SELECT tgname, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgrelid = 'sch_pos.tbl_fleet_booking_service'::regclass 
  AND NOT tgisinternal;
