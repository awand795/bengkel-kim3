import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Phone,
  MessageCircle,
  Loader2,
  KeyRound,
  X,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layout,
  Code,
  Sparkles,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../api/client';
import { PengaturanSitus } from '../types';
import { toast } from '../components/common/Toast';
import { DashboardHtmlBanner } from '../components/common/DashboardHtmlBanner';
import { DEFAULT_DASHBOARD_BANNER_HTML } from '../config/bannerTemplate';

const fmtTanggal = (value?: string | null): string => {
  if (!value) return '-';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const describeError = (err: any, fallback: string): string => {
  const msg = err?.response?.data?.message || err?.message;
  return typeof msg === 'string' && msg.trim() ? msg : fallback;
};

const normalisasiWa = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
};

const waTampilan = (raw: string): string => {
  const digits = normalisasiWa(raw);
  if (!digits) return '-';
  if (digits.startsWith('62')) {
    return `+62 ${digits.slice(2, 5)}-${digits.slice(5, 9)}-${digits.slice(9)}`;
  }
  return digits;
};

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

const Field: React.FC<{
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ id, label, hint, children }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block text-xs font-semibold text-ink">
      {label}
    </label>
    {children}
    {hint && <p className="text-[10px] text-ink-muted leading-tight">{hint}</p>}
  </div>
);

const ModalShell: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, subtitle, onClose, children, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
    <div className="w-full max-w-md bg-surface-raised rounded-2xl shadow-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3.5 border-t border-border bg-surface/50 flex items-center justify-end gap-2">
          {footer}
        </div>
      )}
    </div>
  </div>
);

