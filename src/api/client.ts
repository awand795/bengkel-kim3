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
  PeranUser,
  Notifikasi
} from '../types';
import { useAppStore } from '../store/useAppStore';

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
    if (error.response?.status === 401) {
      // If it's already an auth endpoint (login, refresh, or me)
      if (originalRequest.url?.includes('/auth/')) {
        if (originalRequest.url?.includes('/auth/me')) {
          useAppStore.getState().logout();
        }
        return Promise.reject(error);
      }

      if (!originalRequest._retry) {
        const storedRefreshToken = localStorage.getItem('bengkel_refresh_token');
        if (!storedRefreshToken) {
          useAppStore.getState().logout();
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
            `${API_BASE}/api/data/kim3/auth/refresh-token`,
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
          } else {
            throw new Error('Refresh token invalid');
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          useAppStore.getState().logout();
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Pagination-aware list helper ───────────────────────────────────────────
// Endpoint di API Builder yang punya "Automatic SQL Pagination" aktif
// mengembalikan { pagination: {...}, data: [...] }.
// Yang tidak aktif tetap mengembalikan array biasa. Helper di bawah
// menormalkan kedua bentuk tersebut sehingga view lama tidak perlu berubah.
export interface PaginationMeta {
  current_page: number;
  limit: number;
  offset: number;
  total_records: number;
  total_pages: number;
}

export interface PaginatedResult<T> {
  rows: T[];
  pagination: PaginationMeta | null;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  /** Kata kunci pencarian server-side (param `q` di API Builder). */
  q?: string;
}

// Standar batas pengambilan data di aplikasi KIM 3:
// - DEFAULT_PAGE_LIMIT: Batas default baris per halaman untuk tampilan tabel operasional
// - LOOKUP_LIST_LIMIT: Batas aman untuk daftar dropdown referensi (nopol armada, sparepart, dll.)
//   sehingga tidak membebani browser dengan ribuan DOM sekaligus.
export const DEFAULT_PAGE_LIMIT = 10;
export const LOOKUP_LIST_LIMIT = 150;

const normalizeList = <T,>(payload: any): PaginatedResult<T> => {
  if (Array.isArray(payload)) {
    return { rows: payload, pagination: null };
  }
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return { rows, pagination: payload?.pagination ?? null };
};

const fetchList = async <T,>(url: string, query: ListQuery = {}): Promise<PaginatedResult<T>> => {
  const params: Record<string, string | number> = {};
  if (query.q !== undefined) params.q = query.q;
  if (query.page !== undefined) params.page = query.page;
  if (query.limit !== undefined) params.limit = query.limit;
  const res = await apiClient.get(url, { params });
  return normalizeList<T>(res.data);
};

// Normalisasi plat: primary key walk-in — huruf besar tanpa spasi.
// dipakai di semua pengiriman no_polisi agar cocok dengan data tersimpan.
export const normalizePlat = (nopol: string | null | undefined): string =>
  (nopol || '').toUpperCase().replace(/\s+/g, '');

// Helper: ambil pesan error paling informatif dari respons API Builder
// (validasi parameter 400 / business rule / DB error) agar tidak tertutup
// pesan generik "Terjadi kesalahan."
export const getApiErrorMessage = (err: any, fallback = 'Terjadi kesalahan.'): string => {
  const data = err?.response?.data;
  if (data) {
    if (typeof data.message === 'string' && data.message.trim()) return data.message;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e: any) => (typeof e === 'string' ? e : JSON.stringify(e))).join('; ');
    }
    if (typeof data.error === 'string' && data.error.trim()) return data.error;
  }
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
};

