SELECT 
    endpoint_path,
    method,
    sql_query
FROM sch_sync.api_endpoints
WHERE (endpoint_path LIKE '%booking%' OR endpoint_path LIKE '%dokumen%')
  AND method IN ('POST', 'PUT', 'PATCH');
