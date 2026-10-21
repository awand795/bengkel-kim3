-- 1. Update /kim3/booking-tambah: Pure SQL generation (no triggers)
UPDATE sch_sync.api_endpoints
SET sql_query = $$WITH seq_gen AS (
    SELECT 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-' || 
           LPAD((COALESCE(MAX(NULLIF(SUBSTRING(no_booking FROM '[0-9]+$'), '')::integer), 0) + 1)::text, 4, '0') AS gen_no
    FROM sch_fleet.booking_service
    WHERE no_booking LIKE 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-%'
),
pelanggan_resolve AS (
    SELECT COALESCE(
        CAST(NULLIF(:id_pelanggan, '') AS integer),
        CAST(NULLIF(:sys_user, '') AS integer),
        (
            SELECT id_pelanggan 
            FROM sch_fleet.v_kendaraan 
            WHERE UPPER(REPLACE(no_polisi, ' ', '')) = UPPER(REPLACE(:no_polisi, ' ', '')) 
              AND id_pelanggan IS NOT NULL 
            ORDER BY id DESC LIMIT 1
        )
    ) AS res_id_pelanggan
)
INSERT INTO sch_fleet.booking_service (
    no_booking, id_pelanggan, no_polisi, jenis_layanan, tanggal_booking, jam_booking, keluhan, catatan, status, prioritas, input_by, kode_cabang, nama_cabang
)
SELECT
    COALESCE(NULLIF(TRIM(CAST(:no_booking AS text)), ''), s.gen_no),
    p.res_id_pelanggan,
    REPLACE(UPPER(:no_polisi), ' ', ''),
    :jenis_layanan,
    NULLIF(CAST(:tanggal_booking AS text), '')::DATE,
    :jam_booking,
    :keluhan,
    :catatan,
    'Booked',
    COALESCE(:prioritas, 'Normal'),
    :sys_user,
    NULLIF(TRIM(CAST(:kode_cabang AS text)), ''),
    NULLIF(TRIM(CAST(:nama_cabang AS text)), '')
FROM seq_gen s, pelanggan_resolve p
RETURNING *;$$
WHERE endpoint_path = '/kim3/booking-tambah' AND method = 'POST';

-- 2. Update /kim3/dokumen-tambah: Pure SQL auto-link (no triggers)
UPDATE sch_sync.api_endpoints
SET sql_query = $$INSERT INTO sch_fleet.dokumen_kendaraan (
    no_polisi, id_pelanggan, nama_dokumen, jenis_dokumen, file_url, masa_berlaku, keterangan, input_by
)
SELECT 
    REPLACE(UPPER(:no_polisi), ' ', ''),
    COALESCE(
        CAST(NULLIF(:id_pelanggan, '') AS integer),
        CAST(NULLIF(:sys_user, '') AS integer),
        (
            SELECT id_pelanggan 
            FROM sch_fleet.kendaraan 
            WHERE UPPER(REPLACE(no_polisi, ' ', '')) = UPPER(REPLACE(:no_polisi, ' ', ''))
              AND id_pelanggan IS NOT NULL 
            ORDER BY id DESC LIMIT 1
        )
    ),
    :nama_dokumen,
    :jenis_dokumen,
    :file_url,
    NULLIF(:masa_berlaku, '')::DATE,
    :keterangan,
    :sys_user
RETURNING *;$$
WHERE endpoint_path = '/kim3/dokumen-tambah' AND method = 'POST';
