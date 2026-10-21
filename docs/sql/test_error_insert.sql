DO $$
DECLARE
    v_no_booking text := NULL;
    v_id_pelanggan text := '11';
    v_sys_user text := 'awanda';
    v_no_polisi text := 'BK 9393 ER';
    v_jenis_layanan text := 'Service Berkala';
    v_tanggal_booking text := '2026-10-23';
    v_jam_booking text := '14:30';
    v_keluhan text := 'Keluhan test';
    v_catatan text := 'Catatan test';
    v_prioritas text := 'Prioritas Booking';
    v_kode_cabang text := NULL;
    v_nama_cabang text := NULL;
BEGIN
    WITH seq_gen AS (
        SELECT 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-' || 
               LPAD((COALESCE(MAX(NULLIF(SUBSTRING(no_booking FROM '[0-9]+$'), '')::integer), 0) + 1)::text, 4, '0') AS gen_no
        FROM sch_fleet.booking_service
        WHERE no_booking LIKE 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-%'
    ),
    pelanggan_resolve AS (
        SELECT COALESCE(
            CAST(NULLIF(v_id_pelanggan, '') AS integer),
            CAST(NULLIF(v_sys_user, '') AS integer),
            (
                SELECT id_pelanggan 
                FROM sch_fleet.v_kendaraan 
                WHERE UPPER(REPLACE(no_polisi, ' ', '')) = UPPER(REPLACE(v_no_polisi, ' ', '')) 
                  AND id_pelanggan IS NOT NULL 
                ORDER BY id DESC LIMIT 1
            )
        ) AS res_id_pelanggan
    )
    INSERT INTO sch_fleet.booking_service (
        no_booking, id_pelanggan, no_polisi, jenis_layanan, tanggal_booking, jam_booking, keluhan, catatan, status, prioritas, input_by, kode_cabang, nama_cabang
    )
    SELECT
        COALESCE(NULLIF(TRIM(v_no_booking), ''), s.gen_no),
        p.res_id_pelanggan,
        REPLACE(UPPER(v_no_polisi), ' ', ''),
        v_jenis_layanan,
        NULLIF(v_tanggal_booking, '')::DATE,
        v_jam_booking,
        v_keluhan,
        v_catatan,
        'Booked',
        COALESCE(v_prioritas, 'Normal'),
        v_sys_user,
        NULLIF(TRIM(v_kode_cabang), ''),
        NULLIF(TRIM(v_nama_cabang), '')
    FROM seq_gen s, pelanggan_resolve p;
END $$;
