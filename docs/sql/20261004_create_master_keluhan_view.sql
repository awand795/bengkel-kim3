-- ==============================================================================
-- Migration / Reference: View sch_fleet.v_master_keluhan in DEV-POS (dba_dev_pos)
-- Date: 2026-10-04
-- Description:
--   Master data keluhan/gejala umum kendaraan armada untuk booking service KIM 3.
--   Diakses oleh endpoint API Builder: GET /kim3/master/keluhan
-- ==============================================================================

CREATE OR REPLACE VIEW sch_fleet.v_master_keluhan AS
SELECT 1 AS id, 'Rem bunyi / bergetar'::character varying(255) AS keluhan, 'Pengereman & Kaki-kaki'::character varying(100) AS kategori
UNION ALL
SELECT 2 AS id, 'Tarikan mesin berat & boros'::character varying(255) AS keluhan, 'Performa Mesin'::character varying(100) AS kategori
UNION ALL
SELECT 3 AS id, 'Kaki-kaki berisik di jalan rusak'::character varying(255) AS keluhan, 'Pengereman & Kaki-kaki'::character varying(100) AS kategori
UNION ALL
SELECT 4 AS id, 'Susah starter saat dingin'::character varying(255) AS keluhan, 'Kelistrikan'::character varying(100) AS kategori
UNION ALL
SELECT 5 AS id, 'Rembesan oli / radiator bocor'::character varying(255) AS keluhan, 'Perawatan Rutin'::character varying(100) AS kategori
UNION ALL
SELECT 6 AS id, 'Suhu mesin cepat overheat'::character varying(255) AS keluhan, 'Performa Mesin'::character varying(100) AS kategori
UNION ALL
SELECT 7 AS id, 'Lampu indikator speedometer menyala'::character varying(255) AS keluhan, 'Kelistrikan'::character varying(100) AS kategori
UNION ALL
SELECT 8 AS id, 'Kopling selip / gigi susah masuk'::character varying(255) AS keluhan, 'Transmisi & Kopling'::character varying(100) AS kategori;

GRANT SELECT ON sch_fleet.v_master_keluhan TO postgres;
