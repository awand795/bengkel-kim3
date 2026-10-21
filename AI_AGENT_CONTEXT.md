# AI AGENT CONTEXT & HANDOFF GUIDE
## Sistem Operasional Bengkel KIM 3 (Web Fleet Customer & Security Gate Portal)

Dokumen ini adalah panduan lengkap (*single source of truth*) yang disusun agar AI agent atau engineer mana pun dapat langsung memahami arsitektur, mengakses SSH server, mengedit API di API Builder, menjalankan query database, serta melanjutkan pengembangan fitur tanpa hambatan.

---

## 1. Ringkasan Eksekutif Proyek

- **Nama Aplikasi**: Bengkel KIM 3 (Master Truck)
- **Repositori Git**: `https://github.com/awand795/bengkel-kim3.git` (Branch: `main`)
- **Teknologi Frontend**: React 18, Vite 5, TypeScript, Tailwind CSS v4, Zustand, TanStack React Query v5, Axios, Lucide React
- **Port Lokal Vite**: `http://localhost:3000` (Proxy `/api` ➔ `http://94.237.69.119:8081`)
- **Dua Portal Utama**:
  1. **Web Fleet Customer**: Dashboard monitoring armada, live SPK tracking milestone, persetujuan estimasi & pekerjaan tambahan, cetak faktur/invoice resmi POS, reservasi jadwal booking, manajemen armada & dokumen legalitas.
  2. **Security Gate Portal**: Pos Gerbang Utama KIM 3, pencatatan check-in armada (tamu/servis), monitoring armada di dalam bengkel (*On Progress*), eksekusi *Check Out* saat servis selesai, penerbitan Gate Pass digital (*Memo Keluar*), serta arsip riwayat keluar.

---

## 2. Kredensial Server & Akses SSH

### A. Akses SSH ke Server API Builder
- **Server IP**: `94.237.69.119`
- **SSH Port**: `8822` *(Catatan: port non-standar, wajib sertakan `-p 8822`)*
- **User**: `awanda`
- **Private Key**: `C:\Users\awand\Downloads\awanda.pem`
- **Perintah SSH Terminal**:
  ```bash
  ssh -i "C:\Users\awand\Downloads\awanda.pem" -p 8822 -o StrictHostKeyChecking=no awanda@94.237.69.119
  ```

### B. Database Konfigurasi API Builder (`data_setting_sync`)
- **Lokasi**: Di dalam server `94.237.69.119` (Localhost)
- **Host**: `127.0.0.1`
- **Port**: `8832`
- **Database**: `data_setting_sync`
- **User**: `postgres`
- **Password**: `postgre!PowerData@202608`
- **Tabel Konfigurasi Endpoint**: `sch_sync.api_endpoints`
- **ID Koneksi Database POS Bengkel**: `1790050800000`

### C. Database Operasional Bengkel & Web Fleet (`dba_dev_pos`)
- **Host Eksternal**: `122.248.253.73`
- **Port**: `8832`
- **Database**: `dba_dev_pos`
- **User**: `postgres`
- **Password**: `techRiderDevelop`
- **Schema Terkait**:
  - `sch_pos` — Data operasional bengkel riil (Work Order, POS Kasir, Mekanik, Suku Cadang).
  - `sch_fleet` — Data Web Fleet Customer & Pos Security (Kendaraan, Dokumen, SPK Views, Kunjungan Gerbang, Memo Keluar).

---

## 3. Cara Mengakses & Mengedit API di API Builder Server

API backend pada aplikasi ini menggunakan **API Builder dinamis** yang membaca routing dan query SQL langsung dari tabel `sch_sync.api_endpoints`. Perubahan query SQL bersifat **langsung aktif (*instant hot-reload*) tanpa perlu me-restart service backend**.

