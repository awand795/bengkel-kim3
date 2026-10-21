import axios from 'axios';
import {
  Kendaraan,
  MasterBrand,
  MasterType,
  MasterJenisLayanan,
  MasterKeluhan,
  MasterEmployee,
  KendaraanLookup,
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
  Notifikasi,
  SecurityDashboardStats,
  KunjunganGerbang,
  SecurityBookingItem,
  SecurityOnProgressItem,
  MemoKeluarItem,
  SecurityRiwayatKeluarItem,
  CheckInPayload,
  CheckOutPayload
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
  if (Array.isArray(payload?.data)) {
    return { rows: payload.data, pagination: payload?.pagination ?? null };
  }
  if (payload?.data && typeof payload.data === 'object') {
    return { rows: [payload.data as T], pagination: payload?.pagination ?? null };
  }
  return { rows: [], pagination: payload?.pagination ?? null };
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

/**
 * Regex standar plat nomor Indonesia (TNKB):
 * - 1 atau 2 huruf kode wilayah (misal: B, D, BK, BL, AD, L, dll)
 * - 1 sampai 4 digit nomor polisi (1-9999, tidak diawali 0)
 * - 1 sampai 3 huruf seri sub-wilayah (misal: A, RR, ABC, dll)
 */
export const PLAT_INDONESIA_REGEX = /^([A-Z]{1,2})\s*([1-9][0-9]{0,3})\s*([A-Z]{1,3})$/;

export const isValidPlatIndonesia = (nopol?: string | null): boolean => {
  if (!nopol) return false;
  const clean = String(nopol).trim().toUpperCase();
  return PLAT_INDONESIA_REGEX.test(clean);
};

export const formatPlatIndonesia = (nopol?: string | null): string => {
  if (!nopol) return '';
  const clean = String(nopol).trim().toUpperCase();
  const match = clean.match(PLAT_INDONESIA_REGEX);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return clean;
};

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

/**
 * Mengambil tanggal lokal sistem (YYYY-MM-DD) dengan offset hari (misal 1 untuk besok / H+1).
 */
export const getLocalDateStr = (offsetDays = 0): string => {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    const rawPlat = String(data.no_polisi || '').trim().toUpperCase();
    if (!rawPlat) {
      throw new Error('Nomor polisi wajib diisi.');
    }
    if (!isValidPlatIndonesia(rawPlat)) {
      throw new Error('Format nomor polisi tidak sesuai standar plat Indonesia (contoh: BK 1234 ABC).');
    }
    const merk = cleanField(data.merk).toUpperCase();
    if (!merk) {
      throw new Error('Merk kendaraan wajib diisi.');
    }
    const model = cleanField(data.model).toUpperCase();
    if (!model) {
      throw new Error('Model kendaraan wajib diisi.');
    }
    const type = cleanField(data.type || data.jenis_armada).toUpperCase();
    if (!type) {
      throw new Error('Tipe / bentuk kendaraan wajib diisi.');
    }
    const tahun = Number(data.tahun);
    if (!tahun || tahun < 1970 || tahun > new Date().getFullYear() + 1) {
      throw new Error('Tahun pembuatan kendaraan tidak valid.');
    }

    const payload = {
      ...data,
      no_polisi: formatPlatIndonesia(rawPlat),
      merk,
      model,
      type,
      jenis_armada: type as any,
      tahun,
      unit_name: data.unit_name ? String(data.unit_name).trim().toUpperCase() : undefined,
      no_rangka: data.no_rangka ? String(data.no_rangka).trim().toUpperCase() : undefined,
      no_mesin: data.no_mesin ? String(data.no_mesin).trim().toUpperCase() : undefined,
      asuransi: data.asuransi ? String(data.asuransi).trim().toUpperCase() : undefined,
      note: data.note ? String(data.note).trim() : undefined,
      description: data.description ? String(data.description).trim() : undefined,
      foto_kendaraan_base64_data: data.foto_kendaraan || undefined,
    };
    const res = await apiClient.post('/kim3/kendaraan-tambah', payload);
    return res.data;
  },
  updateKendaraan: async (data: Partial<Kendaraan>): Promise<any> => {
    const payload = {
      ...data,
      merk: data.merk !== undefined ? cleanField(data.merk).toUpperCase() : undefined,
      model: data.model !== undefined ? cleanField(data.model).toUpperCase() : undefined,
      type: (data.type || data.jenis_armada) !== undefined ? cleanField(data.type || data.jenis_armada).toUpperCase() : undefined,
      jenis_armada: (data.type || data.jenis_armada) !== undefined ? cleanField(data.type || data.jenis_armada).toUpperCase() as any : undefined,
      unit_name: data.unit_name !== undefined ? (data.unit_name ? String(data.unit_name).trim().toUpperCase() : '') : undefined,
      no_rangka: data.no_rangka !== undefined ? (data.no_rangka ? String(data.no_rangka).trim().toUpperCase() : '') : undefined,
      no_mesin: data.no_mesin !== undefined ? (data.no_mesin ? String(data.no_mesin).trim().toUpperCase() : '') : undefined,
      asuransi: data.asuransi !== undefined ? (data.asuransi ? String(data.asuransi).trim().toUpperCase() : '') : undefined,
      note: data.note !== undefined ? (data.note ? String(data.note).trim() : '') : undefined,
      description: data.description !== undefined ? (data.description ? String(data.description).trim() : '') : undefined,
      foto_kendaraan_base64_data: data.foto_kendaraan || undefined,
    };
    const res = await apiClient.post('/kim3/kendaraan-update', payload);
    return res.data;
  },
  hapusKendaraan: async (no_polisi: string): Promise<any> => {
    const res = await apiClient.post('/kim3/hapus-kendaraan', { no_polisi });
    return res.data;
  },

  // Lookup Kendaraan & Terhubung Pengguna Fleet (sch_pos.tbl_member_unit via sch_fleet.v_kendaraan_lookup)
  lookupKendaraanByNopol: async (nopol: string): Promise<KendaraanLookup[]> => {
    try {
      const res = await apiClient.get('/kim3/kendaraan-lookup', {
        params: { nopol },
      });
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    } catch {
      return [];
    }
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

  // Master PIC / Petugas / Karyawan (sch_pos.tbl_employee via sch_fleet.v_pos_employee)
  getMasterEmployee: async (params?: { department?: string; jobposition?: string }): Promise<MasterEmployee[]> => {
    const res = await apiClient.get('/kim3/master/pic-employee', { params });
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.data)) return res.data.data;
    return [];
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
    const minBookingDate = getLocalDateStr(1);
    if (data.tanggal_booking && data.tanggal_booking < minBookingDate) {
      throw new Error(`Pemesanan jadwal booking service wajib minimal H+1 dari hari ini (mulai ${minBookingDate}).`);
    }
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
    const rawRole = (data as any).role || (data as any).peran || '';
    const isSecurity = rawRole.toLowerCase().includes('security');
    const peran: PeranUser = isSecurity ? 'Security' : 'Customer Fleet';
    const role = isSecurity ? 'Security' : 'Customer_Fleet';

    return {
      id: data.id,
      email: data.email,
      nama_lengkap: data.nama_lengkap,
      nama_pic: (data as any).nama_pic ?? null,
      peran,
      role,
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

  // -------------------------------------------------------------
  // MODUL SECURITY & POS GERBANG
  // -------------------------------------------------------------

  getSecurityDashboardStats: async (): Promise<SecurityDashboardStats> => {
    let statData: any = {};
    try {
      const res = await apiClient.get('/kim3/security/dashboard');
      const raw = res.data?.data ?? res.data;
      statData = Array.isArray(raw) ? raw[0] : raw;
    } catch (err) {
      console.warn('getSecurityDashboardStats API error:', err);
    }
    return {
      total_masuk_hari_ini: Number(statData?.total_masuk_hari_ini || 0),
      total_di_dalam: Number(statData?.total_di_dalam || 0),
      total_siap_keluar: Number(statData?.total_siap_keluar || 0),
      total_booking_hari_ini: Number(statData?.total_booking_hari_ini || 0),
      total_keluar_hari_ini: Number(statData?.total_keluar_hari_ini || 0),
    };
  },

  getSecurityBookingList: async (params?: { tanggal?: string; search?: string }): Promise<SecurityBookingItem[]> => {
    const isCheckedInStatus = (st?: string | null): boolean => {
      if (!st) return false;
      const s = st.toLowerCase().replace(/[\s\-_]+/g, '');
      return s === 'checkin' || s === 'checkedin' || s === 'sudahmasuk' || s === 'selesaicheckin';
    };

    try {
      const res = await apiClient.get('/kim3/security/booking-list', { params });
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
      if (list.length > 0) {
        return list.map((b: any) => {
          const checkedIn = Boolean(b.sudah_checkin) || isCheckedInStatus(b.status);
          return {
            ...b,
            sudah_checkin: checkedIn,
            status: checkedIn ? 'Check In' : (b.status || 'Booked'),
          };
        });
      }
    } catch (err) {
      console.warn('API /kim3/security/booking-list failed, falling back to /kim3/booking:', err);
    }
    try {
      const allBookings = await api.getBooking();
      return allBookings
        .filter((b) => {
          if (b.status === 'Dibatalkan' || b.status === 'Booking Canceled' || b.is_canceled) return false;
          const checkedIn = isCheckedInStatus(b.status);
          if (b.tanggal_booking && !checkedIn) {
            const parts = (b.jam_booking || '23:59').split(':');
            const h = String(Number(parts[0]) || 0).padStart(2, '0');
            const m = String(Number(parts[1]) || 0).padStart(2, '0');
            const sched = new Date(b.tanggal_booking.slice(0, 10) + 'T' + h + ':' + m + ':00');
            if (!isNaN(sched.getTime()) && Date.now() > sched.getTime()) return false;
          }
          if (params?.tanggal && b.tanggal_booking !== params.tanggal) return false;
          if (params?.search) {
            const q = params.search.toLowerCase();
            const match = (b.no_polisi || '').toLowerCase().includes(q) || (b.no_booking || '').toLowerCase().includes(q) || (b.nama_customer || b.nama_perusahaan || '').toLowerCase().includes(q);
            if (!match) return false;
          }
          return true;
        })
        .map((b) => {
          const checkedIn = isCheckedInStatus(b.status);
          return {
            booking_id: b.id,
            no_booking: b.no_booking,
            no_polisi: b.no_polisi,
            jenis_layanan: b.jenis_layanan || 'Service Berkala',
            tanggal_booking: b.tanggal_booking,
            jam_booking: b.jam_booking,
            keluhan: b.keluhan || b.catatan || '',
            catatan: b.catatan || b.keterangan || '',
            status: checkedIn ? 'Check In' : (b.status || 'Booked'),
            nama_pelanggan: b.nama_perusahaan || b.nama_customer || 'Customer Fleet',
            nama_pic: b.pic_driver || b.nama_customer || '',
            no_telepon: b.no_telepon || '',
            tipe_kendaraan: b.jenis_armada || 'Truk',
            sudah_checkin: checkedIn,
          };
        });
    } catch {
      return [];
    }
  },

  getSecurityKunjungan: async (params?: { status_gerbang?: string; tipe_kunjungan?: string; search?: string }): Promise<KunjunganGerbang[]> => {
    const res = await apiClient.get('/kim3/security/kunjungan', { params });
    const raw = res.data?.data ?? res.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return [raw];
    return [];
  },

  securityCheckIn: async (payload: CheckInPayload): Promise<any> => {
    const res = await apiClient.post('/kim3/security/check-in', payload);
    return res.data;
  },

  getSecurityOnProgress: async (): Promise<SecurityOnProgressItem[]> => {
    try {
      const res = await apiClient.get('/kim3/security/on-progress');
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('API /kim3/security/on-progress failed:', e);
    }
    // Fallback otomatis: sinkronkan dari data kunjungan_gerbang aktif dengan status 'DI_DALAM'
    try {
      const kunjungan = await api.getSecurityKunjungan({ status_gerbang: 'DI_DALAM' });
      return kunjungan.map((k) => ({
        kunjungan_id: k.id,
        nomor_tiket: k.nomor_tiket,
        no_polisi: k.no_polisi,
        tipe_kunjungan: k.tipe_kunjungan,
        nama_pengemudi: k.nama_pengemudi,
        nama_perusahaan: k.nama_perusahaan || '',
        waktu_masuk: k.waktu_masuk ? k.waktu_masuk.slice(0, 16) : '-',
        durasi_jam: 0,
        status_progress: 'Dalam Pemeriksaan SA',
        no_spk: '-',
        foreman: '-',
        mekanik: '-',
      }));
    } catch {
      return [];
    }
  },

  getSecuritySiapCheckOut: async (): Promise<SecurityOnProgressItem[]> => {
    try {
      const res = await apiClient.get('/kim3/security/siap-checkout');
      const raw = res.data?.data ?? res.data;
      const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
      return list;
    } catch (e) {
      console.warn('API /kim3/security/siap-checkout failed:', e);
      return [];
    }
  },

  securityCheckOut: async (payload: CheckOutPayload): Promise<any> => {
    const res = await apiClient.post('/kim3/security/check-out', payload);
    return res.data;
  },

  getSecurityMemoKeluar: async (search?: string): Promise<MemoKeluarItem[]> => {
    const res = await apiClient.get('/kim3/security/memo-keluar', { params: { search } });
    const raw = res.data?.data ?? res.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return [raw];
    return [];
  },

  getSecurityMemoDetail: async (params: { id?: number | string; nomor_memo?: string }): Promise<MemoKeluarItem | null> => {
    const res = await apiClient.get('/kim3/security/memo-keluar-detail', { params });
    const raw = res.data?.data ?? res.data;
    const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
    return list.length > 0 ? list[0] : null;
  },

  getSecurityRiwayatKeluar: async (periode?: 'HARI_INI' | 'KEMARIN' | 'MINGGU_INI' | 'BULAN_INI' | 'SEMUA'): Promise<SecurityRiwayatKeluarItem[]> => {
    const res = await apiClient.get('/kim3/security/riwayat-keluar', { params: { periode: periode || 'HARI_INI' } });
    const raw = res.data?.data ?? res.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return [raw];
    return [];
  },
};
