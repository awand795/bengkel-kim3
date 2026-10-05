import axios from 'axios';
import {
  Kendaraan,
  MasterBrand,
  MasterType,
  MasterJenisLayanan,
  MasterKeluhan,
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

export const cleanField = (val?: any): string => {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
  return s;
};

export const formatMerkModel = (merk?: string | null, model?: string | null, fallback?: string): string => {
  const m = cleanField(merk);
  const mdl = cleanField(model);
  const combined = [m, mdl].filter(Boolean).join(' ');
  return combined || (fallback ? cleanField(fallback) : '');
};

export const formatNamaArmada = (k: { unit_name?: string | null; merk?: string | null; model?: string | null; jenis_armada?: string | null; type?: string | null }): string => {
  const unit = cleanField(k.unit_name);
  const modelMerk = formatMerkModel(k.merk, k.model);
  const type = cleanField(k.type || k.jenis_armada);

  if (unit && modelMerk) return `${unit} — ${modelMerk}`;
  if (unit) return unit;
  if (modelMerk) return modelMerk;
  if (type) return type;
  return 'Armada Kendaraan';
};

export const getApiErrorMessage = (err: any, fallback = 'Terjadi kesalahan pada sistem.'): string => {
  const data = err?.response?.data;
  let rawMsg = '';
  if (data) {
    if (typeof data.message === 'string' && data.message.trim()) rawMsg = data.message;
    else if (Array.isArray(data.errors) && data.errors.length > 0) {
      rawMsg = data.errors.map((e: any) => (typeof e === 'string' ? e : JSON.stringify(e))).join('; ');
    } else if (typeof data.error === 'string' && data.error.trim()) {
      rawMsg = data.error;
    }
  }
  if (!rawMsg && typeof err?.message === 'string' && err.message.trim()) {
    rawMsg = err.message;
  }
  if (!rawMsg) return fallback;

  const lower = rawMsg.toLowerCase();

  // Deteksi jika pesan mengandung query SQL, nama tabel/kolom, atau Java database exception
  const isSqlOrTechnicalError =
    lower.includes('bad sql grammar') ||
    lower.includes('preparedstatementcallback') ||
    lower.includes('psqlexception') ||
    lower.includes('sqlexception') ||
    lower.includes('org.postgresql') ||
    lower.includes('org.springframework') ||
    lower.includes('syntax error') ||
    lower.includes('update ') ||
    lower.includes('insert into') ||
    lower.includes('select ') ||
    lower.includes('delete from') ||
    lower.includes('gen_salt') ||
    lower.includes('crypt(') ||
    lower.includes('relation ') ||
    lower.includes('column ') ||
    lower.includes('broken pipe') ||
    lower.includes('hikari') ||
    lower.includes('connection refused') ||
    lower.includes('internal server error') ||
    lower.includes('fatal:') ||
    rawMsg.includes('[UPDATE') ||
    rawMsg.includes('[SELECT') ||
    rawMsg.includes('[INSERT') ||
    rawMsg.includes('[DELETE');

  if (isSqlOrTechnicalError) {
    if (lower.includes('otp') || lower.includes('password') || lower.includes('sandi')) {
      return 'Terjadi kendala teknis saat memproses pengaturan kata sandi. Silakan coba kembali beberapa saat lagi.';
    }
    return fallback || 'Terjadi kendala pada sistem. Silakan coba kembali beberapa saat lagi.';
  }

  // Pemetaan pesan database spesifik yang sering muncul menjadi bahasa yang mudah dipahami
  if (lower.includes('pengguna_email_key') || (lower.includes('duplicate key') && lower.includes('email'))) {
    return 'Pendaftaran gagal. Alamat email ini sudah terdaftar di sistem.';
  }
  if (lower.includes('check_email_format')) {
    return 'Format email tidak valid. Pastikan penulisan alamat email sudah benar.';
  }
  if (lower.includes('tidak terdaftar') || lower.includes('tidak ditemukan')) {
    return 'Alamat email tidak terdaftar dalam sistem.';
  }
  if (lower.includes('otp') && (lower.includes('tidak valid') || lower.includes('kedaluwarsa') || lower.includes('kadaluarsa'))) {
    return 'Kode OTP tidak valid atau telah kedaluwarsa. Silakan ajukan kode baru.';
  }

  return rawMsg;
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
    const payload = {
      ...data,
      foto_kendaraan_base64_data: data.foto_kendaraan || undefined,
    };
    const res = await apiClient.post('/kim3/kendaraan-tambah', payload);
    return res.data;
  },
  updateKendaraan: async (data: Partial<Kendaraan>): Promise<any> => {
    const payload = {
      ...data,
      foto_kendaraan_base64_data: data.foto_kendaraan || undefined,
    };
    const res = await apiClient.post('/kim3/kendaraan-update', payload);
    return res.data;
  },
  hapusKendaraan: async (no_polisi: string): Promise<any> => {
    const res = await apiClient.post('/kim3/hapus-kendaraan', { no_polisi });
    return res.data;
  },

  // Master Merk Kendaraan (sch_pos.tbl_member_asset_brand via sch_fleet.v_pos_asset_brand)
  getMasterMerk: async (): Promise<MasterBrand[]> => {
    try {
      const res = await apiClient.get('/kim3/master/merk');
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch {
      return [];
    }
  },

  // Master Tipe Kendaraan (sch_pos.tbl_member_asset_type via sch_fleet.v_pos_asset_type)
  getMasterTipe: async (brand?: string): Promise<MasterType[]> => {
    try {
      const res = await apiClient.get('/kim3/master/tipe', {
        params: brand ? { brand } : undefined,
      });
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch {
      return [];
    }
  },

  // Master Jenis Layanan (sch_fleet.v_jenis_layanan)
  getMasterJenisLayanan: async (): Promise<MasterJenisLayanan[]> => {
    try {
      const res = await apiClient.get('/kim3/master/layanan');
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch {
      return [];
    }
  },

  // Master Keluhan / Gejala Kendaraan (sch_fleet.v_master_keluhan)
  getMasterKeluhan: async (): Promise<MasterKeluhan[]> => {
    try {
      const res = await apiClient.get('/kim3/master/keluhan');
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch {
      return [];
    }
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
    nama_pic?: string;
    nama_perusahaan?: string;
    no_telepon?: string;
    peran?: string;
    email_verification_token?: string;
  }): Promise<any> => {
    // Generate secure email verification token if not provided
    const token =
      userData.email_verification_token ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));

    const namaLengkap = (userData.nama_lengkap || '').trim();
    const namaPerusahaan = (userData.nama_perusahaan || '').trim() || namaLengkap;
    const namaPic = (userData.nama_pic || '').trim() || namaLengkap;
    const noTelepon = (userData.no_telepon || '').trim();

    const payload = {
      email: (userData.email || '').trim().toLowerCase(),
      password: userData.password,
      nama_lengkap: namaLengkap,
      nama_perusahaan: namaPerusahaan,
      nama_pic: namaPic,
      no_telepon: noTelepon,
      peran: userData.peran || 'Customer Fleet',
      email_verification_token: token,
    };

    const res = await apiClient.post('/kim3/auth/register', payload);
    return res.data;
  },

  resendVerification: async (email?: string): Promise<{ success: boolean; message: string; already_verified?: boolean }> => {
    const res = await apiClient.post<{ success: boolean; message: string; already_verified?: boolean }>('/kim3/auth/resend-verification', { email });
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string; email?: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string; email?: string }>(
      '/kim3/auth/forgot-password',
      { email }
    );
    return res.data;
  },

  verifyOtp: async (email: string, otp: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      '/kim3/auth/verify-otp',
      { email, otp }
    );
    return res.data;
  },

  resetPassword: async (data: {
    email: string;
    otp: string;
    password_baru: string;
  }): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      '/kim3/auth/reset-password',
      data
    );
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
      nama_pic: (data as any).nama_pic ?? null,
      peran: 'Customer Fleet',
      role: 'Customer_Fleet',
      status_aktif: data.status_aktif !== false,
      id_pelanggan: data.id_pelanggan,
      nama_perusahaan: data.nama_perusahaan ?? data.nama_lengkap,
      alamat: (data as any).alamat ?? null,
      npwp: (data as any).npwp ?? null,
      no_telepon: (data as any).no_telepon ?? null,
      foto_profil: (data as any).foto_profil ?? null,
      email_verifikasi: (data as any).email_verifikasi,
      nomor_hp_verifikasi: (data as any).nomor_hp_verifikasi,
      status_no_aktif: (data as any).status_no_aktif === true,
      pos_verifikasi: (data as any).pos_verifikasi === true,
    };
  },

  // Profil Perusahaan & Akun
  updateProfil: async (data: {
    nama_lengkap: string;
    nama_pic?: string;
    nama_perusahaan?: string;
    alamat?: string;
    npwp?: string;
    no_telepon?: string;
    foto_profil?: string;
    hapus_foto?: boolean | string;
  }): Promise<any> => {
    const payload: any = { ...data };
    if (data.hapus_foto !== undefined) {
      payload.hapus_foto = String(data.hapus_foto);
    } else if ('foto_profil' in data && (data.foto_profil === '' || data.foto_profil === null)) {
      payload.hapus_foto = 'true';
    }
    const res = await apiClient.post('/kim3/profil-simpan', payload);
    return res.data;
  },

  gantiPassword: async (password_baru: string): Promise<any> => {
    const res = await apiClient.post('/kim3/auth/ganti-password', { password_baru });
    return res.data;
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
    id_pengguna?: number | null;
    title: string;
    pesan: string;
    link_tab?: string;
    urgency?: 'urgent' | 'warning' | 'info' | 'success';
  }): Promise<any> => {
    const res = await apiClient.post('/kim3/notifikasi-kirim', data);
    return res.data;
  },
};
