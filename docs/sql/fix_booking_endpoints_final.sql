-- 1. Endpoint POST /kim3/booking-tambah (Pure INSERT with scalar subquery for sequential no_booking)
UPDATE sch_sync.api_endpoints
SET sql_query = $$INSERT INTO sch_fleet.booking_service (
    no_booking, id_pelanggan, no_polisi, jenis_layanan, tanggal_booking, jam_booking, keluhan, catatan, status, prioritas, input_by, kode_cabang, nama_cabang
)
VALUES (
    COALESCE(
        NULLIF(TRIM(CAST(:no_booking AS text)), ''),
        (
            SELECT 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-' || 
                   LPAD((COALESCE(MAX(NULLIF(SUBSTRING(no_booking FROM '[0-9]+$'), '')::integer), 0) + 1)::text, 4, '0')
            FROM sch_fleet.booking_service
            WHERE no_booking LIKE 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-%'
        )
    ),
    COALESCE(
        CAST(NULLIF(CAST(:id_pelanggan AS text), '') AS integer),
        (
            SELECT id_pelanggan 
            FROM sch_fleet.kendaraan 
            WHERE UPPER(REPLACE(no_polisi, ' ', '')) = UPPER(REPLACE(:no_polisi, ' ', ''))
              AND id_pelanggan IS NOT NULL 
            ORDER BY id DESC LIMIT 1
        )
    ),
    REPLACE(UPPER(:no_polisi), ' ', ''),
    :jenis_layanan,
    NULLIF(CAST(:tanggal_booking AS text), '')::DATE,
    :jam_booking,
    :keluhan,
    :catatan,
    'Booked',
    COALESCE(:prioritas, 'Prioritas Booking'),
    :sys_user,
    NULLIF(TRIM(CAST(:kode_cabang AS text)), ''),
    NULLIF(TRIM(CAST(:nama_cabang AS text)), '')
)
RETURNING *;$$
WHERE endpoint_path = '/kim3/booking-tambah' AND method = 'POST';

-- 2. Endpoint POST /kim3/booking-batal (Pure UPDATE statement)
UPDATE sch_sync.api_endpoints
SET sql_query = $$UPDATE sch_fleet.booking_service b
SET status = 'Booking Canceled',
    is_canceled = true,
    cancelat = NOW(),
    cancelby = COALESCE(:sys_user, 'Customer'),
    update_by = COALESCE(:sys_user, 'Customer'),
    update_dt = NOW()
WHERE b.id = CAST(:id AS integer)
  AND COALESCE(b.is_canceled, false) = false
  -- Tidak bisa dibatalkan jika sudah CONFIRMED oleh POS
  AND NOT EXISTS (
      SELECT 1 FROM sch_pos.tbl_fleet_booking_service p 
      WHERE (p.booking_no = b.no_booking OR p.id = b.id) 
        AND p.status = 'CONFIRMED'
  )
  -- Tidak bisa dibatalkan jika sudah check in di gerbang
  AND NOT EXISTS (
      SELECT 1 FROM sch_fleet.kunjungan_gerbang kg 
      WHERE kg.booking_id = b.id AND kg.status_gerbang = 'DI_DALAM'
  )
  -- Tidak bisa dibatalkan jika sudah terbit SPK
  AND NOT EXISTS (
      SELECT 1 FROM sch_fleet.v_spk_pos_service spk 
      WHERE spk.id_booking = b.id
  )
RETURNING *;$$
WHERE endpoint_path = '/kim3/booking-batal' AND method = 'POST';
