import axios from 'axios';
import {
  DashboardSummary,
  Pengguna,
  Pelanggan,
  Kendaraan,
  DokumenKendaraan,
  BookingService,
  AntrianKunjungan,
  SpkService,
  SpkItemPekerjaan,
  SpkItemPart,
  StokSparepart,
  PurchaseRequestPart,
  PekerjaanTambahan,
  TransaksiBeliPart,
  InvoicePembayaran,
  MemoKeluar
} from '../types';

// In Vite development, requests to /api are proxied to http://94.237.69.119:8081
// For standalone production builds or direct access, fallback to server IP
const API_BASE = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api/data`,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Storage upload client (already built into server backend)
export const uploadFileToStorage = async (file: File, bucket: 'foto_kendaraan' | 'foto_barang' | 'dokumen_armada' = 'foto_kendaraan'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);

  try {
    const res = await axios.post(`${API_BASE}/api/storage/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (res.data?.url) {
      return res.data.url;
    }
    if (res.data?.filename) {
      return `/api/storage/files/${bucket}/${res.data.filename}`;
    }
  } catch (err) {
    console.warn('Backend storage upload error, fallback to Base64 data URL:', err);
  }

  // Fallback: Convert to Base64 so photo can still be saved directly to DB
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const api = {
  // Dashboard
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get<DashboardSummary[]>('/bengkel/dashboard-summary');
    return res.data[0] || {
      total_on_progress: 0,
      sedang_dikerjakan: 0,
      menunggu_part_approval: 0,
      menunggu_qc: 0,
      total_selesai: 0,
      booking_hari_ini: 0,
      pr_pending_purchasing: 0,
    };
  },

  // Pengguna & Tim
  getPengguna: async (): Promise<Pengguna[]> => {
    const res = await apiClient.get<Pengguna[]>('/bengkel/pengguna');
    return res.data;
  },

  // Pelanggan
  getPelanggan: async (): Promise<Pelanggan[]> => {
    const res = await apiClient.get<Pelanggan[]>('/bengkel/pelanggan');
    return res.data;
  },

  // Kendaraan
  getKendaraan: async (): Promise<Kendaraan[]> => {
    const res = await apiClient.get<Kendaraan[]>('/bengkel/kendaraan');
    return res.data;
  },
  tambahKendaraan: async (data: Partial<Kendaraan>): Promise<any> => {
    const res = await apiClient.post('/bengkel/kendaraan-tambah', data);
    return res.data;
  },

  // Dokumen
  getDokumen: async (): Promise<DokumenKendaraan[]> => {
    const res = await apiClient.get<DokumenKendaraan[]>('/bengkel/dokumen');
    return res.data;
  },
  tambahDokumen: async (data: Partial<DokumenKendaraan>): Promise<any> => {
    const res = await apiClient.post('/bengkel/dokumen-tambah', data);
    return res.data;
  },

  // Booking Service
  getBooking: async (): Promise<BookingService[]> => {
    const res = await apiClient.get<BookingService[]>('/bengkel/booking');
    return res.data;
  },
  tambahBooking: async (data: Partial<BookingService>): Promise<any> => {
    const res = await apiClient.post('/bengkel/booking-tambah', data);
    return res.data;
  },

  // Antrian Security
  getAntrian: async (): Promise<AntrianKunjungan[]> => {
    const res = await apiClient.get<AntrianKunjungan[]>('/bengkel/antrian');
    return res.data;
  },
  checkInSecurity: async (data: Partial<AntrianKunjungan>): Promise<any> => {
    const res = await apiClient.post('/bengkel/antrian-checkin', data);
    return res.data;
  },
  checkOutSecurity: async (data: { id: number; barang_dibawa_keluar?: boolean; detail_barang_keluar?: string; foto_kendaraan_keluar?: string; foto_barang?: string; no_memo_keluar?: string }): Promise<any> => {
    const res = await apiClient.post('/bengkel/antrian-checkout', data);
    return res.data;
  },

  // SPK Service
  getSpkList: async (): Promise<SpkService[]> => {
    const res = await apiClient.get<SpkService[]>('/bengkel/spk');
    return res.data;
  },
  buatSpk: async (data: Partial<SpkService>): Promise<any> => {
    const res = await apiClient.post('/bengkel/spk-buat', data);
    return res.data;
  },
  updateSpkStatus: async (data: { id: number; status_spk?: string; nama_foreman?: string; nama_mekanik?: string; estimasi_biaya?: number; estimasi_waktu_jam?: number; catatan_foreman?: string }): Promise<any> => {
    const res = await apiClient.post('/bengkel/spk-status', data);
    return res.data;
  },

  // Pekerjaan & Part SPK
  getPekerjaanSpk: async (): Promise<SpkItemPekerjaan[]> => {
    const res = await apiClient.get<SpkItemPekerjaan[]>('/bengkel/spk-pekerjaan');
    return res.data;
  },
  tambahPekerjaanSpk: async (data: Partial<SpkItemPekerjaan>): Promise<any> => {
    const res = await apiClient.post('/bengkel/spk-pekerjaan-tambah', data);
    return res.data;
  },
  getPartSpk: async (): Promise<SpkItemPart[]> => {
    const res = await apiClient.get<SpkItemPart[]>('/bengkel/spk-part');
    return res.data;
  },
  tambahPartSpk: async (data: Partial<SpkItemPart>): Promise<any> => {
    const res = await apiClient.post('/bengkel/spk-part-tambah', data);
    return res.data;
  },

  // Stok Sparepart
  getStokPart: async (): Promise<StokSparepart[]> => {
    const res = await apiClient.get<StokSparepart[]>('/bengkel/stok-part');
    return res.data;
  },

  // Purchasing & PR
  getPurchasingList: async (): Promise<PurchaseRequestPart[]> => {
    const res = await apiClient.get<PurchaseRequestPart[]>('/bengkel/purchasing');
    return res.data;
  },
  ajukanPR: async (data: { no_pr: string; id_spk: number; nama_sa_pemohon: string; catatan_pr?: string }): Promise<any> => {
    const res = await apiClient.post('/bengkel/purchase-request', data);
    return res.data;
  },
  buatPO: async (data: {
    no_po: string;
    id_pr: number;
    id_spk: number;
    nama_admin_purchasing: string;
    vendor_1_nama?: string;
    vendor_1_harga?: number;
    vendor_2_nama?: string;
    vendor_2_harga?: number;
    vendor_terpilih: string;
    harga_kesepakatan: number;
    estimasi_tanggal_ready_eta: string;
    estimasi_jam_ready_eta: string;
    catatan_purchasing?: string;
  }): Promise<any> => {
    const res = await apiClient.post('/bengkel/purchase-order', data);
    return res.data;
  },
  konfirmasiSA: async (data: { id: number; status_konfirmasi_sa: 'Disetujui SA' | 'Ditolak SA' }): Promise<any> => {
    const res = await apiClient.post('/bengkel/po-konfirmasi-sa', data);
    return res.data;
  },

  // Tambahan Pekerjaan
  getTambahanPekerjaan: async (): Promise<PekerjaanTambahan[]> => {
    const res = await apiClient.get<PekerjaanTambahan[]>('/bengkel/pekerjaan-tambahan');
    return res.data;
  },
  ajukanTambahanPekerjaan: async (data: Partial<PekerjaanTambahan>): Promise<any> => {
    const res = await apiClient.post('/bengkel/pekerjaan-tambahan-tambah', data);
    return res.data;
  },
  approvalCustomer: async (data: { id: number; status_approval_customer: 'Disetujui' | 'Ditolak' }): Promise<any> => {
    const res = await apiClient.post('/bengkel/approval-customer', data);
    return res.data;
  },

  // QC & FIR
  inputQcFir: async (data: {
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
  }): Promise<any> => {
    const res = await apiClient.post('/bengkel/qc-fir', data);
    return res.data;
  },

  // Beli Part Langsung
  getBeliPartList: async (): Promise<TransaksiBeliPart[]> => {
    const res = await apiClient.get<TransaksiBeliPart[]>('/bengkel/beli-part');
    return res.data;
  },
  buatBeliPart: async (data: Partial<TransaksiBeliPart>): Promise<any> => {
    const res = await apiClient.post('/bengkel/beli-part-buat', data);
    return res.data;
  },

  // Invoice & Pembayaran
  getInvoiceList: async (): Promise<InvoicePembayaran[]> => {
    const res = await apiClient.get<InvoicePembayaran[]>('/bengkel/invoice');
    return res.data;
  },
  buatInvoice: async (data: Partial<InvoicePembayaran>): Promise<any> => {
    const res = await apiClient.post('/bengkel/invoice-buat', data);
    return res.data;
  },
  bayarInvoice: async (data: { id: number; metode_pembayaran: string; kasir_pic?: string; bukti_pembayaran?: string }): Promise<any> => {
    const res = await apiClient.post('/bengkel/invoice-bayar', data);
    return res.data;
  },

  // Memo Keluar
  getMemoKeluarList: async (): Promise<MemoKeluar[]> => {
    const res = await apiClient.get<MemoKeluar[]>('/bengkel/memo-keluar');
    return res.data;
  },
  buatMemoKeluar: async (data: Partial<MemoKeluar>): Promise<any> => {
    const res = await apiClient.post('/bengkel/memo-keluar-buat', data);
    return res.data;
  },
};
