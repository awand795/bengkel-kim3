-- 1. Status Booking di sch_fleet vs sch_pos
SELECT 
    b.id,
    b.no_booking,
    b.no_polisi,
    b.tanggal_booking,
    b.jam_booking,
    b.status AS status_fleet,
    b.is_canceled,
    p.booking_no AS pos_booking_no,
    p.status AS status_pos,
    p.memo AS memo_pos,
    p.reschedule_date
FROM sch_fleet.booking_service b
LEFT JOIN sch_pos.tbl_fleet_booking_service p 
    ON b.no_booking = p.booking_no OR b.id = p.id
ORDER BY b.id DESC
LIMIT 6;

-- 2. Notifikasi Terkini di sch_fleet.notifikasi
SELECT 
    id,
    id_pengguna,
    title,
    pesan,
    urgency,
    dibaca,
    created_at
FROM sch_fleet.notifikasi
ORDER BY id DESC
LIMIT 5;
