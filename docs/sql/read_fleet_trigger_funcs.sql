SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('fn_auto_link_booking_pelanggan', 'fn_generate_no_booking', 'fn_auto_link_dokumen_pelanggan');
