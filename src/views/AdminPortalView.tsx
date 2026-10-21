import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  UserCog,
  Settings as SettingsIcon,
  Plus,
  Pencil,
  Search,
  X,
  Loader2,
  KeyRound,
  Phone,
  MessageCircle,
  AlertTriangle,
  Users,
  CheckCircle2,
  Power,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../api/client';
import { AdminUser, PengaturanSitus, SecurityUser } from '../types';
import { toast } from '../components/common/Toast';

export type AdminMenu = 'security' | 'akun' | 'pengaturan';

interface AdminPortalViewProps {
  initialMenu?: AdminMenu;
}

const fmtTanggal = (value?: string | null): string => {
  if (!value) return '-';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const describeError = (err: any, fallback: string): string => {
  const raw = String(
    err?.response?.data?.error || err?.response?.data?.message || err?.message || ''
  );
  if (raw.toLowerCase().includes('duplicate key')) {
    return 'Email tersebut sudah dipakai akun lain.';
  }
  if (raw && !/bad sql grammar|internal server|database execution error/i.test(raw)) {
    return raw;
  }
  return fallback;
};

/** Nomor WA Indonesia → format internasional 62xxx (tanpa simbol). */
const normalisasiWa = (input: string): string => {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

const waTampilan = (nomor: string): string => {
  const digits = nomor.replace(/\D/g, '');
  return digits.startsWith('62') ? `0${digits.slice(2)}` : digits;
};

// ── Komponen kecil ────────────────────────────────────────────────────────
const Field: React.FC<{
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ id, label, hint, children }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block text-[11px] font-semibold text-ink">
      {label}
    </label>
    {children}
    {hint && <p className="text-[10px] text-ink-muted leading-relaxed">{hint}</p>}
  </div>
);

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-border bg-surface text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

const ModalShell: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  wide?: boolean;
}> = ({ title, subtitle, onClose, children, footer, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
    <div
      className="absolute inset-0 bg-surface-dark/60 backdrop-blur-xs"
      onClick={onClose}
      aria-hidden="true"
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto bg-surface-raised rounded-xl border border-border shadow-2xl`}
    >
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border sticky top-0 bg-surface-raised z-10">
        <div>
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-[11px] text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
          aria-label="Tutup dialog"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-4 sm:px-5 py-4 space-y-3.5">{children}</div>
      <div className="px-4 sm:px-5 py-3.5 border-t border-border bg-surface/60 flex items-center justify-end gap-2 sticky bottom-0">
        {footer}
      </div>
    </div>
  </div>
);

const StatusPill: React.FC<{ aktif: boolean }> = ({ aktif }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
      aktif
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${aktif ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {aktif ? 'Aktif' : 'Nonaktif'}
  </span>
);

const EmptyState: React.FC<{ icon: any; title: string; message: string }> = ({
  icon: Icon,
  title,
  message,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-4">
    <div className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-ink-muted" />
    </div>
    <p className="text-xs font-bold text-ink">{title}</p>
    <p className="text-[11px] text-ink-muted mt-1 max-w-xs">{message}</p>
  </div>
);

// ── Tab: Akun Security ────────────────────────────────────────────────────
interface SecurityFormState {
  id?: number;
  nama_lengkap: string;
  email: string;
  no_telepon: string;
  pos_jaga: string;
  password: string;
  status_aktif: boolean;
}

const emptySecurityForm: SecurityFormState = {
  nama_lengkap: '',
  email: '',
  no_telepon: '',
  pos_jaga: 'Pos Gerbang Utama',
  password: '',
  status_aktif: true,
};

const SecurityTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SecurityFormState>(emptySecurityForm);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-security-users'],
    queryFn: () => api.getSecurityUsers({ limit: 150 }),
  });

  const rows = useMemo(() => {
    const list = data?.rows ?? [];
    const q = keyword.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) =>
      [row.nama_lengkap, row.email, row.pos_jaga]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, keyword]);

  const totalAktif = (data?.rows ?? []).filter((r) => r.status_aktif).length;

  const openCreate = () => {
    setForm(emptySecurityForm);
    setFormOpen(true);
  };

  const openEdit = (row: SecurityUser) => {
    setForm({
      id: row.id,
      nama_lengkap: row.nama_lengkap,
      email: row.email,
      no_telepon: row.no_telepon || '',
      pos_jaga: row.pos_jaga || '',
      password: '',
      status_aktif: row.status_aktif !== false,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(form.id);
    if (!form.nama_lengkap.trim()) return toast.warning('Nama wajib diisi', 'Lengkapi nama lengkap petugas security.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return toast.warning('Email tidak valid', 'Gunakan format email yang benar, mis. petugas@perusahaan.com.');
    }
    if (!isEdit && form.password.trim().length < 8) {
      return toast.warning('Password terlalu pendek', 'Minimal 8 karakter untuk akun baru.');
    }
    if (isEdit && form.password && form.password.trim().length < 8) {
      return toast.warning('Password terlalu pendek', 'Kosongkan jika tidak ingin mengganti password, atau isi minimal 8 karakter.');
    }

    setSaving(true);
    try {
      await api.simpanSecurityUser({
        id: form.id,
        nama_lengkap: form.nama_lengkap.trim(),
        email: form.email.trim().toLowerCase(),
        no_telepon: form.no_telepon.trim(),
        pos_jaga: form.pos_jaga.trim(),
        password: form.password.trim() || undefined,
        status_aktif: form.status_aktif,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-security-users'] });
      toast.success(
        isEdit ? 'Akun security diperbarui' : 'Akun security ditambahkan',
        isEdit ? 'Perubahan akun langsung berlaku.' : 'Petugas baru dapat login memakai email & password tersebut.'
      );
      setFormOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan akun', describeError(err, 'Periksa kembali data lalu coba lagi.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (row: SecurityUser) => {
    try {
      await api.setSecurityUserStatus(row.id, row.status_aktif !== false ? false : true);
      await queryClient.invalidateQueries({ queryKey: ['admin-security-users'] });
      toast.success(
        row.status_aktif ? 'Akun dinonaktifkan' : 'Akun diaktifkan kembali',
        `${row.nama_lengkap} ${row.status_aktif ? 'tidak bisa login sampai diaktifkan lagi.' : 'sudah bisa login kembali.'}`
      );
    } catch (err) {
      toast.error('Gagal mengubah status akun', describeError(err, 'Coba beberapa saat lagi.'));
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface-raised border border-border p-3.5">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">Total Petugas</p>
          <p className="text-xl font-black text-ink mt-1">{data?.rows.length ?? 0}</p>
        </div>
        <div className="rounded-xl bg-surface-raised border border-border p-3.5">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">Aktif</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{totalAktif}</p>
        </div>
        <div className="rounded-xl bg-surface-raised border border-border p-3.5 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">Nonaktif</p>
          <p className="text-xl font-black text-ink-muted mt-1">{(data?.rows.length ?? 0) - totalAktif}</p>
        </div>
      </div>

      <div className="rounded-xl bg-surface-raised border border-border">
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2.5 border-b border-border">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama, email, atau pos jaga..."
              className={`${inputClass} pl-8`}
              aria-label="Cari akun security"
            />
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#12388F] hover:bg-[#0F2F78] text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Akun Security
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-ink-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat akun security...
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={keyword ? 'Tidak ada akun yang cocok' : 'Belum ada akun security'}
            message={
              keyword
                ? 'Coba kata kunci lain atau hapus filter pencarian.'
                : 'Tambahkan petugas pos gerbang agar bisa memakai Portal Security.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-ink-muted border-b border-border bg-surface/60">
                  <th className="px-3.5 py-2.5 font-bold">Nama & Email</th>
                  <th className="px-3.5 py-2.5 font-bold">Pos Jaga</th>
                  <th className="px-3.5 py-2.5 font-bold">No. Telepon</th>
                  <th className="px-3.5 py-2.5 font-bold">Status</th>
                  <th className="px-3.5 py-2.5 font-bold">Terdaftar</th>
                  <th className="px-3.5 py-2.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-3.5 py-2.5">
                      <p className="font-semibold text-ink">{row.nama_lengkap}</p>
                      <p className="text-[10px] text-ink-muted">{row.email}</p>
                    </td>
                    <td className="px-3.5 py-2.5 text-ink-muted">{row.pos_jaga || '-'}</td>
                    <td className="px-3.5 py-2.5 text-ink-muted">{row.no_telepon || '-'}</td>
                    <td className="px-3.5 py-2.5">
                      <StatusPill aktif={row.status_aktif !== false} />
                    </td>
                    <td className="px-3.5 py-2.5 text-ink-muted whitespace-nowrap">
                      {fmtTanggal(row.created_at)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-accent-subtle hover:text-accent text-[10px] font-semibold text-ink transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" /> Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(row)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-colors cursor-pointer ${
                            row.status_aktif
                              ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300'
                              : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          {row.status_aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <ModalShell
          title={form.id ? 'Ubah Akun Security' : 'Tambah Akun Security'}
          subtitle="Akun ini dipakai untuk login ke Portal Security pos gerbang."
          onClose={() => setFormOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-ink hover:bg-surface transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="form-security"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#12388F] hover:bg-[#0F2F78] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {form.id ? 'Simpan Perubahan' : 'Tambah Akun'}
              </button>
            </>
          }
        >
          <form id="form-security" onSubmit={handleSubmit} className="space-y-3.5">
            <Field id="sec-nama" label="Nama Lengkap *">
              <input
                id="sec-nama"
                value={form.nama_lengkap}
                onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                className={inputClass}
                placeholder="mis. Security Gerbang Utama (Pos 1)"
                autoComplete="off"
              />
            </Field>
            <Field id="sec-email" label="Email Login *" hint="Dipakai untuk login. Gunakan email aktif perusahaan.">
              <input
                id="sec-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                placeholder="petugas@mastertruck.co.id"
                autoComplete="off"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field id="sec-pos" label="Pos Jaga">
                <input
                  id="sec-pos"
                  value={form.pos_jaga}
                  onChange={(e) => setForm({ ...form, pos_jaga: e.target.value })}
                  className={inputClass}
                  placeholder="Pos Gerbang Utama"
                />
              </Field>
              <Field id="sec-telp" label="No. Telepon / WhatsApp">
                <input
                  id="sec-telp"
                  value={form.no_telepon}
                  onChange={(e) => setForm({ ...form, no_telepon: e.target.value })}
                  className={inputClass}
                  placeholder="0812xxxxxxx"
                  inputMode="tel"
                />
              </Field>
            </div>
            <Field
              id="sec-pass"
              label={form.id ? 'Password Baru (opsional)' : 'Password Awal *'}
              hint={
                form.id
                  ? 'Kosongkan bila tidak ingin mengganti password petugas.'
                  : 'Minimal 8 karakter. Sampaikan ke petugas setelah akun dibuat.'
              }
            >
              <input
                id="sec-pass"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
                placeholder={form.id ? '•••••••• (biarkan kosong)' : '••••••••'}
                autoComplete="new-password"
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-ink cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.status_aktif}
                onChange={(e) => setForm({ ...form, status_aktif: e.target.checked })}
                className="w-4 h-4 rounded border-border text-[#12388F] focus:ring-accent/30"
              />
              Akun aktif (bisa login)
            </label>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

// ── Tab: Akun Admin ───────────────────────────────────────────────────────
interface AdminFormState {
  id?: number;
  nama_lengkap: string;
  email: string;
  jabatan: string;
  no_telepon: string;
  password: string;
  status_aktif: boolean;
}

const emptyAdminForm: AdminFormState = {
  nama_lengkap: '',
  email: '',
  jabatan: 'Admin Operasional',
  no_telepon: '',
  password: '',
  status_aktif: true,
};

const AdminTab: React.FC = () => {
  const queryClient = useQueryClient();
  const authUser = useAppStore((s) => s.authUser);
  const [keyword, setKeyword] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AdminFormState>(emptyAdminForm);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-admin-users'],
    queryFn: () => api.getAdminUsers({ limit: 150 }),
  });

  const rows = useMemo(() => {
    const list = data?.rows ?? [];
    const q = keyword.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) =>
      [row.nama_lengkap, row.email, row.jabatan]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, keyword]);

  const openCreate = () => {
    setForm(emptyAdminForm);
    setFormOpen(true);
  };

  const openEdit = (row: AdminUser) => {
    setForm({
      id: row.id,
      nama_lengkap: row.nama_lengkap,
      email: row.email,
      jabatan: row.jabatan || '',
      no_telepon: row.no_telepon || '',
      password: '',
      status_aktif: row.status_aktif !== false,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = Boolean(form.id);
    if (!form.nama_lengkap.trim()) return toast.warning('Nama wajib diisi', 'Lengkapi nama lengkap administrator.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return toast.warning('Email tidak valid', 'Gunakan format email yang benar.');
    }
    if (!isEdit && form.password.trim().length < 8) {
      return toast.warning('Password terlalu pendek', 'Minimal 8 karakter untuk akun baru.');
    }
    if (isEdit && form.password && form.password.trim().length < 8) {
      return toast.warning('Password terlalu pendek', 'Kosongkan jika tidak ingin mengganti password, atau isi minimal 8 karakter.');
    }
    if (form.id && authUser?.id === form.id && !form.status_aktif) {
      return toast.warning('Tidak bisa menonaktifkan diri sendiri', 'Minta admin lain menonaktifkan akun Anda.');
    }

    setSaving(true);
    try {
      await api.simpanAdminUser({
        id: form.id,
        nama_lengkap: form.nama_lengkap.trim(),
        email: form.email.trim().toLowerCase(),
        jabatan: form.jabatan.trim(),
        no_telepon: form.no_telepon.trim(),
        password: form.password.trim() || undefined,
        status_aktif: form.status_aktif,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-admin-users'] });
      toast.success(
        isEdit ? 'Akun admin diperbarui' : 'Akun admin ditambahkan',
        isEdit ? 'Perubahan akun langsung berlaku.' : 'Administrator baru dapat login ke Portal Admin.'
      );
      setFormOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan akun', describeError(err, 'Periksa kembali data lalu coba lagi.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="rounded-xl bg-surface-raised border border-border">
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2.5 border-b border-border">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama, email, atau jabatan..."
              className={`${inputClass} pl-8`}
              aria-label="Cari akun admin"
            />
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#12388F] hover:bg-[#0F2F78] text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Akun Admin
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-ink-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat akun admin...
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title={keyword ? 'Tidak ada akun yang cocok' : 'Belum ada akun admin'}
            message={
              keyword
                ? 'Coba kata kunci lain atau hapus filter pencarian.'
                : 'Tambahkan administrator untuk mengelola akun & pengaturan web.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-ink-muted border-b border-border bg-surface/60">
                  <th className="px-3.5 py-2.5 font-bold">Nama & Email</th>
                  <th className="px-3.5 py-2.5 font-bold">Jabatan</th>
                  <th className="px-3.5 py-2.5 font-bold">No. Telepon</th>
                  <th className="px-3.5 py-2.5 font-bold">Status</th>
                  <th className="px-3.5 py-2.5 font-bold">Terdaftar</th>
                  <th className="px-3.5 py-2.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-3.5 py-2.5">
                      <p className="font-semibold text-ink">
                        {row.nama_lengkap}
                        {authUser?.id === row.id && (
                          <span className="ml-1.5 text-[9px] font-bold text-accent">(Anda)</span>
                        )}
                      </p>
                      <p className="text-[10px] text-ink-muted">{row.email}</p>
                    </td>
                    <td className="px-3.5 py-2.5 text-ink-muted">{row.jabatan || '-'}</td>
                    <td className="px-3.5 py-2.5 text-ink-muted">{row.no_telepon || '-'}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusPill aktif={row.status_aktif !== false} />
                        {row.harus_ganti_password && (
                          <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                            Password sementara
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-ink-muted whitespace-nowrap">
                      {fmtTanggal(row.terdaftar)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-accent-subtle hover:text-accent text-[10px] font-semibold text-ink transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" /> Ubah
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <ModalShell
          title={form.id ? 'Ubah Akun Admin' : 'Tambah Akun Admin'}
          subtitle="Akun ini memiliki akses penuh ke Portal Admin: kelola akun & pengaturan web."
          onClose={() => setFormOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-ink hover:bg-surface transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="form-admin"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#12388F] hover:bg-[#0F2F78] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {form.id ? 'Simpan Perubahan' : 'Tambah Akun'}
              </button>
            </>
          }
        >
          <form id="form-admin" onSubmit={handleSubmit} className="space-y-3.5">
            <Field id="adm-nama" label="Nama Lengkap *">
              <input
                id="adm-nama"
                value={form.nama_lengkap}
                onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                className={inputClass}
                placeholder="mis. Administrator Bengkel KIM 3"
                autoComplete="off"
              />
            </Field>
            <Field id="adm-email" label="Email Login *">
              <input
                id="adm-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                placeholder="admin@mastertruck.co.id"
                autoComplete="off"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field id="adm-jabatan" label="Jabatan">
                <input
                  id="adm-jabatan"
                  value={form.jabatan}
                  onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                  className={inputClass}
                  placeholder="Admin Operasional"
                />
              </Field>
              <Field id="adm-telp" label="No. Telepon / WhatsApp">
                <input
                  id="adm-telp"
                  value={form.no_telepon}
                  onChange={(e) => setForm({ ...form, no_telepon: e.target.value })}
                  className={inputClass}
                  placeholder="0812xxxxxxx"
                  inputMode="tel"
                />
              </Field>
            </div>
            <Field
              id="adm-pass"
              label={form.id ? 'Password Baru (opsional)' : 'Password Awal *'}
              hint={
                form.id
                  ? 'Kosongkan bila tidak ingin mengganti password. Jika diisi, admin wajib menggantinya saat login berikutnya.'
                  : 'Minimal 8 karakter. Sampaikan ke admin setelah akun dibuat.'
              }
            >
              <input
                id="adm-pass"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
                placeholder={form.id ? '•••••••• (biarkan kosong)' : '••••••••'}
                autoComplete="new-password"
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-ink cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.status_aktif}
                onChange={(e) => setForm({ ...form, status_aktif: e.target.checked })}
                className="w-4 h-4 rounded border-border text-[#12388F] focus:ring-accent/30"
              />
              Akun aktif (bisa login)
            </label>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

// ── Tab: Pengaturan Web ───────────────────────────────────────────────────
const PengaturanTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [waNomor, setWaNomor] = useState('');
  const [waPesan, setWaPesan] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pengaturan'],
    queryFn: api.getPengaturan,
  });

  const map = useMemo(() => {
    return (data || []).reduce<Record<string, PengaturanSitus>>((acc, item) => {
      acc[item.kunci] = item;
      return acc;
    }, {});
  }, [data]);

  useEffect(() => {
    if (!data) return;
    setWaNomor(map.wa_cs?.nilai || '');
    setWaPesan(map.wa_cs_pesan?.nilai || '');
  }, [data]);

  const nomorFinal = normalisasiWa(waNomor);
  const linkPratinjau = nomorFinal
    ? `https://wa.me/${nomorFinal}?text=${encodeURIComponent(waPesan || 'Halo Bengkel KIM3')}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorFinal || nomorFinal.length < 10) {
      return toast.warning('Nomor WhatsApp tidak valid', 'Gunakan nomor Indonesia, mis. 081234567890 atau 6281234567890.');
    }
    if (!waPesan.trim()) {
      return toast.warning('Pesan otomatis wajib diisi', 'Pesan ini dipakai sebagai teks awal saat pelanggan membuka WhatsApp.');
    }

    setSaving(true);
    try {
      await api.simpanPengaturan({
        kunci: 'wa_cs',
        nilai: nomorFinal,
        keterangan: 'Nomor WhatsApp layanan pelanggan (format 62...)',
      });
      await api.simpanPengaturan({
        kunci: 'wa_cs_pesan',
        nilai: waPesan.trim(),
        keterangan: 'Pesan otomatis WhatsApp',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-pengaturan'] }),
        queryClient.invalidateQueries({ queryKey: ['pengaturan-publik'] }),
      ]);
      toast.success('Pengaturan disimpan', 'Nomor WhatsApp pada sidebar & menu mobile langsung diperbarui.');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan', describeError(err, 'Coba beberapa saat lagi.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="rounded-xl bg-surface-raised border border-border">
        <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#16A34A]" />
          <div>
            <h2 className="text-xs font-bold text-ink">Kontak WhatsApp Halaman Web</h2>
            <p className="text-[10px] text-ink-muted">
              Tombol &ldquo;Chat WhatsApp&rdquo; di sidebar desktop dan menu mobile memakai nomor ini.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-ink-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat pengaturan...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field
                id="set-wa"
                label="Nomor WhatsApp *"
                hint="Boleh diawali 0 atau 62 — otomatis disimpan dalam format 62."
              >
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="set-wa"
                    value={waNomor}
                    onChange={(e) => setWaNomor(e.target.value)}
                    className={`${inputClass} pl-8 font-mono`}
                    placeholder="081234567890"
                    inputMode="tel"
                  />
                </div>
              </Field>
              <Field id="set-pesan" label="Pesan Otomatis *" hint="Teks awal yang muncul di chat pelanggan.">
                <textarea
                  id="set-pesan"
                  value={waPesan}
                  onChange={(e) => setWaPesan(e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="Halo Bengkel KIM3, saya butuh bantuan..."
                />
              </Field>
            </div>

            <div className="rounded-lg border border-border bg-surface/60 p-3 space-y-2">
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">Pratinjau</p>
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 text-[#12388F]" />
                <span className="font-bold font-mono text-ink">
                  {nomorFinal ? waTampilan(nomorFinal) : '-'}
                </span>
              </div>
              <div className="rounded-lg bg-[#DCFCE7] dark:bg-emerald-950/40 border border-[#BBF7D0] dark:border-emerald-900 px-3 py-2">
                <p className="text-[11px] text-[#166534] dark:text-emerald-200 leading-relaxed break-words">
                  {waPesan || 'Halo Bengkel KIM3, saya butuh bantuan...'}
                </p>
              </div>
              {linkPratinjau && (
                <a
                  href={linkPratinjau}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#16A34A] hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Uji tautan WhatsApp
                </a>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[10px] text-ink-muted">
                Terakhir diubah: {map.wa_cs?.update_dt ? fmtTanggal(map.wa_cs.update_dt) : '-'}
              </p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#12388F] hover:bg-[#0F2F78] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Simpan Pengaturan
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface/60 p-3.5 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-ink-muted leading-relaxed">
          Nomor ini tampil untuk semua portal (Customer Fleet & Security). Gunakan nomor layanan resmi
          bengkel yang aktif menerima chat, bukan nomor pribadi petugas.
        </p>
      </div>
    </div>
  );
};

// ── View utama ────────────────────────────────────────────────────────────
export const AdminPortalView: React.FC<AdminPortalViewProps> = ({ initialMenu = 'security' }) => {
  const authUser = useAppStore((s) => s.authUser);
  const [menu, setMenu] = useState<AdminMenu>(initialMenu);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdBaru, setPwdBaru] = useState('');
  const [pwdUlang, setPwdUlang] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    setMenu(initialMenu);
  }, [initialMenu]);

  const tabs: { id: AdminMenu; label: string; icon: any }[] = [
    { id: 'security', label: 'Akun Security', icon: ShieldCheck },
    { id: 'akun', label: 'Akun Admin', icon: UserCog },
    { id: 'pengaturan', label: 'Pengaturan Web', icon: SettingsIcon },
  ];

  const handleGantiPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdBaru.trim().length < 8) {
      return toast.warning('Password terlalu pendek', 'Minimal 8 karakter.');
    }
    if (pwdBaru !== pwdUlang) {
      return toast.warning('Konfirmasi tidak cocok', 'Ulangi penulisan password baru.');
    }
    setPwdSaving(true);
    try {
      await api.gantiPasswordAdmin(pwdBaru);
      const next = { ...(authUser || ({} as any)), harus_ganti_password: false };
      useAppStore.setState({ authUser: next });
      try {
        localStorage.setItem('bengkel_auth_user', JSON.stringify(next));
      } catch {
        /* abaikan */
      }
      toast.success('Password berhasil diganti', 'Gunakan password baru pada login berikutnya.');
      setPwdOpen(false);
      setPwdBaru('');
      setPwdUlang('');
    } catch (err) {
      toast.error('Gagal mengganti password', describeError(err, 'Coba beberapa saat lagi.'));
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Banner identitas admin */}
      <div className="rounded-xl p-5 sm:p-6 shadow-sm border-0 bg-[#1D4ED8] text-white dark:bg-[#1B42B8]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold mb-2 shadow-2xs">
          <UserCog className="w-3.5 h-3.5 text-white" />
          <span>Portal Administrasi Web Fleet KIM 3</span>
        </div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
          Selamat Datang, {authUser?.nama_lengkap || 'Administrator'}
        </h1>
        <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed font-normal">
          Kelola akun petugas security & administrator, serta atur kontak WhatsApp yang tampil di halaman web.
        </p>
        <p className="text-[11px] text-white/70 mt-1 max-w-xl leading-relaxed font-normal">
          {authUser?.jabatan || 'Super Admin'} &bull; Portal Admin KIM 3 &bull; {authUser?.email || 'admin@mastertruck.co.id'}
        </p>
      </div>

      {authUser?.harus_ganti_password && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-2.5 flex-1">
            <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                Anda masih memakai password sementara
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                Demi keamanan, ganti password sekarang. Password awal hanya untuk login pertama.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPwdOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Ganti Password
          </button>
        </div>
      )}

      {/* Tab menu */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = menu === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMenu(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                isActive
                  ? 'bg-[#12388F] text-white border-[#12388F] shadow-2xs'
                  : 'bg-surface-raised text-ink-muted border-border hover:text-ink hover:bg-surface'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
        <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-[10px] text-ink-muted">
          <Users className="w-3 h-3" />
          Akses: Super Admin
        </span>
      </div>

      {menu === 'security' && <SecurityTab />}
      {menu === 'akun' && <AdminTab />}
      {menu === 'pengaturan' && <PengaturanTab />}

      {/* Modal ganti password admin */}
      {pwdOpen && (
        <ModalShell
          title="Ganti Password Admin"
          subtitle="Minimal 8 karakter. Gunakan kombinasi huruf, angka, dan simbol."
          onClose={() => setPwdOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setPwdOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-ink hover:bg-surface transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="form-pwd-admin"
                disabled={pwdSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#12388F] hover:bg-[#0F2F78] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pwdSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                Simpan Password
              </button>
            </>
          }
        >
          <form id="form-pwd-admin" onSubmit={handleGantiPassword} className="space-y-3.5">
            <Field id="pwd-baru" label="Password Baru *">
              <input
                id="pwd-baru"
                type="password"
                value={pwdBaru}
                onChange={(e) => setPwdBaru(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </Field>
            <Field id="pwd-ulang" label="Ulangi Password Baru *">
              <input
                id="pwd-ulang"
                type="password"
                value={pwdUlang}
                onChange={(e) => setPwdUlang(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </Field>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

export default AdminPortalView;
