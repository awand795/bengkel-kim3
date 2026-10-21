UPDATE sch_sync.api_endpoints
SET sql_query = $$WITH seq_gen AS (
    SELECT 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-' || 
           LPAD((COALESCE(MAX(NULLIF(SUBSTRING(no_booking FROM '[0-9]+$'), '')::integer), 0) + 1)::text, 4, '0') AS gen_no
    FROM sch_fleet.booking_service
    WHERE no_booking LIKE 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-%'
)
INSERT INTO sch_fleet.booking_service (
    no_booking, id_pelanggan, no_polisi, jenis_layanan, tanggal_booking, jam_booking, keluhan, catatan, status, prioritas, input_by, kode_cabang, nama_cabang
)
SELECT
    COALESCE(NULLIF(TRIM(CAST(:no_booking AS text)), ''), s.gen_no),
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
FROM seq_gen s
RETURNING *;$$
WHERE endpoint_path = '/kim3/booking-tambah' AND method = 'POST';
