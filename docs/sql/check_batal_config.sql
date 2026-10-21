SELECT 
    endpoint_path,
    method,
    auth_type,
    rate_limit,
    is_active,
    sql_query
FROM sch_sync.api_endpoints
WHERE endpoint_path = '/kim3/booking-batal';
