-- ==============================================================================
-- Migration / Reference: View sch_fleet.v_jenis_layanan in DEV-POS (dba_dev_pos)
-- Date: 2026-10-04
-- Description:
--   Master data opsi service & perbaikan armada untuk booking service KIM 3.
--   Diakses oleh endpoint API Builder: GET /kim3/master/layanan
-- ==============================================================================

CREATE OR REPLACE VIEW sch_fleet.v_jenis_layanan AS
SELECT 1 AS id,
    'Service Berkala (Ganti Oli & Filter)'::character varying(255) AS jenis_layanan,
    'Perawatan rutin berkala mesin, ganti oli mesin & saringan filter'::text AS deskripsi,
    'Perawatan Rutin'::character varying(100) AS kategori,
    '1 Jam'::character varying(50) AS estimasi_durasi
UNION ALL
SELECT 2 AS id,
    'Perbaikan Rem & Kaki-kaki'::character varying(255) AS jenis_layanan,
    'Pemeriksaan & perbaikan kanvas rem, tromol/piringan, suspensi dan tie rod'::text AS deskripsi,
    'Sasis & Kaki-kaki'::character varying(100) AS kategori,
    '2 Jam'::character varying(50) AS estimasi_durasi
UNION ALL
SELECT 3 AS id,
    'Tune Up & Performa Mesin'::character varying(255) AS jenis_layanan,
    'Kalibrasi injektor, pembersihan ruang bakar, setel klep & performa mesin'::text AS deskripsi,
    'Performa Mesin'::character varying(100) AS kategori,
    '2 - 3 Jam'::character varying(50) AS estimasi_durasi
UNION ALL
SELECT 4 AS id,
    'Kelistrikan & Starter / Alternator'::character varying(255) AS jenis_layanan,
    'Diagnosa aki/accu, dinamo starter, alternator pengisian & perkabelan'::text AS deskripsi,
    'Kelistrikan'::character varying(100) AS kategori,
    '1 - 2 Jam'::character varying(50) AS estimasi_durasi
UNION ALL
SELECT 5 AS id,
    'Overhaul Mesin / Transmisi'::character varying(255) AS jenis_layanan,
    'Turun mesin total / setengah, perbaikan transmisi transmisi gigi & gardan'::text AS deskripsi,
    'Perbaikan Berat'::character varying(100) AS kategori,
    '1 - 3 Hari'::character varying(50) AS estimasi_durasi
UNION ALL
SELECT 6 AS id,
    'Pemeriksaan Umum / Keluhan Khusus'::character varying(255) AS jenis_layanan,
    'Pengecekan general checkup menyeluruh atau diagnosa keluhan khusus operasional'::text AS deskripsi,
    'Umum & Diagnosa'::character varying(100) AS kategori,
    'Sesuai Keluhan'::character varying(50) AS estimasi_durasi;

GRANT SELECT ON sch_fleet.v_jenis_layanan TO postgres;
