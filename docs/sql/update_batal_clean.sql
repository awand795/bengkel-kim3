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
RETURNING *;$$
WHERE endpoint_path = '/kim3/booking-batal' AND method = 'POST';
