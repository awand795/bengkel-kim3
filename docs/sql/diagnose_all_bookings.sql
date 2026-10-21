SELECT 
    b.id,
    b.no_booking,
    b.no_polisi,
    b.status,
    b.is_canceled,
    (SELECT p.status FROM sch_pos.tbl_fleet_booking_service p WHERE p.booking_no = b.no_booking OR p.id = b.id LIMIT 1) AS pos_status,
    (SELECT COUNT(*) FROM sch_fleet.kunjungan_gerbang kg WHERE kg.booking_id = b.id AND kg.status_gerbang = 'DI_DALAM') AS kg_count,
    (SELECT COUNT(*) FROM sch_fleet.v_spk_pos_service spk WHERE spk.id_booking = b.id) AS spk_count
FROM sch_fleet.booking_service b
ORDER BY b.id DESC
LIMIT 10;
