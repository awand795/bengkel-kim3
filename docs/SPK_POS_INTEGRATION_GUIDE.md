# Panduan Integrasi Data Riwayat Service & SPK (sch_pos ➔ sch_fleet)

Dokumen ini disusun sebagai panduan teknis dan instruksi serah terima (*handover*) untuk agent atau developer berikutnya. Tujuannya adalah mempermudah transisi data dari **data dummy demo** ke **data riil live dari `sch_pos`** setelah demo selesai.

---

## 1. Ringkasan Status Saat Ini

- **Status Demo (Hari Rabu)**: 
  Aplikasi frontend saat ini membaca endpoint API `/kim3/spk` yang merujuk ke view dummy `sch_fleet.spk_service` agar data presentasi (misal: SPK `SPK-260928-3978`, nopol `BK 3737 RR`) tetap stabil dan tidak terganggu.
- **Persiapan Data Riil (Sudah Selesai Dibuat)**: 
  Telah dibuat 3 view cross-schema baru di schema `sch_fleet` pada database `dba_dev_pos` yang mengambil seluruh data dinamis, timeline, dan rincian transaksi langsung dari schema `sch_pos`.

---

## 2. Informasi Koneksi Database & Server

### A. Database POS Bengkel (`dba_dev_pos`)
- **Host**: `122.248.253.73`
- **Port**: `8832`
- **Database**: `dba_dev_pos`
- **User**: `postgres`
- **Password**: `techRiderDevelop`
- **Schema Terkait**: `sch_pos` (data operasional bengkel) & `sch_fleet` (data web fleet)

### B. Server API Builder / Sync (`data_setting_sync`)
- **Server IP**: `94.237.69.119` (SSH Port: `8822`, User: `awanda`, Key: `C:\Users\awand\Downloads\awanda.pem`)
- **Database Setting**: `127.0.0.1:8832` (`data_setting_sync`)
- **User / Password**: `postgres` / `postgre!PowerData@202608`
- **Tabel Konfigurasi Endpoint**: `sch_sync.api_endpoints`
- **ID Koneksi ke DEV-POS**: `1790050800000`

---

## 3. Daftar View yang Tersedia di `sch_fleet`

Semua view di bawah ini sudah aktif dan teruji di database `dba_dev_pos`:

| Nama View | Jumlah Data Riil | Fungsi Utama |
| :--- | :--- | :--- |
| **`sch_fleet.v_spk_pos_service`** | 612 record | Header SPK, status alur pengerjaan, milestone waktu (Check In s/d Check Out), odometer, cek fisik, invoice kasir, dan foto kendaraan. |
| **`sch_fleet.v_spk_pos_item_pekerjaan`** | 675 record | Rincian jasa pekerjaan mekanik per Work Order (`typecode = 'S'`). |
| **`sch_fleet.v_spk_pos_item_part`** | 662 record | Rincian suku cadang / part yang dipasang per Work Order (`typecode = 'P'`). |

---

## 4. Pemetaan Kolom dari `sch_pos` ke View

| Field di View | Sumber Tabel di `sch_pos` | Deskripsi / Logika |
| :--- | :--- | :--- |
| `id` | `sch_pos.tbl_wo.id` | ID unik Work Order |
| `no_spk` | `COALESCE(rs.logisticnotransspk, wo.wono)` | Nomor SPK Logistik atau nomor WO |
| `no_wo` | `wo.wono` | Nomor asli Work Order di bengkel |
| `no_polisi` | `mu.policeno` (`tbl_member_unit`) | Nomor plat kendaraan |
| `nama_customer` | `m.membername` (`tbl_member`) | Nama perusahaan / entitas pemilik unit |
| `id_pelanggan` | `m.member_fleet_id` (`tbl_member`) | ID login pengguna di Web Fleet Customer |
| `odometer_km` | `wo.vehicle_km` | KM kendaraan saat masuk bengkel |
| `keluhan_customer` | `COALESCE(wo.jobtype, rs.jobtype)` | Jenis pekerjaan / keluhan awal |
| `nama_sa` | `sa.employeename` (`tbl_employee`) | Nama Service Advisor bertugas |
| `nama_mekanik` | `mek.employeename` (`tbl_employee`) | Nama teknisi/mekanik utama |
| `status_spk` | Logika CASE dinamis | `Check In` ➔ `Proses Pekerjaan` ➔ `Selesai Dikerjakan` ➔ `QC Passed` ➔ `Selesai` |
| `waktu_check_in` | `wo.timein` | Jam kendaraan tiba / diterima |
| `waktu_mulai_pekerjaan`| `wo.servicestartat` | Jam teknisi mulai bekerja |
| `waktu_selesai_pekerjaan`| `wo.servicefinishat` | Jam teknisi selesai bekerja |
| `waktu_qc` & `waktu_fir_closed` | `wo.testdrivedatefir` | Jam validasi Quality Control / FIR |
| `waktu_invoice` | `(p.transdate + p.transtime)` | Jam transaksi kasir di `tbl_pos` |
| `waktu_check_out` | `COALESCE(p.finish_date, transdate+time)` | Jam kendaraan keluar bengkel |
| `lead_time_jam` | Dihitung otomatis | Durasi total kendaraan di bengkel (jam) |
| `cek_body` s/d `cek_kaki_kaki` | `sch_pos.tbl_wo_check` | Kondisi fisik kendaraan (OK / Perlu Perhatian / Rusak) |
| `no_invoice` & `total_invoice` | `p.transno` & `p.total` (`tbl_pos`) | Nomor dan total nominal faktur pembayaran |
| `foto_kendaraan` | `sch_fleet.foto` | Foto fisik kendaraan berdasarkan no. polisi |

