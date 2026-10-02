-- ==============================================================================
-- Migration: Central Photo Storage & Cross-Schema Views for Member Unit
-- Date: 2026-10-02
-- Description:
--   1. Replaces sch_fleet.kendaraan with a single centralized photo repository
--      table (sch_fleet.foto) for all entity images (kendaraan, profil, dll).
--   2. Views in sch_fleet mediate access to sch_pos.tbl_member_unit without
--      duplicating tables across schemas.
-- ==============================================================================

-- 1. Central Photo Table: sch_fleet.foto
CREATE TABLE IF NOT EXISTS sch_fleet.foto (
    id SERIAL PRIMARY KEY,
    kategori VARCHAR(50) NOT NULL,       -- 'KENDARAAN', 'PROFIL', 'DOKUMEN', etc.
    referensi_id VARCHAR(100) NOT NULL,   -- e.g. no_polisi (BK8899ITC) or user_id (45)
    foto_data TEXT NOT NULL,              -- base64 image data / data URL
    keterangan VARCHAR(255),
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_foto_kategori_ref UNIQUE (kategori, referensi_id)
);

CREATE INDEX IF NOT EXISTS idx_foto_kategori_ref ON sch_fleet.foto(kategori, referensi_id);
GRANT ALL PRIVILEGES ON sch_fleet.foto TO postgres;
GRANT USAGE, SELECT ON SEQUENCE sch_fleet.foto_id_seq TO postgres;

-- 2. Drop obsolete redundant table sch_fleet.kendaraan
DROP TABLE IF EXISTS sch_fleet.kendaraan CASCADE;

-- 3. Views: sch_fleet.v_pos_tbl_member_unit & sch_fleet.v_pos_member_unit
CREATE OR REPLACE VIEW sch_fleet.v_pos_tbl_member_unit AS
SELECT * FROM sch_pos.tbl_member_unit;

CREATE OR REPLACE VIEW sch_fleet.v_pos_member_unit AS
SELECT * FROM sch_pos.tbl_member_unit;

-- 4. Comprehensive Vehicle View: sch_fleet.v_kendaraan
CREATE OR REPLACE VIEW sch_fleet.v_kendaraan AS
SELECT 
    mu.id,
    mu.policeno AS no_polisi,
    mu.policeno,
    mu.memberid,
    m.id AS member_id,
    m.member_fleet_id,
    m.mobilenumber AS member_mobilenumber,
    m.membername AS member_membername,
    m.membername AS nama_perusahaan,
    m.membername AS nama_pemilik,
    COALESCE(mu.type, mu.model, 'Truk') AS jenis_armada,
    mu.merk,
    mu.model,
    mu.type,
    mu.year AS tahun,
    mu.year,
    mu.chassisno AS no_rangka,
    mu.chassisno,
    mu.machineno AS no_mesin,
    mu.machineno,
    mu.no_inventaris,
    mu.unit_name,
    mu.expired,
    mu.expired AS masa_berlaku_asuransi,
    mu.note,
    mu.description,
    mu.active,
    mu.active AS status_aktif,
    mu.created_from,
    f.foto_data AS foto_kendaraan
FROM sch_fleet.v_pos_tbl_member_unit mu
JOIN sch_fleet.v_pos_tbl_member m ON mu.memberid = m.id
LEFT JOIN sch_fleet.foto f ON f.kategori = 'KENDARAAN' AND f.referensi_id = REPLACE(UPPER(mu.policeno), ' ', '');

-- 5. Views for Asset Brand: sch_fleet.v_pos_tbl_member_asset_brand & sch_fleet.v_pos_asset_brand
CREATE OR REPLACE VIEW sch_fleet.v_pos_tbl_member_asset_brand AS
SELECT * FROM sch_pos.tbl_member_asset_brand;

CREATE OR REPLACE VIEW sch_fleet.v_pos_asset_brand AS
SELECT 
    id,
    brandcode,
    brandname,
    active
FROM sch_fleet.v_pos_tbl_member_asset_brand
WHERE active IS TRUE
ORDER BY brandname ASC;

-- 6. Views for Asset Type: sch_fleet.v_pos_tbl_member_asset_type & sch_fleet.v_pos_asset_type
CREATE OR REPLACE VIEW sch_fleet.v_pos_tbl_member_asset_type AS
SELECT * FROM sch_pos.tbl_member_asset_type;

CREATE OR REPLACE VIEW sch_fleet.v_pos_asset_type AS
SELECT 
    t.id,
    t.typename,
    t.typecode,
    t.modelid,
    m.modelname,
    m.brandid,
    b.brandname,
    t.active
FROM sch_pos.tbl_member_asset_type t
LEFT JOIN sch_pos.tbl_member_asset_model m ON t.modelid = m.id
LEFT JOIN sch_pos.tbl_member_asset_brand b ON m.brandid = b.id
WHERE t.active IS TRUE AND t.typename IS NOT NULL AND TRIM(t.typename) != ''
ORDER BY t.typename ASC;

-- 7. Grant Permissions
GRANT SELECT ON sch_fleet.v_pos_tbl_member_unit TO postgres;
GRANT SELECT ON sch_fleet.v_pos_member_unit TO postgres;
GRANT SELECT ON sch_fleet.v_kendaraan TO postgres;
GRANT SELECT ON sch_fleet.v_pos_tbl_member_asset_brand TO postgres;
GRANT SELECT ON sch_fleet.v_pos_asset_brand TO postgres;
GRANT SELECT ON sch_fleet.v_pos_tbl_member_asset_type TO postgres;
GRANT SELECT ON sch_fleet.v_pos_asset_type TO postgres;

