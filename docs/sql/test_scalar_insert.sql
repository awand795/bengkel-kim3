INSERT INTO sch_fleet.booking_service (
    no_booking, id_pelanggan, no_polisi, jenis_layanan, tanggal_booking, jam_booking, keluhan, catatan, status, prioritas
)
VALUES (
    COALESCE(
        NULLIF(TRIM(''), ''),
        (
            SELECT 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-' || 
                   LPAD((COALESCE(MAX(NULLIF(SUBSTRING(no_booking FROM '[0-9]+$'), '')::integer), 0) + 1)::text, 4, '0')
            FROM sch_fleet.booking_service
            WHERE no_booking LIKE 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-%'
        )
    ),
    11,
    'BK9393ER',
    'Test Scalar Subquery',
    CURRENT_DATE + 3,
    '10:00',
    'Test keluhan',
    'Test catatan',
    'Booked',
    'Normal'
)
RETURNING id, no_booking, id_pelanggan, status;
