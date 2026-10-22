-- ==============================================================================
-- STATUS BOOKING GERBANG: check_in / check_out
-- Database konfigurasi : data_setting_sync (schema sch_sync)
-- Database operasional : dba_dev_pos (schema sch_fleet)
-- Tanggal              : 22 Oktober 2026
--
-- Catatan:
-- - Tidak memakai trigger. Semua perubahan status dilakukan dari SQL API Builder.
-- - Jalankan bagian 0-7 di data_setting_sync, bagian 8 di dba_dev_pos.
-- - Script ini adalah migrasi satu kali. Bagian replace() akan no-op jika
--   endpoint sudah pernah diperbarui.
-- ==============================================================================

-- 0. BACKUP ENDPOINT
CREATE TABLE IF NOT EXISTS sch_sync.api_endpoints_bak_20261022 AS
SELECT * FROM sch_sync.api_endpoints;

-- 1. CHECK-IN: status 'Checked-In' -> 'check_in'
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
    sql_query,
    $old$status = 'Checked-In'$old$,
    $new$status = 'check_in'$new$
)
WHERE endpoint_path = '/kim3/security/check-in'
  AND method = 'POST';

-- 2. CHECK-OUT: tambah CTE upd_booking -> 'check_out'
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
    sql_query,
    $old$  RETURNING *
),
new_memo_no AS ($old$,
    $new$  RETURNING *
),
upd_booking AS (
  UPDATE sch_fleet.booking_service b
  SET status = 'check_out',
      update_by = :sys_user,
      update_dt = NOW()
  FROM upd_kunjungan uk
  WHERE b.id = uk.booking_id
  RETURNING b.id
),
new_memo_no AS ($new$
)
WHERE endpoint_path = '/kim3/security/check-out'
  AND method = 'POST';

-- 3. DASHBOARD: booking yang sudah check_in/check_out tidak dihitung
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
    sql_query,
    $old$AND LOWER(COALESCE(b.status, '')) NOT LIKE '%checked%'$old$,
    $new$AND LOWER(COALESCE(b.status, '')) NOT LIKE '%checked%'
      AND LOWER(COALESCE(b.status, '')) NOT IN ('check_in', 'check_out')$new$
)
WHERE endpoint_path = '/kim3/security/dashboard'
  AND method = 'GET'
  AND sql_query NOT LIKE '%NOT IN (''check_in'', ''check_out'')%';

-- 4. SECURITY BOOKING LIST: sembunyikan booking yang sudah check-in/check-out
--    Memakai kunjungan_gerbang agar tidak self-join ke booking_service
--    (gateway API Builder bermasalah dengan self-join pada view yang sama).
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
    sql_query,
    $old$WHERE COALESCE(b.is_canceled, false) = false
  AND b.is_confirmed = true$old$,
    $new$WHERE COALESCE(b.is_canceled, false) = false
  AND b.is_confirmed = true
  AND NOT EXISTS (
    SELECT 1 FROM sch_fleet.kunjungan_gerbang kg
    WHERE kg.booking_id = b.id
      AND kg.status_gerbang IN ('DI_DALAM', 'SELESAI_KELUAR')
  )$new$
)
WHERE endpoint_path = '/kim3/security/booking-list'
  AND method = 'GET'
  AND sql_query NOT LIKE '%kg.status_gerbang IN (''DI_DALAM'', ''SELESAI_KELUAR'')%';

-- 4b. Perbaiki referensi kolom nama_perusahaan yang tidak ada di sch_fleet.pengguna
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
    sql_query,
    $old$COALESCE(p.nama_perusahaan, p.nama_lengkap, 'Pelanggan Umum') AS nama_pelanggan$old$,
    $new$COALESCE(p.nama_lengkap, 'Pelanggan Umum') AS nama_pelanggan$new$
)
WHERE endpoint_path = '/kim3/security/booking-list'
  AND method = 'GET'
  AND sql_query LIKE '%p.nama_perusahaan%';

-- 5. GET /kim3/booking:
--    a) sync_fleet tidak boleh menimpa status check_in/check_out
--    b) tambah field sudah_kunjungan
--    c) customer hanya menerima booking aktif (belum masuk/keluar gerbang)
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
    sql_query,
    $old$      )
    RETURNING b.id$old$,
    $new$      )
      AND COALESCE(b.status, '') NOT IN ('check_in', 'check_out')
    RETURNING b.id$new$
)
WHERE endpoint_path = '/kim3/booking'
  AND method = 'GET';

