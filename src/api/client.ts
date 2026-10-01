import axios from 'axios';
import {
  Kendaraan,
  DokumenKendaraan,
  BookingService,
  SpkService,
  SpkItemPekerjaan,
  SpkItemPart,
  PurchaseRequestPart,
  PekerjaanTambahan,
  InvoicePembayaran,
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
      const reqUrl: string = originalRequest.url || '';
      if (reqUrl.includes('/auth/login') || reqUrl.includes('/auth/refresh-token')) {
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
  q?: string;
}

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

export const normalizePlat = (nopol: string | null | undefined): string =>
  (nopol || '').toUpperCase().replace(/\s+/g, '');

export const formatPlat = (nopol?: string | null): string => {
  if (!nopol) return '-';
  const clean = String(nopol).trim().toUpperCase().replace(/\s+/g, '');
  const match = clean.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/);
  if (match) {
    return `${match[1]} ${match[2]}${match[3] ? ' ' + match[3] : ''}`.trim();
  }
  return String(nopol).trim();
};

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

export const uploadFotoFile = async (
  file: File
): Promise<{ dataUrl: string; mime: string; size: number; filename: string }> => {
  const formData = new FormData();
  formData.append('foto', file, file.name || 'foto.jpg');

  const res = await apiClient.post('/kim3/foto-upload', formData, {
    transformRequest: [
      (data, headers) => {
        (headers as any)?.delete?.('Content-Type');
        return data;
      },
    ],
  });

  const payload = res.data;
  const row = Array.isArray(payload) ? payload[0] : payload?.data ?? payload;
  const raw = typeof row?.foto_raw === 'string' ? row.foto_raw : '';
  if (!raw) throw new Error('Server tidak mengembalikan data foto.');
  const mime =
    typeof row?.mime_type === 'string' && row.mime_type ? row.mime_type : file.type || 'image/jpeg';
  return {
    dataUrl: `data:${mime};base64,${raw}`,
    mime,
    size: Number(row?.size_bytes) || 0,
    filename: String(row?.filename ?? file.name ?? ''),
  };
};

