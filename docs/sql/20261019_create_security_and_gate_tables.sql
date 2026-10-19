-- ==============================================================================
-- DDL & SEED: MODUL SECURITY & GERBANG BENGKEL MASTER TRUCK - KIM 3
-- Database: dba_dev_pos | Host: 122.248.253.73:8832 | Schema: sch_fleet
-- Tanggal: 19 Oktober 2026
-- Grouping API Builder: Dev - Web Fleet Customer Bengkel Kim3
-- ==============================================================================

-- 1. TABEL PENGGUNA SECURITY (KREDENSIAL INTERNAL POS GERBANG)
CREATE TABLE IF NOT EXISTS sch_fleet.security_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    no_telepon VARCHAR(30),
    pos_jaga VARCHAR(100) DEFAULT 'Pos Gerbang Utama',
    status_aktif BOOLEAN DEFAULT true,
    foto_profil TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    input_by VARCHAR(100) DEFAULT 'SISTEM',
    input_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    update_by VARCHAR(100),
    update_dt TIMESTAMP WITH TIME ZONE
);

-- Seed akun security pos gerbang default
-- Username: security.pos1 | Password: password123
INSERT INTO sch_fleet.security_user (
    username, password_hash, nama_lengkap, no_telepon, pos_jaga, status_aktif
) VALUES (
    'security.pos1',
    '$2b$10$sLoFonGhCoNDCZthsWA/yOC54MG5wjCXGp7NOY4im7sPgQZPPMN3y',
    'Security Gerbang Utama (Pos 1)',
    '081234567890',
    'Pos Gerbang Utama',
    true
) ON CONFLICT (username) DO NOTHING;


-- 2. TABEL KUNJUNGAN GERBANG (SERVICE, BELI PART, TAMU NON-SERVICE)
CREATE TABLE IF NOT EXISTS sch_fleet.kunjungan_gerbang (
    id SERIAL PRIMARY KEY,
    nomor_tiket VARCHAR(50) UNIQUE NOT NULL, -- Format TG-YYMMDD-XXXX
    tipe_kunjungan VARCHAR(30) NOT NULL,    -- 'SERVICE', 'BELI_PART', 'TAMU_NON_SERVICE'
    booking_id INTEGER REFERENCES sch_fleet.booking_service(id) ON DELETE SET NULL,
    no_polisi VARCHAR(20) NOT NULL,
    nama_pengemudi VARCHAR(100) NOT NULL,
    no_telepon_pengemudi VARCHAR(30),
    nama_perusahaan VARCHAR(150),
    tujuan_kunjungan TEXT,
    bertemu_dengan VARCHAR(100),
    pos_jaga VARCHAR(100) DEFAULT 'Pos Gerbang Utama',
    security_user_id INTEGER REFERENCES sch_fleet.security_user(id),
    waktu_masuk TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    waktu_keluar TIMESTAMP WITH TIME ZONE,
    status_gerbang VARCHAR(30) DEFAULT 'DI_DALAM', -- 'DI_DALAM', 'SELESAI_KELUAR', 'DIBATALKAN'
    foto_kendaraan_masuk TEXT,
    foto_kendaraan_keluar TEXT,
    catatan_masuk TEXT,
    catatan_keluar TEXT,
    input_by VARCHAR(100) DEFAULT 'SECURITY',
    input_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    update_by VARCHAR(100),
    update_dt TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_kunjungan_nopol ON sch_fleet.kunjungan_gerbang (no_polisi);
CREATE INDEX IF NOT EXISTS idx_kunjungan_status ON sch_fleet.kunjungan_gerbang (status_gerbang);
CREATE INDEX IF NOT EXISTS idx_kunjungan_masuk ON sch_fleet.kunjungan_gerbang (waktu_masuk);


-- 3. TABEL MEMO KELUAR (GATE PASS DIGITAL)
CREATE TABLE IF NOT EXISTS sch_fleet.memo_keluar (
    id SERIAL PRIMARY KEY,
    nomor_memo VARCHAR(50) UNIQUE NOT NULL, -- Format MK-YYMMDD-XXXX
    kunjungan_id INTEGER NOT NULL REFERENCES sch_fleet.kunjungan_gerbang(id) ON DELETE CASCADE,
    security_user_id INTEGER REFERENCES sch_fleet.security_user(id),
    ttd_security TEXT,                      -- Data URL signature security
    nama_security VARCHAR(100),
    keterangan_barang_keluar TEXT,
    foto_barang_keluar TEXT,
    foto_surat_jalan TEXT,
    status_pos_cleared BOOLEAN DEFAULT true, -- Flag kesiapan/status lunas POS
    catatan TEXT,
    tanggal_terbit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    input_by VARCHAR(100) DEFAULT 'SECURITY',
    input_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    update_by VARCHAR(100),
    update_dt TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_memo_kunjungan ON sch_fleet.memo_keluar (kunjungan_id);
CREATE INDEX IF NOT EXISTS idx_memo_tanggal ON sch_fleet.memo_keluar (tanggal_terbit);

-- ==============================================================================
-- DAFTAR ENDPOINT API BUILDER (Group: Dev - Web Fleet Customer Bengkel Kim3)
-- 1. POST /kim3/auth/login             -> Mendukung Customer Fleet & Staf Security
-- 2. GET  /kim3/auth/me                -> Return profil Customer Fleet / Staf Security
-- 3. GET  /kim3/security/dashboard     -> Statistik Dashboard Gerbang Security
-- 4. GET  /kim3/security/booking-list  -> Booking Service untuk "Pilih & Isi Otomatis"
-- 5. POST /kim3/security/check-in      -> Check-in Masuk Gerbang (Auto Tiket TG-XXXX)
-- 6. GET  /kim3/security/kunjungan     -> List Kunjungan Gerbang
-- 7. GET  /kim3/security/on-progress   -> Monitoring Kendaraan On Progress di Bengkel
-- 8. POST /kim3/security/check-out     -> Check-out Gerbang & Terbitkan Memo Keluar (MK-XXXX)
-- 9. GET  /kim3/security/memo-keluar   -> List Memo Keluar
-- 10. GET /kim3/security/memo-keluar-detail -> Detail Memo Keluar (Cetak/PDF)
-- 11. GET /kim3/security/riwayat-keluar     -> Riwayat Kendaraan Keluar (Filter Periode)
-- ==============================================================================
