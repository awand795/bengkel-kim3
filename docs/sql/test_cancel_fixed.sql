UPDATE sch_fleet.booking_service b
SET status = 'Booking Canceled',
    is_canceled = true,
    cancelat = NOW(),
    cancelby = 'Customer',
    update_by = 'Customer',
    update_dt = NOW()
WHERE b.id = 20
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
RETURNING b.id, b.no_booking, b.status, b.is_canceled;
