SELECT 
    b.id,
    b.no_booking,
    b.id_pelanggan,
    b.no_polisi,
    b.status,
    b.is_canceled,
    p.status AS status_pos
FROM sch_fleet.booking_service b
LEFT JOIN sch_pos.tbl_fleet_booking_service p ON b.no_booking = p.booking_no OR b.id = p.id
ORDER BY b.id DESC
LIMIT 5;
