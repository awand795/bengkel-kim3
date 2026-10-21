UPDATE sch_sync.api_endpoints
SET sql_query = $$INSERT INTO sch_fleet.booking_service (
    no_booking, id_pelanggan, no_polisi, jenis_layanan, tanggal_booking, jam_booking, keluhan, catatan, status, prioritas, input_by, kode_cabang, nama_cabang
)
VALUES (
    COALESCE(
        NULLIF(TRIM(CAST(:no_booking AS text)), ''),
        'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-' || LPAD((FLOOR(RANDOM() * 9000 + 1000)::integer)::text, 4, '0')
    ),
    CASE 
        WHEN NULLIF(TRIM(CAST(:id_pelanggan AS text)), '') ~ '^[0-9]+$' 
        THEN CAST(TRIM(CAST(:id_pelanggan AS text)) AS integer)
        ELSE (
            SELECT id_pelanggan 
            FROM sch_fleet.kendaraan 
            WHERE UPPER(REPLACE(no_polisi, ' ', '')) = UPPER(REPLACE(:no_polisi, ' ', ''))
              AND id_pelanggan IS NOT NULL 
            ORDER BY id DESC LIMIT 1
        )
    END,
    REPLACE(UPPER(:no_polisi), ' ', ''),
    :jenis_layanan,
    NULLIF(CAST(:tanggal_booking AS text), '')::DATE,
    :jam_booking,
    :keluhan,
    :catatan,
    'Booked',
    COALESCE(:prioritas, 'Prioritas Booking'),
    :sys_user,
    NULLIF(TRIM(CAST(:kode_cabang AS text)), ''),
    NULLIF(TRIM(CAST(:nama_cabang AS text)), '')
)
RETURNING *;$$
WHERE endpoint_path = '/kim3/booking-tambah' AND method = 'POST';
