-- Drop all triggers on sch_fleet
DROP TRIGGER IF EXISTS trg_auto_link_booking_pelanggan ON sch_fleet.booking_service;
DROP TRIGGER IF EXISTS trg_generate_no_booking ON sch_fleet.booking_service;
DROP TRIGGER IF EXISTS trg_auto_link_dokumen_pelanggan ON sch_fleet.dokumen_kendaraan;

-- Drop obsolete trigger functions
DROP FUNCTION IF EXISTS sch_fleet.fn_auto_link_booking_pelanggan();
DROP FUNCTION IF EXISTS sch_fleet.fn_generate_no_booking();
DROP FUNCTION IF EXISTS sch_fleet.fn_auto_link_dokumen_pelanggan();
