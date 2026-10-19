-- ==============================================================================
-- Migration: Create View v_pos_employee and Cross-Schema Access in sch_fleet
-- Date: 2026-10-19
-- Description:
--   Membaca master PIC / Petugas / Karyawan bengkel dari sch_pos.tbl_employee 
--   secara aman melalui view di sch_fleet (sch_fleet.v_pos_employee).
--   Digunakan untuk lookup PIC pada kunjungan Gerbang Security (Service -> SA,
--   Beli Part -> Warehouse, Kunjungan -> Management, dll).
-- ==============================================================================

-- 1. View Standar: sch_fleet.v_pos_tbl_employee
CREATE OR REPLACE VIEW sch_fleet.v_pos_tbl_employee AS
SELECT * FROM sch_pos.tbl_employee;

-- 2. View Ringkas & Terformat: sch_fleet.v_pos_employee
CREATE OR REPLACE VIEW sch_fleet.v_pos_employee AS
SELECT 
    e.id,
    e.employeeid,
    e.employeecode,
    e.employeename,
    e.employeename AS nama_karyawan,
    e.jobposition,
    e.jobposition AS jabatan,
    e.department,
    e.department AS departemen,
    e.mobilenumber,
    e.mobilenumber AS no_hp,
    e.email,
    COALESCE(e.active, true) AS active,
    -- Label Display Kustom untuk Dropdown Security Gerbang
    CONCAT(
        e.employeename, 
        CASE 
            WHEN e.jobposition IS NOT NULL AND TRIM(e.jobposition) != '' 
            THEN CONCAT(' (', e.jobposition, ')') 
            ELSE '' 
        END
    ) AS display_label
FROM sch_pos.tbl_employee e
WHERE COALESCE(e.active, true) = true
ORDER BY e.employeename ASC;

-- 3. Grant Hak Akses Select ke User Database
GRANT SELECT ON sch_fleet.v_pos_tbl_employee TO postgres;
GRANT SELECT ON sch_fleet.v_pos_employee TO postgres;

-- ==============================================================================
-- KETERANGAN PENGGUNAAN API BUILDER:
-- Endpoint : GET /kim3/master/pic-employee (atau via query ke sch_fleet.v_pos_employee)
-- Query    : SELECT employeeid, employeename, jobposition, departemen, no_hp, display_label 
--            FROM sch_fleet.v_pos_employee 
--            WHERE active = true;
-- ==============================================================================
