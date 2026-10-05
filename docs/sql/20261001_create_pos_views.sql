-- ==============================================================================
-- Migration: Create Cross-Schema Views for sch_pos in sch_fleet
-- Date: 2026-10-01
-- Description:
--   Whenever reading data from sch_pos, access must be mediated via views in
--   sch_fleet (e.g. v_pos_tbl_member) to keep schema isolation and best practice.
-- ==============================================================================

-- 1. View: sch_fleet.v_pos_tbl_member
CREATE OR REPLACE VIEW sch_fleet.v_pos_tbl_member AS
SELECT * FROM sch_pos.tbl_member;

-- 2. View Alias: sch_fleet.v_pos_member
CREATE OR REPLACE VIEW sch_fleet.v_pos_member AS
SELECT * FROM sch_pos.tbl_member;

-- 3. Grant Permissions
GRANT SELECT ON sch_fleet.v_pos_tbl_member TO postgres;
GRANT SELECT ON sch_fleet.v_pos_member TO postgres;

-- 4. API Builder Queries Reference (ep-kim3-auth-me & bengkel-auth-login-01)
-- Verification check snippet (Strictly reads member_fleet_id from sch_fleet.v_pos_tbl_member):
-- EXISTS (
--   SELECT 1 FROM sch_fleet.v_pos_tbl_member m 
--   WHERE m.member_fleet_id = u.id
--     AND COALESCE(m.active, true) = true
-- ) AS pos_verifikasi