### Struktur Tabel `sch_sync.api_endpoints`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `id` | `bigint` / serial | ID unik endpoint |
| `connection_id` | `bigint` | Gunakan `1790050800000` (merujuk ke DB `dba_dev_pos`) |
| `endpoint_path` | `varchar` | Path URL, contoh: `/kim3/security/siap-checkout` |
| `http_method` | `varchar` | `GET`, `POST`, `PUT`, `DELETE` |
| `sql_query` | `text` | Query SQL Postgres yang dieksekusi saat endpoint dipanggil |
| `execution_mode` | `varchar` | `HYBRID` (mendukung filter & pagination otomatis), `SINGLE`, atau `TRANSACTION` |
| `is_active` | `boolean` | `true` |

### Parameter SQL pada API Builder
- Gunakan format `:nama_parameter` untuk parameter dinamis (query params atau body JSON).
- Contoh penanganan parameter opsional:
  ```sql
  WHERE (:no_polisi IS NULL OR no_polisi = :no_polisi OR :no_polisi = '')
  ```

### Contoh Perintah Praktis Mengedit API via SSH

#### 1. Menampilkan Daftar Endpoint yang Sudah Terdaftar
```bash
ssh -i "C:\Users\awand\Downloads\awanda.pem" -p 8822 -o StrictHostKeyChecking=no awanda@94.237.69.119 "PGPASSWORD='postgre!PowerData@202608' psql -h 127.0.0.1 -p 8832 -U postgres -d data_setting_sync -c \"
SELECT id, endpoint_path, http_method, execution_mode FROM sch_sync.api_endpoints WHERE endpoint_path LIKE '/kim3%' ORDER BY endpoint_path;
\""
```

#### 2. Memeriksa Query SQL dari Suatu Endpoint
```bash
ssh -i "C:\Users\awand\Downloads\awanda.pem" -p 8822 -o StrictHostKeyChecking=no awanda@94.237.69.119 "PGPASSWORD='postgre!PowerData@202608' psql -h 127.0.0.1 -p 8832 -U postgres -d data_setting_sync -c \"
SELECT endpoint_path, sql_query FROM sch_sync.api_endpoints WHERE endpoint_path = '/kim3/security/on-progress';
\""
```

#### 3. Mendaftarkan Endpoint Baru
```bash
ssh -i "C:\Users\awand\Downloads\awanda.pem" -p 8822 -o StrictHostKeyChecking=no awanda@94.237.69.119 "PGPASSWORD='postgre!PowerData@202608' psql -h 127.0.0.1 -p 8832 -U postgres -d data_setting_sync -c \"
INSERT INTO sch_sync.api_endpoints (connection_id, endpoint_path, http_method, sql_query, execution_mode, is_active)
VALUES (
  1790050800000,
  '/kim3/contoh/endpoint',
  'GET',
  'SELECT * FROM sch_fleet.kunjungan_gerbang WHERE (:status IS NULL OR status_gerbang = :status) ORDER BY id DESC',
  'HYBRID',
  true
);
\""
```

#### 4. Memperbarui Query SQL Endpoint yang Sudah Ada
```bash
ssh -i "C:\Users\awand\Downloads\awanda.pem" -p 8822 -o StrictHostKeyChecking=no awanda@94.237.69.119 "PGPASSWORD='postgre!PowerData@202608' psql -h 127.0.0.1 -p 8832 -U postgres -d data_setting_sync -c \"
UPDATE sch_sync.api_endpoints
SET sql_query = 'SELECT * FROM sch_fleet.v_spk_pos_service ORDER BY id DESC'
WHERE endpoint_path = '/kim3/spk' AND http_method = 'GET';
\""
```

#### 5. Menguji Endpoint via `curl`
```bash
curl -H "x-api-key: KIM3-SECURE-TOKEN-2026-X998A7B6C" "http://94.237.69.119:8081/api/data/kim3/security/on-progress?limit=3"
```

---

## 4. Eksekusi SQL Langsung ke Database `dba_dev_pos`

Jika Anda perlu membuat tabel baru, view cross-schema, atau indeks pada database operasional:

