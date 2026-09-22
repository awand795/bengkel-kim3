export type PeranUser = 
  | 'SA' 
  | 'Foreman' 
  | 'Mekanik' 
  | 'Admin Purchasing' 
  | 'Admin Invoice' 
  | 'Security' 
  | 'Customer Fleet'
  | 'Warehouse';

export interface Pengguna {
  id: number;
  username: string;
  nama_lengkap: string;
  peran: PeranUser;
  no_telepon?: string;
  email?: string;
  status_aktif: boolean;
}

export interface Pelanggan {
  id: number;
  nama_perusahaan: string;
  npwp?: string;
  alamat?: string;
  no_telepon?: string;
  email?: string;
  pic_nama?: string;
  pic_telepon?: string;
  pic_jabatan?: string;
  pic_email?: string;
  created_at: string;
}

export interface Kendaraan {
  id: number;
  no_polisi: string;
  id_pelanggan?: number;
  nama_perusahaan?: string;
  nama_pemilik?: string;
  jenis_armada: 'Truk' | 'Mobil' | 'Pickup' | 'Lainnya';
  merk: string;
  model: string;
  tahun?: number;
  no_rangka?: string;
  no_mesin?: string;
  asuransi?: string;
  masa_berlaku_asuransi?: string;
  status_aktif: boolean;
  foto_kendaraan?: string;
}

export interface DokumenKendaraan {
  id: number;
  no_polisi: string;
  id_pelanggan?: number;
  nama_perusahaan?: string;
  nama_dokumen: string;
  jenis_dokumen: 'STNK' | 'BPKB' | 'Asuransi' | 'KIR' | 'Invoice' | 'Faktur' | 'Lainnya';
  file_url: string;
  tanggal_upload: string;
  masa_berlaku?: string;
  keterangan?: string;
}

export interface BookingService {
  id: number;
  no_booking: string;
  id_pelanggan?: number;
  nama_perusahaan?: string;
  no_polisi: string;
  jenis_layanan: string;
  tanggal_booking: string;
  jam_booking: string;
  keluhan?: string;
  catatan?: string;
  status: 'Booked' | 'Check In' | 'Dibatalkan';
  prioritas: 'Normal' | 'Prioritas Booking';
  created_at: string;
}

export interface AntrianKunjungan {
  id: number;
  no_tiket: string;
  no_polisi: string;
  nama_customer?: string;
  no_hp_customer?: string;
  jenis_armada?: string;
  tujuan_kedatangan: 'Service' | 'Beli Part' | 'Kunjungan' | 'Lainnya';
  pic_tujuan?: string;
  keperluan?: string;
  waktu_masuk: string;
  waktu_keluar?: string;
  status_kunjungan: 'Check In' | 'Sedang Dikerjakan' | 'Menunggu Part' | 'Menunggu QC' | 'Selesai' | 'Keluar';
  barang_dibawa_keluar?: boolean;
  detail_barang_keluar?: string;
  foto_kendaraan_masuk?: string;
  foto_kendaraan_keluar?: string;
  foto_barang?: string;
  no_memo_keluar?: string;
  catatan_security?: string;
  id_booking?: number;
}

export interface SpkService {
  id: number;
  no_spk: string;
  id_antrian?: number;
  id_booking?: number;
  no_polisi: string;
  nama_customer?: string;
  odometer_km: number;
  foto_odometer?: string;
  keluhan_customer?: string;
  cek_body?: string;
  cek_mesin?: string;
  cek_kelistrikan?: string;
  cek_kaki_kaki?: string;
  catatan_kondisi_awal?: string;
  nama_sa: string;
  nama_foreman?: string;
  nama_mekanik?: string;
  status_spk: 
    | 'Check In'
    | 'Menunggu Pengecekan Mekanik'
    | 'Pengecekan Mekanik'
    | 'Estimasi Dibuat'
    | 'Menunggu Approval Customer'
    | 'Waiting Part'
    | 'Dalam Pengerjaan'
    | 'Pending'
    | 'Waiting QC'
    | 'QC Passed'
    | 'FIR Closed'
    | 'Selesai';
  estimasi_biaya: number;
  estimasi_waktu_jam: number;
  waktu_check_in?: string;
  waktu_mulai_pekerjaan?: string;
  waktu_selesai_pekerjaan?: string;
  waktu_waiting_part?: string;
  waktu_part_ready?: string;
  waktu_qc?: string;
  waktu_fir_closed?: string;
  waktu_check_out?: string;
  lead_time_jam?: number;
  catatan_sa?: string;
  catatan_foreman?: string;
  created_at: string;
}

export interface SpkItemPekerjaan {
  id: number;
  id_spk: number;
  nama_pekerjaan: string;
  kategori?: string;
  estimasi_durasi_jam: number;
  biaya_jasa: number;
  nama_mekanik?: string;
  status_pekerjaan: 'Menunggu' | 'Dikerjakan' | 'Selesai';
  waktu_mulai?: string;
  waktu_selesai?: string;
}

