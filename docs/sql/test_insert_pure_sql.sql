WITH seq_gen AS (
    SELECT 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-' || 
           LPAD((COALESCE(MAX(NULLIF(SUBSTRING(no_booking FROM '[0-9]+$'), '')::integer), 0) + 1)::text, 4, '0') AS gen_no
    FROM sch_fleet.booking_service
    WHERE no_booking LIKE 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-%'
),
pelanggan_resolve AS (
    SELECT COALESCE(
        CAST(NULLIF('', '') AS integer),
        (
            SELECT id_pelanggan 
            FROM sch_fleet.v_kendaraan 
            WHERE UPPER(REPLACE(no_polisi, ' ', '')) = UPPER(REPLACE('BK 9393 ER', ' ', '')) 
              AND id_pelanggan IS NOT NULL 
            ORDER BY id DESC LIMIT 1
        )
    ) AS res_id_pelanggan
)
INSERT INTO sch_fleet.booking_service (
    no_booking, id_pelanggan, no_polisi, jenis_layanan, tanggal_booking, jam_booking, keluhan, status, prioritas
)
SELECT
    s.gen_no,
    p.res_id_pelanggan,
    'BK9393ER',
    'General Checkup Test Pure SQL',
    CURRENT_DATE + 5,
    '10:00',
    'Test tanpa trigger sama sekali',
    'Booked',
    'Normal'
FROM seq_gen s, pelanggan_resolve p
RETURNING id, no_booking, id_pelanggan, no_polisi, status;
