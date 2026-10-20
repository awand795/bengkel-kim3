-- ============================================================================
-- Migrasi: Relasi Foto Kunjungan Gerbang ke sch_fleet.foto
-- Tanggal: 20 Oktober 2026
-- Deskripsi:
-- 1. Menambahkan kolom relasi foreign key foto_masuk_id dan foto_keluar_id
--    pada tabel sch_fleet.kunjungan_gerbang yang mereferensikan sch_fleet.foto(id).
-- 2. Membuat view relasional sch_fleet.v_kunjungan_gerbang untuk kemudahan
--    pembacaan data kunjungan beserta URL/Data foto dari sch_fleet.foto.
-- ============================================================================

-- 1. Tambah kolom foreign key ke sch_fleet.kunjungan_gerbang
ALTER TABLE sch_fleet.kunjungan_gerbang
  ADD COLUMN IF NOT EXISTS foto_masuk_id INTEGER REFERENCES sch_fleet.foto(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS foto_keluar_id INTEGER REFERENCES sch_fleet.foto(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kunjungan_gerbang_foto_masuk ON sch_fleet.kunjungan_gerbang(foto_masuk_id);
CREATE INDEX IF NOT EXISTS idx_kunjungan_gerbang_foto_keluar ON sch_fleet.kunjungan_gerbang(foto_keluar_id);

-- 2. Pastikan tabel sch_fleet.foto memiliki indeks pendukung untuk kategori & referensi_id
CREATE INDEX IF NOT EXISTS idx_foto_kategori_ref ON sch_fleet.foto(kategori, referensi_id);

-- 3. View Relasional sch_fleet.v_kunjungan_gerbang
CREATE OR REPLACE VIEW sch_fleet.v_kunjungan_gerbang AS
SELECT 
    kg.id,
    kg.nomor_tiket,
    kg.no_polisi,
    kg.nama_pengemudi,
    kg.no_telepon_pengemudi,
    kg.nama_perusahaan,
    kg.tipe_kunjungan,
    kg.tujuan_kunjungan,
    kg.bertemu_dengan,
    kg.booking_id,
    kg.waktu_masuk,
    kg.waktu_keluar,
    kg.pos_jaga,
    kg.status_kunjungan,
    kg.catatan_masuk,
    kg.catatan_keluar,
    kg.foto_masuk_id,
    kg.foto_keluar_id,
    -- Prioritaskan foto dari relasi sch_fleet.foto, fallback ke kolom legacy
    COALESCE(fm.foto_data, kg.foto_kendaraan_masuk) AS foto_kendaraan_masuk,
    COALESCE(fk.foto_data, kg.foto_kendaraan_keluar) AS foto_kendaraan_keluar,
    kg.memo_id,
    kg.created_at,
    kg.updated_at
FROM sch_fleet.kunjungan_gerbang kg
LEFT JOIN sch_fleet.foto fm 
    ON (kg.foto_masuk_id IS NOT NULL AND fm.id = kg.foto_masuk_id)
    OR (kg.foto_masuk_id IS NULL AND fm.kategori = 'CHECKIN' AND fm.referensi_id = kg.nomor_tiket)
LEFT JOIN sch_fleet.foto fk 
    ON (kg.foto_keluar_id IS NOT NULL AND fk.id = kg.foto_keluar_id)
    OR (kg.foto_keluar_id IS NULL AND fk.kategori = 'CHECKOUT' AND fk.referensi_id = kg.nomor_tiket);
