# AI AGENT CONTEXT & MULTI-PROJECT GUIDE (OPENCODE)
## Proyek: Web Fleet Customer Bengkel KIM 3 (Master Truck)

Selamat datang, AI Agent (OpenCode / Cursor / Claude). Dokumen ini memberikan pemahaman lengkap mengenai proyek ini serta proyek partner terkait (**Pos Security Gerbang**).

---

## 1. Identitas Proyek Ini: Web Fleet Customer (`Bengkel-Kim3`)
- **Direktori Kerja**: `D:\my-project\Project Backendless\Bengkel-Kim3` (atau folder aktif saat ini).
- **Port Lokal**: `http://localhost:3000`
- **Panduan Detail**: Buka dan baca [`./AI_AGENT_CONTEXT.md`](./AI_AGENT_CONTEXT.md).
- **Fungsi Utama**:
  - Monitoring armada truk customer & live milestone tracking SPK pengerjaan servis.
  - Persetujuan estimasi biaya & pekerjaan tambahan.
  - Cetak faktur/invoice resmi POS bengkel.
  - Reservasi jadwal booking servis oleh customer (`sch_fleet.booking_service`).
  - Portal Super Admin untuk manajemen akun & pengaturan situs.

---

## 2. Proyek Partner: Pos Security Gerbang (`Bengkel-Kim3-Security`)
> [!IMPORTANT]
> Proyek partner berada di folder tetangga: `../Bengkel-Kim3-Security` (Path absolut: `D:\my-project\Project Backendless\Bengkel-Kim3-Security`).
> **Anda memiliki izin penuh untuk membaca dan mengedit file di folder `../Bengkel-Kim3-Security` bila user meminta perubahan yang berkaitan dengan Pos Security.**

- **Port Lokal Security**: `http://localhost:3500`
- **Konteks Detail Security**: Buka file `../Bengkel-Kim3-Security/AI_AGENT_CONTEXT.md`.
- **Fungsi Utama Security**:
  - Pemeriksaan Check-In kendaraan (Kedatangan) berdasarkan Booking atau Walk-In.
  - Multi-camera dokumentasi 4 sudut fisik kendaraan yang tersimpan di `sch_pos.ms_foto`.
  - Monitoring kendaraan aktif di dalam bengkel (`waktu_check_out IS NULL`).
  - Pemeriksaan Check-Out kendaraan (hanya aktif jika invoice POS berstatus LUNAS).
  - Gate Pass Digital / Memo Keluar (`sch_fleet.memo_keluar`).
  - Autentikasi Staf Security via DarkoPOS API (`POST /api/v1/users/login`).
- **Remote Git Security**: `https://github.com/awand795/security-mastertruck.git`

---

## 3. Integrasi & Alur Data Antar Kedua Proyek

Kedua proyek berbagi database operasional yang sama (`dba_dev_pos` di `122.248.253.73:8832`) dan gateway API yang sama (`http://94.237.69.119:8081` dengan `X-Api-Key: KIM3-SECURE-TOKEN-2026-X998A7B6C`).

```
[CUSTOMER FLEET (Port 3000)]                    [POS SECURITY (Port 3500)]
         │                                                  │
1. Reservasi Booking (sch_fleet.booking_service)            │
         └─────────────────────────────────────────────────►│ 2. Deteksi nopol saat kedatangan
                                                            │    (Cek Booking Confirmed / Walk-In)
                                                            │    Ambil Foto 4 Sudut (sch_pos.ms_foto)
3. Live Monitoring Masuk ◄──────────────────────────────────┘ 4. Eksekusi Check-In (sch_pos.kunjungan_masuk)
   (via sch_fleet.v_kunjungan_gerbang & /kim3/kunjungan-service)
         │
5. Pengerjaan WO Mekanik & Kasir POS Melunasi Invoice
   (sch_pos.tbl_pos status 'Lunas')
         │
         └─────────────────────────────────────────────────►│ 6. Truk Masuk Daftar "Siap Checkout"
                                                            │    Security Eksekusi Check-Out
7. Status Selesai & Ditutup ◄───────────────────────────────┘ 8. Terbit Gate Pass (sch_fleet.memo_keluar)
   (waktu_check_out terisi)
```

---

## 4. Kredensial Server & Akses Cepat

- **SSH API Builder Server**:
  ```bash
  ssh -i "C:\Users\awand\Downloads\awanda.pem" -p 8822 -o StrictHostKeyChecking=no awanda@94.237.69.119
  ```
- **Database Setting Gateway (`data_setting_sync`)**:
  - `127.0.0.1:8832` | user: `postgres` | pass: `postgre!PowerData@202608` | Tabel: `sch_sync.api_endpoints`
- **Database Operasional (`dba_dev_pos`)**:
  - `122.248.253.73:8832` | user: `postgres` | pass: `techRiderDevelop` | Schemas: `sch_fleet`, `sch_pos`

---

## 5. Perintah Menjalankan Server Lintas Folder

```powershell
# Jalankan Web Fleet Customer (Port 3000):
npm run dev -- --port 3000

# Jalankan Security Gate Portal (Port 3500):
cd "../Bengkel-Kim3-Security"; npm run dev -- --port 3500
```

---

## 6. Pemisahan Environment (`main` Prod vs `develop` Dev) & Aturan Build/Deploy Docker

> [!CAUTION]
> **WAJIB DIIKUTI SETIAP KALI USER MEMINTA BUILD DOCKER, PUSH, DAN DEPLOY:**
> - **Selalu pastikan berada di branch `main` (Production)** sebelum menjalankan `docker build`, `docker push`, dan deploy ke `52.77.133.95:3000`.
> - **JANGAN PERNAH** build/deploy image production dari branch `develop`!

| Environment | Branch Git | Prefix Endpoint Frontend (`src/api/client.ts`) | `connection_id` API Builder (`sch_sync.api_endpoints`) | Database Target |
| :--- | :--- | :--- | :--- | :--- |
| **Production** | `main` | `/mastertruck/*` | `1789369839047` | `bengkeldarkopos` (Prod) |
| **Development** | `develop` | `/kim3/*` | `1790050800000` | `dba_dev_pos` (Dev) |

### Checklist Wajib Sebelum Build/Deploy & Sinkronisasi Backend
1. Pastikan branch aktif adalah `main` (`git branch --show-current` -> `main`) dan `src/api/client.ts` hanya memanggil `/mastertruck/*` (bukan `/kim3/*`).
2. Jika ada perubahan SQL/endpoint baru di API Builder (`sch_sync.api_endpoints`), pastikan query, `parameters`, `enable_pagination`, dan `security_mode` identik antara `/mastertruck/*` dan `/kim3/*`, tetapi `connection_id` tetap terpisah (`1789369839047` untuk `/mastertruck/*`, `1790050800000` untuk `/kim3/*`).
3. Perintah Build, Push & Deploy Production (`52.77.133.95:3000`):
   ```powershell
   npx tsc --noEmit
   docker build -t awandadarkotech/webfleet-mastertruck:latest .
   docker push awandadarkotech/webfleet-mastertruck:latest
   ssh -i "C:\Users\awand\Downloads\awanda.pem" -p 8822 -o StrictHostKeyChecking=no awanda@52.77.133.95 "docker pull awandadarkotech/webfleet-mastertruck:latest && docker stop webfleet-mastertruck || true && docker rm webfleet-mastertruck || true && docker run -d --name webfleet-mastertruck --restart unless-stopped -p 3000:80 awandadarkotech/webfleet-mastertruck:latest && sleep 2 && curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000"
   ```
