-- Update GET /kim3/booking
UPDATE sch_sync.api_endpoints
SET sql_query = $$SELECT 
    b.id,
    b.no_booking,
    b.id_pelanggan,
    u.nama_lengkap AS nama_perusahaan,
    u.nama_lengkap,
    u.nama_pic,
    b.no_polisi,
    b.jenis_layanan,
    b.tanggal_booking,
    b.jam_booking,
    b.tanggal_booking_awal,
    b.jam_booking_awal,
    b.reschedule_date,
    b.memo_pos,
    b.status_pos,
    b.keluhan,
    b.catatan,
    b.status,
    b.is_confirmed,
    b.can_cancel,
    b.prioritas,
    b.kode_cabang,
    b.nama_cabang,
    b.is_canceled,
    b.cancelat,
    b.cancelby,
    b.created_at
FROM sch_fleet.v_fleet_booking_service b
LEFT JOIN sch_fleet.pengguna u ON b.id_pelanggan = u.id
WHERE (:sys_role != 'Customer_Fleet' OR b.id_pelanggan = CAST(NULLIF(:sys_user, '') AS integer))
ORDER BY b.tanggal_booking DESC, b.jam_booking ASC;$$
WHERE endpoint_path = '/kim3/booking' AND method = 'GET';

-- Update GET /kim3/security/booking-list
UPDATE sch_sync.api_endpoints
SET sql_query = $$SELECT 
  b.id AS booking_id,
  b.no_booking,
  b.no_polisi,
  b.jenis_layanan,
  TO_CHAR(b.tanggal_booking, 'YYYY-MM-DD') AS tanggal_booking,
  b.jam_booking,
  b.tanggal_booking_awal,
  b.jam_booking_awal,
  b.reschedule_date,
  b.memo_pos,
  b.status_pos,
  b.keluhan,
  b.catatan,
  b.status,
  b.is_confirmed,
  b.can_cancel,
  b.kode_cabang,
  b.nama_cabang,
  COALESCE(p.nama_perusahaan, p.nama_lengkap, 'Pelanggan Umum') AS nama_pelanggan,
  COALESCE(p.nama_pic, p.nama_lengkap, '') AS nama_pic,
  COALESCE(p.no_telepon, '') AS no_telepon,
  COALESCE(f.foto_data, '') AS foto_kendaraan,
  u.merk,
  u.model,
  u.type AS tipe,
  u.year AS tahun,
  EXISTS (
    SELECT 1 FROM sch_fleet.kunjungan_gerbang kg
    WHERE kg.booking_id = b.id AND kg.status_gerbang = 'DI_DALAM'
  ) AS sudah_checkin
FROM sch_fleet.v_fleet_booking_service b
LEFT JOIN sch_fleet.pengguna p ON p.id = b.id_pelanggan
LEFT JOIN sch_fleet.v_pos_tbl_member_unit u ON REPLACE(UPPER(u.policeno), ' ', '') = REPLACE(UPPER(b.no_polisi), ' ', '')
LEFT JOIN sch_fleet.foto f ON f.kategori = 'KENDARAAN' AND f.referensi_id = REPLACE(UPPER(b.no_polisi), ' ', '')
WHERE COALESCE(b.is_canceled, false) = false
  AND b.is_confirmed = true
  AND (
    :tanggal IS NULL OR :tanggal = '' OR b.tanggal_booking = :tanggal::date
  )
  AND (
    :search IS NULL OR :search = ''
    OR UPPER(b.no_polisi) LIKE '%' || UPPER(TRIM(:search)) || '%'
    OR UPPER(b.no_booking) LIKE '%' || UPPER(TRIM(:search)) || '%'
    OR UPPER(p.nama_lengkap) LIKE '%' || UPPER(TRIM(:search)) || '%'
  )
ORDER BY b.tanggal_booking ASC, b.jam_booking ASC;$$
WHERE endpoint_path = '/kim3/security/booking-list' AND method = 'GET';
