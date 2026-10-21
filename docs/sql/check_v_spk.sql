SELECT 
    id,
    no_spk,
    id_booking,
    no_polisi,
    status_spk,
    created_at
FROM sch_fleet.v_spk_pos_service 
WHERE id_booking IN (18, 20, 23) OR UPPER(REPLACE(no_polisi, ' ', '')) = 'BK9393ER';
