-- ==============================================================================
-- Migration: Create View v_kendaraan_lookup in sch_fleet
-- Date: 2026-10-19
-- Description:
--   Menyediakan pencarian kendaraan langsung dari sch_pos.tbl_member_unit
--   dan menghubungkannya dengan akun pengguna armada di sch_fleet.pengguna.
--   Digunakan oleh Pos Gerbang Security pada saat menginput Plat Nomor.
-- ==============================================================================

CREATE OR REPLACE VIEW sch_fleet.v_kendaraan_lookup AS
SELECT 
    mu.id,
    mu.policeno AS no_polisi,
    REPLACE(UPPER(mu.policeno), ' ', '') AS no_polisi_clean,
    m.id AS member_id,
    m.membername AS nama_perusahaan,
    m.member_fleet_id AS id_pelanggan,
    p.id AS user_id,
    p.nama_lengkap AS nama_pengguna_fleet,
    p.nama_pic,
    COALESCE(p.no_telepon, m.mobilenumber) AS no_telepon,
    COALESCE(mu.type, mu.model, 'Truk') AS jenis_armada,
    mu.merk,
    mu.model,
    mu.year AS tahun,
    mu.active AS status_aktif,
    f.foto_data AS foto_kendaraan
FROM sch_pos.tbl_member_unit mu
JOIN sch_pos.tbl_member m ON mu.memberid = m.id
LEFT JOIN sch_fleet.pengguna p ON m.member_fleet_id = p.id
LEFT JOIN sch_fleet.foto f ON f.kategori = 'KENDARAAN' AND f.referensi_id = REPLACE(UPPER(mu.policeno), ' ', '');

GRANT SELECT ON sch_fleet.v_kendaraan_lookup TO postgres;