UPDATE sch_sync.api_endpoints
SET sql_query = replace(
    sql_query,
    $old$    b.status,
    b.is_confirmed,$old$,
    $new$    b.status,
    EXISTS (
      SELECT 1 FROM sch_fleet.kunjungan_gerbang kg
      WHERE kg.booking_id = b.id
        AND kg.status_gerbang IN ('DI_DALAM', 'SELESAI_KELUAR')
    ) AS sudah_kunjungan,
    b.is_confirmed,$new$
)
WHERE endpoint_path = '/kim3/booking'
  AND method = 'GET';

UPDATE sch_sync.api_endpoints
SET sql_query = replace(
    sql_query,
    $old$WHERE (:sys_role != 'Customer_Fleet' OR b.id_pelanggan = CAST(NULLIF(:sys_user, '') AS integer))
ORDER BY$old$,
    $new$WHERE (:sys_role != 'Customer_Fleet' OR b.id_pelanggan = CAST(NULLIF(:sys_user, '') AS integer))
  AND (
    :sys_role != 'Customer_Fleet'
    OR NOT EXISTS (
      SELECT 1 FROM sch_fleet.kunjungan_gerbang kg
      WHERE kg.booking_id = b.id
        AND kg.status_gerbang IN ('DI_DALAM', 'SELESAI_KELUAR')
    )
  )
ORDER BY$new$
)
WHERE endpoint_path = '/kim3/booking'
  AND method = 'GET';

-- 6. BATAL BOOKING: kunci booking yang sudah masuk/keluar gerbang
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
    sql_query,
    $old$  AND COALESCE(b.is_canceled, false) = false$old$,
    $new$  AND COALESCE(b.is_canceled, false) = false
  AND COALESCE(b.status, '') NOT IN ('check_in', 'check_out')$new$
)
WHERE endpoint_path = '/kim3/booking-batal'
  AND method = 'POST'
  AND sql_query NOT LIKE '%COALESCE(b.status%';

UPDATE sch_sync.api_endpoints
SET sql_query = replace(
    sql_query,
    $old$WHERE kg.booking_id = b.id AND kg.status_gerbang = 'DI_DALAM'$old$,
    $new$WHERE kg.booking_id = b.id AND kg.status_gerbang IN ('DI_DALAM', 'SELESAI_KELUAR')$new$
)
WHERE endpoint_path = '/kim3/booking-batal'
  AND method = 'POST';

-- 7. VERIFIKASI ENDPOINT
SELECT endpoint_path,
       sql_query LIKE '%check_in%' AS has_check_in,
       sql_query LIKE '%check_out%' AS has_check_out
FROM sch_sync.api_endpoints
WHERE endpoint_path IN (
    '/kim3/security/check-in',
    '/kim3/security/check-out',
    '/kim3/security/dashboard',
    '/kim3/security/booking-list',
    '/kim3/booking',
    '/kim3/booking-batal'
)
ORDER BY endpoint_path;

-- ==============================================================================
-- 8. JALANKAN DI dba_dev_pos: BACKFILL DATA LAMA
-- ==============================================================================
BEGIN;

-- 8a. Normalisasi status lama
UPDATE sch_fleet.booking_service
SET status = 'check_in',
    update_by = 'SYSTEM',
    update_dt = NOW()
WHERE status = 'Checked-In';

-- 8b. Booking yang masih punya kunjungan aktif
UPDATE sch_fleet.booking_service b
SET status = 'check_in',
    update_by = 'SYSTEM',
    update_dt = NOW()
WHERE EXISTS (
    SELECT 1 FROM sch_fleet.kunjungan_gerbang kg
    WHERE kg.booking_id = b.id AND kg.status_gerbang = 'DI_DALAM'
)
AND COALESCE(b.status, '') NOT IN ('Booking Canceled', 'Dibatalkan', 'check_in');

-- 8c. Booking yang sudah keluar dan tidak punya kunjungan aktif
UPDATE sch_fleet.booking_service b
SET status = 'check_out',
    update_by = 'SYSTEM',
    update_dt = NOW()
WHERE EXISTS (
    SELECT 1 FROM sch_fleet.kunjungan_gerbang kg
    WHERE kg.booking_id = b.id AND kg.status_gerbang = 'SELESAI_KELUAR'
)
AND NOT EXISTS (
    SELECT 1 FROM sch_fleet.kunjungan_gerbang kg
    WHERE kg.booking_id = b.id AND kg.status_gerbang = 'DI_DALAM'
)
AND COALESCE(b.status, '') NOT IN ('Booking Canceled', 'Dibatalkan', 'check_out');

COMMIT;

-- 8d. Verifikasi data
SELECT b.id, b.no_booking, b.status, kg.id AS kunjungan_id, kg.status_gerbang
FROM sch_fleet.booking_service b
LEFT JOIN sch_fleet.kunjungan_gerbang kg ON kg.booking_id = b.id
WHERE kg.id IS NOT NULL
ORDER BY b.id;