export const api = {
  // Upload Foto ke Database (POST /kim3/foto-upload)
  uploadFoto: async (
    file: File
  ): Promise<{ dataUrl: string; mime: string; size: number; filename: string }> => {
    return uploadFotoFile(file);
  },

  // Kendaraan Saya
  getKendaraan: async (): Promise<Kendaraan[]> =>
    (await fetchList<Kendaraan>('/kim3/kendaraan', { limit: LOOKUP_LIST_LIMIT })).rows,
  getKendaraanPage: (query: ListQuery = {}): Promise<PaginatedResult<Kendaraan>> =>
    fetchList<Kendaraan>('/kim3/kendaraan', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  tambahKendaraan: async (data: Partial<Kendaraan>): Promise<any> => {
    const res = await apiClient.post('/kim3/kendaraan-tambah', data);
    return res.data;
  },
  updateKendaraan: async (data: Partial<Kendaraan>): Promise<any> => {
    const res = await apiClient.post('/kim3/kendaraan-update', data);
    return res.data;
  },
  hapusKendaraan: async (no_polisi: string): Promise<any> => {
    const res = await apiClient.post('/kim3/hapus-kendaraan', { no_polisi });
    return res.data;
  },

  // Dokumen Saya
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

  // SPK Service (Pelacakan & Riwayat Service)
  getSpkList: async (): Promise<SpkService[]> =>
    (await fetchList<SpkService>('/kim3/spk', { limit: LOOKUP_LIST_LIMIT })).rows,
  getSpkListPage: (query: ListQuery = {}): Promise<PaginatedResult<SpkService>> =>
    fetchList<SpkService>('/kim3/spk', { limit: DEFAULT_PAGE_LIMIT, ...query }),
  updateSpkStatus: async (data: { id: number; status_spk?: string; catatan_sa?: string }): Promise<any> => {
    const res = await apiClient.post('/kim3/spk-status', data);
    return res.data;
  },

  // Pekerjaan & Part SPK
  getPekerjaanSpk: async (): Promise<SpkItemPekerjaan[]> =>
    (await fetchList<SpkItemPekerjaan>('/kim3/spk-pekerjaan', { limit: LOOKUP_LIST_LIMIT })).rows,
  getPartSpk: async (): Promise<SpkItemPart[]> =>
    (await fetchList<SpkItemPart>('/kim3/spk-part', { limit: LOOKUP_LIST_LIMIT })).rows,

  // Purchasing & ETA Part
  getPurchasingList: async (): Promise<PurchaseRequestPart[]> =>
    (await fetchList<PurchaseRequestPart>('/kim3/purchasing', { limit: LOOKUP_LIST_LIMIT })).rows,

  // Tambahan Pekerjaan & Persetujuan Customer
  getTambahanPekerjaan: async (): Promise<PekerjaanTambahan[]> =>
    (await fetchList<PekerjaanTambahan>('/kim3/pekerjaan-tambahan', { limit: LOOKUP_LIST_LIMIT })).rows,
  approvalCustomer: async (data: { id: number; status_approval_customer: 'Disetujui' | 'Ditolak' }): Promise<any> => {
    const res = await apiClient.post('/kim3/approval-customer', data);
    return res.data;
  },

  // Invoice & Pembayaran (Riwayat & Bukti Tagihan)
  getInvoiceList: async (): Promise<InvoicePembayaran[]> =>
    (await fetchList<InvoicePembayaran>('/kim3/invoice', { limit: LOOKUP_LIST_LIMIT })).rows,
  getInvoiceListPage: (query: ListQuery = {}): Promise<PaginatedResult<InvoicePembayaran>> =>
    fetchList<InvoicePembayaran>('/kim3/invoice', { limit: DEFAULT_PAGE_LIMIT, ...query }),

  // Auth & Token (JWT Authentication)
  login: async (identifier: string, password: string = 'password123'): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/kim3/auth/login', { 
      email: identifier.trim(), 
      password 
    });
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
    nama_perusahaan?: string;
    no_telepon?: string;
    peran?: string;
  }): Promise<any> => {
    const res = await apiClient.post('/kim3/auth/register', {
      ...userData,
      peran: 'Customer Fleet',
    });
    return res.data;
  },

  resendVerification: async (email?: string): Promise<{ success: boolean; message: string; already_verified?: boolean }> => {
    const res = await apiClient.post<{ success: boolean; message: string; already_verified?: boolean }>('/kim3/auth/resend-verification', { email });
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

  // Verifikasi Sesi & Identity User aktif dari Database
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
      peran: 'Customer Fleet',
      role: 'Customer_Fleet',
      status_aktif: data.status_aktif !== false,
      id_pelanggan: data.id_pelanggan,
      nama_perusahaan: data.nama_perusahaan ?? null,
      alamat: (data as any).alamat ?? null,
      npwp: (data as any).npwp ?? null,
      no_telepon: (data as any).no_telepon ?? null,
      foto_profil: (data as any).foto_profil ?? null,
    };
  },

  // Profil Perusahaan & Akun
  updateProfil: async (data: { nama_lengkap: string; nama_perusahaan?: string; alamat?: string; npwp?: string; no_telepon?: string; foto_profil?: string }): Promise<any> => {
    const res = await apiClient.post('/kim3/profil-simpan', data);
    return res.data;
  },

  gantiPassword: async (password_baru: string): Promise<any> => {
    const res = await apiClient.post('/kim3/auth/ganti-password', { password_baru });
    return res.data;
  },

  // Pengaturan Sistem & PPN (Read-only untuk faktur & kop)
  getPengaturan: async (): Promise<PengaturanSistem> => {
    const res = await apiClient.get<PengaturanSistem[]>('/kim3/pengaturan');
    return res.data[0] || ({} as PengaturanSistem);
  },

  // Notifikasi
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

  hapusSemuaNotifikasi: async (): Promise<any> => {
    const res = await apiClient.post('/kim3/notifikasi-hapus-semua', {});
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