---

## 5. Instruksi Langkah Demi Langkah untuk Agent Berikutnya (Aktivasi Live)

Jika user meminta: *"Aktifkan data riil dari sch_pos"* atau *"Ganti data dummy SPK ke view riil"*, jalankan langkah berikut:

### Langkah 1: Update Endpoint API Builder di Server
Jalankan perintah SSH untuk memperbarui SQL query endpoint `/kim3/spk` di tabel `sch_sync.api_endpoints`:

```bash
ssh -i "C:\Users\awand\Downloads\awanda.pem" -p 8822 -o StrictHostKeyChecking=no awanda@94.237.69.119 "PGPASSWORD='postgre!PowerData@202608' psql -h 127.0.0.1 -p 8832 -U postgres -d data_setting_sync -c \"
UPDATE sch_sync.api_endpoints
SET sql_query = 'SELECT * FROM sch_fleet.v_spk_pos_service WHERE (:id_pelanggan IS NULL OR id_pelanggan = CAST(:id_pelanggan AS integer) OR :id_pelanggan = \'\'\'\') ORDER BY id DESC'
WHERE endpoint_path = '/kim3/spk';
\""
```

### Langkah 2: Verifikasi Respon API
Lakukan pengujian pemanggilan data melalui curl atau endpoint lokal:
```bash
curl -H "x-api-key: KIM3-SECURE-TOKEN-2026-X998A7B6C" "http://94.237.69.119:8081/api/data/kim3/spk?limit=5"
```
Pastikan kolom-kolom `no_spk`, `no_polisi`, `status_spk`, `waktu_check_in`, `no_invoice` tampil dengan data riil dari `sch_pos`.

### Langkah 3: Rollback ke Dummy (Jika Dibutuhkan Kembali)
Jika sewaktu-waktu perlu kembali ke data dummy demo:
```bash
ssh -i "C:\Users\awand\Downloads\awanda.pem" -p 8822 -o StrictHostKeyChecking=no awanda@94.237.69.119 "PGPASSWORD='postgre!PowerData@202608' psql -h 127.0.0.1 -p 8832 -U postgres -d data_setting_sync -c \"
UPDATE sch_sync.api_endpoints
SET sql_query = 'SELECT s.*, fk.foto_data AS foto_kendaraan FROM sch_fleet.spk_service s LEFT JOIN sch_fleet.foto fk ON fk.kategori = \'\'\'\'KENDARAAN\'\'\'\' AND fk.referensi_id = REPLACE(UPPER(s.no_polisi), \'\'\'\' \'\'\'\', \'\'\'\'\'\'\'\') WHERE (:id_pelanggan IS NULL OR s.id_pelanggan = CAST(:id_pelanggan AS integer) OR :id_pelanggan = \'\'\'\') ORDER BY s.id DESC'
WHERE endpoint_path = '/kim3/spk';
\""
```

---

## 6. Lokasi File SQL Terkait
- **Script Pembuatan View**: [`docs/sql/20261009_create_pos_spk_tracking_views.sql`](file:///D:/my-project/Project%20Backendless/Bengkel-Kim3/docs/sql/20261009_create_pos_spk_tracking_views.sql)
- **Komponen Frontend**: [`src/views/WebFleetCustomerView.tsx`](file:///D:/my-project/Project%20Backendless/Bengkel-Kim3/src/views/WebFleetCustomerView.tsx)
- **API Client**: [`src/api/client.ts`](file:///D:/my-project/Project%20Backendless/Bengkel-Kim3/src/api/client.ts)
