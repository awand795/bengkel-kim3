WITH seq_gen AS (
    SELECT 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-' || 
           LPAD((COALESCE(MAX(NULLIF(SUBSTRING(no_booking FROM '[0-9]+$'), '')::integer), 0) + 1)::text, 4, '0') AS gen_no
    FROM sch_fleet.booking_service
    WHERE no_booking LIKE 'BK-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYMMDD') || '-%'
)
SELECT gen_no FROM seq_gen;
