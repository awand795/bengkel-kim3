-- ==============================================================================
-- Migration: Riwayat Service untuk unit yang sudah check-in tapi belum ada WO
--            + perbaikan fallback kondisi fisik awal (OK -> Belum Diperiksa)
-- Database: dba_dev_pos | Schema: sch_fleet
-- Tanggal: 22 Oktober 2026
-- ==============================================================================
--
-- Perubahan:
--   1. View sch_fleet.v_spk_pos_service: 4 field cek_* sebelumnya memakai
--      fallback 'OK' (baik di CASE ELSE maupun COALESCE). Akibatnya unit yang
--      belum diisi tbl_wo_check selalu tampil "OK" padahal belum diperiksa.
--      Fallback diubah menjadi 'Belum Diperiksa'.
--   2. View dipertahankan apa adanya selain fallback tersebut, dengan cara
--      membaca definisi view terkini (pg_get_viewdef) lalu mengganti literal
--      'OK'::text saja. Ini mencegah perbaikan waktu_check_out / lead_time_jam
--      yang sudah ada ikut ter-revert.
--   3. waktu_check_in memakai kg.waktu_masuk AT TIME ZONE 'Asia/Jakarta'
--      agar tidak tampil sebagai UTC (sama seperti waktu_check_out).
--
-- Catatan: endpoint customer /kim3/kunjungan-service didaftarkan terpisah di
--          database data_setting_sync (lihat 20261022_kunjungan_service_endpoint.sql).
-- ==============================================================================

DO $do$
DECLARE
  v text;
BEGIN
  SELECT pg_get_viewdef('sch_fleet.v_spk_pos_service'::regclass, true) INTO v;

  -- Ganti hanya literal 'OK'::text (8 kemunculan: 4x CASE ELSE + 4x COALESCE).
  v := replace(
    v,
    quote_literal('OK') || '::text',
    quote_literal('Belum Diperiksa') || '::text'
  );

  EXECUTE 'CREATE OR REPLACE VIEW sch_fleet.v_spk_pos_service AS ' || v;
END
$do$;

-- ----------------------------------------------------------------------------
-- 3. Samakan zona waktu waktu_check_in dengan waktu_check_out.
--    Sebelumnya kg.waktu_masuk (timestamptz) di-cast langsung ke timestamp
--    tanpa time zone sehingga tampil sebagai UTC (mis. 03:23, bukan 10:23 WIB).
--    wo.timein sudah berupa timestamp lokal, jadi hanya kg.waktu_masuk yang
--    dikonversi ke Asia/Jakarta.
-- ----------------------------------------------------------------------------
DO $do$
DECLARE
  v text;
BEGIN
  SELECT pg_get_viewdef('sch_fleet.v_spk_pos_service'::regclass, true) INTO v;

  v := replace(
    v,
    $old$COALESCE(kg.waktu_masuk, wo.timein::timestamp with time zone)::timestamp without time zone AS waktu_check_in$old$,
    $new$(CASE WHEN kg.waktu_masuk IS NOT NULL THEN (kg.waktu_masuk AT TIME ZONE 'Asia/Jakarta'::text) ELSE wo.timein END) AS waktu_check_in$new$
  );

  EXECUTE 'CREATE OR REPLACE VIEW sch_fleet.v_spk_pos_service AS ' || v;
END
$do$;