// Storage upload client (already built into server backend)
export const uploadFileToStorage = async (file: File, bucket: 'foto_kendaraan' | 'foto_barang' | 'dokumen_armada' = 'foto_kendaraan'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);

  const jwt = localStorage.getItem('bengkel_jwt_token');
  const headers: Record<string, string> = {
    'Content-Type': 'multipart/form-data',
    'x-api-key': KIM3_STATIC_TOKEN,
  };
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  try {
    const res = await axios.post(`${API_BASE}/api/storage/upload`, formData, {
      headers,
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
    const res = await apiClient.get<DashboardSummary[]>('/kim3/dashboard-summary');
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
  getPengguna: async (): Promise<Pengguna[]> =>
    (await fetchList<Pengguna>('/kim3/pengguna', { limit: LOOKUP_LIST_LIMIT })).rows,

  // Pelanggan
  getPelanggan: async (): Promise<Pelanggan[]> =>
    (await fetchList<Pelanggan>('/kim3/pelanggan', { limit: LOOKUP_LIST_LIMIT })).rows,
  getPelangganPage: (query: ListQuery = {}): Promise<PaginatedResult<Pelanggan>> =>
    fetchList<Pelanggan>('/kim3/pelanggan', { limit: DEFAULT_PAGE_LIMIT, ...query }),

  // Kendaraan
  getKendaraan: async (): Promise<Kendaraan[]> =>
    (await fetchList<Kendaraan>('/kim3/kendaraan', { limit: LOOKUP_LIST_LIMIT })).rows,

  // Cari pemilik kendaraan by plat (walk-in): tenant + user customer aktif.
  // Mengembalikan array (biasanya 0-1 baris). Plat dinormalisasi dulu.
  cariPemilikPlat: async (noPolisi: string): Promise<Array<{
    id_kendaraan: number;
    no_polisi: string;
    id_pelanggan: number | null;
    nama_perusahaan: string | null;
    user_id: number | null;
    nama_lengkap: string | null;
    email: string | null;
  }>> => {
    const plat = normalizePlat(noPolisi);
    if (!plat) return [];
    const res = await apiClient.get('/kim3/kendaraan-cari-pemilik', { params: { no_polisi: plat } });
    const data = res.data;
    return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
  },
  getKendaraanPage: (query: ListQuery = {}): Promise<PaginatedResult<Kendaraan>> =>
    fetchList<Kendaraan>('/kim3/kendaraan', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  tambahKendaraan: async (data: Partial<Kendaraan>): Promise<any> => {
    const res = await apiClient.post('/kim3/kendaraan-tambah', data);
    return res.data;
  },

  // Dokumen
  getDokumen: async (): Promise<DokumenKendaraan[]> =>
    (await fetchList<DokumenKendaraan>('/kim3/dokumen', { limit: LOOKUP_LIST_LIMIT })).rows,
  getDokumenPage: (query: ListQuery = {}): Promise<PaginatedResult<DokumenKendaraan>> =>
    fetchList<DokumenKendaraan>('/kim3/dokumen', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  tambahDokumen: async (data: Partial<DokumenKendaraan>): Promise<any> => {
    const res = await apiClient.post('/kim3/dokumen-tambah', data);
    return res.data;
  },

  // Booking Service
  getBooking: async (): Promise<BookingService[]> =>
    (await fetchList<BookingService>('/kim3/booking', { limit: LOOKUP_LIST_LIMIT })).rows,
  getBookingPage: (query: ListQuery = {}): Promise<PaginatedResult<BookingService>> =>
    fetchList<BookingService>('/kim3/booking', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  tambahBooking: async (data: Partial<BookingService>): Promise<any> => {
    const res = await apiClient.post('/kim3/booking-tambah', data);
    return res.data;
  },
  batalkanBooking: async (data: { id: number }): Promise<any> => {
    const res = await apiClient.post('/kim3/booking-batal', data);
    return res.data;
  },

  // Antrian Security
  getAntrian: async (): Promise<AntrianKunjungan[]> =>
    (await fetchList<AntrianKunjungan>('/kim3/antrian', { limit: LOOKUP_LIST_LIMIT })).rows,
  getAntrianPage: (query: ListQuery = {}): Promise<PaginatedResult<AntrianKunjungan>> =>
    fetchList<AntrianKunjungan>('/kim3/antrian', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  checkInSecurity: async (data: Partial<AntrianKunjungan>): Promise<any> => {
    const res = await apiClient.post('/kim3/antrian-checkin', data);
    return res.data;
  },
  checkOutSecurity: async (data: { id: number; barang_dibawa_keluar?: boolean; detail_barang_keluar?: string; foto_kendaraan_keluar?: string; foto_barang?: string; no_memo_keluar?: string }): Promise<any> => {
    const res = await apiClient.post('/kim3/antrian-checkout', data);
    return res.data;
  },
  konfirmasiKunjunganPic: async (data: { id: number; status_konfirmasi_pic: 'Diterima' | 'Ditolak'; catatan_pic?: string }): Promise<any> => {
    const res = await apiClient.post('/kim3/antrian-konfirmasi-pic', data);
    return res.data;
  },

  // SPK Service
  getSpkList: async (): Promise<SpkService[]> =>
    (await fetchList<SpkService>('/kim3/spk', { limit: LOOKUP_LIST_LIMIT })).rows,
  getSpkListPage: (query: ListQuery = {}): Promise<PaginatedResult<SpkService>> =>
    fetchList<SpkService>('/kim3/spk', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  buatSpk: async (data: Partial<SpkService>): Promise<any> => {
    const res = await apiClient.post('/kim3/spk-buat', data);
    return res.data;
  },
  updateSpkStatus: async (data: { id: number; status_spk?: string; nama_foreman?: string; nama_mekanik?: string; id_mekanik?: number; estimasi_biaya?: number; estimasi_waktu_jam?: number; catatan_foreman?: string; catatan_sa?: string }): Promise<any> => {
    const res = await apiClient.post('/kim3/spk-status', data);
    return res.data;
  },

  // Pekerjaan & Part SPK
  getPekerjaanSpk: async (): Promise<SpkItemPekerjaan[]> =>
    (await fetchList<SpkItemPekerjaan>('/kim3/spk-pekerjaan', { limit: LOOKUP_LIST_LIMIT })).rows,
  tambahPekerjaanSpk: async (data: Partial<SpkItemPekerjaan>): Promise<any> => {
    const res = await apiClient.post('/kim3/spk-pekerjaan-tambah', data);
    return res.data;
  },
  simpanPekerjaanSpk: async (data: { id_spk: number; nama_pekerjaan: string; biaya_jasa: number; estimasi_durasi_jam?: number }): Promise<any> => {
    const res = await apiClient.post('/kim3/spk-pekerjaan-simpan', data);
    return res.data;
  },
  getPartSpk: async (): Promise<SpkItemPart[]> =>
    (await fetchList<SpkItemPart>('/kim3/spk-part', { limit: LOOKUP_LIST_LIMIT })).rows,
  tambahPartSpk: async (data: Partial<SpkItemPart>): Promise<any> => {
    const res = await apiClient.post('/kim3/spk-part-tambah', data);
    return res.data;
  },

  // Stok Sparepart
  getStokPart: async (): Promise<StokSparepart[]> =>
    (await fetchList<StokSparepart>('/kim3/stok-part', { limit: LOOKUP_LIST_LIMIT })).rows,
  getStokPartPage: (query: ListQuery = {}): Promise<PaginatedResult<StokSparepart>> =>
    fetchList<StokSparepart>('/kim3/stok-part', { limit: DEFAULT_PAGE_LIMIT, ...query }),

  // Purchasing & PR
  getPurchasingList: async (): Promise<PurchaseRequestPart[]> =>
    (await fetchList<PurchaseRequestPart>('/kim3/purchasing', { limit: LOOKUP_LIST_LIMIT })).rows,
  getPurchasingListPage: (query: ListQuery = {}): Promise<PaginatedResult<PurchaseRequestPart>> =>
    fetchList<PurchaseRequestPart>('/kim3/purchasing', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  ajukanPR: async (data: { no_pr: string; id_spk: number; nama_sa_pemohon: string; catatan_pr?: string }): Promise<any> => {
    const res = await apiClient.post('/kim3/purchase-request', data);
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
    const res = await apiClient.post('/kim3/purchase-order', data);
    return res.data;
  },
  konfirmasiSA: async (data: { id: number; status_konfirmasi_sa: 'Disetujui SA' | 'Ditolak SA' }): Promise<any> => {
    const res = await apiClient.post('/kim3/po-konfirmasi-sa', data);
    return res.data;
  },
  konfirmasiBarangReady: async (data: { id_pr: number; id_spk: number }): Promise<any> => {
    const res = await apiClient.post('/kim3/barang-ready', data);
    return res.data;
  },
  updatePOETA: async (data: { id: number; estimasi_tanggal_ready_eta: string; estimasi_jam_ready_eta: string; catatan_purchasing?: string }): Promise<any> => {
    const res = await apiClient.post('/kim3/purchase-order-eta', data);
    return res.data;
  },

  // Tambahan Pekerjaan
  getTambahanPekerjaan: async (): Promise<PekerjaanTambahan[]> =>
    (await fetchList<PekerjaanTambahan>('/kim3/pekerjaan-tambahan', { limit: LOOKUP_LIST_LIMIT })).rows,
  ajukanTambahanPekerjaan: async (data: Partial<PekerjaanTambahan>): Promise<any> => {
    const res = await apiClient.post('/kim3/pekerjaan-tambahan-tambah', data);
    return res.data;
  },
  approvalCustomer: async (data: { id: number; status_approval_customer: 'Disetujui' | 'Ditolak' }): Promise<any> => {
    const res = await apiClient.post('/kim3/approval-customer', data);
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
    const res = await apiClient.post('/kim3/qc-fir', data);
    return res.data;
  },

  // Beli Part Langsung
  getBeliPartList: async (): Promise<TransaksiBeliPart[]> =>
    (await fetchList<TransaksiBeliPart>('/kim3/beli-part', { limit: LOOKUP_LIST_LIMIT })).rows,
  getBeliPartListPage: (query: ListQuery = {}): Promise<PaginatedResult<TransaksiBeliPart>> =>
    fetchList<TransaksiBeliPart>('/kim3/beli-part', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  buatBeliPart: async (data: Partial<TransaksiBeliPart>): Promise<any> => {
    const res = await apiClient.post('/kim3/beli-part-buat', data);
    return res.data;
  },
  updateBeliPartStatus: async (data: { id: number; status_transaksi?: string; foto_penyerahan?: string; catatan?: string }): Promise<any> => {
    try {
      const res = await apiClient.post('/kim3/beli-part-status', data);
      return res.data;
    } catch (e) {
      console.warn('Endpoint /kim3/beli-part-status note:', e);
      return { success: true };
    }
  },

  // Invoice & Pembayaran
  getInvoiceList: async (): Promise<InvoicePembayaran[]> =>
    (await fetchList<InvoicePembayaran>('/kim3/invoice', { limit: LOOKUP_LIST_LIMIT })).rows,
  getInvoiceListPage: (query: ListQuery = {}): Promise<PaginatedResult<InvoicePembayaran>> =>
    fetchList<InvoicePembayaran>('/kim3/invoice', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  buatInvoice: async (data: Partial<InvoicePembayaran>): Promise<any> => {
    const res = await apiClient.post('/kim3/invoice-buat', data);
    return res.data;
  },
  bayarInvoice: async (data: { id: number; metode_pembayaran: string; kasir_pic?: string; bukti_pembayaran?: string }): Promise<any> => {
    const res = await apiClient.post('/kim3/invoice-bayar', data);
    return res.data;
  },

  // Memo Keluar
  getMemoKeluarList: async (): Promise<MemoKeluar[]> =>
    (await fetchList<MemoKeluar>('/kim3/memo-keluar', { limit: LOOKUP_LIST_LIMIT })).rows,
  getMemoKeluarListPage: (query: ListQuery = {}): Promise<PaginatedResult<MemoKeluar>> =>
    fetchList<MemoKeluar>('/kim3/memo-keluar', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  buatMemoKeluar: async (data: Partial<MemoKeluar>): Promise<any> => {
    const res = await apiClient.post('/kim3/memo-keluar-buat', data);
    return res.data;
  },

  // Auth & Token (JWT Authentication)
  login: async (email: string, password: string = 'password123'): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/kim3/auth/login', { email, password });
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
    email: string;
    password: string;
    nama_lengkap: string;
    peran: string;
    no_telepon?: string;
  }): Promise<any> => {
    const res = await apiClient.post('/kim3/auth/register', userData);
    return res.data;
  },

  refreshToken: async (token?: string): Promise<LoginResponse> => {
    const rToken = token || localStorage.getItem('bengkel_refresh_token');
    const res = await apiClient.post<LoginResponse>('/kim3/auth/refresh-token', { refresh_token: rToken });
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

  // Verifikasi Sesi & Identity User aktif dari Database (me)
  getMe: async (): Promise<AuthUser> => {
    const res = await apiClient.get<AuthUser[]>('/kim3/auth/me');
    const data = Array.isArray(res.data) ? res.data[0] : res.data;
    if (!data || !data.id) {
      throw new Error('User not found or inactive in database');
    }
    return {
      id: data.id,
      email: data.email,
      nama_lengkap: data.nama_lengkap,
      peran: (data.peran as PeranUser) || 'Customer Fleet',
      role: data.role || data.peran,
      status_aktif: data.status_aktif !== false,
      id_pelanggan: data.id_pelanggan,
      nama_perusahaan: data.nama_perusahaan,
    };
  },

  // Admin Panel: Pengaturan Sistem (Workshop, PPN, Kop & Footer Cetak)
  getPengaturan: async (): Promise<PengaturanSistem> => {
    const res = await apiClient.get<PengaturanSistem[]>('/kim3/pengaturan');
    return res.data[0] || ({} as PengaturanSistem);
  },

  simpanPengaturan: async (data: Partial<PengaturanSistem>): Promise<PengaturanSistem> => {
    const res = await apiClient.post('/kim3/pengaturan-simpan', data);
    return Array.isArray(res.data) ? res.data[0] : res.data;
  },

  // Admin Panel: Manajemen Pengguna & Role
  tambahPengguna: async (data: {
    email: string;
    password?: string;
    nama_lengkap: string;
    peran: PeranUser;
    no_telepon?: string;
    status_aktif?: boolean;
  }): Promise<any> => {
    const res = await apiClient.post('/kim3/pengguna-tambah', data);
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
    const res = await apiClient.post('/kim3/pengguna-update', data);
    return res.data;
  },

  resetPasswordPengguna: async (data: {
    id: number;
    password_baru: string;
  }): Promise<any> => {
    const res = await apiClient.post('/kim3/pengguna-reset-pwd', data);
    return res.data;
  },

  toggleStatusPengguna: async (data: {
    id: number;
    status_aktif: boolean;
  }): Promise<any> => {
    const res = await apiClient.post('/kim3/pengguna-toggle-status', data);
    return res.data;
  },

  // Pusat Notifikasi Resmi (Direct Database Sync)
  getNotifikasi: async (): Promise<Notifikasi[]> =>
    (await fetchList<Notifikasi>('/kim3/notifikasi', { limit: 100 })).rows,

  tandaiNotifikasiBaca: async (id: number): Promise<any> => {
    const res = await apiClient.post('/kim3/notifikasi-baca', { id });
    return res.data;
  },

  hapusNotifikasi: async (id: number): Promise<any> => {
    const res = await apiClient.post('/kim3/notifikasi-hapus', { id });
    return res.data;
  },

  tandaiSemuaNotifikasiBaca: async (): Promise<any> => {
    const res = await apiClient.post('/kim3/notifikasi-baca-semua', {});
    return res.data;
  },

  kirimNotifikasi: async (data: {
    target_role: string;
    target_user_id?: number | null;
    target_pelanggan_id?: number | null;
    title: string;
    pesan: string;
    link_tab?: string;
    urgency?: 'urgent' | 'warning' | 'info' | 'success';
  }): Promise<any> => {
    const res = await apiClient.post('/kim3/notifikasi-kirim', data);
    return res.data;
  },
};
