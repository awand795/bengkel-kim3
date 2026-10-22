-- ==============================================================================
-- Fix: pencocokan WO/invoice di endpoint Security
-- Database: data_setting_sync | Schema: sch_sync
-- Tanggal: 22 Oktober 2026
-- ==============================================================================
--
-- Masalah:
--   Endpoint Security masih mencocokkan SPK/WO ke kunjungan gerbang hanya
--   berdasarkan nopol, lalu mengambil WO terbaru (ORDER BY s.id DESC).
--   Akibatnya kunjungan aktif baru untuk nopol yang sama (mis. TG-261022-0004)
--   ikut memakai WO lama yang sudah lunas (WO-QA-20261022-01), sehingga:
--     - muncul di daftar Siap Checkout
--     - dihitung di total_siap_keluar dashboard
--     - lolos validasi invoice_paid saat check-out
--
-- Perbaikan:
--   Gunakan id_kunjungan dari sch_fleet.v_spk_pos_service sebagai kunci exact
--   antara tiket gerbang dan WO. ORDER BY s.id DESC LIMIT 1 tetap dipakai
--   sebagai pengaman bila ada lebih dari satu WO untuk tiket yang sama.
--
-- Catatan:
--   - Tidak ada perubahan frontend.
--   - Tidak memakai trigger; endpoint membaca view saat request.
-- ==============================================================================

BEGIN;

-- 1) Daftar siap checkout
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
  sql_query,
  $old$WHERE REPLACE(UPPER(s.no_polisi), ' ', '') = REPLACE(UPPER(a.no_polisi), ' ', '')$old$,
  $new$WHERE s.id_kunjungan = a.kunjungan_id$new$
)
WHERE endpoint_path = '/kim3/security/siap-checkout'
  AND method = 'GET';

-- 2) Daftar kendaraan di dalam / on progress
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
  sql_query,
  $old$WHERE REPLACE(UPPER(s.no_polisi), ' ', '') = REPLACE(UPPER(vk.no_polisi), ' ', '')$old$,
  $new$WHERE s.id_kunjungan = vk.id$new$
)
WHERE endpoint_path = '/kim3/security/on-progress'
  AND method = 'GET';

-- 3) Hitungan total siap keluar di dashboard Security
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
  sql_query,
  $old$WHERE REPLACE(UPPER(s.no_polisi), ' ', '') = REPLACE(UPPER(kg.no_polisi), ' ', '')$old$,
  $new$WHERE s.id_kunjungan = kg.id$new$
)
WHERE endpoint_path = '/kim3/security/dashboard'
  AND method = 'GET';

-- 4) Validasi invoice lunas sebelum check-out
UPDATE sch_sync.api_endpoints
SET sql_query = replace(
  sql_query,
  $old$WHERE REPLACE(UPPER(s.no_polisi), ' ', '') = REPLACE(UPPER(kg.no_polisi), ' ', '')$old$,
  $new$WHERE s.id_kunjungan = kg.id$new$
)
WHERE endpoint_path = '/kim3/security/check-out'
  AND method = 'POST';

COMMIT;
