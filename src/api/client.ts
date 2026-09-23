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
  MemoKeluar,
  LoginResponse,
  AuthUser,
  PengaturanSistem,
  PeranUser
} from '../types';

// In Vite development, requests to /api are proxied to http://94.237.69.119:8081
// For standalone production builds or direct access, fallback to server IP
const API_BASE = import.meta.env.VITE_API_URL || '';

// Static API token configured on server API Builder
export const KIM3_STATIC_TOKEN = 'KIM3-SECURE-TOKEN-2026-X998A7B6C';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api/data`,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-api-key': KIM3_STATIC_TOKEN,
  },
});

// Auto-inject JWT Bearer token for authenticated API communication.
// If the user is not logged in yet, no Authorization header is attached
// so the request fails with 401 and LoginPage takes over.
apiClient.interceptors.request.use((config) => {
  const jwt = localStorage.getItem('bengkel_jwt_token');
  config.headers['x-api-key'] = KIM3_STATIC_TOKEN;
  if (jwt) {
    config.headers['Authorization'] = `Bearer ${jwt}`;
  } else {
    delete config.headers['Authorization'];
  }
  return config;
});

// Auto-refresh JWT token on 401 Unauthorized
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      const storedRefreshToken = localStorage.getItem('bengkel_refresh_token');
      if (!storedRefreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(
          `${API_BASE}/api/data/bengkel/auth/refresh-token`,
          { refresh_token: storedRefreshToken },
          { headers: { 'x-api-key': KIM3_STATIC_TOKEN } }
        );

        const newAccessToken = refreshRes.data?.access_token;
        if (newAccessToken) {
          localStorage.setItem('bengkel_jwt_token', newAccessToken);
          if (refreshRes.data?.refresh_token) {
            localStorage.setItem('bengkel_refresh_token', refreshRes.data.refresh_token);
          }
          processQueue(null, newAccessToken);
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('bengkel_jwt_token');
        localStorage.removeItem('bengkel_refresh_token');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

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
  konfirmasiKunjunganPic: async (data: { id: number; status_konfirmasi_pic: 'Diterima' | 'Ditolak'; catatan_pic?: string }): Promise<any> => {
    const res = await apiClient.post('/bengkel/antrian-konfirmasi-pic', data);
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
  updateSpkStatus: async (data: { id: number; status_spk?: string; nama_foreman?: string; nama_mekanik?: string; estimasi_biaya?: number; estimasi_waktu_jam?: number; catatan_foreman?: string; catatan_sa?: string }): Promise<any> => {
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
  updateBeliPartStatus: async (data: { id: number; status_transaksi?: string; foto_penyerahan?: string; catatan?: string }): Promise<any> => {
    try {
      const res = await apiClient.post('/bengkel/beli-part-status', data);
      return res.data;
    } catch (e) {
      console.warn('Endpoint /bengkel/beli-part-status note:', e);
      return { success: true };
    }
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

  // Auth & Token (JWT Authentication)
  login: async (username: string, password: string = 'password123'): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/bengkel/auth/login', { username, password });
    if (res.data?.access_token) {
      localStorage.setItem('bengkel_jwt_token', res.data.access_token);
      if (res.data?.refresh_token) {
        localStorage.setItem('bengkel_refresh_token', res.data.refresh_token);
      }
      if (res.data?.user) {
        localStorage.setItem('bengkel_auth_user', JSON.stringify(res.data.user));
      }
    }
    return res.data;
  },

  register: async (userData: {
    username: string;
    password: string;
    nama_lengkap: string;
    peran: string;
    no_telepon?: string;
    email?: string;
  }): Promise<any> => {
    const res = await apiClient.post('/bengkel/auth/register', userData);
    return res.data;
  },

  refreshToken: async (token?: string): Promise<LoginResponse> => {
    const rToken = token || localStorage.getItem('bengkel_refresh_token');
    const res = await apiClient.post<LoginResponse>('/bengkel/auth/refresh-token', { refresh_token: rToken });
    if (res.data?.access_token) {
      localStorage.setItem('bengkel_jwt_token', res.data.access_token);
      if (res.data?.refresh_token) {
        localStorage.setItem('bengkel_refresh_token', res.data.refresh_token);
      }
    }
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('bengkel_jwt_token');
    localStorage.removeItem('bengkel_refresh_token');
    localStorage.removeItem('bengkel_auth_user');
  },

  // Admin Panel: Pengaturan Sistem (Workshop, PPN, Kop & Footer Cetak)
  getPengaturan: async (): Promise<PengaturanSistem> => {
    const res = await apiClient.get<PengaturanSistem[]>('/bengkel/pengaturan');
    return res.data[0] || {
      id: 1,
      nama_bengkel: 'BENGKEL KIM 3',
      slogan_bengkel: 'Kawasan Industri Modern 3 - Pusat Perawatan Armada Komersial',
      alamat_bengkel: 'Jl. Pulau Pinang Raya No. 8, Kawasan Industri Modern 3, Medan, Sumatera Utara',
      no_telepon_bengkel: '(061) 8920123 / 0812-6543-9870',
      email_bengkel: 'service@kim3bengkel.co.id',
      npwp_bengkel: '01.234.567.8-123.000',
      logo_url: '/logo.png',
      ppn_persen: 11.00,
      header_print_memo: 'BENGKEL KIM 3 - GATE PASS KELUAR RESMI',
      footer_print_memo: 'Memo keluar ini merupakan dokumen resmi verifikasi security gate. Kendaraan dan muatan wajib diperiksa sebelum keluar gerbang bengkel.',
      header_print_spk: 'BENGKEL KIM 3 - SURAT PERINTAH KERJA (SPK)',
      footer_print_spk: 'Seluruh pengerjaan dan penggantian suku cadang telah diverifikasi Service Advisor dan disetujui pihak penanggung jawab armada.',
      header_print_invoice: 'BENGKEL KIM 3 - FAKTUR TAGIHAN & PEMBAYARAN',
      footer_print_invoice: 'Pembayaran sah setelah dana efektif di rekening. Simpan bukti faktur ini sebagai dokumen jaminan garansi service.',
      bank_nama: 'Bank Mandiri',
      bank_rekening: '105-00-1234567-8',
      bank_atas_nama: 'PT BENGKEL KIM TIGA SEJAHTERA',
      catatan_garansi: 'Garansi pengerjaan bengkel berlaku selama 14 hari kerja atau 1.000 km (mana yang tercapai lebih dahulu).'
    };
  },

  simpanPengaturan: async (data: Partial<PengaturanSistem>): Promise<PengaturanSistem> => {
    const res = await apiClient.post('/bengkel/pengaturan-simpan', data);
    return Array.isArray(res.data) ? res.data[0] : res.data;
  },

  // Admin Panel: Manajemen Pengguna & Role
  tambahPengguna: async (data: {
    username: string;
    password?: string;
    nama_lengkap: string;
    peran: PeranUser;
    no_telepon?: string;
    email?: string;
    status_aktif?: boolean;
  }): Promise<any> => {
    const res = await apiClient.post('/bengkel/pengguna-tambah', data);
    return res.data;
  },

  updatePengguna: async (data: {
    id: number;
    nama_lengkap?: string;
    peran?: PeranUser;
    no_telepon?: string;
    email?: string;
    status_aktif?: boolean;
  }): Promise<any> => {
    const res = await apiClient.post('/bengkel/pengguna-update', data);
    return res.data;
  },

  resetPasswordPengguna: async (data: {
    id: number;
    password_baru: string;
  }): Promise<any> => {
    const res = await apiClient.post('/bengkel/pengguna-reset-pwd', data);
    return res.data;
  },

  toggleStatusPengguna: async (data: {
    id: number;
    status_aktif: boolean;
  }): Promise<any> => {
    const res = await apiClient.post('/bengkel/pengguna-toggle-status', data);
    return res.data;
  },
};