export interface SpkItemPart {
  id: number;
  id_spk: number;
  kode_part?: string;
  nama_part: string;
  jumlah: number;
  satuan: string;
  harga_satuan: number;
  subtotal: number;
  status_ketersediaan: 'Ready di Stock' | 'Tidak Ready di Stock';
  status_part?: 'Draft' | 'PR Diajukan' | 'PO Dibuat' | 'Menunggu Barang Datang' | 'Barang Ready' | 'Diambil Mekanik';
  estimasi_barang_ready_eta?: string;
  id_pr?: number;
}

export interface StokSparepart {
  id: number;
  kode_part: string;
  nama_part: string;
  kategori: string;
  stok: number;
  satuan: string;
  harga_jual: number;
  harga_beli: number;
  lokasi_rak?: string;
}

export interface PurchaseRequestPart {
  pr_id: number;
  no_pr: string;
  id_spk: number;
  no_spk?: string;
  no_polisi?: string;
  nama_customer?: string;
  nama_sa_pemohon: string;
  tanggal_pr: string;
  status_pr: 'Diajukan' | 'Diproses Purchasing' | 'PO Diterbitkan' | 'Barang Ready' | 'Ditolak';
  catatan_pr?: string;
  po_id?: number;
  no_po?: string;
  nama_admin_purchasing?: string;
  vendor_1_nama?: string;
  vendor_1_harga?: number;
  vendor_2_nama?: string;
  vendor_2_harga?: number;
  vendor_terpilih?: string;
  harga_kesepakatan?: number;
  estimasi_tanggal_ready_eta?: string;
  estimasi_jam_ready_eta?: string;
  status_konfirmasi_sa?: 'Menunggu Konfirmasi' | 'Disetujui SA' | 'Ditolak SA';
  catatan_purchasing?: string;
}

export interface PekerjaanTambahan {
  id: number;
  id_spk: number;
  no_spk?: string;
  no_polisi?: string;
  deskripsi_tambahan: string;
  rekomendasi_perbaikan?: string;
  estimasi_biaya_tambahan: number;
  estimasi_waktu_tambahan_jam: number;
  diajukan_oleh_mekanik?: string;
  diverifikasi_foreman?: string;
  status_approval_customer: 'Menunggu Approval' | 'Disetujui' | 'Ditolak';
  waktu_approval?: string;
  catatan?: string;
}

export interface LaporanInspeksiQC {
  id: number;
  no_fir: string;
  id_spk: number;
  nama_foreman: string;
  pekerjaan_sesuai_wo: boolean;
  fungsi_normal: boolean;
  bebas_kebocoran: boolean;
  test_jalan: boolean;
  kebersihan: boolean;
  catatan_foreman?: string;
  status_qc: 'QC Passed' | 'Perlu Perbaikan';
  nama_sa_final_check?: string;
  catatan_sa?: string;
  tanggal_qc?: string;
  tanggal_fir_closed?: string;
}

export interface TransaksiBeliPart {
  id: number;
  no_transaksi: string;
  id_antrian?: number;
  nama_customer: string;
  no_polisi: string;
  no_telepon?: string;
  no_picking_request?: string;
  status_transaksi: 
    | 'Draft'
    | 'Menunggu Approval'
    | 'Estimasi Disetujui'
    | 'Picking Warehouse'
    | 'Barang Siap Diambil'
    | 'Barang Diserahkan'
    | 'Menunggu Pembayaran'
    | 'Selesai';
  subtotal: number;
  ppn_11: number;
  total_biaya: number;
  lokasi_rak?: string;
  foto_penyerahan?: string;
  catatan?: string;
  created_at: string;
}

export interface InvoicePembayaran {
  id: number;
  no_invoice: string;
  id_spk?: number;
  id_transaksi_beli_part?: number;
  id_pelanggan?: number;
  no_polisi: string;
  nama_customer?: string;
  tanggal_invoice: string;
  subtotal: number;
  ppn_nominal: number;
  diskon: number;
  grand_total: number;
  metode_pembayaran: 'Cash' | 'Transfer Bank' | 'QRIS' | 'EDC';
  status_pembayaran: 'Unpaid' | 'Paid' | 'Batal';
  tanggal_bayar?: string;
  kasir_pic?: string;
  bukti_pembayaran?: string;
}

export interface MemoKeluar {
  id: number;
  no_memo: string;
  id_antrian?: number;
  id_spk?: number;
  id_transaksi_beli_part?: number;
  no_polisi: string;
  jenis_armada?: string;
  nama_customer?: string;
  tujuan_kedatangan?: string;
  waktu_keluar: string;
  status: string;
  foto_keluar?: string;
  catatan?: string;
  petugas_security?: string;
}

export interface DashboardSummary {
  total_on_progress: number;
  sedang_dikerjakan: number;
  menunggu_part_approval: number;
  menunggu_qc: number;
  total_selesai: number;
  booking_hari_ini: number;
  pr_pending_purchasing: number;
}