// ── Tab: Pengaturan Web, Banner Iklan & WhatsApp ────────────────────────────
const PengaturanTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [waNomor, setWaNomor] = useState('');
  const [waPesan, setWaPesan] = useState('');
  const [savingWa, setSavingWa] = useState(false);

  const [bannerAktif, setBannerAktif] = useState(true);
  const [bannerHtml, setBannerHtml] = useState(DEFAULT_DASHBOARD_BANNER_HTML);
  const [savingBanner, setSavingBanner] = useState(false);

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
    if (map.dashboard_banner_aktif?.nilai !== undefined) {
      setBannerAktif(map.dashboard_banner_aktif.nilai !== 'false');
    }
    if (map.dashboard_banner_html?.nilai !== undefined) {
      setBannerHtml(map.dashboard_banner_html.nilai || '');
    }
  }, [data]);

  const nomorFinal = normalisasiWa(waNomor);
  const linkPratinjau = nomorFinal
    ? `https://wa.me/${nomorFinal}?text=${encodeURIComponent(waPesan || 'Halo Master Truck')}`
    : '';

  const handleSaveWa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorFinal || nomorFinal.length < 10) {
      return toast.warning('Nomor WhatsApp tidak valid', 'Gunakan nomor Indonesia, mis. 081234567890 atau 6281234567890.');
    }
    if (!waPesan.trim()) {
      return toast.warning('Pesan otomatis wajib diisi', 'Pesan ini dipakai sebagai teks awal saat pelanggan membuka WhatsApp.');
    }

    setSavingWa(true);
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
      toast.success('Pengaturan WhatsApp disimpan', 'Nomor WhatsApp pada sidebar & menu mobile langsung diperbarui.');
    } catch (err) {
      toast.error('Gagal menyimpan WhatsApp', describeError(err, 'Coba beberapa saat lagi.'));
    } finally {
      setSavingWa(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBanner(true);
    try {
      await api.simpanPengaturan({
        kunci: 'dashboard_banner_aktif',
        nilai: bannerAktif ? 'true' : 'false',
        keterangan: 'Status aktifasi banner iklan dashboard (true/false)',
      });
      await api.simpanPengaturan({
        kunci: 'dashboard_banner_html',
        nilai: bannerHtml.trim(),
        keterangan: 'Kode HTML konten banner iklan dashboard customer',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-pengaturan'] }),
        queryClient.invalidateQueries({ queryKey: ['pengaturan-publik'] }),
      ]);
      toast.success('Pengaturan Banner Disimpan', 'Banner iklan pada dashboard customer berhasil diperbarui.');
    } catch (err) {
      toast.error('Gagal menyimpan banner iklan', describeError(err, 'Coba beberapa saat lagi.'));
    } finally {
      setSavingBanner(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── KARTU 1: PENGATURAN BANNER IKLAN DASHBOARD (HTML / CAROUSEL) ── */}
      <div className="rounded-xl bg-surface-raised border border-border overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-surface/50">
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4 text-[#1D4ED8]" />
            <div>
              <h2 className="text-xs font-bold text-ink">Banner Iklan Dashboard Customer (HTML)</h2>
              <p className="text-[10px] text-ink-muted">
                Atur konten promosi/banner HTML yang tampil di bagian paling bawah halaman dashboard customer.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bannerAktif}
                onChange={(e) => setBannerAktif(e.target.checked)}
                className="w-4 h-4 rounded text-accent accent-[#1D4ED8] focus:ring-accent/30 cursor-pointer"
              />
              <span className={bannerAktif ? 'text-status-green font-bold' : 'text-ink-muted'}>
                {bannerAktif ? 'Banner Aktif' : 'Banner Dinonaktifkan'}
              </span>
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-ink-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat banner...
          </div>
        ) : (
          <form onSubmit={handleSaveBanner} className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-accent" />
                Editor Kode HTML Banner
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBannerHtml(DEFAULT_DASHBOARD_BANNER_HTML);
                    toast.info('Template Dimuat', 'Template sample slider iklan 3 slide telah dimuat ke editor.');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-accent/30 bg-accent-subtle/50 text-accent hover:bg-accent-subtle text-[11px] font-semibold transition cursor-pointer"
                  title="Pakai template slider otomatis 3 slide promosi Master Truck"
                >
                  <Sparkles className="w-3 h-3" />
                  Pakai Template Sample Slider Truk
                </button>
                <button
                  type="button"
                  onClick={() => setBannerHtml('')}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-status-red text-[11px] font-medium transition cursor-pointer"
                  title="Kosongkan HTML"
                >
                  <RotateCcw className="w-3 h-3" />
                  Bersihkan
                </button>
              </div>
            </div>

            <textarea
              value={bannerHtml}
              onChange={(e) => setBannerHtml(e.target.value)}
              rows={10}
              placeholder="<!-- Masukkan kode HTML & inline CSS banner di sini... -->"
              className="w-full px-3.5 py-3 rounded-xl border border-border bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              spellCheck={false}
            />

            {/* Live Interactive Preview Box */}
            <div className="rounded-xl border border-border bg-surface/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-accent" />
                  Live Pratinjau Tampilan Dashboard
                </p>
                <span className="text-[10px] text-ink-subtle">
                  {bannerAktif ? 'Tampil di dashboard pelanggan' : 'Disembunyikan dari dashboard pelanggan'}
                </span>
              </div>
              {bannerHtml.trim() ? (
                <div className="rounded-xl overflow-hidden border border-border shadow-xs bg-surface">
                  <DashboardHtmlBanner html={bannerHtml} />
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-ink-muted border border-dashed border-border rounded-xl">
                  Kode HTML masih kosong. Klik &quot;Pakai Template Sample Slider Truk&quot; di atas untuk mencoba template sample.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[10px] text-ink-muted">
                Terakhir diubah: {map.dashboard_banner_html?.update_dt ? fmtTanggal(map.dashboard_banner_html.update_dt) : '-'}
              </p>
              <button
                type="submit"
                disabled={savingBanner}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
              >
                {savingBanner ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Simpan Banner Iklan
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── KARTU 2: PENGATURAN WHATSAPP LAYANAN PELANGGAN ── */}
      <div className="rounded-xl bg-surface-raised border border-border overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border flex items-center gap-2 bg-surface/50">
          <MessageCircle className="w-4 h-4 text-[#16A34A]" />
          <div>
            <h2 className="text-xs font-bold text-ink">Kontak WhatsApp Layanan Pelanggan</h2>
            <p className="text-[10px] text-ink-muted">
              Tombol &ldquo;Chat WhatsApp&rdquo; di halaman web Customer Fleet memakai nomor resmi ini.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-ink-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat WhatsApp...
          </div>
        ) : (
          <form onSubmit={handleSaveWa} className="p-4 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field
                id="set-wa"
                label="Nomor WhatsApp Layanan *"
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
              <Field id="set-pesan" label="Pesan Otomatis *" hint="Teks awal yang muncul di chat pelanggan saat klik tautan WhatsApp.">
                <textarea
                  id="set-pesan"
                  value={waPesan}
                  onChange={(e) => setWaPesan(e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="Halo Master Truck, saya butuh bantuan..."
                />
              </Field>
            </div>

            <div className="rounded-lg border border-border bg-surface/60 p-3 space-y-2">
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">Pratinjau Tampilan & Tautan</p>
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 text-[#12388F]" />
                <span className="font-bold font-mono text-ink">
                  {nomorFinal ? waTampilan(nomorFinal) : '-'}
                </span>
              </div>
              <div className="rounded-lg bg-[#DCFCE7] dark:bg-emerald-950/40 border border-[#BBF7D0] dark:border-emerald-900 px-3 py-2">
                <p className="text-[11px] text-[#166534] dark:text-emerald-200 leading-relaxed break-words">
                  {waPesan || 'Halo Master Truck, saya butuh bantuan...'}
                </p>
              </div>
              {linkPratinjau && (
                <a
                  href={linkPratinjau}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#16A34A] hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Uji Tautan WhatsApp Customer
                </a>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[10px] text-ink-muted">
                Terakhir diubah: {map.wa_cs?.update_dt ? fmtTanggal(map.wa_cs.update_dt) : '-'}
              </p>
              <button
                type="submit"
                disabled={savingWa}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#12388F] hover:bg-[#0F2F78] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingWa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Simpan Nomor WhatsApp
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface/60 p-3.5 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-ink-muted leading-relaxed">
          Pengaturan ini berlaku secara realtime untuk seluruh pelanggan di portal Web Fleet Customer Master Truck.
        </p>
      </div>
    </div>
  );
};

// ── View utama Admin Portal ────────────────────────────────────────────────
export const AdminPortalView: React.FC<{ initialMenu?: string }> = () => {
  const authUser = useAppStore((s) => s.authUser);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdBaru, setPwdBaru] = useState('');
  const [pwdUlang, setPwdUlang] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

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
          <SettingsIcon className="w-3.5 h-3.5 text-white" />
          <span>Pengaturan Portal Web Fleet KIM 3</span>
        </div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
          Panel Administrator
        </h1>
        <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed font-normal">
          Konfigurasi nomor WhatsApp resmi layanan pelanggan Bengkel KIM 3.
        </p>
        <p className="text-[11px] text-white/70 mt-1 max-w-xl leading-relaxed font-normal">
          {authUser?.nama_lengkap || 'Admin'} &bull; {authUser?.email || 'admin@mastertruck.co.id'}
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
                Demi keamanan, ganti password sekarang.
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

      {/* Konten Utama: Pengaturan Nomor WA */}
      <PengaturanTab />

      {/* Modal ganti password admin */}
      {pwdOpen && (
        <ModalShell
          title="Ganti Password Admin"
          subtitle="Minimal 8 karakter. Gunakan kombinasi huruf dan angka."
          onClose={() => setPwdOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setPwdOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="form-ganti-pwd"
                disabled={pwdSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#12388F] hover:bg-[#0F2F78] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pwdSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Simpan Password Baru
              </button>
            </>
          }
        >
          <form id="form-ganti-pwd" onSubmit={handleGantiPassword} className="space-y-3.5">
            <Field id="pwd-baru" label="Password Baru *">
              <input
                id="pwd-baru"
                type="password"
                value={pwdBaru}
                onChange={(e) => setPwdBaru(e.target.value)}
                className={inputClass}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                required
              />
            </Field>
            <Field id="pwd-ulang" label="Ulangi Password Baru *">
              <input
                id="pwd-ulang"
                type="password"
                value={pwdUlang}
                onChange={(e) => setPwdUlang(e.target.value)}
                className={inputClass}
                placeholder="Tulis ulang password baru"
                autoComplete="new-password"
                required
              />
            </Field>
          </form>
        </ModalShell>
      )}
    </div>
  );
};
