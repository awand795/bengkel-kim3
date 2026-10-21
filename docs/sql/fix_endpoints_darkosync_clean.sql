-- 1. Endpoint POST /kim3/booking-tambah (Exact 1 parameter occurrence, standard INSERT)
UPDATE sch_sync.api_endpoints
SET sql_query = $$INSERT INTO sch_fleet.booking_service (
    no_booking, id_pelanggan, no_polisi, jenis_layanan, tanggal_booking, jam_booking, keluhan, catatan, status, prioritas, input_by, kode_cabang, nama_cabang
)
VALUES (
    :no_booking,
    :id_pelanggan,
    REPLACE(UPPER(:no_polisi), ' ', ''),
    :jenis_layanan,
    NULLIF(CAST(:tanggal_booking AS text), '')::DATE,
    :jam_booking,
    :keluhan,
    :catatan,
    'Booked',
    COALESCE(:prioritas, 'Prioritas Booking'),
    COALESCE(:sys_user, 'Customer'),
    NULLIF(TRIM(CAST(:kode_cabang AS text)), ''),
    NULLIF(TRIM(CAST(:nama_cabang AS text)), '')
)
RETURNING *;$$
WHERE endpoint_path = '/kim3/booking-tambah' AND method = 'POST';

-- 2. Endpoint POST /kim3/booking-batal (Exact 1 parameter occurrence for :id)
UPDATE sch_sync.api_endpoints
SET sql_query = $$UPDATE sch_fleet.booking_service b
SET status = 'Booking Canceled',
    is_canceled = true,
    cancelat = NOW(),
    cancelby = 'Customer',
    update_by = 'Customer',
    update_dt = NOW()
WHERE b.id = CAST(:id AS integer)
  AND COALESCE(b.is_canceled, false) = false
  AND NOT EXISTS (
      SELECT 1 FROM sch_pos.tbl_fleet_booking_service p 
      WHERE (p.booking_no = b.no_booking OR p.id = b.id) 
        AND p.status = 'CONFIRMED'
  )
  AND NOT EXISTS (
      SELECT 1 FROM sch_fleet.kunjungan_gerbang kg 
      WHERE kg.booking_id = b.id AND kg.status_gerbang = 'DI_DALAM'
  )
  AND NOT EXISTS (
      SELECT 1 FROM sch_fleet.v_spk_pos_service spk 
      WHERE spk.id_booking = b.id
  )
RETURNING *;$$
WHERE endpoint_path = '/kim3/booking-batal' AND method = 'POST';
