UPDATE sch_sync.api_endpoints
SET sql_query = $$WITH upd_pos AS (
    UPDATE sch_pos.tbl_fleet_booking_service p
    SET status = 'CANCELED',
        memo = CASE 
            WHEN p.memo IS NULL OR p.memo = '' THEN 'Dibatalkan oleh Customer via Web Fleet'
            ELSE p.memo || ' (Dibatalkan Customer)'
        END,
        updated_at = NOW(),
        updated_by = COALESCE(:sys_user, 'Customer')
    FROM sch_fleet.booking_service b
    WHERE b.id = :id AND (p.booking_no = b.no_booking OR p.id = b.id)
    RETURNING p.id
)
UPDATE sch_fleet.booking_service b
SET status = 'Booking Canceled',
    is_canceled = true,
    cancelat = NOW(),
    cancelby = COALESCE(:sys_user, 'Customer'),
    update_by = COALESCE(:sys_user, 'Customer'),
    update_dt = NOW()
WHERE b.id = :id
  AND COALESCE(b.is_canceled, false) = false
  -- Tidak bisa dibatalkan jika sudah CONFIRMED oleh POS
  AND NOT EXISTS (
      SELECT 1 FROM sch_pos.tbl_fleet_booking_service p 
      WHERE (p.booking_no = b.no_booking OR p.id = b.id) 
        AND p.status = 'CONFIRMED'
  )
  -- Tidak bisa dibatalkan jika sudah check-in di gerbang
  AND NOT EXISTS (
      SELECT 1 FROM sch_fleet.kunjungan_gerbang kg 
      WHERE kg.booking_id = b.id AND kg.status_gerbang = 'DI_DALAM'
  )
  -- Tidak bisa dibatalkan jika sudah terbit SPK
  AND NOT EXISTS (
      SELECT 1 FROM sch_fleet.v_spk_pos_service spk 
      WHERE spk.id_booking = b.id
  )
  -- Verifikasi kepemilikan akun customer
  AND (
      :sys_role != 'Customer_Fleet' 
      OR b.id_pelanggan IS NULL 
      OR b.id_pelanggan = (
          SELECT p.id FROM sch_fleet.pengguna p 
          WHERE p.id::text = :sys_user OR p.email = :sys_user 
          LIMIT 1
      )
      OR (:sys_user ~ '^[0-9]+$' AND b.id_pelanggan = :sys_user::integer)
  )
RETURNING *;$$
WHERE endpoint_path = '/kim3/booking-batal' AND method = 'POST';
