-- ==============================================================================
-- API Builder Endpoint: GET /kim3/kunjungan-service
-- Database: data_setting_sync | Schema: sch_sync
-- Tanggal: 22 Oktober 2026
-- Group  : Dev - Web Fleet Customer Bengkel Kim3
-- ==============================================================================
--
-- Tujuan:
--   Menampilkan kunjungan SERVICE yang sudah check-in gerbang
--   (status_gerbang = 'DI_DALAM') tetapi SA belum menerbitkan WO/SPK.
--   Dipakai frontend Customer Fleet sebagai entri Riwayat Service dengan
--   status "Check In" + keterangan "Menunggu Penerimaan Awal oleh SA".
--
-- Catatan:
--   - Pencocokan ke SPK memakai id_kunjungan dari v_spk_pos_service. View
--     tersebut sudah mencocokkan nopol + rentang waktu siklus WO, sehingga
--     tiket gerbang otomatis hilang begitu WO yang benar sudah terbit.
--     id_booking di view berasal dari sch_pos.tbl_request_service.id (bukan
--     booking_service.id), jadi tidak dipakai untuk pencocokan.
--   - Role & tenant mengikuti pola endpoint customer lain (:sys_role / :sys_user).
-- ==============================================================================

INSERT INTO sch_sync.api_endpoints (
  id,
  name,
  method,
  endpoint_path,
  connection_id,
  sql_query,
  parameters,
  enable_pagination,
  is_public,
  auth_token,
  group_name,
  security_mode,
  allowed_roles
) VALUES (
  gen_random_uuid()::text,
  'Bengkel KIM 3 -> Get Kunjungan Service (Menunggu SA)',
  'GET',
  '/kim3/kunjungan-service',
  '1790050800000',
  $sql$
SELECT
  kg.id::integer AS id,
  kg.nomor_tiket,
  kg.booking_id,
  b.id_pelanggan,
  kg.no_polisi,
  COALESCE(u.nama_lengkap, kg.nama_perusahaan, kg.nama_pengemudi, 'Customer Fleet') AS nama_customer,
  COALESCE(
    NULLIF(TRIM(b.keluhan), ''),
    NULLIF(TRIM(b.jenis_layanan), ''),
    NULLIF(TRIM(kg.tujuan_kunjungan), ''),
    'Service Kendaraan'
  ) AS keluhan_customer,
  kg.tujuan_kunjungan,
  kg.catatan_masuk,
  kg.nama_pengemudi,
  kg.nama_perusahaan,
  kg.no_telepon_pengemudi,
  kg.foto_kendaraan_masuk,
  kg.waktu_masuk AS waktu_check_in,
  kg.waktu_masuk AS created_at,
  'Check In'::text AS status_spk,
  'Menunggu Penerimaan Awal oleh SA'::text AS status_keterangan,
  'Belum Diperiksa'::text AS cek_body,
  'Belum Diperiksa'::text AS cek_mesin,
  'Belum Diperiksa'::text AS cek_kelistrikan,
  'Belum Diperiksa'::text AS cek_kaki_kaki,
  0::integer AS odometer_km,
  0::numeric AS estimasi_biaya,
  0::integer AS estimasi_waktu_jam
FROM sch_fleet.kunjungan_gerbang kg
JOIN sch_fleet.booking_service b ON b.id = kg.booking_id
LEFT JOIN sch_fleet.pengguna u ON u.id = b.id_pelanggan
WHERE kg.tipe_kunjungan = 'SERVICE'
  AND kg.status_gerbang = 'DI_DALAM'
  AND (:sys_role != 'Customer_Fleet' OR b.id_pelanggan = CAST(NULLIF(:sys_user, '') AS integer))
  AND NOT EXISTS (
    SELECT 1
    FROM sch_fleet.v_spk_pos_service s
    WHERE s.id_kunjungan = kg.id
  )
ORDER BY kg.waktu_masuk DESC
  $sql$,
  '[]',
  true,
  false,
  'KIM3-SECURE-TOKEN-2026-X998A7B6C',
  'Dev - Web Fleet Customer Bengkel Kim3',
  'HYBRID',
  'Customer_Fleet,SA,Security,Super_Admin'
)
ON CONFLICT (endpoint_path) DO UPDATE SET
  name = EXCLUDED.name,
  method = EXCLUDED.method,
  connection_id = EXCLUDED.connection_id,
  sql_query = EXCLUDED.sql_query,
  parameters = EXCLUDED.parameters,
  enable_pagination = EXCLUDED.enable_pagination,
  is_public = EXCLUDED.is_public,
  auth_token = EXCLUDED.auth_token,
  group_name = EXCLUDED.group_name,
  security_mode = EXCLUDED.security_mode,
  allowed_roles = EXCLUDED.allowed_roles,
  updated_at = CURRENT_TIMESTAMP;
