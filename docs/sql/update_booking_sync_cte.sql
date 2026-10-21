UPDATE sch_sync.api_endpoints
SET sql_query = $$WITH sync_fleet AS (
    UPDATE sch_fleet.booking_service b
    SET 
        status = CASE 
            WHEN p.status = 'CONFIRMED' THEN 'Confirmed'
            WHEN p.status = 'RESCHEDULED' THEN 'Rescheduled'
            WHEN p.status = 'CANCELED' THEN 'Dibatalkan'
            ELSE b.status
        END,
        tanggal_booking = CASE 
            WHEN p.status = 'RESCHEDULED' AND p.reschedule_date IS NOT NULL 
            THEN DATE(p.reschedule_date)
            ELSE b.tanggal_booking
        END,
        jam_booking = CASE 
            WHEN p.status = 'RESCHEDULED' AND p.reschedule_date IS NOT NULL 
            THEN TO_CHAR(p.reschedule_date, 'HH24:MI')
            ELSE b.jam_booking
        END,
        is_canceled = CASE 
            WHEN p.status = 'CANCELED' THEN true 
            ELSE b.is_canceled 
        END
    FROM sch_pos.tbl_fleet_booking_service p
    WHERE (b.no_booking = p.booking_no OR b.id = p.id)
      AND (
          (p.status = 'CONFIRMED' AND b.status IS DISTINCT FROM 'Confirmed') OR
          (p.status = 'RESCHEDULED' AND (b.status IS DISTINCT FROM 'Rescheduled' OR (p.reschedule_date IS NOT NULL AND b.tanggal_booking IS DISTINCT FROM DATE(p.reschedule_date)))) OR
          (p.status = 'CANCELED' AND (b.status IS DISTINCT FROM 'Dibatalkan' OR b.is_canceled IS NOT TRUE))
      )
    RETURNING b.id
)
SELECT 
    b.id,
    b.no_booking,
    b.id_pelanggan,
    u.nama_lengkap AS nama_perusahaan,
    u.nama_lengkap,
    u.nama_pic,
    b.no_polisi,
    b.jenis_layanan,
    b.tanggal_booking,
    b.jam_booking,
    b.tanggal_booking_awal,
    b.jam_booking_awal,
    b.reschedule_date,
    b.memo_pos,
    b.status_pos,
    b.keluhan,
    b.catatan,
    b.status,
    b.is_confirmed,
    b.can_cancel,
    b.prioritas,
    b.kode_cabang,
    b.nama_cabang,
    b.is_canceled,
    b.cancelat,
    b.cancelby,
    b.created_at
FROM sch_fleet.v_fleet_booking_service b
LEFT JOIN sch_fleet.pengguna u ON b.id_pelanggan = u.id
WHERE (:sys_role != 'Customer_Fleet' OR b.id_pelanggan = CAST(NULLIF(:sys_user, '') AS integer))
ORDER BY b.tanggal_booking DESC, b.jam_booking ASC;$$
WHERE endpoint_path = '/kim3/booking' AND method = 'GET';