```bash
# Akses psql langsung ke DB dba_dev_pos
PGPASSWORD='techRiderDevelop' psql -h 122.248.253.73 -p 8832 -U postgres -d dba_dev_pos -c "
SELECT count(*) FROM sch_fleet.kunjungan_gerbang;
"
```

### Tabel & View Utama di `sch_fleet`:
- `sch_fleet.kunjungan_gerbang`: Log fisik gerbang (tiket, nopol, driver, status `DI_DALAM` / `SELESAI_KELUAR`).
- `sch_fleet.memo_keluar`: Gate pass digital (nomor memo `MK-YYMMDD-XXXX`, KM keluar, security, foto/ttd).
- `sch_fleet.booking_service`: Pemesanan jadwal servis oleh customer.
- `sch_fleet.v_spk_pos_service`: Header SPK, status alur pengerjaan, milestone waktu pengerjaan s/d invoice POS.
- `sch_fleet.v_spk_pos_item_pekerjaan`: Rincian jasa pekerjaan mekanik per SPK.
- `sch_fleet.v_spk_pos_item_part`: Rincian suku cadang per SPK.
- `sch_fleet.v_pos_employee`: Master data karyawan/teknisi dari POS.
- `sch_fleet.v_kendaraan_lookup`: Pencarian cepat data unit, merk, tipe, nama pemilik.

---

## 5. Arsitektur Frontend & Aturan Pengembangan

### Struktur Folder Penting
- `src/api/client.ts`: Kumpulan fungsi axios pemanggil API ke backend.
- `src/store/useAppStore.ts`: Global state (Zustand) untuk session, user auth, role (`Customer Fleet` vs `Security`), tab aktif, dan tema tampilan.
- `src/views/WebFleetCustomerView.tsx`: Seluruh tampilan modul Customer Fleet.
- `src/views/SecurityPortalView.tsx`: Seluruh tampilan modul Pos Security Gerbang.
- `src/components/layout/`: Navigasi (`Sidebar.tsx`, `Navbar.tsx`, `MobileBottomNav.tsx`, `NotificationDropdown.tsx`).
- `src/components/security/`: Modal gerbang (`SecurityCheckOutModal.tsx`, `DigitalMemoKeluarModal.tsx`).
- `src/services/realtimeService.ts`: Engine realtime (SSE, differential streaming, audio chime Web Audio API).

### Aturan SOP Alur Bisnis
1. **Pemisahan On Progress vs Check Out**:
   - Di tab **On Progress** (`security-onprogress`), tombol **"Detail"** membuka modal informasi status armada (*read-only*). **Dilarang** meletakkan tombol Check Out di sini.
   - Armada yang sudah selesai diservis otomatis berpindah ke tab **Check Out** (`security-checkout`). Di tab inilah Security dapat mengeksekusi form check out.
2. **Kaidah Bahasa**:
   - Gunakan istilah baku **"Pengerjaan"** atau **"Proses Pengerjaan"** untuk tahapan/status aktivitas yang sedang berjalan (*bukan "Proses Pekerjaan"*).
   - Gunakan **"Daftar Pekerjaan"** untuk rincian item jasa/tugas perbaikan.
3. **Notifikasi & Toast**:
   - Data notifikasi lama dari database disimpan di dropdown lonceng 🔔.
   - Popup toast hanya boleh muncul **satu kali** untuk event baru yang terjadi secara live saat user online. Jangan memunculkan toast berulang untuk data lama saat login ulang (manfaatkan `bengkel_alerted_notif_ids` di `localStorage`).

---

## 6. Verifikasi Build & Pengujian

Sebelum melakukan commit dan push ke repositori GitHub:
```bash
# 1. Pastikan build TypeScript & Vite bersih dari error
npm run build

# 2. Periksa status git
git status

# 3. Commit dan push ke branch main
git add .
git commit -m "feat/fix(...): deskripsi perubahan"
git push origin main
```

---
*Dokumen ini diperbarui secara berkala dan siap digunakan sebagai panduan serah terima mandiri bagi AI Agent berikutnya.*
