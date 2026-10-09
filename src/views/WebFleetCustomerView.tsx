import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, normalizePlat, formatPlat, cleanField, formatMerkModel, formatNamaArmada, getApiErrorMessage } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { Kendaraan, BookingService, SpkService, InvoicePembayaran, SpkItemPekerjaan, SpkItemPart, DokumenKendaraan, PekerjaanTambahan, PurchaseRequestPart } from '../types';
import { PaginationBar } from '../components/common/PaginationBar';
import { useAppStore } from '../store/useAppStore';
import { usePpnRate } from '../hooks/usePpnRate';
import { usePagination } from '../hooks/usePagination';
import { realtimeHub } from '../services/realtimeService';
import { ModalPortal } from '../components/common/ModalPortal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ModalActionButton } from '../components/common/ModalActionButton';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { toast } from '../components/common/Toast';
import { TimePickerInput } from '../components/common/TimePickerInput';
import { etaSpk, labelSumberEta } from '../utils/eta';
import { StepModal } from '../components/common/StepModal';
import { DetailModal } from '../components/common/DetailModal';
import { ListItemCard } from '../components/common/ListItemCard';
import { StatCard } from '../components/common/StatCard';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { FilterChips } from '../components/common/FilterChips';
import { PlateChip } from '../components/common/PlateChip';
import { RupiahCell } from '../components/common/RupiahCell';
import { 
  Truck, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Clock, 
  Lock,
  Download, 
  Plus, 
  ShieldCheck, 
  Building, 
  Phone, 
  Mail, 
  User, 
  ArrowRight,
  Search,
  ChevronRight,
  ChevronDown,
  Wrench,
  AlertCircle,
  XCircle,
  X,
  Camera,
  Package,
  FileCheck,
  Check,
  Info,
  Edit3,
  Trash2,
  Eye,
  Printer,
  ArrowLeft,
  Maximize2,
  ExternalLink,
  Layers,
  AlertTriangle,
  MapPin,
  Building2,
  UserCheck,
  Briefcase,
  CreditCard,
  Droplets,
  Disc,
  Gauge,
  Zap,
  Cog,
  ClipboardCheck,
  SlidersHorizontal,
  Sparkles,
  Lightbulb
} from 'lucide-react';

interface WebFleetCustomerViewProps {
  initialMenu?: 'dashboard' | 'booking' | 'history' | 'kendaraan' | 'dokumen' | 'profil';
}

interface SpkTrackingDetailProps {
  spk: SpkService;
  onBack?: () => void;
  pekerjaanList?: SpkItemPekerjaan[];
  partSpkList?: SpkItemPart[];
  myDokumenList?: DokumenKendaraan[];
  myInvoiceList?: InvoicePembayaran[];
  tambahanList?: PekerjaanTambahan[];
  purchasingList?: PurchaseRequestPart[];
  ppnRate?: number | null;
  approvingTambahan?: boolean;
  decidingEstimasi?: boolean;
  onApproveTambahan?: (id: number, keputusan: 'Disetujui' | 'Ditolak') => void;
  onDecideEstimasi?: (spk: SpkService, setuju: boolean) => void;
  kendaraanList?: Kendaraan[];
}

/**
 * SpkTrackingDetail — halaman detail pelacakan service satu SPK
 * (progres stepper, pekerjaan & part, catatan, dokumen/foto, timeline).
 * Dipakai menu Status & Pelacakan (spk aktif) dan halaman khusus
 * Riwayat Service (spk yang diklik). Tombol aksi approval hanya muncul
 * bila status SPK membutuhkannya (status-gated di JSX).
 */
export const SpkTrackingDetail: React.FC<SpkTrackingDetailProps> = ({
  spk,
  onBack,
  pekerjaanList,
  partSpkList,
  myDokumenList,
  myInvoiceList,
  tambahanList,
  purchasingList,
  ppnRate,
  approvingTambahan,
  decidingEstimasi,
  onApproveTambahan,
  onDecideEstimasi,
  kendaraanList,
}) => {
  const [subTab, setSubTab] = useState<'progress' | 'detail' | 'catatan' | 'dokumen'>('progress');

  // Tarif PPN DB untuk approval (tanpa fallback): angka approve = angka tagihan
  const ppnRateCustomer = ppnRate ?? null;
  const approvalSubtotal = Number(spk?.estimasi_biaya || 0);
  const approvalPpn = ppnRateCustomer === null ? null : Math.round(approvalSubtotal * (ppnRateCustomer / 100));
  const approvalTotal = approvalPpn === null ? null : approvalSubtotal + approvalPpn;

  // Active PR untuk SPK yang sedang dimonitor
  const activePr = purchasingList?.find(
    (p) => p.id_spk === spk?.id || p.no_polisi === spk?.no_polisi
  );

  // Faktur untuk SPK yang sedang dimonitor (entri pembayaran di timeline).
  const activeInvoice = myInvoiceList?.find((inv) => inv.id_spk === spk?.id) || null;
  const activeInvoiceLunas = !!activeInvoice && (activeInvoice.status_pembayaran === 'Paid' || activeInvoice.status_pembayaran === 'Lunas');

  // Format jam & waktu konsisten untuk stepper + timeline riwayat service
  const fmtJam = (iso?: string | null): string =>
    iso && !isNaN(new Date(iso).getTime())
      ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      : '';
  const fmtWaktuStep = (iso?: string | null): { tanggal: string; jam: string } | null => {
    if (!iso || isNaN(new Date(iso).getTime())) return null;
    const d = new Date(iso);
    return {
      tanggal: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      jam: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };
  };
  const fmtWaktuFull = (iso?: string | null): string => {
    if (!iso || isNaN(new Date(iso).getTime())) return '';
    const d = new Date(iso);
    return `Pukul ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB • ${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  };

  // Filter detail pekerjaan, part, dan dokumen kendaraan aktif
  const activePekerjaan = (pekerjaanList || []).filter(p => p.id_spk === spk?.id);
  const activeParts = (partSpkList || []).filter(p => p.id_spk === spk?.id);
  const activeArmadaDocs = (myDokumenList || []).filter(d => d.no_polisi === spk?.no_polisi);

  // Part yang benar-benar menunggu pengadaan (data LIVE dari spk-item-part).
  // Fallback: parse daftar [..] dari catatan PR bila baris part belum ada.
  const waitingParts: Array<{ nama: string }> = (() => {
    const live = activeParts
      .filter((p) => (p.status_ketersediaan || '') !== 'Ready di Stock')
      .map((p) => ({ nama: p.nama_part }));
    if (live.length > 0) return live;
    const m = (activePr?.catatan_pr || '').match(/\[(.*?)\]/);
    if (m) {
      return m[1]
        .split(',')
        .map((s) => s.trim().replace(/\s*\([^)]*\)\s*$/, '').trim())
        .filter(Boolean)
        .map((nama) => ({ nama }));
    }
    return [];
  })();

  // Pekerjaan tambahan yang masih menunggu persetujuan customer untuk SPK ini
  const approvalTambahanList = (tambahanList || []).filter(
    (t) =>
      t.status_approval_customer === 'Menunggu Approval' &&
      (!spk || t.id_spk === spk.id)
  );

  // Modal Step state untuk approval estimasi & pekerjaan tambahan
  const [showEstimasiWizard, setShowEstimasiWizard] = useState(false);
  const [estimasiWizardStep, setEstimasiWizardStep] = useState(0);
  const [targetTambahanWizard, setTargetTambahanWizard] = useState<PekerjaanTambahan | null>(null);
  const [tambahanWizardStep, setTambahanWizardStep] = useState(0);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Cari data armada kendaraan pengguna yang cocok dengan nomor polisi SPK
  const matchingKendaraan = useMemo(() => {
    if (!spk?.no_polisi || !kendaraanList || kendaraanList.length === 0) return null;
    const cleanPlat = normalizePlat(spk.no_polisi);
    return kendaraanList.find((k) => normalizePlat(k.no_polisi) === cleanPlat) || null;
  }, [spk?.no_polisi, kendaraanList]);

  // Foto asli unit kendaraan: prioritas dari foto profil unit armada, fallback foto masuk SPK/dokumen
  const armadaFotoDokumen = useMemo(() => {
    if (!myDokumenList || !spk?.no_polisi) return null;
    const cleanPlat = normalizePlat(spk.no_polisi);
    const doc = myDokumenList.find(
      (d) =>
        normalizePlat(d.no_polisi) === cleanPlat &&
        (d.nama_dokumen?.toLowerCase().includes('foto') ||
          d.file_url?.match(/\.(jpe?g|png|webp)($|\?)/i))
    );
    return doc?.file_url || null;
  }, [myDokumenList, spk?.no_polisi]);

  const rawFotoKendaraan =
    matchingKendaraan?.foto_kendaraan ||
    spk.foto_kendaraan ||
    (spk as any).foto_kendaraan_masuk ||
    armadaFotoDokumen ||
    null;

  const fotoKendaraan = (() => {
    if (!rawFotoKendaraan || typeof rawFotoKendaraan !== 'string') return null;
    const trimmed = rawFotoKendaraan.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      return trimmed;
    }
    return `data:image/jpeg;base64,${trimmed}`;
  })();

  const unitDesc = matchingKendaraan
    ? `${formatMerkModel(matchingKendaraan.merk, matchingKendaraan.model, matchingKendaraan.unit_name || matchingKendaraan.jenis_armada || 'Truk')}${cleanField(matchingKendaraan.tahun) ? ` (${cleanField(matchingKendaraan.tahun)})` : ''}`
    : '';

  // Keputusan estimasi dikirim dari mana pun (kartu alert / wizard / modal riwayat):
  // tutup wizard agar tombol Setujui/Tolak tak bisa diklik dua kali.
  React.useEffect(() => {
    const close = () => setShowEstimasiWizard(false);
    window.addEventListener('kim3:estimasi-decided', close);
    return () => window.removeEventListener('kim3:estimasi-decided', close);
  }, []);

  return (
    <div className="space-y-6">
          
            {/* Active Card */}
            <div className="card-modern bg-surface-raised rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-5">
              {/* Top Summary Header - Mengikuti Referensi Bersih & Rapi */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border pb-6">
                {/* Sisi Kiri: Profil Kendaraan */}
                <div className="flex items-center gap-4 sm:gap-5 min-w-0 lg:max-w-xs shrink-0">
                  {/* Foto Kendaraan Asli Pengguna atau Fallback Icon */}
                  {fotoKendaraan ? (
                    <div
                      className="group/thumb relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs"
                      onClick={() =>
                        setPreviewImage({
                          url: fotoKendaraan,
                          title: formatPlat(spk.no_polisi),
                          subtitle: unitDesc || `Kendaraan SPK ${spk.no_spk}`,
                        })
                      }
                      title="Klik untuk memperbesar foto unit kendaraan"
                    >
                      <img
                        src={fotoKendaraan}
                        alt={formatPlat(spk.no_polisi)}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-[#12388F]/10 to-[#3B6FD4]/10 text-accent flex flex-col items-center justify-center border border-accent/25 shrink-0 shadow-2xs">
                      <Truck className="w-7 h-7 sm:w-8 sm:h-8" />
                      <span className="text-[9px] font-bold text-accent/70 uppercase tracking-wider mt-0.5">Unit</span>
                    </div>
                  )}

                  {/* Info Teks Profil Kendaraan */}
                  <div className="min-w-0 flex flex-col justify-center space-y-1">
                    {/* Baris 1: Plat Nomor (Besar & Tebal) */}
                    <h2 className="text-base sm:text-lg font-black text-ink tracking-tight font-sans leading-none">
                      {formatPlat(spk.no_polisi)}
                    </h2>

                    {/* Baris 2: Merk / Tipe / Mitra */}
                    <p className="text-xs font-medium text-ink-muted truncate leading-snug" title={unitDesc || spk.nama_customer || 'Armada Fleet'}>
                      {unitDesc || spk.nama_customer || 'Armada Fleet'}
                    </p>

                    {/* Baris 3: Status Badge */}
                    <div className="pt-0.5">
                      <StatusBadge status={spk.status_spk} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Garis Pembatas Vertikal & Sisi Kanan: 4 Kolom Informasi (Persis Seperti Referensi) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:border-l lg:border-border lg:pl-8 flex-1 pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
                  {/* Kolom 1: No. SPK */}
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-medium text-ink-subtle block">No. SPK</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-ink block truncate" title={spk.no_spk}>
                      {spk.no_spk}
                    </span>
                    {spk.nama_customer && (
                      <span className="text-[11px] text-ink-muted block truncate" title={spk.nama_customer}>
                        {spk.nama_customer}
                      </span>
                    )}
                  </div>

                  {/* Kolom 2: Layanan & Pekerjaan */}
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-medium text-ink-subtle block">Layanan</span>
                    <span className="text-xs sm:text-sm font-bold text-ink block truncate" title={spk.jenis_layanan || 'Service Kendaraan'}>
                      {spk.jenis_layanan || 'Service Kendaraan'}
                    </span>
                    <span className="text-[11px] text-ink-muted block truncate" title={spk.keluhan_customer || 'Perawatan Berkala'}>
                      {spk.keluhan_customer || 'Perawatan Berkala'}
                    </span>
                  </div>

                  {/* Kolom 3: Check In */}
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-medium text-ink-subtle block">Check In</span>
                    {(() => {
                      const t = spk.waktu_check_in || spk.created_at;
                      if (!t || isNaN(new Date(t).getTime())) {
                        return <span className="text-xs sm:text-sm font-bold text-ink block">-</span>;
                      }
                      const d = new Date(t);
                      const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                      const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                      return (
                        <>
                          <span className="text-xs sm:text-sm font-bold text-ink block truncate">{tgl}</span>
                          <span className="text-[11px] text-ink-muted block">{jam}</span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Kolom 4: Estimasi Selesai / Waktu Selesai */}
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-medium text-ink-subtle block">
                      {spk.status_spk === 'Selesai' ? 'Waktu Selesai' : 'Estimasi Selesai'}
                    </span>
                    {spk.status_spk === 'Selesai' ? (
                      (() => {
                        const tOut = spk.waktu_check_out || spk.waktu_fir_closed || spk.waktu_qc || spk.waktu_selesai_pekerjaan;
                        if (!tOut || isNaN(new Date(tOut).getTime())) {
                          return (
                            <>
                              <span className="text-xs sm:text-sm font-bold text-status-green block">Selesai</span>
                              <span className="text-[11px] text-ink-muted block">Inspeksi Lulus</span>
                            </>
                          );
                        }
                        const dOut = new Date(tOut);
                        const tglOut = dOut.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                        const jamOut = dOut.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                        return (
                          <>
                            <span className="text-xs sm:text-sm font-bold text-ink block truncate">{tglOut}</span>
                            <span className="text-[11px] text-ink-muted block">{jamOut}</span>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <span className="text-xs sm:text-sm font-mono font-bold text-accent block">
                          {(() => { const e = etaSpk(spk); return e.jam != null ? `${e.jam} Jam` : '-'; })()}
                        </span>
                        <span className="text-[11px] text-ink-muted block truncate">{labelSumberEta(etaSpk(spk).sumber)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Banner Menunggu Part: bahasa ramah customer, data live (part + ETA) */}
              {spk.status_spk === 'Waiting Part' && (
                <div className="p-4 sm:p-5 rounded-xl border border-status-amber/40 bg-status-amber-bg/30 text-ink space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-status-amber text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-ink">
                          Kendaraan Menunggu Suku Cadang (Sparepart)
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-status-amber-bg text-status-amber text-xs font-bold">
                          Estimasi Menyusul
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        Unit {formatPlat(spk.no_polisi)} dijeda sementara karena memerlukan suku cadang yang sedang dalam proses pengadaan. Pengerjaan akan dilanjutkan otomatis saat barang tiba.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="bg-surface-raised p-3 rounded-lg border border-border">
                      <span className="text-xs text-ink-muted block font-semibold mb-1">Suku Cadang Dipesan:</span>
                      {waitingParts.length > 0 ? (
                        <ul className="space-y-1">
                          {waitingParts.map((w, idx) => (
                            <li key={idx} className="font-bold text-ink flex items-start justify-between gap-2">
                              <span>• {w.nama}</span>
                              <span className="text-xs text-status-amber font-semibold">Sedang dipesan</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="font-bold text-ink">Sedang dipesan ke distributor</span>
                      )}
                    </div>
                    <div className="bg-surface-raised p-3 rounded-lg border border-border">
                      <span className="text-xs text-ink-muted block font-semibold mb-1">Perkiraan Barang Tiba:</span>
                      <span className="font-mono font-bold text-status-amber">
                        {activePr?.estimasi_tanggal_ready_eta
                          ? `${activePr.estimasi_tanggal_ready_eta}${activePr.estimasi_jam_ready_eta ? ` (${activePr.estimasi_jam_ready_eta} WIB)` : ''}`
                          : 'Sedang dikonfirmasikan — progres tampil otomatis'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Approval Estimasi Alert Card */}
              {spk && ['Menunggu Approval Customer', 'Waiting Approval'].includes(spk.status_spk as string) && (
                <div className="p-4 sm:p-5 rounded-xl border border-accent/40 bg-accent-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-ink">Estimasi Biaya & Waktu Perlu Persetujuan Anda</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-status-amber-bg text-status-amber text-xs font-bold">Menunggu Approval</span>
                      </div>
                      <p className="text-xs text-ink-muted mt-1">
                        Total Estimasi: <strong className="text-ink font-mono">{approvalTotal !== null ? `Rp ${approvalTotal.toLocaleString('id-ID')}` : 'Rp -'}</strong> • Waktu: <strong className="text-ink">{etaSpk(spk).jam ?? 0} Jam</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEstimasiWizardStep(0);
                      setShowEstimasiWizard(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-md shadow-accent/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all"
                  >
                    <span>Tinjau & Beri Keputusan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Konfirmasi sukses: estimasi disetujui, WO terbit */}
              {spk && spk.status_spk === 'Estimasi Disetujui' && (
                <div className="p-4 sm:p-5 rounded-xl border border-status-green/40 bg-status-green-bg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-status-green text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">Estimasi Disetujui — WO Terbit</h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Keputusan Anda tercatat. Mekanik siap memulai pengerjaan unit ini.
                    </p>
                  </div>
                </div>
              )}

              {/* Approval Pekerjaan Tambahan Alert Cards */}
              {approvalTambahanList.length > 0 && (
                <div className="space-y-3">
                  {approvalTambahanList.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 sm:p-5 rounded-xl border border-status-amber/40 bg-status-amber-bg/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-status-amber text-white flex items-center justify-center shrink-0 shadow-xs">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-ink">Pekerjaan Tambahan Ditemukan</h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-status-amber-bg text-status-amber text-xs font-bold">Menunggu Approval</span>
                          </div>
                          <p className="text-xs text-ink-muted mt-1 line-clamp-1">
                            {t.deskripsi_tambahan} • Tambahan: <strong className="text-ink font-mono">Rp {Number(t.estimasi_biaya_tambahan || 0).toLocaleString('id-ID')}</strong> ({t.estimasi_waktu_tambahan_jam || 0} Jam)
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTambahanWizardStep(0);
                          setTargetTambahanWizard(t);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-status-amber hover:bg-status-amber/90 text-white font-bold text-xs shadow-md shadow-status-amber/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all"
                      >
                        <span>Tinjau Tambahan Pekerjaan</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Stepper Progress Bar */}
              <div className="py-6 px-4 sm:px-6 rounded-2xl border border-border bg-gradient-to-b from-[#F8FAFF] via-surface-raised to-surface-raised dark:from-slate-800/40 dark:to-surface-raised overflow-x-auto">
                <div className="flex items-start justify-between min-w-[780px] relative">
                  {[
                    { step: 1, title: 'Check In', desc: 'Diterima Security', done: true, waktu: spk.waktu_check_in || spk.created_at },
                    { 
                      step: 2, 
                      title: spk.status_spk === 'Waiting Part' ? 'Waiting Part' : (spk.status_spk === 'Menunggu Approval Customer' || (spk.status_spk as string) === 'Waiting Approval') ? 'Menunggu Approval' : spk.status_spk === 'Waiting QC' ? 'Menunggu QC' : 'Proses Pekerjaan', 
                      desc: spk.status_spk === 'Waiting Part' ? 'Menunggu Part (Pending)' : (spk.status_spk === 'Menunggu Approval Customer' || (spk.status_spk as string) === 'Waiting Approval') ? 'Estimasi Diajukan' : spk.status_spk === 'Estimasi Disetujui' ? 'WO Terbit' : spk.status_spk === 'Waiting QC' ? 'Inspeksi Foreman' : spk.status_spk === 'Dalam Pengerjaan' ? 'Mekanik Aktif' : 'Selesai Dikerjakan', 
                      done: ['Estimasi Disetujui', 'Dalam Pengerjaan', 'Waiting QC', 'QC Passed', 'FIR Closed', 'Selesai'].includes(spk.status_spk as string), 
                      current: ['Waiting Part', 'Menunggu Approval Customer', 'Waiting Approval', 'Estimasi Disetujui', 'Dalam Pengerjaan', 'Waiting QC'].includes(spk.status_spk as string),
                      isWaitingPart: spk.status_spk === 'Waiting Part',
                      waktu: spk.waktu_mulai_pekerjaan
                    },
                    { step: 3, title: 'QC Passed', desc: 'Inspeksi Foreman', done: spk.status_spk === 'QC Passed' || spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai', current: spk.status_spk === 'Waiting QC', waktu: spk.waktu_qc || spk.tanggal_qc },
                    { step: 4, title: 'FIR Closed', desc: 'Final Check SA', done: spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai', waktu: spk.waktu_fir_closed },
                    { step: 5, title: 'Invoice', desc: 'Proses Kasir', done: spk.status_spk === 'Selesai' || activeInvoiceLunas, waktu: activeInvoice?.tanggal_invoice || (spk.status_spk === 'Selesai' ? spk.waktu_fir_closed : null) },
                    { step: 6, title: 'Check Out', desc: 'Kendaraan Keluar', done: !!spk.waktu_check_out, waktu: spk.waktu_check_out },
                  ].map((s, idx, arr) => {
                    const isLast = idx === arr.length - 1;
                    const nextStep = !isLast ? arr[idx + 1] : null;
                    const lineDone = s.done && (nextStep?.done || nextStep?.current);
                    const wt = s.waktu ? fmtWaktuStep(s.waktu as string) : null;

                    return (
                      <div key={s.step} className="flex-1 flex items-start relative min-w-[125px]">
                        {/* Connecting Line to next step */}
                        {!isLast && (
                          <div 
                            className={`absolute top-5 left-1/2 right-[-50%] h-[2.5px] rounded-full transition-all -z-0 ${
                              lineDone 
                                ? 'bg-gradient-to-r from-[#16A34A] to-[#22C55E]' 
                                : s.done
                                ? 'bg-emerald-300/60 dark:bg-emerald-800/40'
                                : 'bg-slate-200 dark:bg-slate-700/60'
                            }`}
                          />
                        )}

                        <div className="flex flex-col items-center flex-1 text-center min-w-0 z-10 px-1">
                          {/* Step Circle */}
                          <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ring-4 ring-white dark:ring-slate-900 shadow-xs ${
                            s.isWaitingPart
                              ? 'bg-status-red text-white ring-status-red/20 shadow-md scale-105'
                              : s.current 
                              ? 'bg-gradient-to-br from-[#12388F] to-[#3B6FD4] text-white ring-[#12388F]/25 shadow-md scale-105' 
                              : s.done 
                              ? 'bg-gradient-to-br from-[#16A34A] to-[#22C55E] text-white shadow-sm' 
                              : 'bg-white dark:bg-slate-900 text-ink-subtle border-2 border-dashed border-border'
                          }`}>
                            {s.done ? <CheckCircle2 className="w-5 h-5" /> : s.step}
                          </div>

                          {/* Step Title */}
                          <div className={`text-xs font-bold leading-tight truncate max-w-full ${
                            s.isWaitingPart ? 'text-status-red' : s.current ? 'text-accent' : s.done ? 'text-status-green' : 'text-ink'
                          }`}>
                            {s.title}
                          </div>

                          {/* Step Description */}
                          <div className="text-[11px] text-ink-muted mt-0.5 leading-tight truncate max-w-full">
                            {s.desc}
                          </div>

                          {/* Step Time Capsule Badge */}
                          {wt ? (
                            <div className={`mt-2 w-full max-w-[115px] px-2 py-1.5 rounded-xl border flex flex-col items-center justify-center transition-all shadow-2xs ${
                              s.done
                                ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200'
                                : s.current
                                ? 'bg-blue-50/90 border-blue-200/80 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-200'
                                : 'bg-surface border-border text-ink-subtle'
                            }`}>
                              <span className="text-[11px] font-semibold leading-tight text-center">
                                {wt.tanggal}
                              </span>
                              <span className="text-[11px] font-semibold leading-tight text-center mt-0.5">
                                {wt.jam}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-2 px-2 py-1.5 rounded-xl border border-dashed border-border text-ink-subtle/50 text-[11px] font-mono w-full max-w-[115px] flex items-center justify-center">
                              —
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4 Detail Tabs di bawah Tracker Status Service */}
              <div className="border-t border-border pt-5 space-y-4">
                {/* Tab Navigation */}
                <div className="flex gap-2 overflow-x-auto p-1 rounded-2xl bg-[#F1F5F9] dark:bg-slate-800 border border-border">
                  <button
                    type="button"
                    onClick={() => setSubTab('progress')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border shrink-0 ${
                      subTab === 'progress'
                        ? 'border-[#12388F]/25 bg-white dark:bg-slate-900 text-[#12388F] shadow-xs'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-white/70 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Progress Pekerjaan
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('detail')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border shrink-0 ${
                      subTab === 'detail'
                        ? 'border-[#12388F]/25 bg-white dark:bg-slate-900 text-[#12388F] shadow-xs'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-white/70 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    Detail Pekerjaan & Part
                    {(activePekerjaan.length > 0 || activeParts.length > 0) && (
                      <span className="px-1.5 py-0.5 text-xs rounded-full bg-accent-subtle text-accent">
                        {activePekerjaan.length + activeParts.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('catatan')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border shrink-0 ${
                      subTab === 'catatan'
                        ? 'border-[#12388F]/25 bg-white dark:bg-slate-900 text-[#12388F] shadow-xs'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-white/70 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <FileCheck className="w-4 h-4" />
                    Catatan SA & Mekanik
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('dokumen')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border shrink-0 ${
                      subTab === 'dokumen'
                        ? 'border-[#12388F]/25 bg-white dark:bg-slate-900 text-[#12388F] shadow-xs'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-white/70 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    Dokumen & Foto Kendaraan
                    {activeArmadaDocs.length > 0 && (
                      <span className="px-1.5 py-0.5 text-xs rounded-full bg-surface text-ink-muted">
                        {activeArmadaDocs.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* TAB 1: Progress Pekerjaan */}
                {subTab === 'progress' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="space-y-3 p-4 rounded-2xl border border-border bg-gradient-to-b from-[#F8FAFF] to-surface-raised dark:from-slate-800/40 dark:to-transparent">
                      <span className="font-black text-ink flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-accent text-white flex items-center justify-center shadow-2xs shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                        </span>
                        Timeline Riwayat Aktivitas Service:
                      </span>
                      <div className="space-y-3 relative pl-4 border-l-2 border-[#12388F]/25 dark:border-blue-400/30 ml-2">
                        <div className="relative">
                          <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-status-green ring-4 ring-white"></div>
                          <div className="font-semibold text-ink">Kendaraan Masuk di Pos Security</div>
                          <div className="text-xs text-ink-muted">{fmtWaktuFull(spk.waktu_check_in || spk.created_at) || '-'} | Pos Security KIM 3</div>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-accent ring-4 ring-white"></div>
                          <div className="font-semibold text-ink">Penerimaan & Cek Awal oleh SA</div>
                          <div className="text-xs text-ink-muted">{fmtWaktuFull(spk.created_at) || '-'} | SA: {spk.nama_sa || '-'} | Odometer: {spk.odometer_km ? `${spk.odometer_km.toLocaleString('id-ID')} KM` : '-'}</div>
                        </div>
                        <div className="relative">
                          <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full ring-4 ring-white ${spk.status_spk === 'Waiting Part' ? 'bg-status-red animate-pulse' : spk.status_spk === 'Waiting QC' ? 'bg-status-green' : 'bg-status-amber animate-pulse'}`}></div>
                          <div className="font-semibold text-ink">
                            {spk.status_spk === 'Waiting Part'
                              ? 'Menunggu Ketersediaan Sparepart (Timer Ditunda)'
                              : spk.status_spk === 'Waiting QC'
                              ? 'Pekerjaan Selesai Dikerjakan — Menunggu Inspeksi QC Foreman'
                              : spk.status_spk === 'QC Passed' || spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai'
                              ? 'Pengerjaan Service Teknisi Selesai'
                              : spk.status_spk === 'Menunggu Pengecekan Mekanik'
                              ? 'Menunggu Pengecekan & Estimasi Bengkel'
                              : spk.status_spk === 'Estimasi Dibuat'
                              ? 'Estimasi Biaya Sedang Disusun SA'
                              : spk.status_spk === 'Menunggu Approval Customer' || (spk.status_spk as string) === 'Waiting Approval'
                              ? 'Menunggu Persetujuan Estimasi Anda'
                              : spk.status_spk === 'Estimasi Disetujui'
                              ? 'WO Terbit — Siap Dikerjakan Mekanik'
                              : 'Pengerjaan Sedang Dilakukan oleh Mekanik'}
                          </div>
                          <div className="text-xs text-ink-muted">
                            Mekanik: {spk.nama_mekanik || 'Belum Ditugaskan'} | Status SPK: <span className="font-medium text-ink">{spk.status_spk}</span>
                          </div>
                          {spk.waktu_selesai_pekerjaan && (
                            <div className="text-xs text-ink-muted">
                              Selesai pukul {new Date(spk.waktu_selesai_pekerjaan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB • {new Date(spk.waktu_selesai_pekerjaan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {(() => {
                                if (!spk.waktu_mulai_pekerjaan) return null;
                                const ms = new Date(spk.waktu_selesai_pekerjaan as string).getTime() - new Date(spk.waktu_mulai_pekerjaan as string).getTime();
                                if (isNaN(ms) || ms < 0) return null;
                                const h = Math.floor(ms / 3600000);
                                const m = Math.round((ms % 3600000) / 60000);
                                return <span> • Durasi: {h > 0 ? `${h} jam ` : ''}{m} menit</span>;
                              })()}
                            </div>
                          )}
                        </div>
                        {(spk.status_spk === 'QC Passed' || spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai') && (
                          <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-status-green ring-4 ring-white"></div>
                            <div className="font-semibold text-ink">Quality Control (QC) Lulus</div>
                            <div className="text-xs text-ink-muted">
                              Inspeksi kualitas pengerjaan disetujui Foreman
                              {spk.tanggal_qc ? ` • ${fmtWaktuFull(spk.tanggal_qc)}` : ''}
                            </div>
                          </div>
                        )}
                        {(spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai') && (
                          <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-status-green ring-4 ring-white"></div>
                            <div className="font-semibold text-ink">FIR Closed — Final Check SA</div>
                            <div className="text-xs text-ink-muted">
                              Pemeriksaan akhir lolos, invoice diterbitkan
                              {spk.waktu_fir_closed ? ` • ${fmtWaktuFull(spk.waktu_fir_closed)}` : ''}
                            </div>
                          </div>
                        )}
                        {activeInvoiceLunas && activeInvoice && !!spk.waktu_check_out && (
                          <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-status-green ring-4 ring-white"></div>
                            <div className="font-semibold text-ink">Pembayaran Lunas</div>
                            <div className="text-xs text-ink-muted">
                              {activeInvoice.no_invoice} • Rp {Number(activeInvoice.grand_total || 0).toLocaleString('id-ID')}
                              {activeInvoice.tanggal_bayar ? ` • ${fmtWaktuFull(activeInvoice.tanggal_bayar)}` : ''}
                              {activeInvoice.metode_pembayaran ? ` • ${activeInvoice.metode_pembayaran}` : ''}
                            </div>
                          </div>
                        )}
                        {spk.waktu_check_out && (!!spk.waktu_fir_closed || spk.status_spk === 'Selesai') && (
                          <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-status-green ring-4 ring-white"></div>
                            <div className="font-semibold text-ink">Kendaraan Keluar Bengkel</div>
                            <div className="text-xs text-ink-muted">
                              Check-out pos Security • {fmtWaktuFull(spk.waktu_check_out)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 p-4 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-subtle to-transparent">
                      <span className="font-black text-ink flex items-center gap-2">
                        <Info className="w-4 h-4 text-accent" />
                        Status Terkini & Petunjuk:
                      </span>
                      <p className="text-ink-muted leading-relaxed">
                        Kendaraan <span className="font-semibold font-mono text-ink">{formatPlat(spk.no_polisi)}</span>{' '}
                        {spk.waktu_check_out ? (
                          <>sudah <span className="font-semibold text-status-green">keluar dari bengkel</span> pada {new Date(spk.waktu_check_out).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} {new Date(spk.waktu_check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB. Terima kasih telah menggunakan Bengkel KIM 3.</>
                        ) : spk.status_spk === 'Waiting QC' ? (
                          <>selesai dikerjakan dan <span className="font-semibold text-accent">sedang menunggu inspeksi QC oleh Foreman</span>. Tidak perlu tindakan apa pun.</>
                        ) : spk.status_spk === 'QC Passed' ? (
                          <>lulus inspeksi QC dan <span className="font-semibold text-accent">menunggu final check oleh SA</span>. Tidak perlu tindakan apa pun.</>
                        ) : (
                          <>saat ini berada pada tahap pengerjaan <span className="font-semibold text-accent">{spk.status_spk}</span>.</>
                        )}
                      </p>
                      <div className="bg-surface-raised p-3 rounded-xl border border-accent/30 text-ink-muted space-y-1">
                        <div className="font-medium text-ink">Estimasi Selesai:</div>
                        <div>{(() => { const e = etaSpk(spk); return e.jam != null ? `${e.jam} Jam kerja (${labelSumberEta(e.sumber)})` : 'Hari ini, estimasi 2-3 jam kerja'; })()}</div>
                      </div>
                      <div className="text-xs text-ink-muted pt-1">
                        Pembaruan status sistem berjalan realtime tanpa perlu konfirmasi manual via chat/telepon.
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Detail Pekerjaan & Sparepart */}
                {subTab === 'detail' && (
                  <div className="space-y-4 pt-1 text-xs">
                    {/* Daftar Jasa */}
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="bg-surface px-4 py-2.5 font-bold text-ink flex justify-between items-center">
                        <span>Daftar Pekerjaan / Jasa Service</span>
                        <span className="text-xs text-ink-muted font-normal">
                          {activePekerjaan.length > 0 ? `${activePekerjaan.length} Item Jasa` : 'Estimasi Paket'}
                        </span>
                      </div>
                      <div className="divide-y divide-border bg-surface-raised">
                        {activePekerjaan.length > 0 ? (
                          activePekerjaan.map((p, idx) => (
                            <div key={idx} className="p-3 flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-ink">{p.nama_pekerjaan || p.kategori}</div>
                                <div className="text-xs text-ink-subtle">Durasi: {p.estimasi_durasi_jam ? `${p.estimasi_durasi_jam} Jam` : '60 Menit'}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-ink">Rp {(p.biaya_jasa || 0).toLocaleString('id-ID')}</div>
                                <span className="text-xs text-status-green bg-status-green-bg px-2 py-0.5 rounded-full font-medium">{p.status_pekerjaan || 'Disetujui'}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-ink-subtle">
                            Belum ada rincian jasa pengerjaan untuk unit ini.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Daftar Part */}
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="bg-surface px-4 py-2.5 font-bold text-ink flex justify-between items-center">
                        <span>Daftar Sparepart & Material</span>
                        <span className="text-xs text-ink-muted font-normal">
                          {activeParts.length > 0 ? `${activeParts.length} Item Part` : '0 Item Part'}
                        </span>
                      </div>
                      <div className="divide-y divide-border bg-surface-raised">
                        {activeParts.length > 0 ? (
                          activeParts.map((pt, idx) => (
                            <div key={idx} className="p-3 flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-ink">{pt.nama_part}</div>
                                <div className="text-xs text-ink-subtle">Jumlah: {pt.jumlah} {pt.satuan || 'pcs'}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-ink">Rp {((pt.harga_satuan || 0) * (pt.jumlah || 1)).toLocaleString('id-ID')}</div>
                                <span className="text-xs text-ink-muted bg-surface px-2 py-0.5 rounded-full font-medium">{pt.status_ketersediaan || 'Ready di Stock'}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-ink-subtle">
                            Belum ada rincian sparepart untuk unit ini.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Catatan SA & Mekanik */}
                {subTab === 'catatan' && (
                  <div className="space-y-3 pt-1 text-xs">
                    <div className="bg-status-amber-bg p-4 rounded-xl border border-status-amber/30 space-y-1.5">
                      <div className="font-bold text-status-amber flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-status-amber" />
                        Keluhan Awal Customer (Driver / PIC Kendaraan):
                      </div>
                      <p className="text-ink font-medium italic pl-6">
                        "{spk.keluhan_customer || '-'}"
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-surface p-4 rounded-xl border border-border space-y-2">
                        <div className="font-bold text-ink flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-accent" />
                          Catatan Service Advisor (SA):
                        </div>
                        <div className="text-ink-muted text-xs">
                          {spk.catatan_sa || spk.catatan_kondisi_awal || 'Belum ada catatan dari Service Advisor.'}
                        </div>
                        {spk.odometer_km ? (
                          <div className="text-xs text-ink-muted pt-1.5 border-t border-border">
                            Odometer tercatat: <strong>{spk.odometer_km.toLocaleString('id-ID')} KM</strong>
                          </div>
                        ) : null}
                      </div>

                      <div className="bg-surface p-4 rounded-xl border border-border space-y-2">
                        <div className="font-bold text-ink flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-ink-muted" />
                          Catatan & Temuan Teknisi / Foreman:
                        </div>
                        <div className="text-ink-muted text-xs">
                          {spk.catatan_foreman || 'Belum ada catatan temuan teknisi untuk unit ini.'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-status-green-bg p-3 rounded-xl border border-status-green/30 text-ink-muted flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-status-green shrink-0" />
                      <span>Garansi pekerjaan service KIM3 berlaku selama 14 hari kerja atau 1.000 KM sejak kendaraan keluar.</span>
                    </div>
                  </div>
                )}

                {/* TAB 4: Dokumen & Foto Kendaraan */}
                {subTab === 'dokumen' && (
                  <div className="space-y-4 pt-1 text-xs">
                    {/* Foto Kendaraan (Before / After) */}
                    <div className="space-y-2">
                      <span className="font-bold text-ink block">Dokumentasi Visual Kendaraan (Foto Fisik):</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="border border-border rounded-xl p-3 bg-surface space-y-2 text-center">
                          <div className="text-xs font-semibold text-ink-muted">Foto Masuk Pos Security</div>
                          <div className="h-32 bg-surface rounded-xl flex flex-col items-center justify-center text-ink-subtle gap-1 overflow-hidden">
                            {(spk as any).foto_kendaraan_masuk ? (
                              <img
                                src={(spk as any).foto_kendaraan_masuk}
                                alt="Kendaraan Masuk"
                                onClick={() =>
                                  setPreviewImage({
                                    url: (spk as any).foto_kendaraan_masuk,
                                    title: formatPlat(spk.no_polisi),
                                    subtitle: `Foto Masuk Pos Security • SPK: ${spk.no_spk}`,
                                  })
                                }
                                className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                title="Klik untuk memperbesar foto"
                              />
                            ) : (
                              <>
                                <Camera className="w-6 h-6" />
                                <span className="text-xs">Tersimpan di Security Log</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-ink-muted">Tampak Depan & Nopol</div>
                        </div>

                        <div className="border border-border rounded-xl p-3 bg-surface space-y-2 text-center">
                          <div className="text-xs font-semibold text-ink-muted">Foto Sebelum Pengerjaan</div>
                          <div className="h-32 bg-surface rounded-xl flex flex-col items-center justify-center text-ink-subtle gap-1">
                            <Camera className="w-6 h-6" />
                            <span className="text-xs">Kondisi Awal Komponen</span>
                          </div>
                          <div className="text-xs text-ink-muted">Dokumentasi SA / Mekanik</div>
                        </div>

                        <div className="border border-border rounded-xl p-3 bg-surface space-y-2 text-center">
                          <div className="text-xs font-semibold text-ink-muted">Foto Setelah Pengerjaan</div>
                          <div className="h-32 bg-surface rounded-xl flex flex-col items-center justify-center text-ink-subtle gap-1">
                            {spk.status_spk === 'QC Passed' || spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai' ? (
                              <>
                                <CheckCircle2 className="w-6 h-6 text-status-green" />
                                <span className="text-xs text-status-green font-medium">Verifikasi QC Disetujui</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-6 h-6 text-ink-subtle" />
                                <span className="text-xs">Menunggu Pekerjaan Selesai</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-ink-muted">Inspeksi Akhir Foreman</div>
                        </div>
                      </div>
                    </div>

                    {/* Dokumen Terkait Kendaraan */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <span className="font-bold text-ink block">Berkas & Dokumen Kendaraan Ini:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-raised hover:border-accent/30 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-5 h-5 text-accent" />
                            <div>
                              <div className="font-semibold text-ink">SPK_{spk.no_spk}.pdf</div>
                              <div className="text-xs text-ink-subtle">Surat Perintah Kerja Resmi</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toast.info('Mengunduh Berkas', `Salinan Surat Perintah Kerja ${spk.no_spk} sedang diunduh.`)}
                            className="p-1.5 text-accent hover:bg-accent-subtle rounded-xl"
                            title="Unduh SPK"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>

                        {activeArmadaDocs.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-raised hover:border-accent/30 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <FileCheck className="w-5 h-5 text-status-green" />
                              <div>
                                <div className="font-semibold text-ink">{doc.nama_dokumen || doc.jenis_dokumen}</div>
                                <div className="text-xs text-ink-subtle">Berlaku s/d: {doc.masa_berlaku || '-'}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toast.info('Mengunduh Berkas', `Dokumen ${doc.nama_dokumen} sedang diunduh.`)}
                              className="p-1.5 text-ink-muted hover:bg-surface rounded-xl"
                              title="Unduh Dokumen"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {activeArmadaDocs.length === 0 && (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-raised">
                            <div className="flex items-center gap-2.5">
                              <FileCheck className="w-5 h-5 text-ink-muted" />
                              <div>
                                <div className="font-semibold text-ink">Kartu_Riwayat_Service.pdf</div>
                                <div className="text-xs text-ink-subtle">Riwayat Perawatan Rutin Bengkel KIM3</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toast.info('Mengunduh Riwayat', `Riwayat service kendaraan ${formatPlat(spk.no_polisi)} sedang disiapkan.`)}
                              className="p-1.5 text-accent hover:bg-accent-subtle rounded-xl"
                              title="Unduh Riwayat"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

      {/* StepModal Approval Estimasi Biaya & Waktu (3 Langkah) */}
      <StepModal
        open={showEstimasiWizard}
        onClose={() => setShowEstimasiWizard(false)}
        title="Persetujuan Estimasi Service"
        subtitle={`${spk.no_spk} • ${formatPlat(spk.no_polisi)}`}
        currentStep={estimasiWizardStep}
        onNext={() => setEstimasiWizardStep((s) => Math.min(s + 1, 2))}
        onBack={() => setEstimasiWizardStep((s) => Math.max(s - 1, 0))}
        onSubmit={() => {
          onDecideEstimasi?.(spk, true);
          setShowEstimasiWizard(false);
        }}
        submitLabel={`Setujui Estimasi${approvalTotal !== null ? ` Rp ${approvalTotal.toLocaleString('id-ID')}` : ''}`}
        isPending={decidingEstimasi}
        size="lg"
        steps={[
          {
            id: 'pekerjaan-part',
            label: 'Pekerjaan & Part',
            content: (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-ink mb-2">Rincian Suku Cadang (Sparepart):</h4>
                  {activeParts.length > 0 ? (
                    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden bg-surface-raised">
                      {activeParts.map((p) => (
                        <div key={p.id} className="p-3 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-ink block">{p.nama_part}</span>
                            <span className="text-xs text-ink-muted">{p.jumlah} {p.satuan}</span>
                          </div>
                          <span className="font-bold text-ink font-mono">Rp {Number(p.subtotal || 0).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-ink-muted italic p-3 rounded-lg bg-surface border border-border">Tidak ada penggantian sparepart pada estimasi ini.</p>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-ink mb-2">Rincian Jasa Pengerjaan:</h4>
                  {activePekerjaan.length > 0 ? (
                    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden bg-surface-raised">
                      {activePekerjaan.map((p) => (
                        <div key={p.id} className="p-3 flex items-center justify-between">
                          <span className="font-bold text-ink">{p.nama_pekerjaan}</span>
                          <span className="font-bold text-ink font-mono">Rp {Number(p.biaya_jasa || 0).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-ink-muted italic p-3 rounded-lg bg-surface border border-border">Belum ada rincian jasa khusus.</p>
                  )}
                </div>
              </div>
            ),
          },
          {
            id: 'biaya-waktu',
            label: 'Rincian Biaya & Waktu',
            content: (
              <div className="space-y-4 text-xs">
                <div className="card-modern rounded-xl p-4 bg-surface-raised border border-border space-y-2.5">
                  <div className="flex justify-between text-ink-muted">
                    <span>Subtotal Biaya (Part + Jasa):</span>
                    <span className="font-bold text-ink font-mono">Rp {approvalSubtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>PPN {ppnRateCustomer !== null ? `(${ppnRateCustomer}%)` : '(Belum Diatur)'}:</span>
                    <span className="font-bold text-ink font-mono">Rp {approvalPpn !== null ? approvalPpn.toLocaleString('id-ID') : '-'}</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between items-center">
                    <span className="font-bold text-sm text-ink">Total Tagihan Estimasi:</span>
                    <span className="font-black text-lg text-status-green font-mono">Rp {approvalTotal !== null ? approvalTotal.toLocaleString('id-ID') : '-'}</span>
                  </div>
                </div>

                <div className="card-modern rounded-xl p-4 bg-surface-raised border border-border space-y-1">
                  <span className="text-xs font-semibold text-ink-muted">Estimasi Waktu Pengerjaan:</span>
                  <div className="text-base font-bold text-ink font-mono">
                    {etaSpk(spk).jam ?? 0} Jam
                  </div>
                  <p className="text-xs text-ink-subtle">Waktu dihitung sejak persetujuan diberikan hingga kendaraan siap dilakukan Quality Control.</p>
                </div>
              </div>
            ),
          },
          {
            id: 'keputusan',
            label: 'Keputusan',
            content: (
              <div className="space-y-4 text-xs text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center mx-auto shadow-xs border border-accent/20">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Konfirmasi Keputusan Estimasi</h3>
                  <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
                    Jika Anda menyetujui, Work Order resmi akan diterbitkan dan teknisi mekanik segera memulai pekerjaan.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border text-left font-mono space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">No. SPK:</span>
                    <span className="font-bold text-ink">{spk.no_spk}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">No. Polisi:</span>
                    <span className="font-bold text-ink">{formatPlat(spk.no_polisi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Total Bayar:</span>
                    <span className="font-bold text-status-green font-bold">Rp {approvalTotal !== null ? approvalTotal.toLocaleString('id-ID') : '-'}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2 sm:flex-row">
                  <ModalActionButton
                    variant="success"
                    width="responsive"
                    className="flex-1"
                    disabled={decidingEstimasi || approvalTotal === null}
                    onClick={() => {
                      onDecideEstimasi?.(spk, true);
                      setShowEstimasiWizard(false);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui Estimasi (Mulai Service)</span>
                  </ModalActionButton>
                  <ModalActionButton
                    variant="danger"
                    width="responsive"
                    className="flex-1"
                    disabled={decidingEstimasi}
                    onClick={() => {
                      onDecideEstimasi?.(spk, false);
                      setShowEstimasiWizard(false);
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak Estimasi</span>
                  </ModalActionButton>
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* StepModal Approval Pekerjaan Tambahan (3 Langkah) */}
      {targetTambahanWizard && (
        <StepModal
          open={!!targetTambahanWizard}
          onClose={() => setTargetTambahanWizard(null)}
          title="Persetujuan Pekerjaan Tambahan"
          subtitle={`${spk.no_spk} • ${formatPlat(spk.no_polisi)}`}
          currentStep={tambahanWizardStep}
          onNext={() => setTambahanWizardStep((s) => Math.min(s + 1, 2))}
          onBack={() => setTambahanWizardStep((s) => Math.max(s - 1, 0))}
          onSubmit={() => {
            onApproveTambahan?.(targetTambahanWizard.id, 'Disetujui');
            setTargetTambahanWizard(null);
          }}
          submitLabel="Setujui Pekerjaan Tambahan"
          isPending={approvingTambahan}
          size="md"
          steps={[
            {
              id: 'deskripsi',
              label: 'Temuan Kerusakan',
              content: (
                <div className="space-y-3 text-xs">
                  <div className="card-modern rounded-xl p-4 bg-surface-raised border border-border space-y-2">
                    <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">Temuan Kerusakan Tambahan:</span>
                    <p className="text-sm font-semibold text-ink leading-relaxed">
                      "{targetTambahanWizard.deskripsi_tambahan}"
                    </p>
                    {targetTambahanWizard.rekomendasi_perbaikan && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block mb-0.5">Rekomendasi Tindakan:</span>
                        <p className="text-xs text-ink leading-relaxed">{targetTambahanWizard.rekomendasi_perbaikan}</p>
                      </div>
                    )}
                  </div>

                  {(targetTambahanWizard.diajukan_oleh_mekanik || targetTambahanWizard.diverifikasi_foreman) && (
                    <div className="p-3 rounded-lg bg-surface border border-border text-xs text-ink-muted space-y-0.5">
                      {targetTambahanWizard.diajukan_oleh_mekanik && <div>Diajukan Mekanik: <strong className="text-ink">{targetTambahanWizard.diajukan_oleh_mekanik}</strong></div>}
                      {targetTambahanWizard.diverifikasi_foreman && <div>Diverifikasi Foreman: <strong className="text-ink">{targetTambahanWizard.diverifikasi_foreman}</strong></div>}
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'biaya-waktu',
              label: 'Biaya & Waktu',
              content: (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="card-modern rounded-xl p-4 bg-surface-raised border border-border">
                      <span className="text-xs font-semibold text-ink-muted block mb-1">Estimasi Biaya Tambahan:</span>
                      <span className="text-lg font-black text-ink font-mono">
                        Rp {Number(targetTambahanWizard.estimasi_biaya_tambahan || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="card-modern rounded-xl p-4 bg-surface-raised border border-border">
                      <span className="text-xs font-semibold text-ink-muted block mb-1">Waktu Pengerjaan Tambahan:</span>
                      <span className="text-lg font-black text-ink font-mono">
                        {targetTambahanWizard.estimasi_waktu_tambahan_jam || 0} Jam
                      </span>
                    </div>
                  </div>
                  {targetTambahanWizard.catatan && (
                    <div className="p-3 rounded-lg bg-surface border border-border">
                      <span className="text-xs font-bold text-ink-muted block mb-0.5">Catatan Tambahan:</span>
                      <p className="text-xs text-ink">{targetTambahanWizard.catatan}</p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'keputusan',
              label: 'Keputusan',
              content: (
                <div className="space-y-4 text-xs text-center py-2">
                  <div className="w-12 h-12 rounded-2xl bg-status-amber-bg text-status-amber flex items-center justify-center mx-auto shadow-xs border border-status-amber/20">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Beri Keputusan Pekerjaan Tambahan</h3>
                    <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
                      Jika disetujui, item pekerjaan tambahan ini akan dimasukkan ke dalam SPK aktif kendaraan Anda.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      disabled={approvingTambahan}
                      onClick={() => {
                        onApproveTambahan?.(targetTambahanWizard.id, 'Disetujui');
                        setTargetTambahanWizard(null);
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-status-green hover:bg-status-green/90 text-white font-bold text-xs shadow-md shadow-status-green/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Setujui Tambahan</span>
                    </button>
                    <button
                      type="button"
                      disabled={approvingTambahan}
                      onClick={() => {
                        onApproveTambahan?.(targetTambahanWizard.id, 'Ditolak');
                        setTargetTambahanWizard(null);
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-status-red hover:bg-status-red/90 text-white font-bold text-xs shadow-md shadow-status-red/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak Tambahan</span>
                    </button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Modal Lightbox Preview Foto Membesar */}
      {previewImage && (
        <ModalPortal onClose={() => setPreviewImage(null)}>
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)}
          >
            {/* Top Controls */}
            <div
              className="w-full max-w-4xl flex items-center justify-between pb-3 text-white shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <span className="px-3.5 py-1 rounded-lg bg-white/15 border border-white/25 font-mono font-black text-sm tracking-wider text-white shadow-xs">
                  {previewImage.title}
                </span>
                {previewImage.subtitle && (
                  <span className="text-xs text-white/80 font-medium truncate hidden sm:inline">
                    {previewImage.subtitle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Buka gambar di tab baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-2 rounded-xl bg-white/15 hover:bg-status-red text-white transition-colors cursor-pointer"
                  title="Tutup (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Large Image Frame */}
            <div
              className="relative max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl border border-white/15 shadow-2xl bg-black/50 p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[76vh] max-w-full w-auto object-contain rounded-xl select-none"
              />
            </div>

            {/* Hint */}
            <div
              className="mt-3 text-center text-xs text-white/70"
              onClick={(e) => e.stopPropagation()}
            >
              Tekan <kbd className="px-2 py-0.5 rounded bg-white/20 text-white font-mono text-xs">Esc</kbd> atau klik di luar gambar untuk menutup
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

interface BookingServiceItem {
  id?: number;
  title: string;
  tag: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  estimasi_durasi?: string;
}

const BOOKING_SERVICE_OPTIONS: BookingServiceItem[] = [
  {
    title: 'Service Berkala (Ganti Oli & Filter)',
    tag: 'Perawatan Rutin',
    description: 'Ganti oli mesin, saringan oli/solar, kuras radiator, serta pemeriksaan volume semua fluida.',
    icon: Droplets,
    badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    estimasi_durasi: '1 Jam',
  },
  {
    title: 'Perbaikan Rem & Kaki-kaki',
    tag: 'Pengereman & Suspensi',
    description: 'Brake pad/shoe, rotor disc, per daun, shock absorber, ball joint, tie rod & kingpin.',
    icon: Disc,
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    estimasi_durasi: '2 Jam',
  },
  {
    title: 'Tune Up & Performa Mesin',
    tag: 'Performa & Emisi',
    description: 'Kalibrasi nozzle injector, pembersihan filter udara, throttle body, busi & gurah mesin.',
    icon: Gauge,
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    estimasi_durasi: '2 - 3 Jam',
  },
  {
    title: 'Kelistrikan & Starter / Alternator',
    tag: 'Sistem Elektrikal',
    description: 'Pengecekan aki (accu), dinamo starter, alternator pengisian, sekring & kabel bodi.',
    icon: Zap,
    badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    estimasi_durasi: '1 - 2 Jam',
  },
  {
    title: 'Overhaul Mesin / Transmisi',
    tag: 'Perbaikan Mayor',
    description: 'Turun mesin (top/full overhaul), penggantian kampas kopling set, transmisi & gardan.',
    icon: Cog,
    badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    estimasi_durasi: '1 - 3 Hari',
  },
  {
    title: 'Pemeriksaan Umum / Keluhan Khusus',
    tag: 'Inspeksi & Diagnosa',
    description: 'General check-up pra-kir, scan OBD diagnostic, investigasi bunyi tidak wajar atau getaran.',
    icon: ClipboardCheck,
    badgeColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    estimasi_durasi: 'Sesuai Keluhan',
  },
];

const BOOKING_CUSTOM_PRESETS = [
  'Servis AC & Blower',
  'Hidrolik & PTO Dump',
  'Las Bak & Perbaikan Sasis',
  'Spooring & Balancing',
  'Ganti Kampas Kopling',
  'Kuras Tangki Bahan Bakar',
  'Pengecekan Kebocoran Oli',
];

const BOOKING_COMMON_COMPLAINTS = [
  'Rem bunyi / bergetar',
  'Tarikan mesin berat & boros',
  'Kaki-kaki berisik di jalan rusak',
  'Susah starter saat dingin',
  'Rembesan oli / radiator bocor',
  'Suhu mesin cepat overheat',
  'Lampu indikator speedometer menyala',
  'Kopling selip / gigi susah masuk',
];

const getServiceVisuals = (title: string, category?: string) => {
  const t = title.toLowerCase();
  if (t.includes('oli') || t.includes('berkala')) {
    return {
      icon: Droplets,
      badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
      tag: category || 'Perawatan Rutin',
    };
  }
  if (t.includes('rem') || t.includes('kaki')) {
    return {
      icon: Disc,
      badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
      tag: category || 'Sasis & Kaki-kaki',
    };
  }
  if (t.includes('tune up') || t.includes('performa') || t.includes('mesin')) {
    return {
      icon: Gauge,
      badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      tag: category || 'Performa Mesin',
    };
  }
  if (t.includes('listrik') || t.includes('starter') || t.includes('alternator')) {
    return {
      icon: Zap,
      badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
      tag: category || 'Kelistrikan',
    };
  }
  if (t.includes('overhaul') || t.includes('transmisi') || t.includes('berat')) {
    return {
      icon: Cog,
      badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
      tag: category || 'Perbaikan Berat',
    };
  }
  return {
    icon: ClipboardCheck,
    badgeColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    tag: category || 'Umum & Diagnosa',
  };
};

const getBookingServiceGroup = (service: BookingServiceItem): string => {
  const text = `${service.title} ${service.tag}`.toLowerCase();
  if (/oli|berkala|perawatan|filter|pelumas/.test(text)) return 'Perawatan';
  if (/rem|kaki|suspensi|roda|ban|spooring|balancing/.test(text)) return 'Rem & kaki-kaki';
  if (/mesin|engine|transmisi|kopling|gardan|injektor|overhaul/.test(text)) return 'Mesin & transmisi';
  if (/listrik|elektrik|starter|alternator|aki|kelistrikan/.test(text)) return 'Kelistrikan';
  if (/las|bak|sasis|karoseri|hidrolik|pto|dump/.test(text)) return 'Karoseri & hidrolik';
  if (/inspeksi|diagnosa|diagnostik|pemeriksaan|general check/.test(text)) return 'Pemeriksaan';
  return 'Lainnya';
};

export const WebFleetCustomerView: React.FC<WebFleetCustomerViewProps> = ({ initialMenu }) => {
  const queryClient = useQueryClient();
  const { setActiveTab, currentUser, authUser, fleetPendingPartId, setFleetPendingPartId, fleetPendingSpkId, setFleetPendingSpkId, setApprovalModalOpen } = useAppStore();
  const [fleetMenu, setFleetMenu] = useState<'dashboard' | 'booking' | 'history' | 'kendaraan' | 'dokumen' | 'profil'>(
    initialMenu || 'dashboard'
  );

  React.useEffect(() => {
    if (initialMenu) {
      setFleetMenu(initialMenu);
    }
  }, [initialMenu]);

  // Pindah menu (mis. via sidebar) = kembali ke tampilan awal menu tersebut:
  // tutup halaman detail riwayat yang menggantung.
  React.useEffect(() => {
    setHistoryDetail(null);
  }, [fleetMenu]);

  // Booking Wizard Step (image5.png Mockup 1)
  const [openBookingModal, setOpenBookingModal] = useState<boolean>(false);
  const [bookingStep, setBookingStep] = useState<number>(1);
  const [isCustomService, setIsCustomService] = useState(false);
  const [customServiceText, setCustomServiceText] = useState('');
  const [bookingServiceSearch, setBookingServiceSearch] = useState('');
  const [bookingServiceCategory, setBookingServiceCategory] = useState('Semua');
  const [showAllBookingServices, setShowAllBookingServices] = useState(false);
  const [bookingKendaraanSearch, setBookingKendaraanSearch] = useState('');
  const [bookingKendaraanPage, setBookingKendaraanPage] = useState(1);
  const [bookingKendaraanLimit, setBookingKendaraanLimit] = useState(5);
  const [bookingForm, setBookingForm] = useState({
    no_polisi: '',
    jenis_layanan: 'Service Berkala (Ganti Oli & Filter)',
    tanggal_booking: new Date().toISOString().slice(0, 10),
    jam_booking: '08:30',
    keluhan: '',
    catatan: '',
  });

  // ── Pagination & pencarian server-side (API Builder) ────────────────────────
  // Endpoint /kim3/kendaraan & /kim3/spk sudah memakai "Automatic SQL Pagination",
  // jadi daftar kendaraan & riwayat service diambil per halaman (page + limit) dan
  // pencariannya dikirim ke server lewat parameter `q` (ILIKE di SQL).
  const [armadaPage, setArmadaPage] = useState(1);
  const [armadaLimit, setArmadaLimit] = useState(10);
  const [armadaSearch, setArmadaSearch] = useState('');
  const [armadaQuery, setArmadaQuery] = useState('');
  // Edit & hapus unit kendaraan dari menu Daftar Kendaraan
  const [editArmadaData, setEditArmadaData] = useState<Kendaraan | null>(null);
  const [editArmadaForm, setEditArmadaForm] = useState({
    no_polisi: '',
    no_inventaris: '',
    unit_name: '',
    merk: '',
    model: '',
    type: '',
    jenis_armada: 'Truk',
    tahun: new Date().getFullYear(),
    no_rangka: '',
    no_mesin: '',
    expired: '',
    asuransi: '',
    masa_berlaku_asuransi: '',
    note: '',
    description: '',
    foto_kendaraan: '',
  });
  const [hapusArmadaTarget, setHapusArmadaTarget] = useState<Kendaraan | null>(null);

  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historySearch, setHistorySearch] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'semua' | 'sedang-diservis' | 'selesai'>('semua');
  // Halaman khusus detail riwayat SPK (tersembunyi dari sidebar)
  const [historyDetail, setHistoryDetail] = useState<SpkService | null>(null);
  // Modal lightbox preview foto armada / dokumen yang membesar
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Debounce input pencarian supaya tidak membanjiri server setiap ketikan
  React.useEffect(() => {
    const t = setTimeout(() => {
      setArmadaQuery(armadaSearch.trim());
      setArmadaPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [armadaSearch]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setHistoryQuery(historySearch.trim());
      setHistoryPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [historySearch]);

  // Kalau jumlah data menyusut (mis. filter aktif) sampai halaman aktif melewati
  // halaman terakhir, tarik kembali ke halaman terakhir yang valid.
  // Queries
  const { data: kendaraanList } = useQuery({
    queryKey: ['kendaraan-list'],
    queryFn: api.getKendaraan,
  });

  const { data: masterMerkList = [] } = useQuery({
    queryKey: ['master-merk-list'],
    queryFn: api.getMasterMerk,
    staleTime: 1000 * 60 * 30,
  });

  const { data: masterTipeList = [] } = useQuery({
    queryKey: ['master-tipe-list'],
    queryFn: () => api.getMasterTipe(),
    staleTime: 1000 * 60 * 30,
  });

  const { data: bookingList, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['booking-list'],
    queryFn: api.getBooking,
  });

  const { data: spkList, isLoading: spkLoading } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 8000,
  });

  const { data: dokumenList } = useQuery({
    queryKey: ['dokumen-list'],
    queryFn: api.getDokumen,
  });

  const { data: tambahanList } = useQuery({
    queryKey: ['tambahan-pekerjaan'],
    queryFn: api.getTambahanPekerjaan,
    refetchInterval: 10000,
  });

  const { data: purchasingList } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
    refetchInterval: 8000,
  });

  const { data: pekerjaanList } = useQuery({
    queryKey: ['pekerjaan-spk-list'],
    queryFn: api.getPekerjaanSpk,
  });

  const { data: partSpkList } = useQuery({
    queryKey: ['part-spk-list'],
    queryFn: api.getPartSpk,
  });

  // Faktur milik customer (untuk seksi Faktur & Pembayaran di History)
  const { data: invoiceList } = useQuery({
    queryKey: ['invoice-list'],
    queryFn: api.getInvoiceList,
    refetchInterval: 15000,
  });

  // Daftar kendaraan per halaman (server-side pagination + search)
  const { data: armadaPageData, isFetching: armadaFetching } = useQuery({
    queryKey: ['kendaraan-page', armadaPage, armadaLimit, armadaQuery],
    queryFn: () => api.getKendaraanPage({ page: armadaPage, limit: armadaLimit, q: armadaQuery }),
    placeholderData: (prev) => prev,
  });

  // Riwayat service per halaman (server-side pagination + search)
  const { data: historyPageData, isFetching: historyFetching } = useQuery({
    queryKey: ['spk-page', historyPage, historyLimit, historyQuery],
    queryFn: () => api.getSpkListPage({ page: historyPage, limit: historyLimit, q: historyQuery }),
    placeholderData: (prev) => prev,
  });

  // Master Jenis Layanan dari view sch_fleet.v_jenis_layanan (database DEV-POS via /kim3/master/layanan)
  const { data: masterLayananList = [] } = useQuery({
    queryKey: ['master-jenis-layanan'],
    queryFn: api.getMasterJenisLayanan,
    staleTime: 1000 * 60 * 30,
  });

  const availableServiceOptions = useMemo(() => {
    if (masterLayananList && masterLayananList.length > 0) {
      return masterLayananList.map((m) => {
        const visual = getServiceVisuals(m.jenis_layanan, m.kategori);
        return {
          id: m.id,
          title: m.jenis_layanan,
          tag: m.kategori || visual.tag,
          description: cleanField(m.deskripsi) || cleanField((m as any).description) || '',
          estimasi_durasi: m.estimasi_durasi,
          icon: visual.icon,
          badgeColor: visual.badgeColor,
        };
      });
    }
    return BOOKING_SERVICE_OPTIONS;
  }, [masterLayananList]);

  const bookingServiceCategories = useMemo(() => {
    const priority = ['Perawatan', 'Mesin & transmisi', 'Rem & kaki-kaki', 'Kelistrikan', 'Karoseri & hidrolik', 'Pemeriksaan', 'Lainnya'];
    const present = new Set(availableServiceOptions.map(getBookingServiceGroup));
    return ['Semua', ...priority.filter((category) => present.has(category))];
  }, [availableServiceOptions]);

  const filteredBookingServiceOptions = useMemo(() => {
    const query = bookingServiceSearch.trim().toLowerCase();
    return availableServiceOptions.filter((service) => {
      const matchesCategory = bookingServiceCategory === 'Semua' || getBookingServiceGroup(service) === bookingServiceCategory;
      const matchesQuery = !query || `${service.title} ${service.tag} ${service.description}`.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [availableServiceOptions, bookingServiceCategory, bookingServiceSearch]);

  const visibleBookingServiceOptions = useMemo(() => {
    const revealAll = showAllBookingServices || bookingServiceSearch.trim() || bookingServiceCategory !== 'Semua';
    if (revealAll || filteredBookingServiceOptions.length <= 5) return filteredBookingServiceOptions;

    const initialOptions = filteredBookingServiceOptions.slice(0, 5);
    const selectedOption = filteredBookingServiceOptions.find(
      (service) => !isCustomService && service.title === bookingForm.jenis_layanan
    );
    if (selectedOption && !initialOptions.includes(selectedOption)) {
      return [selectedOption, ...initialOptions.slice(0, 4)];
    }
    return initialOptions;
  }, [
    bookingForm.jenis_layanan,
    bookingServiceCategory,
    bookingServiceSearch,
    filteredBookingServiceOptions,
    isCustomService,
    showAllBookingServices,
  ]);

  // Master Keluhan Kendaraan dari view sch_fleet.v_master_keluhan (database DEV-POS via /kim3/master/keluhan)
  const { data: masterKeluhanList = [] } = useQuery({
    queryKey: ['master-keluhan-list'],
    queryFn: api.getMasterKeluhan,
    staleTime: 1000 * 60 * 30,
  });

  const availableComplaintChips = useMemo(() => {
    if (masterKeluhanList && masterKeluhanList.length > 0) {
      return masterKeluhanList.map((k) => k.keluhan);
    }
    return BOOKING_COMMON_COMPLAINTS;
  }, [masterKeluhanList]);



  // Profil Customer & Kontak: form editable (tersimpan di tabel pengguna via /kim3/profil-simpan)
  const [profilEditing, setProfilEditing] = useState(false);
  const [profilForm, setProfilForm] = useState({
    nama_perusahaan: authUser?.nama_perusahaan || authUser?.nama_lengkap || '',
    alamat: authUser?.alamat || '',
    npwp: authUser?.npwp || '',
    no_telepon: authUser?.no_telepon || '',
    nama_pic: authUser?.nama_pic || '',
    foto_profil: authUser?.foto_profil || '',
  });
  const simpanProfilMutation = useMutation({
    mutationFn: () =>
      api.updateProfil({
        nama_lengkap: (profilForm.nama_perusahaan.trim() || authUser?.nama_lengkap || '').trim(),
        nama_pic: (profilForm.nama_pic.trim() || '-'),
        alamat: profilForm.alamat.trim(),
        npwp: profilForm.npwp.trim(),
        no_telepon: profilForm.no_telepon.trim(),
        foto_profil: profilForm.foto_profil ?? '',
      }),
    onSuccess: async () => {
      const me = await api.getMe();
      useAppStore.setState({ authUser: me, currentUser: me.nama_lengkap || '' });
      try {
        localStorage.setItem('bengkel_auth_user', JSON.stringify(me));
      } catch {
        /* abaikan */
      }
      setProfilEditing(false);
      toast.success('Profil Disimpan', 'Data perusahaan & kontak Anda telah diperbarui.');
    },
    onError: (err) => toast.error('Gagal Menyimpan', getApiErrorMessage(err)),
  });

  // Multi-tenant Customer Scoping:
  // Pelanggan ID & Nama Perusahaan dari sesi login akun mitra aktif
  const myPelangganId = authUser?.id_pelanggan || authUser?.id || null;
  const myCompanyName = (authUser?.nama_perusahaan || authUser?.nama_lengkap || '').toLowerCase().trim();

  // Status Verifikasi POS / Admin
  const isVerifiedByAdmin = authUser?.pos_verifikasi === true;

  // Predikat kepemilikan kendaraan (guard berbasis relasi ID murni dengan fallback)
  const isMyKendaraan = (k: Kendaraan) => {
    // 1. Relasi Strict by ID: id_pelanggan atau member_fleet_id sama dengan ID pengguna yang login
    const targetUserId = authUser?.id || myPelangganId;
    if (targetUserId) {
      if (k.id_pelanggan === targetUserId || k.member_fleet_id === targetUserId) {
        return true;
      }
    }
    // 2. Fallback sekunder jika data unit belum terisi id_pelanggan / member_fleet_id
    if (!k.id_pelanggan && !k.member_fleet_id && myCompanyName) {
      return (
        (k.nama_pemilik && k.nama_pemilik.toLowerCase().trim() === myCompanyName) ||
        (k.nama_perusahaan && k.nama_perusahaan.toLowerCase().trim() === myCompanyName)
      );
    }
    return false;
  };

  // Filter Kendaraan milik kendaraan customer yang sedang login
  const myKendaraanList = (kendaraanList || []).filter((k) => isMyKendaraan(k));

  // Himpunan plat nomor kendaraan kendaraan customer
  const myPlateSet = new Set(myKendaraanList.map((k) => k.no_polisi.toUpperCase().replace(/\s+/g, '')));

  // Pilihan kendaraan di modal booking (Step 1): filter by plat nomor, merk, model + pagination
  const filteredBookingKendaraanList = useMemo(() => {
    const q = bookingKendaraanSearch.trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return myKendaraanList;
    return myKendaraanList.filter((k) => {
      const plat = (k.no_polisi || '').toLowerCase().replace(/\s+/g, '');
      const merk = (k.merk || '').toLowerCase();
      const model = (k.model || '').toLowerCase();
      return plat.includes(q) || merk.includes(q) || model.includes(q);
    });
  }, [myKendaraanList, bookingKendaraanSearch]);

  const bookingKendaraanTotalPages = Math.max(1, Math.ceil(filteredBookingKendaraanList.length / bookingKendaraanLimit));
  const bookingKendaraanSafePage = Math.min(bookingKendaraanPage, bookingKendaraanTotalPages);
  const bookingKendaraanPaginated = filteredBookingKendaraanList.slice(
    (bookingKendaraanSafePage - 1) * bookingKendaraanLimit,
    bookingKendaraanSafePage * bookingKendaraanLimit
  );

  // Otomatis sinkronkan halaman kendaraan di modal booking saat unit tertentu dipilih
  React.useEffect(() => {
    if (openBookingModal && bookingForm.no_polisi) {
      const idx = filteredBookingKendaraanList.findIndex(
        (k) => normalizePlat(k.no_polisi) === normalizePlat(bookingForm.no_polisi)
      );
      if (idx !== -1) {
        setBookingKendaraanPage(Math.floor(idx / bookingKendaraanLimit) + 1);
      }
    }
  }, [openBookingModal, bookingForm.no_polisi, bookingKendaraanLimit, filteredBookingKendaraanList]);

  // Filter SPK khusus kendaraan customer yang sedang login
  const isMySpk = (s: SpkService) => {
    if (myPelangganId && s.id_pelanggan === myPelangganId) return true;
    if (myCompanyName && s.nama_customer && s.nama_customer.toLowerCase().trim() === myCompanyName) return true;
    if (s.no_polisi && myPlateSet.has(s.no_polisi.toUpperCase().replace(/\s+/g, ''))) return true;
    return false;
  };

  // Urut eksplisit terbaru dulu agar pelacakan selalu ambil 1 data service terkini
  const mySpkList = (spkList || [])
    .filter((s) => isMySpk(s))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  // Filter faktur milik kendaraan customer yang sedang login
  const myInvoiceList = (invoiceList || []).filter((inv) => {
    if (inv.id_spk && mySpkList.some((s) => s.id === inv.id_spk)) return true;
    if (myPelangganId && inv.id_pelanggan === myPelangganId) return true;
    if (inv.no_polisi && myPlateSet.has(inv.no_polisi.toUpperCase().replace(/\s+/g, ''))) return true;
    return false;
  });

  // Baris yang sedang ditampilkan pada daftar kendaraan & riwayat service.
  // Server sudah memfilter per tenant di SQL, guard di sini hanya jaring pengaman
  // agar data mitra lain tidak pernah ikut tampil.
  const armadaRows = (armadaPageData?.rows || []).filter((k) => isMyKendaraan(k));

  // Filter SPK riwayat berdasarkan status pengerjaan (Sedang Diservis vs Selesai) & kata kunci pencarian
  const historyFiltered = React.useMemo(() => {
    let list = mySpkList;
    if (historyStatusFilter === 'sedang-diservis') {
      list = list.filter((s) => s.status_spk !== 'Selesai' && s.status_spk !== 'FIR Closed');
    } else if (historyStatusFilter === 'selesai') {
      list = list.filter((s) => s.status_spk === 'Selesai' || s.status_spk === 'FIR Closed');
    }

    const q = historySearch.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        (s.no_spk && s.no_spk.toLowerCase().includes(q)) ||
        (s.no_polisi && s.no_polisi.toLowerCase().includes(q)) ||
        (s.keluhan_customer && s.keluhan_customer.toLowerCase().includes(q)) ||
        (s.status_spk && s.status_spk.toLowerCase().includes(q))
      );
    }
    return list;
  }, [mySpkList, historyStatusFilter, historySearch]);

  const historyTotalPages = Math.max(1, Math.ceil(historyFiltered.length / historyLimit));
  const historySafePage = Math.min(historyPage, historyTotalPages);
  const historyRows = historyFiltered.slice(
    (historySafePage - 1) * historyLimit,
    historySafePage * historyLimit
  );

  React.useEffect(() => {
    setHistoryPage(1);
  }, [historyStatusFilter, historySearch, historyLimit]);

  // Deep-link approval realtime SPK: buka detail saat link settle
  React.useEffect(() => {
    if (fleetPendingSpkId == null) return;
    if (fleetMenu !== 'history') {
      setFleetMenu('history');
      return;
    }
    if (spkList === undefined) return;
    const target = mySpkList.find((s) => s.id === fleetPendingSpkId);
    if (target) {
      setHistoryDetail(target);
    }
    setFleetPendingSpkId(null);
  }, [fleetPendingSpkId, fleetMenu, spkList, mySpkList, setFleetMenu, setHistoryDetail, setFleetPendingSpkId]);

  React.useEffect(() => {
    setApprovalModalOpen(!!historyDetail);
  }, [historyDetail, setApprovalModalOpen]);

  // Kalau jumlah data menyusut (mis. filter pencarian aktif) sampai halaman aktif
  // melewati halaman terakhir, tarik kembali ke halaman terakhir yang valid.
  React.useEffect(() => {
    const meta = armadaPageData?.pagination;
    if (meta && meta.total_pages > 0 && armadaPage > meta.total_pages) {
      setArmadaPage(meta.total_pages);
    }
  }, [armadaPageData, armadaPage]);

  // Filter Booking khusus customer yang sedang login
  const myBookingList = (bookingList || []).filter((b) => {
    if (myPelangganId && b.id_pelanggan === myPelangganId) return true;
    if (myCompanyName && b.nama_perusahaan && b.nama_perusahaan.toLowerCase().trim() === myCompanyName) return true;
    if (b.no_polisi && myPlateSet.has(b.no_polisi.toUpperCase().replace(/\s+/g, ''))) return true;
    return false;
  });

  // Helper: Cek apakah kendaraan dari jadwal booking ini sudah di-check in atau terbit SPK
  const isBookingCheckedIn = useCallback((b: BookingService): boolean => {
    if (b.status === 'Check In') return true;
    if (b.status === 'Dibatalkan' || b.status === 'Booking Canceled' || b.is_canceled) return false;

    const bPlate = normalizePlat(b.no_polisi);
    const hasSpk = (spkList || []).some((s) => {
      if (s.id_booking != null && s.id_booking === b.id) return true;
      if (bPlate && normalizePlat(s.no_polisi) === bPlate) {
        const sTime = s.waktu_check_in || s.created_at || '';
        const bDate = (b.tanggal_booking || '').slice(0, 10);
        if (!bDate || !sTime || sTime.slice(0, 10) >= bDate) return true;
      }
      return false;
    });

    return hasSpk;
  }, [spkList]);

  // Status operasional booking: 'Check In' bila sudah terbit SPK / berstatus Check In
  const getBookingEffectiveStatus = useCallback((b: BookingService): 'Booked' | 'Check In' | 'Booking Canceled' => {
    if (b.status === 'Booking Canceled' || b.status === 'Dibatalkan' || b.is_canceled) return 'Booking Canceled';
    if (b.status === 'Check In' || isBookingCheckedIn(b)) return 'Check In';
    return 'Booked';
  }, [isBookingCheckedIn]);

  // Helper: Cek apakah kendaraan saat ini aktif berada di dalam bengkel (belum check-out)
  const isKendaraanInBengkel = useCallback((nopol?: string): boolean => {
    if (!nopol) return false;
    const cleanP = normalizePlat(nopol);
    if (!cleanP) return false;
    return (spkList || []).some((s) => {
      if (normalizePlat(s.no_polisi) !== cleanP) return false;
      return s.status_spk !== 'Selesai' && !s.waktu_check_out;
    });
  }, [spkList]);

  // Helper: Status badge masa berlaku dokumen (berlaku > 30 hari, mendekati <= 30 hari, kadaluarsa < 0)
  const renderDocExpiryBadge = useCallback((dateStr?: string | null) => {
    if (!dateStr) return <span className="text-ink-muted">-</span>;
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return <span className="text-ink-muted">-</span>;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiry = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const dateFormatted = target.toLocaleDateString('id-ID');

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
          {dateFormatted}
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
          {dateFormatted}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
        <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
        {dateFormatted}
      </span>
    );
  }, []);

  // Aturan cancel booking: status masih Booked dan minimal 10 menit sebelum
  // jadwal (tanggal_booking + jam_booking). Server juga menolak bila status
  // sudah berubah / sudah ada check-in dari booking tersebut.
  const getCancelState = (b: BookingService): { allowed: boolean; reason: string } => {
    const effStatus = getBookingEffectiveStatus(b);
    if (effStatus === 'Check In') {
      return { allowed: false, reason: 'Kendaraan sudah di-check in di gerbang bengkel.' };
    }
    if (effStatus !== 'Booked') {
      return { allowed: false, reason: `Status "${b.status}" sudah tidak bisa dibatalkan.` };
    }
    const [h, m] = (b.jam_booking || '00:00').split(':').map(Number);
    const sched = new Date(`${b.tanggal_booking}T${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}:00`);
    if (isNaN(sched.getTime())) {
      return { allowed: false, reason: 'Jadwal booking tidak valid.' };
    }
    if (Date.now() > sched.getTime() - 10 * 60 * 1000) {
      return { allowed: false, reason: 'Batas pembatalan H-10 menit sudah lewat. Hubungi bengkel.' };
    }
    return { allowed: true, reason: '' };
  };

  // Booking Saya: urut jadwal terdekat, yang masih aktif di atas, lalu selesai, dan yang Dibatalkan di bawah
  const myBookingSorted = [...myBookingList].sort((a, b) => {
    const aStat = getBookingEffectiveStatus(a);
    const bStat = getBookingEffectiveStatus(b);
    if (aStat === 'Booking Canceled' && bStat !== 'Booking Canceled') return 1;
    if (bStat === 'Booking Canceled' && aStat !== 'Booking Canceled') return -1;
    if (aStat === 'Check In' && bStat === 'Booked') return 1;
    if (bStat === 'Check In' && aStat === 'Booked') return -1;
    return `${a.tanggal_booking} ${a.jam_booking}`.localeCompare(`${b.tanggal_booking} ${b.jam_booking}`);
  });

  // ── Booking Saya: DateTile component ─────────────────────────────────────────
  const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  const BookingDateTile = ({ dateStr }: { dateStr?: string }) => {
    if (!dateStr) {
      return (
        <div className="w-[52px] h-[52px] rounded-xl bg-[#EEF2FF] dark:bg-blue-950/40 border border-[#DDE5FB] dark:border-blue-900/50 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-[#12388F] dark:text-blue-300" />
        </div>
      );
    }

    const parts = dateStr.split('-');
    let month = '';
    let day = '';
    if (parts.length === 3) {
      const monthNum = parseInt(parts[1], 10);
      const dayNum = parseInt(parts[2], 10);
      if (!isNaN(monthNum) && !isNaN(dayNum) && monthNum >= 1 && monthNum <= 12) {
        month = MONTH_NAMES[monthNum - 1];
        day = String(dayNum);
      }
    }

    if (!month || !day) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        month = MONTH_NAMES[d.getMonth()] || '';
        day = String(d.getDate());
      }
    }

    if (!month || !day) {
      return (
        <div className="w-[52px] h-[52px] rounded-xl bg-[#EEF2FF] dark:bg-blue-950/40 border border-[#DDE5FB] dark:border-blue-900/50 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-[#12388F] dark:text-blue-300" />
        </div>
      );
    }

    return (
      <div className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-[#12388F] to-[#3B6FD4] flex flex-col items-center justify-center shrink-0 select-none shadow-md shadow-[#12388F]/25 border border-white/10">
        <span className="text-[10px] font-bold text-white/75 tracking-wider leading-none uppercase">
          {month}
        </span>
        <span className="text-[20px] font-extrabold text-white leading-tight tabular-nums mt-0.5">
          {day}
        </span>
      </div>
    );
  };

  // ── Booking Saya: hanya menampilkan booking yang Aktif (Booked) ──────────────
  const bookingAktifList = myBookingSorted.filter((b) => getBookingEffectiveStatus(b) === 'Booked');
  const bookingFiltered = bookingAktifList;

  const {
    page: bookingViewPage,
    limit: bookingViewLimit,
    safePage: bookingViewSafePage,
    totalPages: bookingViewTotalPages,
    offset: bookingViewOffset,
    setPage: setBookingViewPage,
    setLimit: setBookingViewLimit,
  } = usePagination({
    total: bookingFiltered.length,
    defaultLimit: 10,
    maxLimit: 200,
    storageKey: 'booking',
  });

  const bookingViewRows = bookingFiltered.slice(
    bookingViewOffset,
    bookingViewOffset + bookingViewLimit
  );

  // Jadwal Booking Terdekat: hanya yang masih Booked DAN jadwalnya belum lewat.
  // Booking yang sudah check-in (Diproses), Selesai, Dibatalkan, atau terlewat
  // tidak tampil di kartu ringkas (tetap ada di tab Booking Saya).
  const upcomingBookings = myBookingSorted.filter((b) => {
    if (getBookingEffectiveStatus(b) !== 'Booked') return false;
    const [h, m] = (b.jam_booking || '00:00').split(':').map(Number);
    const sched = new Date(
      `${b.tanggal_booking}T${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}:00`
    );
    return !Number.isNaN(sched.getTime()) && sched.getTime() >= Date.now();
  });

  // Batalkan Booking Mutation
  const batalkanBookingMutation = useMutation({
    mutationFn: (id: number) => api.batalkanBooking({ id }),
    onSuccess: (res, id) => {
      const b = (bookingList || []).find((x) => x.id === id);
      queryClient.invalidateQueries({ queryKey: ['booking-list'] });
      if (res?.rows_affected === 0) {
        toast.warning('Booking tidak dapat dibatalkan', 'Mungkin sudah diproses / check-in oleh Security.');
        return;
      }
      realtimeHub.publish({
        type: 'BOOKING_CREATED',
        targetRoles: ['SA', 'Security'],
        title: 'Booking Dibatalkan Customer',
        message: `Booking ${b?.no_booking || ''} (${b?.no_polisi ? formatPlat(b.no_polisi) : ''}) jadwal ${b?.tanggal_booking || ''} ${b?.jam_booking || ''} dibatalkan customer.`,
        linkTab: 'security-booking',
        urgency: 'warning',
      });
      toast.success('Booking Dibatalkan', 'Jadwal Anda telah dibatalkan.');
    },
    onError: (err: any) =>
      toast.error('Gagal Membatalkan', err?.message || 'Coba beberapa saat lagi.'),
  });

  // Target konfirmasi pembatalan booking (pengganti window.confirm)
  const [cancelBookingTarget, setCancelBookingTarget] = useState<BookingService | null>(null);

  // Tombol Batalkan Booking (dipakai di Dashboard & seksi Booking Saya).
  // Terkunci bila aturan H-10 menit / status tidak memungkinkan.
  const BookingCancelButton = ({ b, compact = false }: { b: BookingService; compact?: boolean }) => {
    const effStatus = getBookingEffectiveStatus(b);
    if (effStatus === 'Booking Canceled' || effStatus === ('Dibatalkan' as any)) {
      return (
        <span className="text-xs px-2.5 py-1 rounded-xl bg-surface text-ink-subtle border border-border font-bold">
          Booking Canceled
        </span>
      );
    }
    if (effStatus === 'Check In') {
      return (
        <span className="text-xs px-2.5 py-1 rounded-xl bg-status-green-bg text-status-green font-bold border border-status-green/30">
          Sudah di Bengkel
        </span>
      );
    }
    const st = getCancelState(b);
    const isDisabled = !st.allowed || batalkanBookingMutation.isPending;
    const tooltipText = st.allowed ? 'Batalkan booking ini' : st.reason;

    if (isDisabled) {
      return (
        <span title={tooltipText} className="inline-block">
          <button
            type="button"
            disabled
            className={`${
              compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
            } rounded-xl font-bold border border-[#E2E8F0] dark:border-slate-700 bg-surface dark:bg-slate-800 text-[#94A3B8] dark:text-slate-500 cursor-not-allowed inline-flex items-center gap-1.5`}
          >
            <Lock className="w-3 h-3 text-[#94A3B8] dark:text-slate-500" />
            <span>Batalkan</span>
          </button>
        </span>
      );
    }

    return (
      <button
        type="button"
        title={tooltipText}
        onClick={() => setCancelBookingTarget(b)}
        className={`${
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
        } rounded-xl font-bold transition-all border border-[#FECACA] dark:border-red-900/50 text-[#DC2626] dark:text-red-400 bg-transparent hover:bg-[#FEF2F2] dark:hover:bg-red-950/40 cursor-pointer inline-flex items-center gap-1`}
      >
        Batalkan
      </button>
    );
  };

  // Filter Dokumen khusus kendaraan milik customer yang sedang login
  const myDokumenList = (dokumenList || []).filter((d) => {
    if (myPelangganId && d.id_pelanggan === myPelangganId) return true;
    if (myCompanyName && d.nama_perusahaan && d.nama_perusahaan.toLowerCase().trim() === myCompanyName) return true;
    if (d.no_polisi && myPlateSet.has(d.no_polisi.toUpperCase().replace(/\s+/g, ''))) return true;
    return false;
  });

  // Active SPK being monitored: ambil SPK aktif milik customer yang sedang berjalan
  const activeTrackSpk = mySpkList.find(s => s.status_spk !== 'Selesai' && s.status_spk !== 'FIR Closed') || mySpkList[0];

  // ── DOKUMEN SAYA: Berkas legalitas kendaraan (STNK, BPKB, KIR, Asuransi) ─────
  const [dokumenFilterPlat, setDokumenFilterPlat] = useState('');
  const [dokumenPage, setDokumenPage] = useState(1);
  const [dokumenLimit, setDokumenLimit] = useState(10);

  const dokumenSemuaList = [...myDokumenList].sort((a, b) => {
    return String(b.tanggal_upload || '').localeCompare(String(a.tanggal_upload || ''));
  });
  const dokumenTerfilterList = dokumenSemuaList.filter((item) => {
    if (!dokumenFilterPlat) return true;
    return (item.no_polisi || '').toUpperCase().replace(/\s+/g, '') === dokumenFilterPlat.toUpperCase().replace(/\s+/g, '');
  });
  const dokumenTotalPages = Math.max(1, Math.ceil(dokumenTerfilterList.length / dokumenLimit));
  const dokumenSafePage = Math.min(dokumenPage, dokumenTotalPages);
  const dokumenRows = dokumenTerfilterList.slice((dokumenSafePage - 1) * dokumenLimit, dokumenSafePage * dokumenLimit);

  React.useEffect(() => {
    setDokumenPage(1);
  }, [dokumenFilterPlat, dokumenLimit]);

  // Tarif PPN dari DB (dipakai komponen tracking + seksi approval)
  const { rate: ppnRateCustomer } = usePpnRate();

  // Approval Mutation (Setujui / Tolak pekerjaan tambahan)
  const approvalTambahanMutation = useMutation({
    mutationFn: (payload: { id: number; status_approval_customer: 'Disetujui' | 'Ditolak' }) =>
      api.approvalCustomer(payload),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tambahan-pekerjaan'] });
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      if (variables.status_approval_customer === 'Disetujui') {
        toast.success('Pekerjaan Tambahan Disetujui', 'Mekanik akan segera melanjutkan pengerjaan unit.');
      } else {
        toast.info('Pekerjaan Tambahan Ditolak', 'Bengkel akan melanjutkan pengerjaan sesuai SPK awal.');
      }
    },
    onError: (err: any) =>
      toast.error('Gagal Mengirim Keputusan', err?.message || 'Coba beberapa saat lagi.'),
  });

  // Approval Mutation estimasi UTAMA (Excel tahap 6: Approve/Reject -> WO terbit).
  // Setujui -> 'Estimasi Disetujui' (WO terbit, mekanik boleh START).
  // Tolak -> 'Estimasi Dibuat' (SA revisi angka & kirim ulang).
  const approvalEstimasiMutation = useMutation({
    mutationFn: async (payload: { setuju: boolean; spk: SpkService }) => {
      const { setuju, spk } = payload;
      if (!spk) throw new Error('Tidak ada SPK aktif.');
      return api.updateSpkStatus({
        id: spk.id,
        status_spk: setuju ? 'Estimasi Disetujui' : 'Estimasi Dibuat',
        catatan_sa: setuju ? undefined : 'Estimasi ditolak customer — mohon revisi angka & kirim ulang.',
      });
    },
    onSuccess: (_res, { setuju, spk }) => {
      // Optimistic UI: balik status seketika agar kartu approval langsung
      // hilang/berubah tanpa menunggu refetch (refetch tab background bisa lama).
      queryClient.setQueryData<SpkService[]>(['spk-list'], (old) =>
        old ? old.map((s) => (s.id === spk.id ? { ...s, status_spk: setuju ? 'Estimasi Disetujui' : 'Estimasi Dibuat' } : s)) : old
      );
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      window.dispatchEvent(new CustomEvent('kim3:estimasi-decided'));
      if (setuju) {
        realtimeHub.publish({
          type: 'SPK_STATUS_CHANGED',
          targetRoles: ['SA'],
          title: 'Estimasi Disetujui Customer',
          message: `Estimasi ${spk?.no_spk} (${formatPlat(spk?.no_polisi || '')}) disetujui. WO terbit — mekanik siap start.`,
          linkTab: 'sa',
          urgency: 'success',
        });
        const mid = spk?.id_mekanik;
        if (mid) {
          realtimeHub.publish({
            type: 'SPK_STATUS_CHANGED',
            targetRoles: ['Mekanik'],
            targetUserId: mid,
            title: 'WO Siap Dikerjakan',
            message: `Estimasi ${spk?.no_spk} unit ${formatPlat(spk?.no_polisi || '')} disetujui customer. Silakan START JOB.`,
            linkTab: 'mekanik',
            urgency: 'urgent',
          });
        }
        toast.success('Estimasi Disetujui', 'WO diterbitkan — mekanik siap memulai pengerjaan.');
      } else {
        realtimeHub.publish({
          type: 'SPK_STATUS_CHANGED',
          targetRoles: ['SA'],
          title: 'Estimasi Ditolak Customer',
          message: `Estimasi ${spk?.no_spk} (${formatPlat(spk?.no_polisi || '')}) ditolak. Mohon revisi & kirim ulang.`,
          linkTab: 'sa',
          urgency: 'warning',
        });
        toast.info('Estimasi Ditolak', 'Bengkel akan merevisi estimasi dan mengirim ulang.');
      }
    },
    onError: (err: any) =>
      toast.error('Gagal Mengirim Keputusan', err?.message || 'Coba beberapa saat lagi.'),
  });


  // Booking Mutation
  const createBookingMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      if (bookingForm.tanggal_booking < todayStr) {
        throw new Error('Tanggal rencana masuk tidak boleh di masa lampau.');
      }
      if (bookingForm.tanggal_booking === todayStr) {
        const [h, m] = (bookingForm.jam_booking || '00:00').split(':').map(Number);
        const curH = now.getHours();
        const curM = now.getMinutes();
        if (h < curH || (h === curH && m <= curM)) {
          throw new Error(`Jam kedatangan untuk hari ini tidak boleh di jam yang sudah terlewat.`);
        }
      }

      const bookNo = `BK${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      return api.tambahBooking({
        no_booking: bookNo,
        id_pelanggan: myPelangganId || undefined,
        no_polisi: bookingForm.no_polisi,
        jenis_layanan: bookingForm.jenis_layanan,
        tanggal_booking: bookingForm.tanggal_booking,
        jam_booking: bookingForm.jam_booking,
        keluhan: bookingForm.keluhan,
        catatan: bookingForm.catatan,
        prioritas: 'Prioritas Booking',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-list'] });
      realtimeHub.publish({
        type: 'BOOKING_CREATED',
        targetRoles: ['SA', 'Security'],
        title: 'Booking Baru Diterima',
        message: `Customer telah membuat booking service nopol ${formatPlat(bookingForm.no_polisi)} (${bookingForm.jenis_layanan}) untuk ${bookingForm.tanggal_booking} jam ${bookingForm.jam_booking}.`,
        linkTab: 'security-booking',
        urgency: 'info',
      });
      toast.success(
        'Booking Service Berhasil Dibuat!',
        `Kendaraan ${formatPlat(bookingForm.no_polisi)} dijadwalkan pada ${bookingForm.tanggal_booking} jam ${bookingForm.jam_booking} WIB.`
      );
      setOpenBookingModal(false);
      setBookingStep(1);
      setFleetMenu('booking');
      setActiveTab('fleet-booking');
    },
    onError: (err: any) =>
      toast.error('Gagal Membuat Booking', err?.message || 'Periksa kembali koneksi atau data formulir Anda.'),
  });

  // Tambah Kendaraan State & Mutation
  const [openTambahArmadaModal, setOpenTambahArmadaModal] = useState(false);
  const [armadaForm, setArmadaForm] = useState({
    no_polisi: '',
    no_inventaris: '',
    unit_name: '',
    jenis_armada: 'Truk',
    type: '',
    merk: '',
    model: '',
    tahun: new Date().getFullYear(),
    nama_pemilik: currentUser || '',
    no_rangka: '',
    no_mesin: '',
    expired: '',
    asuransi: '',
    masa_berlaku_asuransi: '',
    note: '',
    description: '',
    foto_kendaraan: '',
  });

  const tambahArmadaMutation = useMutation({
    mutationFn: async (data: typeof armadaForm) => {
      if (!isVerifiedByAdmin) {
        throw new Error('Akun belum terverifikasi oleh admin POS.');
      }
      // Plat dinormalisasi (primary key walk-in); konflik pemilik ditolak server.
      const plat = normalizePlat(data.no_polisi);
      if (!plat) throw new Error('Nomor polisi wajib diisi.');
      const res = await api.tambahKendaraan({
        no_polisi: plat,
        no_inventaris: data.no_inventaris || undefined,
        unit_name: data.unit_name || undefined,
        jenis_armada: data.jenis_armada as any,
        type: data.type || data.jenis_armada || undefined,
        merk: cleanField(data.merk) || undefined,
        model: cleanField(data.model) || undefined,
        tahun: Number(data.tahun) || new Date().getFullYear(),
        nama_pemilik: data.nama_pemilik || authUser?.nama_perusahaan || authUser?.nama_lengkap || 'Customer Fleet',
        no_rangka: data.no_rangka || undefined,
        no_mesin: data.no_mesin || undefined,
        expired: data.expired || data.masa_berlaku_asuransi || undefined,
        asuransi: data.asuransi || undefined,
        masa_berlaku_asuransi: data.masa_berlaku_asuransi || data.expired || undefined,
        note: data.note || undefined,
        description: data.description || undefined,
        foto_kendaraan: data.foto_kendaraan || undefined,
        id_pelanggan: myPelangganId || undefined,
      });
      return { res, plat };
    },
    onSuccess: ({ plat }) => {
      queryClient.invalidateQueries({ queryKey: ['kendaraan-list'] });
      queryClient.invalidateQueries({ queryKey: ['kendaraan-page'] });
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['booking-list'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-list'] });
      toast.success('Unit Kendaraan Ditambahkan', `Kendaraan ${plat} berhasil didaftarkan ke sistem.`);

      // Klaim plat walk-in: bila ada riwayat (SPK/booking/invoice) untuk plat ini,
      // kirim 1 notif ringkasan personal ke diri sendiri.
      const norm = (s?: string) => (s || '').toUpperCase().replace(/\s+/g, '');
      const nSpk = (spkList || []).filter((s) => norm(s.no_polisi) === plat).length;
      const nBooking = (bookingList || []).filter((b) => norm(b.no_polisi) === plat).length;
      const nInv = (invoiceList || []).filter((i) => norm(i.no_polisi) === plat).length;
      const total = nSpk + nBooking + nInv;
      if (total > 0 && authUser?.id) {
        const parts: string[] = [];
        if (nSpk > 0) parts.push(`${nSpk} SPK`);
        if (nBooking > 0) parts.push(`${nBooking} booking`);
        if (nInv > 0) parts.push(`${nInv} faktur`);
        realtimeHub.publish({
          type: 'SPK_STATUS_CHANGED',
          targetRoles: ['Customer Fleet'],
          targetUserId: authUser.id,
          targetPelangganId: myPelangganId,
          title: 'Riwayat Kendaraan Ditemukan',
          message: `Plat ${plat} memiliki riwayat (${parts.join(', ')}) yang kini masuk ke akun Anda.`,
          linkTab: 'fleet-history',
          urgency: 'success',
        });
      }
      setOpenTambahArmadaModal(false);
      setArmadaForm({
        no_polisi: '',
        no_inventaris: '',
        unit_name: '',
        jenis_armada: 'Truk',
        type: '',
        merk: '',
        model: '',
        tahun: new Date().getFullYear(),
        nama_pemilik: currentUser || '',
        no_rangka: '',
        no_mesin: '',
        expired: '',
        asuransi: '',
        masa_berlaku_asuransi: '',
        note: '',
        description: '',
        foto_kendaraan: '',
      });
    },
    onError: (err: any) =>
      toast.error('Gagal Menambahkan Unit', getApiErrorMessage(err, 'Periksa kembali kelengkapan data kendaraan Anda.')),
  });

  // Edit Kendaraan Mutation (server guard: customer hanya unit miliknya)
  const editArmadaMutation = useMutation({
    mutationFn: (data: typeof editArmadaForm) =>
      api.updateKendaraan({
        no_polisi: editArmadaData?.no_polisi || data.no_polisi || '',
        no_inventaris: data.no_inventaris || undefined,
        unit_name: data.unit_name || undefined,
        jenis_armada: data.jenis_armada as any,
        type: data.type || data.jenis_armada || undefined,
        merk: cleanField(data.merk) || undefined,
        model: cleanField(data.model) || undefined,
        tahun: Number(data.tahun) || undefined,
        no_rangka: data.no_rangka || undefined,
        no_mesin: data.no_mesin || undefined,
        expired: data.expired || data.masa_berlaku_asuransi || undefined,
        asuransi: data.asuransi || undefined,
        masa_berlaku_asuransi: data.masa_berlaku_asuransi || data.expired || undefined,
        note: data.note || undefined,
        description: data.description || undefined,
        foto_kendaraan: data.foto_kendaraan || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kendaraan-list'] });
      queryClient.invalidateQueries({ queryKey: ['kendaraan-page'] });
      toast.success('Unit Kendaraan Diperbarui', `Data ${editArmadaData?.no_polisi ? formatPlat(editArmadaData.no_polisi) : ''} berhasil disimpan.`);
      setEditArmadaData(null);
    },
    onError: (err) => toast.error('Gagal Memperbarui Unit', getApiErrorMessage(err, 'Periksa kembali data kendaraan Anda.')),
  });

  // Hapus Kendaraan Mutation (server guard: customer hanya unit miliknya)
  const hapusArmadaMutation = useMutation({
    mutationFn: (noPolisi: string) => api.hapusKendaraan(noPolisi),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kendaraan-list'] });
      queryClient.invalidateQueries({ queryKey: ['kendaraan-page'] });
      toast.success('Unit Kendaraan Dihapus', `${hapusArmadaTarget?.no_polisi ? formatPlat(hapusArmadaTarget.no_polisi) : 'Unit'} telah dihapus dari daftar kendaraan Anda.`);
      setHapusArmadaTarget(null);
    },
    onError: (err) => toast.error('Gagal Menghapus Unit', getApiErrorMessage(err, 'Unit mungkin sedang dipakai transaksi aktif.')),
  });

  // Tambah Dokumen State & Mutation
  const [openTambahDokumenModal, setOpenTambahDokumenModal] = useState(false);
  const [dokumenForm, setDokumenForm] = useState({
    no_polisi: '',
    nama_dokumen: '',
    jenis_dokumen: 'STNK',
    masa_berlaku: '',
    keterangan: '',
    file_url: 'https://bengkelkim3.com/dokumen/sample-doc.pdf',
  });

  const tambahDokumenMutation = useMutation({
    mutationFn: async (data: typeof dokumenForm) => {
      if (!isVerifiedByAdmin) {
        throw new Error('Akun belum terverifikasi oleh admin POS.');
      }
      return api.tambahDokumen({
        no_polisi: data.no_polisi,
        nama_dokumen: data.nama_dokumen,
        jenis_dokumen: data.jenis_dokumen as any,
        masa_berlaku: data.masa_berlaku || undefined,
        keterangan: data.keterangan,
        file_url: data.file_url,
        id_pelanggan: myPelangganId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dokumen-list'] });
      toast.success('Dokumen Berhasil Disimpan', `Berkas ${dokumenForm.nama_dokumen} untuk kendaraan ${formatPlat(dokumenForm.no_polisi)} aman tersimpan.`);
      setOpenTambahDokumenModal(false);
      setDokumenForm({
        no_polisi: '',
        nama_dokumen: '',
        jenis_dokumen: 'STNK',
        masa_berlaku: '',
        keterangan: '',
        file_url: 'https://bengkelkim3.com/dokumen/sample-doc.pdf',
      });
    },
    onError: (err: any) =>
      toast.error('Gagal Mengunggah Dokumen', err?.message || 'Periksa kembali data Anda.'),
  });

  return (
    <div className="space-y-6">
      
      {/* Alert Akun Belum Terverifikasi oleh Admin */}
      {!isVerifiedByAdmin && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-500/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-base text-amber-950 dark:text-amber-100">
                  Akun Belum Terverifikasi oleh Admin
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40">
                  Menunggu Approval POS
                </span>
              </div>
              <p className="text-sm text-amber-900 dark:text-amber-100/90 mt-1 leading-relaxed font-medium">
                Akun kemitraan Anda saat ini menunggu verifikasi data oleh admin sistem POS. Anda belum dapat melakukan booking service, menambahkan armada kendaraan baru, atau mengunggah dokumen sampai akun selesai diverifikasi oleh admin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MENU 0: DASHBOARD RINGKASAN KENDARAAN */}
      {fleetMenu === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div
            className="rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border-0 bg-[#1D4ED8] text-white dark:bg-[#1B42B8]"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold mb-2 shadow-2xs">
                <Truck className="w-3.5 h-3.5 text-white" />
                Portal Monitoring Fleet KIM 3 Medan
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">Selamat Datang, {currentUser || 'Pelanggan Fleet'}</h1>
              <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed font-normal">
                Pantau status perbaikan kendaraan, jadwalkan booking perawatan berkala, serta kelola dokumen perizinan STNK & KIR secara realtime.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                disabled={!isVerifiedByAdmin}
                onClick={() => {
                  if (!isVerifiedByAdmin) {
                    toast.warning('Aksi Dibatasi', 'Akun belum terverifikasi oleh admin.');
                    return;
                  }
                  setFleetMenu('booking');
                  setActiveTab('fleet-booking');
                }}
                className={`px-4 py-2.5 bg-white hover:bg-[#EFF6FF] active:bg-[#DBEAFE] text-[#1D4ED8] text-xs font-semibold rounded-xl border-0 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] hover:-translate-y-[1px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-[#1D4ED8] flex items-center gap-2 ${
                  !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin' : undefined}
              >
                <Plus className="w-4 h-4 text-[#1D4ED8]" /> Booking Service
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Booking Aktif"
              value={upcomingBookings.length}
              subtitle="Antrian Masuk"
              icon={Calendar}
              tone="blue"
              onClick={() => {
                setFleetMenu('booking');
                setActiveTab('fleet-booking');
              }}
            />
            <StatCard
              title="Total Kendaraan"
              value={myKendaraanList.length}
              subtitle="Unit Terdaftar"
              icon={Truck}
              tone="accent"
              onClick={() => {
                setFleetMenu('kendaraan');
                setActiveTab('fleet-kendaraan');
              }}
            />
            <StatCard
              title="Sedang Diservis"
              value={mySpkList.filter(s => s.status_spk !== 'Selesai' && s.status_spk !== 'FIR Closed').length}
              subtitle="Di Bengkel KIM 3"
              icon={Wrench}
              badge={mySpkList.filter(s => s.status_spk !== 'Selesai' && s.status_spk !== 'FIR Closed').length > 0 ? 'Aktif' : undefined}
              tone="amber"
              onClick={() => {
                if (activeTrackSpk) {
                  setHistoryDetail(activeTrackSpk);
                } else {
                  setFleetMenu('history');
                  setActiveTab('fleet-history');
                }
              }}
            />
            <StatCard
              title="Dokumen Digital"
              value={myDokumenList.length}
              subtitle="STNK & KIR"
              icon={FileText}
              tone="teal"
              onClick={() => {
                setFleetMenu('dokumen');
                setActiveTab('fleet-dokumen');
              }}
            />
          </div>
        </div>
      )}

      {/* MENU 2: BOOKING SERVICE (image5.png Mockup 1) */}
      {fleetMenu === 'booking' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">Booking Service Kendaraan Perusahaan</h2>
              <p className="text-xs text-ink-muted">Jadwalkan service kendaraan Anda untuk mendapatkan antrian prioritas di Bengkel KIM 3</p>
            </div>
            <button
              type="button"
              disabled={!isVerifiedByAdmin}
              onClick={() => {
                if (!isVerifiedByAdmin) {
                  toast.warning('Aksi Dibatasi', 'Akun belum terverifikasi oleh admin.');
                  return;
                }
                setBookingStep(1);
                setOpenBookingModal(true);
              }}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#12388F] hover:bg-[#0D2A6B] text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 ${
                !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin' : undefined}
            >
              <Plus className="w-4 h-4" />
              <span>Jadwalkan Service Baru</span>
            </button>
          </div>

          {/* Booking Saya: Daftar booking aktif */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:bg-surface-raised">
              <h3 className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#12388F] dark:bg-blue-950/60 dark:text-blue-300">
                  <Calendar className="h-4 w-4" />
                </span>
                Daftar Booking Saya
              </h3>
              <span className="w-fit rounded-md border border-[#DCE5F5] bg-[#F5F8FD] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#34517C] dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
                {bookingAktifList.length} booking aktif
              </span>
            </div>

            <div>
            {isLoadingBooking ? (
              <div className="divide-y divide-border">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex animate-pulse items-center gap-4 px-5 py-4">
                    <div className="h-9 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 flex-1 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="hidden h-4 w-36 rounded bg-slate-200 dark:bg-slate-800 sm:block" />
                    <div className="h-7 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : bookingFiltered.length > 0 ? (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-border bg-[#F6F8FB] dark:bg-slate-800/70">
                      <tr>
                        <th scope="col" className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">No. Booking</th>
                        <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Kendaraan</th>
                        <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Layanan</th>
                        <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Jadwal</th>
                        <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Status</th>
                        <th scope="col" className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {bookingViewRows.map((b) => (
                        <tr key={b.id} className="transition-colors hover:bg-[#F7F9FC] dark:hover:bg-slate-800/40">
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs font-semibold text-[#34517C] dark:text-blue-300">
                            {b.no_booking || `#${b.id}`}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <PlateChip plat={b.no_polisi} />
                          </td>
                          <td className="px-4 py-3.5 text-xs font-medium text-ink-muted">{b.jenis_layanan}</td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <div className="text-xs font-semibold tabular-nums text-ink">{b.tanggal_booking}</div>
                            <div className="mt-0.5 text-[11px] tabular-nums text-ink-subtle">{b.jam_booking} WIB</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <StatusBadge status={getBookingEffectiveStatus(b)} size="sm" />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <BookingCancelButton b={b} compact />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {bookingViewRows.map((b) => (
                    <div key={b.id} className="flex items-start gap-3 px-4 py-4">
                      <BookingDateTile dateStr={b.tanggal_booking} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <PlateChip plat={b.no_polisi} />
                          <StatusBadge status={getBookingEffectiveStatus(b)} size="sm" />
                        </div>
                        <p className="mt-2 truncate text-xs font-semibold text-ink">{b.jenis_layanan}</p>
                        <p className="mt-1 text-[11px] tabular-nums text-ink-muted">{b.tanggal_booking} · {b.jam_booking} WIB</p>
                        <p className="mt-1 font-mono text-[10px] text-ink-subtle">{b.no_booking || `#${b.id}`}</p>
                        <div className="mt-3">
                          <BookingCancelButton b={b} compact />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <PaginationBar
                  page={bookingViewSafePage}
                  totalPages={bookingViewTotalPages}
                  totalRecords={bookingFiltered.length}
                  limit={bookingViewLimit}
                  label="booking"
                  maxLimit={200}
                  className="px-4 py-3 sm:px-5"
                  onPageChange={setBookingViewPage}
                  onLimitChange={setBookingViewLimit}
                />
              </>
            ) : (
              <EmptyState
                icon={Calendar}
                variant="card"
                title="Belum Ada Booking Aktif"
                description="Jadwalkan kedatangan kendaraan Anda untuk mendapatkan antrian prioritas di Bengkel KIM 3."
                action={isVerifiedByAdmin ? {
                  label: '+ Buat Booking Baru',
                  onClick: () => {
                    setBookingStep(1);
                    setOpenBookingModal(true);
                  },
                } : undefined}
              />
            )}
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl border border-[#DCE5F5] bg-[#F5F8FD] px-4 py-3 text-xs leading-relaxed text-[#52647E] dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-slate-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#34517C] dark:text-blue-300" />
            <p>
              Setelah check-in di gerbang, kendaraan otomatis masuk ke Riwayat Kendaraan. Booking dapat dibatalkan paling lambat 10 menit sebelum jadwal.
            </p>
          </div>

          {/* StepModal for Booking Service */}
          {openBookingModal && (
            <StepModal
              open={openBookingModal}
              onClose={() => {
                setOpenBookingModal(false);
                setBookingStep(1);
              }}
              title="Buat Jadwal Booking Service"
              subtitle="Langkah mudah reservasi jadwal perbaikan atau perawatan kendaraan"
              size="lg"
              currentStep={bookingStep - 1}
              onNext={() => {
                if (bookingStep === 1) {
                  if (!bookingForm.no_polisi || myKendaraanList.length === 0) {
                    toast.warning('Pilih Kendaraan', 'Silakan pilih kendaraan yang akan diservis.');
                    return;
                  }
                  setBookingStep(2);
                } else if (bookingStep === 2) {
                  if (isCustomService && !customServiceText.trim()) {
                    toast.warning('Isi Jenis Layanan', 'Silakan ketik jenis perbaikan kustom Anda terlebih dahulu.');
                    return;
                  }
                  setBookingStep(3);
                } else if (bookingStep === 3) {
                  const now = new Date();
                  const todayStr = now.toISOString().slice(0, 10);
                  if (!bookingForm.tanggal_booking) {
                    toast.error('Tanggal Belum Dipilih', 'Silakan pilih tanggal rencana masuk.');
                    return;
                  }
                  if (bookingForm.tanggal_booking < todayStr) {
                    toast.error('Tanggal Tidak Valid', 'Tanggal rencana masuk tidak boleh di masa lampau.');
                    return;
                  }
                  if (bookingForm.tanggal_booking === todayStr) {
                    const [h, m] = (bookingForm.jam_booking || '00:00').split(':').map(Number);
                    const curH = now.getHours();
                    const curM = now.getMinutes();
                    if (h < curH || (h === curH && m <= curM)) {
                      toast.error(
                        'Jam Tidak Valid',
                        `Jam kedatangan untuk hari ini tidak boleh di jam yang sudah terlewat (${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')} WIB).`
                      );
                      return;
                    }
                  }
                  setBookingStep(4);
                }
              }}
              onBack={() => setBookingStep((s) => Math.max(1, s - 1))}
              onSubmit={() => createBookingMutation.mutate()}
              submitLabel={createBookingMutation.isPending ? 'Menyimpan...' : 'Konfirmasi Booking'}
              isPending={createBookingMutation.isPending}
              steps={[
                {
                  id: 'kendaraan',
                  label: 'Pilih Kendaraan',
                  isValid: !!bookingForm.no_polisi && myKendaraanList.length > 0,
                  content: (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm font-bold tracking-tight text-ink">Pilih kendaraan untuk diservis</h3>
                          <p className="mt-0.5 text-[11px] text-ink-muted">Pilih satu unit dari armada perusahaan Anda.</p>
                        </div>
                        <button
                          type="button"
                          disabled={!isVerifiedByAdmin}
                          onClick={() => {
                            if (!isVerifiedByAdmin) {
                              toast.warning('Aksi Dibatasi', 'Akun belum terverifikasi oleh admin.');
                              return;
                            }
                            setOpenTambahArmadaModal(true);
                          }}
                          className={`inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-[#D5DDE8] bg-white px-3 py-2 text-xs font-semibold text-[#34517C] transition hover:bg-[#F5F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:self-auto ${
                            !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin' : undefined}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Tambah Kendaraan</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
                        <input
                          type="text"
                          value={bookingKendaraanSearch}
                          onChange={(e) => {
                            setBookingKendaraanSearch(e.target.value);
                            setBookingKendaraanPage(1);
                          }}
                          placeholder="Cari nomor polisi, merk, atau model..."
                          aria-label="Cari plat nomor kendaraan"
                          className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-9 text-xs text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-hidden dark:bg-surface"
                        />
                        {bookingKendaraanSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setBookingKendaraanSearch('');
                              setBookingKendaraanPage(1);
                            }}
                            aria-label="Bersihkan pencarian"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-subtle transition hover:bg-surface-raised hover:text-ink"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                        <span className="shrink-0 px-1 text-[11px] font-medium tabular-nums text-ink-subtle">
                          {filteredBookingKendaraanList.length} kendaraan
                        </span>
                      </div>

                      <div className="space-y-2">
                        {filteredBookingKendaraanList.length > 0 ? (
                          bookingKendaraanPaginated.map((k) => {
                            const isSelected = bookingForm.no_polisi === k.no_polisi;
                            return (
                              <label
                                key={k.id}
                                className={`group flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors sm:px-4 ${
                                  isSelected
                                    ? 'border-[#34517C] bg-[#F4F7FC] ring-1 ring-[#34517C]/10 dark:bg-blue-950/20'
                                    : 'border-border bg-white hover:border-[#B8C7DC] hover:bg-[#FAFBFD] dark:bg-surface-raised dark:hover:bg-surface'
                                }`}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  {k.foto_kendaraan ? (
                                    <img
                                      src={k.foto_kendaraan}
                                      alt=""
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewImage({
                                          url: k.foto_kendaraan!,
                                          title: formatPlat(k.no_polisi),
                                          subtitle: `${formatMerkModel(k.merk, k.model, k.unit_name || k.jenis_armada || 'Truk')}${cleanField(k.tahun) ? ` (${cleanField(k.tahun)})` : ''}`,
                                        });
                                      }}
                                      className="h-12 w-12 shrink-0 cursor-pointer rounded-lg border border-border object-cover shadow-sm transition-transform hover:scale-[1.03]"
                                      title="Klik untuk memperbesar foto"
                                    />
                                  ) : (
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#DCE5F5] bg-[#F5F8FD] text-[#34517C] dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
                                      <Truck className="h-5 w-5" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                      <PlateChip plat={k.no_polisi} />
                                      <span className="text-[10px] font-medium text-ink-subtle">
                                        {cleanField(k.tahun) || cleanField(k.year) || 'Tahun tidak diketahui'}
                                      </span>
                                    </div>
                                    <div className="truncate text-xs font-bold text-ink">
                                      {formatMerkModel(k.merk, k.model, k.unit_name || k.jenis_armada || 'Truk')}
                                    </div>
                                    <div className="mt-0.5 truncate text-[11px] font-medium text-ink-muted">
                                      {cleanField(k.type) || cleanField(k.jenis_armada) || 'Truk'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 pl-1">
                                  <span className="hidden items-center gap-1 rounded-md border border-status-green/25 bg-status-green-bg px-2 py-1 text-[10px] font-semibold text-status-green sm:inline-flex">
                                    <span className="h-1.5 w-1.5 rounded-full bg-status-green" />
                                    Aktif
                                  </span>
                                  <input
                                    type="radio"
                                    name="booking_kendaraan"
                                    checked={isSelected}
                                    onChange={() => setBookingForm({ ...bookingForm, no_polisi: k.no_polisi })}
                                    aria-label={`Pilih kendaraan ${formatPlat(k.no_polisi)}`}
                                    className="h-4 w-4 shrink-0 cursor-pointer accent-[#34517C]"
                                  />
                                </div>
                              </label>
                            );
                          })
                        ) : myKendaraanList.length > 0 ? (
                          <div className="space-y-2 rounded-xl border border-dashed border-border bg-[#F8FAFC] p-6 text-center dark:bg-surface">
                            <p className="text-xs text-ink-muted font-medium">
                              Tidak ada kendaraan dengan plat nomor atau nama <span className="font-semibold text-ink">"{bookingKendaraanSearch}"</span>.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setBookingKendaraanSearch('');
                                setBookingKendaraanPage(1);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-subtle text-accent text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Bersihkan Pencarian
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 rounded-xl border border-dashed border-border bg-[#F8FAFC] p-6 text-center dark:bg-surface">
                            <p className="text-xs text-ink-muted font-medium">Belum ada kendaraan terdaftar untuk akun fleet Anda.</p>
                            <button
                              type="button"
                              disabled={!isVerifiedByAdmin}
                              onClick={() => {
                                if (!isVerifiedByAdmin) {
                                  toast.warning('Aksi Dibatasi', 'Akun belum terverifikasi oleh admin POS.');
                                  return;
                                }
                                setOpenTambahArmadaModal(true);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition ${
                                !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin POS' : undefined}
                            >
                              <Plus className="w-3.5 h-3.5" /> Daftarkan Truk Sekarang
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Pagination Bar untuk Pilihan Kendaraan */}
                      {bookingKendaraanTotalPages > 1 && (
                        <PaginationBar
                          page={bookingKendaraanSafePage}
                          totalPages={bookingKendaraanTotalPages}
                          totalRecords={filteredBookingKendaraanList.length}
                          limit={bookingKendaraanLimit}
                          limitOptions={[5, 10, 20]}
                          label="kendaraan"
                          className="border-t-0 bg-[#FAFBFD] px-3 py-2.5 dark:bg-surface"
                          onPageChange={setBookingKendaraanPage}
                          onLimitChange={(l) => {
                            setBookingKendaraanLimit(l);
                            setBookingKendaraanPage(1);
                          }}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  id: 'layanan',
                  label: 'Pilih Layanan',
                  content: (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm sm:p-4 dark:bg-surface-raised">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#52647E] dark:text-blue-300">Jenis pekerjaan</p>
                            <h3 className="mt-0.5 text-sm font-bold tracking-tight text-ink">Apa yang perlu dikerjakan?</h3>
                            <p className="mt-0.5 text-[11px] text-ink-muted">Pilih layanan paling sesuai. Service advisor akan membantu memastikan detailnya.</p>
                          </div>
                          <span className="w-fit rounded-md bg-[#F2F5F9] px-2 py-1 text-[10px] font-semibold tabular-nums text-ink-muted dark:bg-slate-800">
                            {visibleBookingServiceOptions.length} dari {filteredBookingServiceOptions.length} pilihan
                          </span>
                        </div>

                        <div className="relative mt-3">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
                          <input
                            type="search"
                            value={bookingServiceSearch}
                            onChange={(e) => setBookingServiceSearch(e.target.value)}
                            placeholder="Cari layanan, misalnya ganti oli atau rem..."
                            aria-label="Cari jenis layanan"
                            className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-9 text-xs text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-hidden dark:bg-surface"
                          />
                          {bookingServiceSearch && (
                            <button
                              type="button"
                              onClick={() => setBookingServiceSearch('')}
                              aria-label="Bersihkan pencarian layanan"
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-subtle hover:bg-surface hover:text-ink"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
                          {bookingServiceCategories.map((category) => {
                            const selected = bookingServiceCategory === category;
                            const count = category === 'Semua'
                              ? availableServiceOptions.length
                              : availableServiceOptions.filter((srv) => getBookingServiceGroup(srv) === category).length;
                            return (
                              <button
                                key={category}
                                type="button"
                                onClick={() => setBookingServiceCategory(category)}
                                aria-pressed={selected}
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                  selected
                                    ? 'border-[#34517C] bg-[#34517C] text-white'
                                    : 'border-border bg-white text-ink-muted hover:border-[#B8C7DC] hover:bg-[#F7F9FC] dark:bg-surface-raised'
                                }`}
                              >
                                {category}
                                <span className={`tabular-nums ${selected ? 'text-white/75' : 'text-ink-subtle'}`}>{count}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-2 space-y-1.5">
                        {visibleBookingServiceOptions.length > 0 ? visibleBookingServiceOptions.map((srv) => {
                          const isSelected = !isCustomService && bookingForm.jenis_layanan === srv.title;
                          const IconComp = srv.icon;
                          return (
                            <button
                              key={srv.title}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => {
                                setIsCustomService(false);
                                setBookingForm({ ...bookingForm, jenis_layanan: srv.title });
                              }}
                              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                isSelected
                                  ? 'border-[#34517C] bg-[#F4F7FC] dark:bg-blue-950/20'
                                  : 'border-border bg-white hover:border-[#B8C7DC] hover:bg-[#FAFBFD] dark:bg-surface-raised dark:hover:bg-surface'
                              }`}
                            >
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${srv.badgeColor}`}>
                                <IconComp className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="truncate text-xs font-bold leading-snug text-ink">{srv.title}</h4>
                                <p className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed text-ink-muted">
                                  {cleanField(srv.description) || srv.tag}
                                </p>
                              </div>
                              <span className="hidden shrink-0 rounded-md border border-border bg-white px-2 py-1 text-[9px] font-semibold text-ink-subtle sm:inline dark:bg-surface-raised">
                                {srv.tag}
                              </span>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                isSelected ? 'border-[#34517C] bg-[#34517C] text-white' : 'border-[#CBD5E1] text-transparent dark:border-slate-600'
                              }`}>
                                <Check className="h-3 w-3" />
                              </span>
                            </button>
                          );
                        }) : (
                          <div className="rounded-lg border border-dashed border-border bg-[#F8FAFC] px-4 py-6 text-center dark:bg-surface">
                            <p className="text-xs font-semibold text-ink">Layanan tidak ditemukan</p>
                            <p className="mt-1 text-[11px] text-ink-muted">Coba kata kunci lain atau pilih kategori Semua.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setBookingServiceSearch('');
                                setBookingServiceCategory('Semua');
                              }}
                              className="mt-2 text-[11px] font-semibold text-[#34517C] hover:underline"
                            >
                              Tampilkan semua layanan
                            </button>
                          </div>
                        )}
                        </div>
                        {bookingServiceCategory === 'Semua' && !bookingServiceSearch.trim() && filteredBookingServiceOptions.length > 5 && (
                          <button
                            type="button"
                            onClick={() => setShowAllBookingServices((visible) => !visible)}
                            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[11px] font-semibold text-[#34517C] transition hover:border-[#B8C7DC] hover:bg-[#F7F9FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:text-blue-300"
                          >
                            {showAllBookingServices ? 'Tampilkan lebih sedikit' : `Lihat ${filteredBookingServiceOptions.length - visibleBookingServiceOptions.length} layanan lainnya`}
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllBookingServices ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      <button
                          type="button"
                          onClick={() => {
                            setIsCustomService(true);
                            setBookingForm({
                              ...bookingForm,
                              jenis_layanan: customServiceText.trim() || 'Perbaikan Kustom',
                            });
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                            isCustomService
                              ? 'border-[#34517C] bg-[#F4F7FC] dark:bg-blue-950/20'
                              : 'border-[#D5DDE8] bg-[#F8FAFC] hover:border-[#B8C7DC] hover:bg-[#F5F8FD] dark:bg-surface'
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#DCE5F5] bg-white text-[#34517C] dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
                            <SlidersHorizontal className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold leading-snug text-ink">Layanan lainnya</h4>
                            <p className="mt-0.5 text-[10px] leading-relaxed text-ink-muted">Tuliskan kebutuhan spesifik yang tidak ada di pilihan layanan.</p>
                          </div>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            isCustomService ? 'border-[#34517C] bg-[#34517C] text-white' : 'border-[#CBD5E1] text-transparent dark:border-slate-600'
                          }`}>
                            <Check className="h-3 w-3" />
                          </span>
                      </button>

                      {/* Custom Service Input with Quick Presets */}
                      {isCustomService && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-accent-subtle/80 to-transparent dark:from-accent/10 border border-accent/30 space-y-2.5 app-page-transition">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5 text-accent" />
                              <span>Tuliskan Rincian Pekerjaan Kustom Anda:</span>
                              <span className="text-status-red">*</span>
                            </label>
                            <span className="text-[10px] text-accent font-semibold">Wajib diisi</span>
                          </div>

                          {/* Quick Preset Buttons */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] text-ink-muted font-medium block">
                              Pilihan cepat (klik untuk langsung mengisi):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {BOOKING_CUSTOM_PRESETS.map((preset) => {
                                const isPresetActive = customServiceText === preset;
                                return (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => {
                                      setCustomServiceText(preset);
                                      setBookingForm({ ...bookingForm, jenis_layanan: preset });
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                      isPresetActive
                                        ? 'bg-accent text-white shadow-2xs'
                                        : 'bg-surface-raised border border-border text-ink hover:border-accent hover:text-accent'
                                    }`}
                                  >
                                    <Sparkles className="w-2.5 h-2.5 opacity-70" />
                                    <span>{preset}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              required
                              autoFocus
                              placeholder="Contoh: Perbaikan Silinder Hidrolik Dump Truk, Las Dudukan Bak, Servis AC..."
                              value={customServiceText}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomServiceText(val);
                                setBookingForm({
                                  ...bookingForm,
                                  jenis_layanan: val.trim() || 'Perbaikan Kustom',
                                });
                              }}
                              className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-accent/50 text-xs focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised font-bold text-ink"
                            />
                            {customServiceText && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomServiceText('');
                                  setBookingForm({ ...bookingForm, jenis_layanan: 'Perbaikan Kustom' });
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1 cursor-pointer"
                                title="Hapus teks"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span>Service advisor kami akan mengonfirmasi detail kebutuhan teknis saat estimasi dibuat.</span>
                          </p>
                        </div>
                      )}

                      {/* Complaint / Keluhan Kendaraan Section */}
                      <div className="pt-2 border-t border-border/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-status-amber" />
                            <span>Jelaskan Keluhan atau Gejala Kendaraan:</span>
                            <span className="text-[11px] font-normal text-ink-muted">(Opsional)</span>
                          </label>
                          {bookingForm.keluhan && (
                            <button
                              type="button"
                              onClick={() => setBookingForm({ ...bookingForm, keluhan: '' })}
                              className="text-[11px] text-ink-muted hover:text-status-red flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <X className="w-3 h-3" />
                              <span>Bersihkan</span>
                            </button>
                          )}
                        </div>

                        {/* Quick Complaint Chips */}
                        <div className="space-y-1">
                          <span className="text-[11px] text-ink-muted font-medium block">
                            Tambahkan keluhan umum secara cepat:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {availableComplaintChips.map((chip) => {
                              const alreadyAdded = bookingForm.keluhan.includes(chip);
                              return (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => {
                                    setBookingForm((prev) => {
                                      const trimmed = prev.keluhan.trim();
                                      if (!trimmed) {
                                        return { ...prev, keluhan: chip };
                                      }
                                      if (trimmed.includes(chip)) return prev;
                                      return { ...prev, keluhan: `${trimmed}, ${chip}` };
                                    });
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                                    alreadyAdded
                                      ? 'bg-status-amber-bg text-status-amber border border-status-amber/40 font-semibold'
                                      : 'bg-surface border border-border text-ink hover:border-status-amber/50 hover:bg-surface-raised'
                                  }`}
                                >
                                  {alreadyAdded ? (
                                    <Check className="w-3 h-3 text-status-amber" />
                                  ) : (
                                    <Plus className="w-3 h-3 text-ink-muted" />
                                  )}
                                  <span>{chip}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Textarea */}
                        <textarea
                          rows={3}
                          value={bookingForm.keluhan}
                          onChange={(e) => setBookingForm({ ...bookingForm, keluhan: e.target.value })}
                          placeholder="Contoh: Rem bunyi saat pengereman mendadak, tarikan mesin agak berat saat muatan penuh..."
                          className="w-full px-3.5 py-3 rounded-2xl border border-border text-xs focus:ring-2 focus:ring-accent focus:border-accent focus:outline-hidden bg-surface-raised text-ink font-medium leading-relaxed shadow-2xs"
                        />

                        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted bg-[#FFFBEB] dark:bg-amber-950/30 p-2.5 rounded-xl border border-[#FDE68A] dark:border-amber-900/50">
                          <Lightbulb className="w-3.5 h-3.5 text-status-amber shrink-0" />
                          <span>
                            Tip: Informasi gejala bunyi atau getaran membantu mekanik menyiapkan tools diagnosa lebih dini.
                          </span>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'jadwal',
                  label: 'Tanggal & Waktu',
                  content: (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-accent/15 bg-gradient-to-br from-accent-subtle/80 via-accent-subtle/30 to-transparent p-4 sm:p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-accent" />
                            Tanggal Rencana Masuk <span className="text-status-red">*</span>
                          </label>
                          <input
                            type="date"
                            min={new Date().toISOString().slice(0, 10)}
                            value={bookingForm.tanggal_booking}
                            onChange={(e) => {
                              const todayStr = new Date().toISOString().slice(0, 10);
                              if (e.target.value && e.target.value < todayStr) {
                                toast.warning('Tanggal Tidak Valid', 'Tanggal rencana masuk tidak boleh di masa lampau.');
                                setBookingForm({ ...bookingForm, tanggal_booking: todayStr });
                                return;
                              }
                              setBookingForm({ ...bookingForm, tanggal_booking: e.target.value });
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border font-mono text-xs focus:ring-2 focus:ring-accent focus:border-accent focus:outline-hidden bg-surface-raised font-bold text-ink"
                          />
                          <div className="text-xs text-ink-muted mt-1.5 font-medium">
                            Pilih hari ini atau tanggal kedatangan berikutnya
                          </div>
                        </div>
                        <div>
                          <TimePickerInput
                            label="Pilih Jam Kedatangan"
                            required
                            selectedDate={bookingForm.tanggal_booking}
                            value={bookingForm.jam_booking}
                            onChange={(time) => setBookingForm({ ...bookingForm, jam_booking: time })}
                          />
                          <div className="text-xs text-ink-muted mt-1.5 font-medium">
                            Jam operasional bengkel: 08:00 - 17:00 WIB
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'konfirmasi',
                  label: 'Konfirmasi',
                  content: (
                    <div className="overflow-hidden rounded-xl border border-[#DDE1E5] bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8EAED] px-4 py-3.5 dark:border-slate-700 sm:px-5">
                        <div>
                          <h3 className="text-[15px] font-bold tracking-tight text-[#252A31] dark:text-slate-100">
                            Ringkasan booking
                          </h3>
                          <p className="mt-0.5 text-xs text-[#737B84] dark:text-slate-400">
                            Pastikan kendaraan dan jadwal sudah benar.
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#48724B] dark:text-emerald-300">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF3E9] dark:bg-emerald-950">
                            <Check className="h-3 w-3" />
                          </span>
                          Siap dikonfirmasi
                        </span>
                      </div>

                      <div className="grid divide-y divide-[#E8EAED] dark:divide-slate-700 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        <div className="min-w-0 px-4 py-3.5 sm:px-5">
                          <span className="mb-2 block text-xs font-medium text-[#626B75] dark:text-slate-400">
                            Kendaraan
                          </span>
                          <span className="inline-flex max-w-full items-center rounded-md border-2 border-[#424A53] bg-white px-2.5 py-1 font-mono text-base font-bold tracking-[0.08em] text-[#252A31] shadow-[0_1px_0_#C5CBD2] dark:border-slate-400 dark:bg-slate-800 dark:text-slate-100">
                            <span className="truncate">{formatPlat(bookingForm.no_polisi)}</span>
                          </span>
                        </div>

                        <div className="min-w-0 px-4 py-3.5 sm:px-5">
                          <span className="mb-1.5 block text-xs font-medium text-[#626B75] dark:text-slate-400">
                            Jenis layanan
                          </span>
                          <span className="block font-semibold leading-snug text-[#30363C] dark:text-slate-100">
                            {bookingForm.jenis_layanan}
                          </span>
                        </div>

                        <div className="min-w-0 px-4 py-3.5 sm:px-5">
                          <span className="mb-1.5 block text-xs font-medium text-[#626B75] dark:text-slate-400">
                            Jadwal masuk
                          </span>
                          <span className="block font-semibold leading-snug tabular-nums text-[#30363C] dark:text-slate-100">
                            {new Date(`${bookingForm.tanggal_booking}T12:00:00`).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#626B75] dark:text-slate-400">
                            Pukul {bookingForm.jam_booking} WIB
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-[#E8EAED] bg-[#F8F9FA] px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50 sm:px-5">
                        <span className="mb-1 block text-xs font-medium text-[#626B75] dark:text-slate-400">
                          Catatan keluhan
                        </span>
                        <p className="leading-relaxed text-[#454C53] dark:text-slate-300">
                          {bookingForm.keluhan || 'Tidak ada catatan keluhan khusus.'}
                        </p>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>
      )}

      {/* MENU 3: KENDARAAN SAYA (image5.png Mockup 4) */}
      {fleetMenu === 'kendaraan' && (
        <div className="space-y-5">
          {/* Header Section dengan Aksi Tambah */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-ink tracking-tight flex items-center gap-2">
                <Truck className="w-5 h-5 text-[var(--menu-accent-text,var(--color-accent))]" />
                <span>Kendaraan Saya</span>
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Kelola data kendaraan perusahaan Anda.
              </p>
            </div>
            <button
              type="button"
              disabled={!isVerifiedByAdmin}
              onClick={() => {
                if (!isVerifiedByAdmin) {
                  toast.warning('Aksi Dibatasi', 'Akun belum terverifikasi oleh admin.');
                  return;
                }
                setOpenTambahArmadaModal(true);
              }}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#12388F] hover:bg-[#0D2A6B] text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 ${
                !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin' : undefined}
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kendaraan</span>
            </button>
          </div>

          {/* Pencarian kendaraan dalam toolbar */}
          <div className="rounded-xl border border-border bg-white p-2.5 shadow-sm sm:p-3 dark:bg-surface-raised">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
              <input
                type="text"
                value={armadaSearch}
                onChange={(e) => setArmadaSearch(e.target.value)}
                placeholder="Cari no. polisi, merk, model..."
                aria-label="Cari kendaraan"
                className="h-10 w-full rounded-lg border border-border bg-white pl-10 pr-10 text-xs text-ink placeholder:text-ink-subtle transition focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-hidden dark:bg-surface"
              />
              {armadaSearch && (
                <button
                  type="button"
                  onClick={() => setArmadaSearch('')}
                  aria-label="Bersihkan pencarian kendaraan"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-subtle transition hover:text-ink"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {armadaRows.length > 0 ? (
            <>
              <div className="space-y-3">
              {armadaRows.map((k) => {
                const sedangDiBengkel = isKendaraanInBengkel(k.no_polisi);
                return (
                  <div
                    key={k.id}
                      className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition duration-200 hover:border-[#B9C8DC] hover:shadow-md dark:bg-surface-raised"
                  >
                      <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-stretch xl:gap-5">
                        {/* Identitas utama */}
                        <div className="flex min-w-0 items-start gap-3.5 xl:w-[285px] xl:shrink-0">
                        {k.foto_kendaraan ? (
                          <div
                            className="group/thumb relative h-[76px] w-[76px] shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-slate-100 dark:bg-slate-800"
                          onClick={() =>
                            setPreviewImage({
                              url: k.foto_kendaraan!,
                              title: formatPlat(k.no_polisi),
                              subtitle: `${formatNamaArmada(k)} • ${cleanField(k.jenis_armada) || cleanField(k.type) || 'Truk'}${cleanField(k.tahun) ? ` (${cleanField(k.tahun)})` : ''}`,
                            })
                          }
                          title="Klik untuk memperbesar foto unit"
                        >
                          <img
                            src={k.foto_kendaraan}
                            alt={formatPlat(k.no_polisi)}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover/thumb:opacity-100">
                            <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex h-[76px] w-[76px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#CBD5E1] bg-slate-50 text-[#64748B] transition-colors hover:border-[#34517C] hover:text-[#34517C] dark:border-slate-700 dark:bg-slate-800/60"
                          onClick={() => {
                            setEditArmadaForm({
                              no_polisi: k.no_polisi,
                              no_inventaris: k.no_inventaris || '',
                              unit_name: k.unit_name || '',
                              merk: k.merk || '',
                              model: k.model || '',
                              type: k.type || k.jenis_armada || '',
                              jenis_armada: k.jenis_armada || k.type || 'Truk',
                              tahun: k.tahun || k.year || new Date().getFullYear(),
                              no_rangka: k.no_rangka || k.chassisno || '',
                              no_mesin: k.no_mesin || k.machineno || '',
                              expired: k.expired ? String(k.expired).slice(0, 10) : (k.masa_berlaku_asuransi ? String(k.masa_berlaku_asuransi).slice(0, 10) : ''),
                              asuransi: k.asuransi || '',
                              masa_berlaku_asuransi: k.masa_berlaku_asuransi ? String(k.masa_berlaku_asuransi).slice(0, 10) : (k.expired ? String(k.expired).slice(0, 10) : ''),
                              note: k.note || '',
                              description: k.description || '',
                              foto_kendaraan: '',
                            });
                            setEditArmadaData(k);
                          }}
                          title="Pasang foto unit"
                        >
                          <Truck className="w-6 h-6" />
                          <span className="text-[10px] font-bold">+ Foto</span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-md border border-[#D5DDE8] bg-[#F6F8FB] px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-[#1E293B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {formatPlat(k.no_polisi)}
                          </span>
                          {sedangDiBengkel ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-status-amber/30 bg-status-amber-bg px-2 py-0.5 text-[10px] font-bold text-status-amber">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-amber animate-pulse" />
                              Sedang di Bengkel
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-status-green/30 bg-status-green-bg px-2 py-0.5 text-[10px] font-bold text-status-green">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-green" />
                              Aktif
                            </span>
                          )}
                        </div>
                        <h3 className="truncate text-sm font-bold text-[#0F172A] dark:text-white">
                          {formatNamaArmada(k)}
                        </h3>
                        <p className="truncate text-[11px] text-[#64748B] dark:text-slate-400">
                          {cleanField(k.merk) || 'Merk belum diisi'}{cleanField(k.model) ? ` · ${cleanField(k.model)}` : ''} · Pemilik: {cleanField(k.nama_pemilik) || cleanField(currentUser) || 'Perusahaan'}
                        </p>
                      </div>
                    </div>

                    {/* Rincian unit */}
                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 border-t border-border pt-4 sm:grid-cols-3 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                      <div className="min-w-0 rounded-lg bg-[#F7F9FC] px-3 py-2 dark:bg-slate-800/60">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Tipe / Varian</span>
                        <span className="block truncate text-xs font-semibold text-ink">{cleanField(k.type) || cleanField(k.jenis_armada) || '-'}</span>
                      </div>
                      <div className="min-w-0 rounded-lg bg-[#F7F9FC] px-3 py-2 dark:bg-slate-800/60">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Tahun</span>
                        <span className="block truncate text-xs font-semibold tabular-nums text-ink">{cleanField(k.tahun) || cleanField(k.year) || '-'}</span>
                      </div>
                      <div className="min-w-0 rounded-lg bg-[#F7F9FC] px-3 py-2 dark:bg-slate-800/60">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">No. Rangka</span>
                        <span className="block truncate font-mono text-xs font-semibold text-ink" title={cleanField(k.no_rangka) || cleanField(k.chassisno) || '-'}>
                          {cleanField(k.no_rangka) || cleanField(k.chassisno) || '-'}
                        </span>
                      </div>
                      <div className="min-w-0 rounded-lg bg-[#F7F9FC] px-3 py-2 dark:bg-slate-800/60">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">No. Mesin</span>
                        <span className="block truncate font-mono text-xs font-semibold text-ink" title={cleanField(k.no_mesin) || cleanField(k.machineno) || '-'}>
                          {cleanField(k.no_mesin) || cleanField(k.machineno) || '-'}
                        </span>
                      </div>
                      <div className="col-span-2 min-w-0 rounded-lg bg-[#F7F9FC] px-3 py-2 sm:col-span-1 dark:bg-slate-800/60">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">Masa Berlaku</span>
                        <div className="truncate">
                          {renderDocExpiryBadge(k.expired || k.masa_berlaku_asuransi)}
                        </div>
                      </div>
                    </div>

                    {/* Aksi unit */}
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border pt-3 xl:flex-col xl:items-stretch xl:justify-center xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                      <button
                        type="button"
                        disabled={!isVerifiedByAdmin}
                        onClick={() => {
                          if (!isVerifiedByAdmin) {
                            toast.warning('Aksi Dibatasi', 'Akun belum terverifikasi oleh admin.');
                            return;
                          }
                          setBookingForm({ ...bookingForm, no_polisi: k.no_polisi });
                          setFleetMenu('booking');
                          setActiveTab('fleet-booking');
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#12388F] bg-[#12388F] px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-[#12388F]/15 transition-colors hover:border-[#0D2A6B] hover:bg-[#0D2A6B] dark:border-blue-600 dark:bg-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-500 ${
                          !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin' : undefined}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Booking</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditArmadaForm({
                            no_polisi: k.no_polisi,
                            no_inventaris: k.no_inventaris || '',
                            unit_name: k.unit_name || '',
                            merk: k.merk || '',
                            model: k.model || '',
                            type: k.type || k.jenis_armada || '',
                            jenis_armada: k.jenis_armada || k.type || 'Truk',
                            tahun: k.tahun || k.year || new Date().getFullYear(),
                            no_rangka: k.no_rangka || k.chassisno || '',
                            no_mesin: k.no_mesin || k.machineno || '',
                            expired: k.expired ? String(k.expired).slice(0, 10) : (k.masa_berlaku_asuransi ? String(k.masa_berlaku_asuransi).slice(0, 10) : ''),
                            asuransi: k.asuransi || '',
                            masa_berlaku_asuransi: k.masa_berlaku_asuransi ? String(k.masa_berlaku_asuransi).slice(0, 10) : (k.expired ? String(k.expired).slice(0, 10) : ''),
                            note: k.note || '',
                            description: k.description || '',
                            foto_kendaraan: k.foto_kendaraan || '',
                          });
                          setEditArmadaData(k);
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#C8D7F0] bg-[#EEF4FF] px-3 py-2 text-xs font-semibold text-[#2453A6] transition-colors hover:border-[#9CB7E5] hover:bg-[#E2ECFF] dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 ${
                          !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        aria-label={`Edit unit ${k.no_polisi}`}
                        title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin POS' : 'Edit spesifikasi unit'}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        disabled={!isVerifiedByAdmin}
                        onClick={() => {
                          if (!isVerifiedByAdmin) {
                            toast.warning('Aksi Dibatasi', 'Akun belum terverifikasi oleh admin POS.');
                            return;
                          }
                          setHapusArmadaTarget(k);
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#F3C6C3] bg-[#FFF3F2] px-3 py-2 text-xs font-semibold text-[#B42318] transition-colors hover:border-[#E7A7A2] hover:bg-[#FDE8E6] dark:border-red-900/50 dark:bg-rose-950/30 dark:text-red-400 dark:hover:bg-rose-950/60 ${
                          !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        aria-label={`Hapus unit ${k.no_polisi}`}
                        title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin POS' : 'Hapus unit kendaraan'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
            <PaginationBar
              page={armadaPage}
              totalPages={armadaPageData?.pagination?.total_pages ?? 1}
              totalRecords={armadaPageData?.pagination?.total_records ?? armadaRows.length}
              limit={armadaLimit}
              label="kendaraan"
              isLoading={armadaFetching}
              className="rounded-xl border border-border bg-[#FAFBFD] px-4 py-3 sm:px-5 dark:bg-surface-raised"
              onPageChange={setArmadaPage}
              onLimitChange={(l) => {
                setArmadaLimit(l);
                setArmadaPage(1);
              }}
            />
            </>
          ) : armadaQuery ? (
            <div className="bg-surface-raised rounded-xl border border-border p-8 text-center shadow-xs max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-xl bg-surface text-ink-subtle flex items-center justify-center mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Kendaraan Tidak Ditemukan</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Tidak ada unit yang cocok dengan pencarian{' '}
                  <span className="font-semibold text-ink">"{armadaQuery}"</span>. Coba kata kunci lain.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setArmadaSearch('')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-subtle text-accent text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" /> Bersihkan Pencarian
              </button>
            </div>
          ) : (
            <div className="bg-surface-raised rounded-xl border border-border p-8 text-center shadow-xs max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mx-auto">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Belum Ada Kendaraan Terdaftar</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Daftarkan kendaraan operasional atau kendaraan truk perusahaan Anda untuk mulai memanfaatkan fitur pemantauan & booking service.
                </p>
              </div>
              <button
                type="button"
                disabled={!isVerifiedByAdmin}
                onClick={() => {
                  if (!isVerifiedByAdmin) {
                    toast.warning('Aksi Dibatasi', 'Akun belum terverifikasi oleh admin POS.');
                    return;
                  }
                  setOpenTambahArmadaModal(true);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition ${
                  !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin POS' : undefined}
              >
                <Plus className="w-4 h-4" /> Daftarkan Unit Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* MENU 4: DOKUMEN SAYA — berkas kendaraan + faktur otomatis (service & beli part) */}
      {fleetMenu === 'dokumen' && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border bg-white px-4 py-4 dark:bg-surface-raised sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold tracking-tight text-ink">Dokumen Saya</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Berkas legalitas kendaraan dan masa berlakunya</p>
            </div>
            <button
              type="button"
              disabled={!isVerifiedByAdmin}
              onClick={() => {
                if (!isVerifiedByAdmin) {
                  toast.warning('Aksi Dibatasi', 'Akun belum terverifikasi oleh admin POS.');
                  return;
                }
                if (myKendaraanList.length > 0) {
                  setDokumenForm(prev => ({ ...prev, no_polisi: myKendaraanList[0].no_polisi }));
                }
                setOpenTambahDokumenModal(true);
              }}
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#12388F] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#0D2A6B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12388F]/30 focus-visible:ring-offset-2 ${
                !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin POS' : undefined}
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Dokumen Baru</span>
            </button>
          </div>

          {/* Filter kendaraan (plat nomor) dalam toolbar */}
          <div className="flex flex-col gap-2.5 border-b border-border bg-[#F8FAFC] p-3 dark:bg-slate-900/40 sm:flex-row sm:items-center">
            <div className="relative sm:max-w-xs w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
              <select
                value={dokumenFilterPlat}
                onChange={(e) => setDokumenFilterPlat(e.target.value)}
                aria-label="Filter dokumen per kendaraan"
                className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-white pl-9 pr-8 text-xs font-medium text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:bg-surface-raised"
              >
                <option value="">Semua Kendaraan</option>
                {myKendaraanList.map((k) => (
                  <option key={k.id} value={k.no_polisi}>
                    {formatPlat(k.no_polisi)} — {formatNamaArmada(k)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            </div>
            {dokumenFilterPlat && (
              <button
                type="button"
                onClick={() => setDokumenFilterPlat('')}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink-muted transition hover:bg-surface dark:bg-surface-raised"
              >
                <X className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>

          {dokumenRows.length > 0 ? (
            <div className="overflow-hidden bg-surface-raised">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle dark:bg-slate-900/40">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Nama Dokumen</th>
                      <th className="px-4 py-3 font-semibold">Jenis</th>
                      <th className="px-4 py-3 font-semibold">No. Polisi</th>
                      <th className="px-4 py-3 font-semibold">Masa Berlaku</th>
                      <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {dokumenRows.map((item) => (
                      <tr key={`doc-${item.id}`} className="transition-colors hover:bg-surface/70">
                        <td className="max-w-[280px] px-5 py-3.5 font-semibold text-ink">
                          <span className="block truncate">{item.nama_dokumen}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                            {item.jenis_dokumen}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-md border border-border bg-white px-2.5 py-1 font-mono text-xs font-bold text-ink dark:bg-surface">
                            {formatPlat(item.no_polisi)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {renderDocExpiryBadge(item.masa_berlaku)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D7E0EC] bg-white px-3 text-xs font-semibold text-[#34517C] transition hover:border-[#B9C9DD] hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                          >
                            <Download className="h-3.5 w-3.5" /> Unduh
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: stacked card list (pengganti tabel di layar < md) */}
              <div className="block space-y-2.5 p-3 md:hidden">
                {dokumenRows.map((item) => (
                  <div key={`doc-${item.id}`} className="rounded-xl border border-border bg-white p-3.5 dark:bg-surface">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold leading-snug text-ink">{item.nama_dokumen}</div>
                        <div className="mt-1">
                          <span className="inline-flex rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs font-bold text-ink">
                            {formatPlat(item.no_polisi)}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                        {item.jenis_dokumen}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-ink-subtle">
                      <span>Masa Berlaku</span>
                      <div>
                        {renderDocExpiryBadge(item.masa_berlaku)}
                      </div>
                    </div>

                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#D7E0EC] bg-[#F1F5F9] px-3 py-2 text-xs font-semibold text-[#34517C] transition hover:border-[#B9C9DD] hover:bg-[#E7EDF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Dokumen
                    </a>
                  </div>
                ))}
              </div>

              {/* Pagination menempel di footer container tabel */}
              <div className="border-t border-border bg-white px-4 pb-3 dark:bg-surface-raised">
                <PaginationBar
                  page={dokumenSafePage}
                  totalPages={dokumenTotalPages}
                  totalRecords={dokumenTerfilterList.length}
                  limit={dokumenLimit}
                  label="dokumen"
                  onPageChange={setDokumenPage}
                  onLimitChange={(l) => {
                    setDokumenLimit(l);
                    setDokumenPage(1);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 border-t border-border bg-surface px-5 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF0F7] text-[#34517C] dark:bg-blue-950/40 dark:text-blue-300">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Belum Ada Dokumen</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Unggah berkas STNK, KIR, atau polis asuransi kendaraan Anda di sini.
                </p>
              </div>
              <button
                type="button"
                disabled={!isVerifiedByAdmin}
                onClick={() => {
                  if (!isVerifiedByAdmin) {
                    toast.warning('Aksi Dibatasi', 'Akun belum terverifikasi oleh admin POS.');
                    return;
                  }
                  if (myKendaraanList.length > 0) {
                    setDokumenForm(prev => ({ ...prev, no_polisi: myKendaraanList[0].no_polisi }));
                  }
                  setOpenTambahDokumenModal(true);
                }}
                className={`inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#12388F] px-4 text-xs font-bold text-white transition hover:bg-[#0D2A6B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12388F]/30 focus-visible:ring-offset-2 ${
                  !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin POS' : undefined}
              >
                <Plus className="w-3.5 h-3.5" /> Unggah Dokumen Baru
              </button>
            </div>
          )}
        </div>
      )}

      {/* MENU 5: PROFIL CUSTOMER & KONTAK */}
      {fleetMenu === 'profil' && (() => {
        const companyName = authUser?.nama_perusahaan || authUser?.nama_lengkap || currentUser || 'Mitra Fleet';
        const cleanName = companyName.replace(/^(PT|CV|UD|PT\.|CV\.|UD\.)\s+/i, '').trim();
        const parts = cleanName.split(' ').filter(Boolean);
        const companyInitials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : cleanName.slice(0, 2).toUpperCase() || 'MF';
        const custIdFormatted = `KIM3-CUST-${String(myPelangganId || authUser?.id_pelanggan || authUser?.id || 1).padStart(4, '0')}`;

        return (
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Header Hero Profile Card */}
            <div className="bg-surface-raised rounded-2xl border border-border p-5 sm:p-7 shadow-xs relative overflow-hidden">
              {/* Ambient soft glow */}
              <div className="absolute top-0 right-0 w-80 h-32 bg-accent/5 dark:bg-accent/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
                <div className="flex items-center gap-4 sm:gap-5">
                  {/* Company Avatar / Logo */}
                  <div className="relative shrink-0">
                    {authUser?.foto_profil ? (
                      <img
                        src={authUser.foto_profil}
                        alt={companyName}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-border shadow-xs"
                      />
                    ) : (
                      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-accent to-[#0A2154] text-white flex flex-col items-center justify-center font-black text-xl sm:text-2xl shadow-xs border border-white/20 select-none">
                        <span>{companyInitials}</span>
                        <span className="text-[9px] font-semibold tracking-wider opacity-75 uppercase">Fleet</span>
                      </div>
                    )}
                    {isVerifiedByAdmin && (
                      <div
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-surface-raised"
                        title="Akun Terverifikasi Admin POS"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Company Name & Key Meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg sm:text-xl font-black text-ink tracking-tight truncate">
                        {companyName}
                      </h1>
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface border border-border text-accent">
                        {custIdFormatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {isVerifiedByAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Terverifikasi oleh Admin</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span>Menunggu Verifikasi Admin</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-ink-muted mt-2 flex items-center gap-2.5 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-accent" />
                        <span>PIC: <strong className="text-ink font-semibold">{authUser?.nama_pic || '-'}</strong></span>
                      </span>
                      <span className="text-border">•</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-ink-muted" />
                        <span>{authUser?.email || '-'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action: Edit Profile Button */}
                {!profilEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfilForm({
                        nama_perusahaan: authUser?.nama_perusahaan || authUser?.nama_lengkap || currentUser || '',
                        alamat: authUser?.alamat || '',
                        npwp: authUser?.npwp || '',
                        no_telepon: authUser?.no_telepon || '',
                        nama_pic: authUser?.nama_pic || '',
                        foto_profil: authUser?.foto_profil || '',
                      });
                      setProfilEditing(true);
                    }}
                    className="px-4 py-2 bg-accent text-white hover:bg-accent-hover rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profil</span>
                  </button>
                )}
              </div>

              {/* Quick Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border/80">
                <div className="bg-surface p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-ink-muted block tracking-wider">Unit Armada</span>
                  <span className="text-lg font-black text-ink mt-0.5 block">{myKendaraanList.length} Kendaraan</span>
                </div>
                <div className="bg-surface p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-ink-muted block tracking-wider">Service Tercatat</span>
                  <span className="text-lg font-black text-ink mt-0.5 block">{spkList?.length || 0} Kali Servis</span>
                </div>
                <div className="bg-surface p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-ink-muted block tracking-wider">Dokumen Digital</span>
                  <span className="text-lg font-black text-ink mt-0.5 block">{dokumenList?.length || 0} Berkas</span>
                </div>
                <div className="bg-surface p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-ink-muted block tracking-wider">Status Akun</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Aktif</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Body Section: Read-Only Overview OR Editing Mode Form */}
            {!profilEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Card 1: Informasi Entitas & Legalitas */}
                <div className="bg-surface-raised rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-accent" />
                      <span>Informasi Perusahaan</span>
                    </h3>
                    <span className="text-[10px] font-bold text-ink-muted bg-surface px-2 py-0.5 rounded border border-border">
                      Legalitas
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[11px] font-medium text-ink-muted block mb-0.5">Nama Perusahaan / Entitas:</span>
                      <span className="text-sm font-bold text-ink block">{companyName}</span>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-ink-muted block mb-0.5">ID Pelanggan / Kemitraan:</span>
                      <span className="font-mono font-bold text-accent text-xs bg-accent-subtle/50 px-2 py-0.5 rounded border border-accent/20 inline-block">
                        {custIdFormatted}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-ink-muted block mb-0.5">Alamat Perusahaan:</span>
                      <div className="flex items-start gap-1.5 text-ink font-medium leading-relaxed bg-surface p-2.5 rounded-xl border border-border">
                        <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <span>{authUser?.alamat || 'Alamat perusahaan belum dilengkapi.'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[11px] font-medium text-ink-muted block mb-0.5">NPWP:</span>
                        <span className="font-mono font-semibold text-xs text-ink block">
                          {authUser?.npwp || <span className="text-ink-muted italic">-</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-ink-muted block mb-0.5">Status Verifikasi Admin:</span>
                        {isVerifiedByAdmin ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi oleh Admin
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-600 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Belum Terverifikasi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Kontak Penanggung Jawab / PIC */}
                <div className="bg-surface-raised rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-accent" />
                      <span>Kontak PIC / Penanggung Jawab</span>
                    </h3>
                    <span className="text-[10px] font-bold text-ink-muted bg-surface px-2 py-0.5 rounded border border-border">
                      Operasional
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[11px] font-medium text-ink-muted block mb-0.5">Nama PIC:</span>
                      <span className="text-sm font-bold text-ink block">{authUser?.nama_pic || '-'}</span>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-ink-muted block mb-0.5">No. Telepon / WhatsApp:</span>
                      {authUser?.no_telepon ? (
                        <a
                          href={`https://wa.me/${authUser.no_telepon.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-accent hover:underline bg-surface px-2.5 py-1 rounded-lg border border-border"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{authUser.no_telepon}</span>
                        </a>
                      ) : (
                        <span className="text-ink-muted italic">-</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-ink-muted block mb-0.5">Email Login:</span>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-ink bg-surface px-2.5 py-1 rounded-lg border border-border">
                        <Mail className="w-3.5 h-3.5 text-ink-muted" />
                        <span>{authUser?.email || '-'}</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-[11px] font-medium text-ink-muted block mb-0.5">Keamanan Akun:</span>
                      <div className="flex items-center gap-1.5 text-xs text-ink bg-surface px-2.5 py-1.5 rounded-lg border border-border">
                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-medium">Password Terlindungi</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Editing Form Mode */
              <div className="bg-surface-raised rounded-2xl border border-border p-5 sm:p-7 shadow-xs space-y-5">
                <div className="border-b border-border pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-accent" />
                      <span>Edit Profil Customer & Kontak</span>
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Perbarui data perusahaan dan kontak PIC penanggung jawab Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfilEditing(false)}
                    className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-surface transition cursor-pointer"
                    title="Batal edit"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Logo / Foto Profil Perusahaan */}
                  <div className="sm:col-span-2">
                    <PhotoUploader
                      label="Logo atau Foto Profil Perusahaan (Opsional)"
                      value={profilForm.foto_profil}
                      onChange={(url) => setProfilForm((p) => ({ ...p, foto_profil: url }))}
                    />
                  </div>

                  {/* Nama Perusahaan */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-accent" />
                      <span>Nama Perusahaan / Entitas:</span>
                      <span className="text-status-red">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profilForm.nama_perusahaan}
                      onChange={(e) => setProfilForm((p) => ({ ...p, nama_perusahaan: e.target.value }))}
                      placeholder="Contoh: Mitra PT Tes Logistik"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:border-accent bg-surface text-ink font-semibold transition"
                    />
                  </div>

                  {/* Nama PIC */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-accent" />
                      <span>Nama PIC:</span>
                      <span className="text-[10px] font-normal text-ink-muted">(Opsional jika Perorangan)</span>
                    </label>
                    <input
                      type="text"
                      value={profilForm.nama_pic === '-' ? '' : profilForm.nama_pic}
                      onChange={(e) => setProfilForm((p) => ({ ...p, nama_pic: e.target.value }))}
                      placeholder="Beri tanda - atau kosongkan jika perorangan"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:border-accent bg-surface text-ink font-semibold transition"
                    />
                  </div>

                  {/* No Telepon / WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-accent" />
                      <span>No. Telepon / WhatsApp:</span>
                    </label>
                    <input
                      type="tel"
                      value={profilForm.no_telepon}
                      onChange={(e) => setProfilForm((p) => ({ ...p, no_telepon: e.target.value }))}
                      placeholder="Contoh: 0812-3456-7890"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:border-accent bg-surface text-ink font-mono font-semibold transition"
                    />
                  </div>

                  {/* NPWP */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-accent" />
                      <span>NPWP:</span>
                    </label>
                    <input
                      type="text"
                      value={profilForm.npwp}
                      onChange={(e) => setProfilForm((p) => ({ ...p, npwp: e.target.value }))}
                      placeholder="Contoh: 01.234.567.8-901.000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:border-accent bg-surface text-ink font-mono font-semibold transition"
                    />
                  </div>

                  {/* Alamat Perusahaan */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-accent" />
                      <span>Alamat Perusahaan:</span>
                    </label>
                    <textarea
                      rows={2}
                      value={profilForm.alamat}
                      onChange={(e) => setProfilForm((p) => ({ ...p, alamat: e.target.value }))}
                      placeholder="Contoh: Medan Deli, Kota Medan"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:border-accent bg-surface text-ink font-medium leading-relaxed transition"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col justify-end gap-2 border-t border-border pt-4 sm:flex-row">
                  <ModalActionButton
                    variant="cancel"
                    width="responsive"
                    disabled={simpanProfilMutation.isPending}
                    onClick={() => setProfilEditing(false)}
                  >
                    Batal
                  </ModalActionButton>
                  <ModalActionButton
                    variant="primary"
                    width="responsive"
                    disabled={simpanProfilMutation.isPending || !profilForm.nama_perusahaan.trim()}
                    onClick={() => simpanProfilMutation.mutate()}
                  >
                    {simpanProfilMutation.isPending ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{simpanProfilMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </ModalActionButton>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {/* MENU 6: HISTORY SERVICE */}
      {fleetMenu === 'history' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-ink">Riwayat Kendaraan (History)</h2>
            <p className="text-xs text-ink-muted">Seluruh riwayat pengerjaan service unit kendaraan operasional Anda di Bengkel KIM 3</p>
          </div>

          {/* Satu kartu tunggal */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
            {/* Toolbar: Tab di kiri, pencarian di kanan */}
            <div className="flex flex-col justify-between gap-3 border-b border-border bg-white px-4 pt-3 sm:px-5 md:flex-row md:items-center dark:bg-surface-raised">
              {/* Tab Filter Status */}
              <div className="order-2 md:order-1">
                <FilterChips
                  variant="tabs"
                  options={[
                    { id: 'semua', label: 'Semua', count: mySpkList.length },
                    { id: 'sedang-diservis', label: 'Sedang Diservis', count: mySpkList.filter(s => s.status_spk !== 'Selesai' && s.status_spk !== 'FIR Closed').length },
                    { id: 'selesai', label: 'Selesai', count: mySpkList.filter(s => s.status_spk === 'Selesai' || s.status_spk === 'FIR Closed').length },
                  ]}
                  selectedId={historyStatusFilter}
                  onChange={(id) => setHistoryStatusFilter(id as 'semua' | 'sedang-diservis' | 'selesai')}
                />
              </div>

              {/* Pencarian (Mobile: di atas, MD+: di kanan) */}
              <div className="order-1 w-full pb-3 md:order-2 md:w-80">
                <div className="relative group/search">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle transition-colors group-focus-within/search:text-accent" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Cari no. SPK, no. polisi, keluhan, atau status..."
                    aria-label="Cari riwayat service"
                    className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-9 text-xs text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none dark:bg-surface"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      aria-label="Bersihkan pencarian riwayat"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-subtle transition hover:text-ink"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {spkLoading ? (
              <div className="divide-y divide-border px-5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex items-center justify-between gap-4 py-3 animate-pulse">
                    <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="w-20 h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    <div className="w-44 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    <div className="w-16 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : historyRows.length > 0 ? (
              <>
                {/* Desktop Table: langsung di dalam kartu */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-border bg-[#F6F8FB] dark:bg-slate-800/70">
                      <tr>
                        <th scope="col" className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">No. Booking / SPK</th>
                        <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Kendaraan</th>
                        <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Layanan</th>
                        <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Tanggal Masuk</th>
                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Biaya</th>
                        <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Status</th>
                        <th scope="col" className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-ink-subtle">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {historyRows.map((spk) => (
                        <tr
                          key={spk.id}
                          tabIndex={0}
                          onClick={() => setHistoryDetail(spk)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setHistoryDetail(spk);
                            }
                          }}
                          className="group cursor-pointer transition-colors hover:bg-[#F7F9FC] focus-visible:bg-[#F7F9FC] focus-visible:outline-none dark:hover:bg-slate-800/50 dark:focus-visible:bg-slate-800/50"
                        >
                          <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#34517C] transition-[box-shadow] group-hover:[box-shadow:inset_3px_0_0_#34517C] group-focus-visible:[box-shadow:inset_3px_0_0_#34517C] dark:text-blue-300">
                            {spk.no_spk}
                          </td>
                          <td className="px-4 py-3.5">
                            <PlateChip plat={spk.no_polisi} />
                          </td>
                          <td className="max-w-[260px] px-4 py-3.5 text-xs leading-relaxed text-ink-muted" title={spk.keluhan_customer}>
                            {spk.keluhan_customer}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium tabular-nums text-ink-muted">
                            {new Date(spk.created_at).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <RupiahCell amount={spk.estimasi_biaya} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <StatusBadge status={spk.status_spk} size="sm" />
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryDetail(spk);
                              }}
                              title={`Lihat detail tracking ${spk.no_spk}`}
                              aria-label={`Lihat detail tracking ${spk.no_spk}`}
                              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-[#D5DDE8] bg-white px-3 text-xs font-semibold text-[#34517C] transition-colors hover:border-[#34517C] hover:bg-[#F5F8FD] dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: stacked card list */}
                <div className="block md:hidden p-4 space-y-3">
                  {historyRows.map((spk) => (
                    <div
                      key={spk.id}
                      onClick={() => setHistoryDetail(spk)}
                      className="relative cursor-pointer overflow-hidden rounded-xl border border-border bg-white p-4 transition-colors hover:border-[#B8C7DC] hover:bg-[#FAFBFD] dark:bg-slate-800/60 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#DCE5F5] bg-[#F5F8FD] px-2.5 py-1 font-mono text-xs font-semibold text-[#34517C] dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                          <FileText className="w-3.5 h-3.5" />
                          {spk.no_spk}
                        </span>
                        <StatusBadge status={spk.status_spk} size="sm" />
                      </div>

                      <div className="mt-3">
                        <PlateChip plat={spk.no_polisi} />
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-muted" title={spk.keluhan_customer}>
                        {spk.keluhan_customer}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                        <div className="rounded-lg border border-border bg-[#F8FAFC] px-3 py-2 dark:bg-slate-900/50">
                          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Tanggal Masuk</span>
                          <span className="text-xs font-semibold tabular-nums text-ink">
                            {new Date(spk.created_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <div className="rounded-lg border border-border bg-[#F8FAFC] px-3 py-2 text-right dark:bg-slate-900/50">
                          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Biaya</span>
                          <RupiahCell amount={spk.estimasi_biaya} />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryDetail(spk);
                        }}
                        className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#D5DDE8] bg-white text-xs font-semibold text-[#34517C] transition-colors hover:border-[#34517C] hover:bg-[#F5F8FD] dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Lihat Detail Service</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Footer Pagination langsung di dasar kartu */}
                <PaginationBar
                  page={historySafePage}
                  totalPages={historyTotalPages}
                  totalRecords={historyFiltered.length}
                  limit={historyLimit}
                  label="riwayat service"
                  className="bg-[#FAFBFD] px-4 py-3 sm:px-5 dark:bg-slate-900/40"
                  onPageChange={setHistoryPage}
                  onLimitChange={(l) => {
                    setHistoryLimit(l);
                    setHistoryPage(1);
                  }}
                />
              </>
            ) : historySearch.trim() ? (
              <div className="py-14 px-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#12388F] to-[#3B6FD4] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#12388F]/25">
                  <Search className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-ink">Riwayat Tidak Ditemukan</h3>
                  <p className="text-xs text-ink-muted mt-1">
                    Tidak ada riwayat service yang cocok dengan pencarian{' '}
                    <span className="font-semibold text-ink">"{historySearch}"</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistorySearch('')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#12388F] hover:bg-[#0D2A6B] text-white text-xs font-bold rounded-xl shadow-md shadow-[#12388F]/25 transition cursor-pointer"
                >
                  <X className="w-4 h-4" /> Bersihkan Pencarian
                </button>
              </div>
            ) : (
              <div className="py-14 px-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#12388F] to-[#3B6FD4] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#12388F]/25">
                  <Wrench className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-ink">
                    {historyStatusFilter === 'sedang-diservis'
                      ? 'Tidak Ada Unit Sedang Diservis'
                      : historyStatusFilter === 'selesai'
                      ? 'Belum Ada Riwayat Selesai'
                      : 'Belum Ada Riwayat Service'}
                  </h3>
                  <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto">
                    {historyStatusFilter === 'sedang-diservis'
                      ? 'Saat ini seluruh kendaraan Anda beroperasi prima dan tidak ada unit yang sedang dalam proses pengerjaan di bengkel.'
                      : 'Seluruh riwayat pengerjaan service kendaraan Anda di Bengkel KIM 3 akan tercatat dan dapat ditinjau di sini.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Detail SPK Tracking (untuk Dashboard & History) */}
      <DetailModal
        open={!!historyDetail}
        onClose={() => setHistoryDetail(null)}
        title={historyDetail ? `Detail Riwayat Service` : 'Detail Service'}
        subtitle={historyDetail ? `No. Dokumen: ${historyDetail.no_spk}` : undefined}
        badge={undefined}
        size="xl"
      >
        {historyDetail && (
          <SpkTrackingDetail
            spk={historyDetail}
            kendaraanList={kendaraanList || armadaPageData?.rows || (armadaPageData as any)?.data}
            pekerjaanList={pekerjaanList}
            partSpkList={partSpkList}
            myDokumenList={myDokumenList}
            myInvoiceList={myInvoiceList}
            tambahanList={tambahanList}
            purchasingList={purchasingList}
            ppnRate={ppnRateCustomer}
            approvingTambahan={approvalTambahanMutation.isPending}
            decidingEstimasi={approvalEstimasiMutation.isPending}
            onApproveTambahan={(id, keputusan) =>
              approvalTambahanMutation.mutate({ id, status_approval_customer: keputusan })
            }
            onDecideEstimasi={(s, setuju) => approvalEstimasiMutation.mutate({ setuju, spk: s })}
          />
        )}
      </DetailModal>





      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH KENDARAAN KENDARAAN BARU                                     */}
      {/* ========================================================================= */}
      {openTambahArmadaModal && (
        <ModalPortal onClose={() => setOpenTambahArmadaModal(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm app-backdrop-in">
            <div className="bg-surface-raised rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col overflow-hidden app-modal-in my-auto">
              <div className="shrink-0 border-b border-border bg-surface-raised px-5 py-3 sm:px-7">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold tracking-tight text-ink sm:text-base">Tambah Unit Kendaraan Baru</h3>
                      <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                        Daftarkan kendaraan operasional ke database Bengkel KIM 3
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenTambahArmadaModal(false)}
                    aria-label="Tutup modal"
                    className="shrink-0 rounded-lg p-1.5 text-ink-subtle transition hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!armadaForm.no_polisi.trim()) {
                    toast.warning('Nomor Polisi wajib diisi.');
                    return;
                  }
                  tambahArmadaMutation.mutate(armadaForm);
                }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                  <section aria-labelledby="armada-identitas-heading">
                    <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                      <div>
                        <h4 id="armada-identitas-heading" className="text-xs font-bold text-ink">Identitas kendaraan</h4>
                        <p className="mt-0.5 text-[11px] text-ink-subtle">Informasi utama untuk mengenali unit</p>
                      </div>
                      <span className="text-[10px] font-medium text-ink-subtle"><span className="text-status-red">*</span> Wajib diisi</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="armada-no-polisi" className="mb-1.5 block text-xs font-semibold text-ink-muted">
                          No. Polisi <span className="text-status-red">*</span>
                        </label>
                        <input
                          id="armada-no-polisi"
                          type="text"
                          required
                          placeholder="Contoh: BK 9999 XX"
                          value={armadaForm.no_polisi}
                          onChange={(e) => setArmadaForm({ ...armadaForm, no_polisi: e.target.value.toUpperCase() })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm font-bold uppercase tracking-wide focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label htmlFor="armada-unit-name" className="mb-1.5 block text-xs font-semibold text-ink-muted">
                          Nama Unit / Panggilan
                        </label>
                        <input
                          id="armada-unit-name"
                          type="text"
                          placeholder="Contoh: Fuso Wingbox Medan-Aceh"
                          value={armadaForm.unit_name}
                          onChange={(e) => setArmadaForm({ ...armadaForm, unit_name: e.target.value })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby="armada-spesifikasi-heading">
                    <div className="mb-3 border-b border-border pb-2">
                      <h4 id="armada-spesifikasi-heading" className="text-xs font-bold text-ink">Spesifikasi unit</h4>
                      <p className="mt-0.5 text-[11px] text-ink-subtle">Merk, model, dan bentuk kendaraan</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="armada-merk" className="mb-1.5 block text-xs font-semibold text-ink-muted">Merk</label>
                        <select
                          id="armada-merk"
                          value={armadaForm.merk}
                          onChange={(e) => setArmadaForm({ ...armadaForm, merk: e.target.value })}
                          className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-accent focus:outline-hidden"
                        >
                          <option value="">-- Pilih Merk --</option>
                          {masterMerkList.map((m) => (
                            <option key={m.id} value={m.brandname}>{m.brandname}</option>
                          ))}
                          {armadaForm.merk && !masterMerkList.some((m) => m.brandname.toLowerCase() === armadaForm.merk.toLowerCase()) && (
                            <option value={armadaForm.merk}>{armadaForm.merk}</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="armada-model" className="mb-1.5 block text-xs font-semibold text-ink-muted">Model / Seri</label>
                        <input
                          id="armada-model"
                          type="text"
                          placeholder="Contoh: Dutro 130HD"
                          value={armadaForm.model}
                          onChange={(e) => setArmadaForm({ ...armadaForm, model: e.target.value })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label htmlFor="armada-type" className="mb-1.5 block text-xs font-semibold text-ink-muted">Tipe / Bentuk Kendaraan</label>
                        <select
                          id="armada-type"
                          value={armadaForm.type || armadaForm.jenis_armada}
                          onChange={(e) => setArmadaForm({ ...armadaForm, type: e.target.value, jenis_armada: e.target.value })}
                          className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-accent focus:outline-hidden"
                        >
                          <option value="">-- Pilih Tipe Kendaraan --</option>
                          {armadaForm.merk && masterTipeList.filter((t) => t.brandname?.toLowerCase() === armadaForm.merk.toLowerCase()).length > 0 && (
                            <optgroup label={`Tipe Sesuai Merk (${armadaForm.merk})`}>
                              {masterTipeList
                                .filter((t) => t.brandname?.toLowerCase() === armadaForm.merk.toLowerCase())
                                .map((t) => (
                                  <option key={`merk-tipe-${t.id}`} value={t.typename}>
                                    {t.typename} {t.modelname ? `(${t.modelname})` : ''}
                                  </option>
                                ))}
                            </optgroup>
                          )}
                          <optgroup label="Tipe / Bentuk Karoseri Armada">
                            {['Box', 'Wingbox', 'Bak Terbuka', 'Dump Truck', 'Tangki', 'Trailer', 'Tronton', 'Pick Up', 'Dutro', 'Truk Engkel'].map((b) => (
                              <option key={`common-${b}`} value={b}>{b}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Tipe Kendaraan Lainnya">
                            {Array.from(new Set(masterTipeList.map((t) => t.typename).filter(Boolean))).map((tn) => (
                              <option key={`pos-type-${tn}`} value={tn}>{tn}</option>
                            ))}
                          </optgroup>
                          {(armadaForm.type || armadaForm.jenis_armada) &&
                            !masterTipeList.some((t) => t.typename?.toLowerCase() === (armadaForm.type || armadaForm.jenis_armada).toLowerCase()) &&
                            !['Box', 'Wingbox', 'Bak Terbuka', 'Dump Truck', 'Tangki', 'Trailer', 'Tronton', 'Pick Up', 'Dutro', 'Truk Engkel'].some(
                              (b) => b.toLowerCase() === (armadaForm.type || armadaForm.jenis_armada).toLowerCase()
                            ) && (
                              <option value={armadaForm.type || armadaForm.jenis_armada}>
                                {armadaForm.type || armadaForm.jenis_armada}
                              </option>
                            )}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="armada-tahun" className="mb-1.5 block text-xs font-semibold text-ink-muted">Tahun Pembuatan</label>
                        <input
                          id="armada-tahun"
                          type="number"
                          min="1990"
                          max={new Date().getFullYear() + 1}
                          value={armadaForm.tahun}
                          onChange={(e) => setArmadaForm({ ...armadaForm, tahun: Number(e.target.value) })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby="armada-dokumen-heading">
                    <div className="mb-3 border-b border-border pb-2">
                      <h4 id="armada-dokumen-heading" className="text-xs font-bold text-ink">Identitas teknis & masa berlaku</h4>
                      <p className="mt-0.5 text-[11px] text-ink-subtle">Nomor kendaraan dan pengingat dokumen</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="armada-no-rangka" className="mb-1.5 block text-xs font-semibold text-ink-muted">Nomor Rangka (VIN)</label>
                        <input
                          id="armada-no-rangka"
                          type="text"
                          placeholder="MHKHINO..."
                          value={armadaForm.no_rangka}
                          onChange={(e) => setArmadaForm({ ...armadaForm, no_rangka: e.target.value.toUpperCase() })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm uppercase focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label htmlFor="armada-no-mesin" className="mb-1.5 block text-xs font-semibold text-ink-muted">Nomor Mesin</label>
                        <input
                          id="armada-no-mesin"
                          type="text"
                          placeholder="J08E-..."
                          value={armadaForm.no_mesin}
                          onChange={(e) => setArmadaForm({ ...armadaForm, no_mesin: e.target.value.toUpperCase() })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm uppercase focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="armada-expired" className="mb-1.5 block text-xs font-semibold text-ink-muted">
                          Masa Berlaku STNK
                        </label>
                        <input
                          id="armada-expired"
                          type="date"
                          value={armadaForm.expired || armadaForm.masa_berlaku_asuransi}
                          onChange={(e) => setArmadaForm({ ...armadaForm, expired: e.target.value, masa_berlaku_asuransi: e.target.value })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby="armada-foto-heading">
                    <div className="mb-3 border-b border-border pb-2">
                      <h4 id="armada-foto-heading" className="text-xs font-bold text-ink">Foto unit <span className="font-normal text-ink-subtle">(opsional)</span></h4>
                      <p className="mt-0.5 text-[11px] text-ink-subtle">Tambahkan foto agar unit mudah dikenali</p>
                    </div>
                    <PhotoUploader
                      label=""
                      value={armadaForm.foto_kendaraan}
                      onChange={(url) => setArmadaForm({ ...armadaForm, foto_kendaraan: url })}
                    />
                    <p className="mt-2 text-[11px] leading-relaxed text-ink-subtle">
                      Foto tersimpan otomatis dengan kompresi. Maks. 15 MB; JPG, PNG, atau WebP. Foto tampil di daftar setelah unit disimpan.
                    </p>
                  </section>
                </div>

                <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-surface-raised px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                  <ModalActionButton
                    variant="cancel"
                    width="responsive"
                    onClick={() => setOpenTambahArmadaModal(false)}
                  >
                    Batal
                  </ModalActionButton>
                  <ModalActionButton
                    type="submit"
                    variant="primary"
                    width="responsive"
                    disabled={tambahArmadaMutation.isPending || !isVerifiedByAdmin}
                    title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin POS' : undefined}
                  >
                    <Plus className="h-4 w-4" />
                    <span>{tambahArmadaMutation.isPending ? 'Menyimpan...' : 'Simpan Unit Kendaraan'}</span>
                  </ModalActionButton>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UNGGAH DOKUMEN DIGITAL KENDARAAN                                   */}
      {/* ========================================================================= */}
      {openTambahDokumenModal && (
        <ModalPortal onClose={() => setOpenTambahDokumenModal(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm app-backdrop-in sm:p-6">
            <div className="my-auto flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl app-modal-in">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-raised px-5 py-3 sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold tracking-tight text-ink sm:text-base">Unggah Dokumen Kendaraan</h3>
                  <p className="mt-0.5 text-[11px] text-ink-muted">Simpan arsip legalitas untuk unit kendaraan Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenTambahDokumenModal(false)}
                aria-label="Tutup unggah dokumen"
                className="shrink-0 rounded-lg p-1.5 text-ink-subtle transition hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!dokumenForm.no_polisi || !dokumenForm.nama_dokumen.trim()) {
                  toast.warning('Pilih kendaraan dan isi nama dokumen.');
                  return;
                }
                tambahDokumenMutation.mutate(dokumenForm);
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
              <section aria-labelledby="dokumen-upload-info" className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h4 id="dokumen-upload-info" className="text-xs font-bold text-ink">Informasi dokumen</h4>
                  <p className="mt-0.5 text-[11px] text-ink-subtle">Pilih unit, jenis berkas, dan masa berlakunya</p>
                </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
                  Pilih Unit Kendaraan <span className="text-status-red">*</span>
                </label>
                <select
                  required
                  value={dokumenForm.no_polisi}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, no_polisi: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">-- Pilih Nomor Polisi --</option>
                  {myKendaraanList.map((k) => (
                    <option key={k.id} value={k.no_polisi}>
                      {formatPlat(k.no_polisi)} — {formatNamaArmada(k)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
                    Jenis Dokumen <span className="text-status-red">*</span>
                  </label>
                  <select
                    value={dokumenForm.jenis_dokumen}
                    onChange={(e) => setDokumenForm({ ...dokumenForm, jenis_dokumen: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="STNK">STNK (Pajak Tahunan / 5 Tahunan)</option>
                    <option value="KIR">KIR (Uji Berkala Dishub)</option>
                    <option value="BPKB">BPKB Unit</option>
                    <option value="Asuransi">Polis Asuransi All Risk / TLO</option>
                    <option value="Izin Usaha">Izin Usaha Angkutan / Dishub</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Masa Berlaku Dokumen</label>
                  <input
                    type="date"
                    value={dokumenForm.masa_berlaku}
                    onChange={(e) => setDokumenForm({ ...dokumenForm, masa_berlaku: e.target.value })}
                    className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              </section>
              <section aria-labelledby="dokumen-upload-detail" className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h4 id="dokumen-upload-detail" className="text-xs font-bold text-ink">Detail berkas</h4>
                  <p className="mt-0.5 text-[11px] text-ink-subtle">Beri nama yang mudah dikenali saat dicari kembali</p>
                </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-muted">
                  Nama Dokumen / Keterangan Berkas <span className="text-status-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: STNK Pajak Berlaku s/d Mei 2027"
                  value={dokumenForm.nama_dokumen}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, nama_dokumen: e.target.value })}
                  className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-muted">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Catatan nomor seri atau barcode dokumen"
                  value={dokumenForm.keterangan}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, keterangan: e.target.value })}
                  className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              </section>
              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-surface-raised px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <ModalActionButton
                  variant="cancel"
                  width="responsive"
                  onClick={() => setOpenTambahDokumenModal(false)}
                >
                  Batal
                </ModalActionButton>
                <ModalActionButton
                  type="submit"
                  variant="primary"
                  width="responsive"
                  disabled={tambahDokumenMutation.isPending || !isVerifiedByAdmin}
                  title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin POS' : undefined}
                >
                  <Plus className="w-4 h-4" />
                  <span>{tambahDokumenMutation.isPending ? 'Menyimpan...' : 'Simpan Dokumen'}</span>
                </ModalActionButton>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT UNIT KENDARAAN                                                 */}
      {/* ========================================================================= */}
      {editArmadaData && (
        <ModalPortal onClose={() => setEditArmadaData(null)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm app-backdrop-in sm:p-6">
            <div className="my-auto flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl app-modal-in">
              <div className="shrink-0 border-b border-border bg-surface-raised px-5 py-3 sm:px-7">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold tracking-tight text-ink sm:text-base">Edit Unit Kendaraan</h3>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-ink-muted">
                        {formatPlat(editArmadaData.no_polisi)} · Nomor polisi tidak dapat diubah
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditArmadaData(null)}
                    aria-label="Tutup modal"
                    className="shrink-0 rounded-lg p-1.5 text-ink-subtle transition hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  editArmadaMutation.mutate(editArmadaForm);
                }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                  <section aria-labelledby="edit-armada-identitas">
                    <div className="mb-3 border-b border-border pb-2">
                      <h4 id="edit-armada-identitas" className="text-xs font-bold text-ink">Identitas kendaraan</h4>
                      <p className="mt-0.5 text-[11px] text-ink-subtle">Nomor polisi: <span className="font-mono font-semibold text-ink-muted">{formatPlat(editArmadaData.no_polisi)}</span></p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="edit-armada-unit-name" className="mb-1.5 block text-xs font-semibold text-ink-muted">Nama Unit / Panggilan</label>
                        <input
                          id="edit-armada-unit-name"
                          type="text"
                          placeholder="Contoh: Fuso Wingbox Medan-Aceh"
                          value={editArmadaForm.unit_name}
                          onChange={(e) => setEditArmadaForm({ ...editArmadaForm, unit_name: e.target.value })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-armada-merk" className="mb-1.5 block text-xs font-semibold text-ink-muted">Merk</label>
                        <select
                          id="edit-armada-merk"
                          value={editArmadaForm.merk}
                          onChange={(e) => setEditArmadaForm({ ...editArmadaForm, merk: e.target.value })}
                          className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-accent focus:outline-hidden"
                        >
                          <option value="">-- Pilih Merk --</option>
                          {masterMerkList.map((m) => <option key={m.id} value={m.brandname}>{m.brandname}</option>)}
                          {editArmadaForm.merk && !masterMerkList.some((m) => m.brandname.toLowerCase() === editArmadaForm.merk.toLowerCase()) && (
                            <option value={editArmadaForm.merk}>{editArmadaForm.merk}</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="edit-armada-model" className="mb-1.5 block text-xs font-semibold text-ink-muted">Model / Seri</label>
                        <input
                          id="edit-armada-model"
                          type="text"
                          placeholder="Contoh: Dutro 130HD"
                          value={editArmadaForm.model}
                          onChange={(e) => setEditArmadaForm({ ...editArmadaForm, model: e.target.value })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby="edit-armada-spesifikasi">
                    <div className="mb-3 border-b border-border pb-2">
                      <h4 id="edit-armada-spesifikasi" className="text-xs font-bold text-ink">Spesifikasi unit</h4>
                      <p className="mt-0.5 text-[11px] text-ink-subtle">Tipe kendaraan dan tahun pembuatan</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="edit-armada-type" className="mb-1.5 block text-xs font-semibold text-ink-muted">Tipe / Bentuk Kendaraan</label>
                        <select
                          id="edit-armada-type"
                          value={editArmadaForm.type || editArmadaForm.jenis_armada}
                          onChange={(e) => setEditArmadaForm({ ...editArmadaForm, type: e.target.value, jenis_armada: e.target.value })}
                          className="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-accent focus:outline-hidden"
                        >
                          <option value="">-- Pilih Tipe Kendaraan --</option>
                          {editArmadaForm.merk && masterTipeList.filter((t) => t.brandname?.toLowerCase() === editArmadaForm.merk.toLowerCase()).length > 0 && (
                            <optgroup label={`Tipe Sesuai Merk (${editArmadaForm.merk})`}>
                              {masterTipeList
                                .filter((t) => t.brandname?.toLowerCase() === editArmadaForm.merk.toLowerCase())
                                .map((t) => <option key={`edit-merk-tipe-${t.id}`} value={t.typename}>{t.typename} {t.modelname ? `(${t.modelname})` : ''}</option>)}
                            </optgroup>
                          )}
                          <optgroup label="Tipe / Bentuk Karoseri Armada">
                            {['Box', 'Wingbox', 'Bak Terbuka', 'Dump Truck', 'Tangki', 'Trailer', 'Tronton', 'Pick Up', 'Dutro', 'Truk Engkel'].map((b) => (
                              <option key={`edit-common-${b}`} value={b}>{b}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Tipe Kendaraan Lainnya">
                            {Array.from(new Set(masterTipeList.map((t) => t.typename).filter(Boolean))).map((tn) => (
                              <option key={`edit-pos-type-${tn}`} value={tn}>{tn}</option>
                            ))}
                          </optgroup>
                          {(editArmadaForm.type || editArmadaForm.jenis_armada) &&
                            !masterTipeList.some((t) => t.typename?.toLowerCase() === (editArmadaForm.type || editArmadaForm.jenis_armada).toLowerCase()) &&
                            !['Box', 'Wingbox', 'Bak Terbuka', 'Dump Truck', 'Tangki', 'Trailer', 'Tronton', 'Pick Up', 'Dutro', 'Truk Engkel'].some(
                              (b) => b.toLowerCase() === (editArmadaForm.type || editArmadaForm.jenis_armada).toLowerCase()
                            ) && <option value={editArmadaForm.type || editArmadaForm.jenis_armada}>{editArmadaForm.type || editArmadaForm.jenis_armada}</option>}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="edit-armada-tahun" className="mb-1.5 block text-xs font-semibold text-ink-muted">Tahun Pembuatan</label>
                        <input
                          id="edit-armada-tahun"
                          type="number"
                          min="1990"
                          max={new Date().getFullYear() + 1}
                          value={editArmadaForm.tahun}
                          onChange={(e) => setEditArmadaForm({ ...editArmadaForm, tahun: Number(e.target.value) })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby="edit-armada-teknis">
                    <div className="mb-3 border-b border-border pb-2">
                      <h4 id="edit-armada-teknis" className="text-xs font-bold text-ink">Identitas teknis & masa berlaku</h4>
                      <p className="mt-0.5 text-[11px] text-ink-subtle">Nomor kendaraan dan pengingat dokumen</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="edit-armada-no-rangka" className="mb-1.5 block text-xs font-semibold text-ink-muted">Nomor Rangka (VIN)</label>
                        <input
                          id="edit-armada-no-rangka"
                          type="text"
                          placeholder="MHKHINO..."
                          value={editArmadaForm.no_rangka}
                          onChange={(e) => setEditArmadaForm({ ...editArmadaForm, no_rangka: e.target.value.toUpperCase() })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm uppercase focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-armada-no-mesin" className="mb-1.5 block text-xs font-semibold text-ink-muted">Nomor Mesin</label>
                        <input
                          id="edit-armada-no-mesin"
                          type="text"
                          placeholder="J08E-..."
                          value={editArmadaForm.no_mesin}
                          onChange={(e) => setEditArmadaForm({ ...editArmadaForm, no_mesin: e.target.value.toUpperCase() })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm uppercase focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="edit-armada-expired" className="mb-1.5 block text-xs font-semibold text-ink-muted">Masa Berlaku (Pajak/STNK/Asuransi)</label>
                        <input
                          id="edit-armada-expired"
                          type="date"
                          value={editArmadaForm.expired || editArmadaForm.masa_berlaku_asuransi}
                          onChange={(e) => setEditArmadaForm({ ...editArmadaForm, expired: e.target.value, masa_berlaku_asuransi: e.target.value })}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 font-mono text-sm focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby="edit-armada-foto">
                    <div className="mb-3 border-b border-border pb-2">
                      <h4 id="edit-armada-foto" className="text-xs font-bold text-ink">Foto unit <span className="font-normal text-ink-subtle">(opsional)</span></h4>
                      <p className="mt-0.5 text-[11px] text-ink-subtle">Unggah foto baru untuk mengganti foto saat ini</p>
                    </div>
                    <PhotoUploader
                      label=""
                      value={editArmadaForm.foto_kendaraan}
                      onChange={(url) => setEditArmadaForm({ ...editArmadaForm, foto_kendaraan: url })}
                    />
                    <p className="mt-2 text-[11px] leading-relaxed text-ink-subtle">
                      Biarkan foto tetap seperti saat ini jika tidak ingin menggantinya. Foto baru dikompresi otomatis; maks. 15 MB.
                    </p>
                  </section>
                </div>

                <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-surface-raised px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                  <ModalActionButton
                    variant="cancel"
                    width="responsive"
                    onClick={() => setEditArmadaData(null)}
                  >
                    Batal
                  </ModalActionButton>
                  <ModalActionButton
                    type="submit"
                    variant="primary"
                    width="responsive"
                    disabled={editArmadaMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                    <span>{editArmadaMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </ModalActionButton>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Konfirmasi hapus unit kendaraan */}
      {hapusArmadaTarget && (
        <ConfirmModal
          title="Hapus Unit Kendaraan?"
          message={`Unit ${formatPlat(hapusArmadaTarget.no_polisi)} (${formatNamaArmada(hapusArmadaTarget)}) akan dihapus permanen dari daftar kendaraan Anda. Riwayat service & faktur tetap tersimpan.`}
          confirmLabel="Ya, Hapus"
          tone="red"
          isPending={hapusArmadaMutation.isPending}
          onClose={() => setHapusArmadaTarget(null)}
          onConfirm={() => {
            hapusArmadaMutation.mutate(hapusArmadaTarget.no_polisi);
          }}
        />
      )}

      {/* Konfirmasi batalkan booking (pengganti window.confirm) */}
      {cancelBookingTarget && (
        <ConfirmModal
          title="Batalkan Booking?"
          message={`Batalkan booking ${cancelBookingTarget.no_booking} (${formatPlat(cancelBookingTarget.no_polisi)}) jadwal ${cancelBookingTarget.tanggal_booking} ${cancelBookingTarget.jam_booking}?`}
          confirmLabel="Ya, Batalkan"
          tone="red"
          isPending={batalkanBookingMutation.isPending}
          onClose={() => setCancelBookingTarget(null)}
          onConfirm={() => {
            batalkanBookingMutation.mutate(cancelBookingTarget.id, {
              onSuccess: () => setCancelBookingTarget(null),
            });
          }}
        />
      )}

      {/* Modal Lightbox Preview Foto Membesar */}
      {previewImage && (
        <ModalPortal onClose={() => setPreviewImage(null)}>
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)}
          >
            {/* Top Controls */}
            <div
              className="w-full max-w-4xl flex items-center justify-between pb-3 text-white shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <span className="px-3.5 py-1 rounded-lg bg-white/15 border border-white/25 font-mono font-black text-sm tracking-wider text-white shadow-xs">
                  {previewImage.title}
                </span>
                {previewImage.subtitle && (
                  <span className="text-xs text-white/80 font-medium truncate hidden sm:inline">
                    {previewImage.subtitle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Buka gambar di tab baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-2 rounded-xl bg-white/15 hover:bg-status-red text-white transition-colors cursor-pointer"
                  title="Tutup (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Large Image Frame */}
            <div
              className="relative max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl border border-white/15 shadow-2xl bg-black/50 p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[76vh] max-w-full w-auto object-contain rounded-xl select-none"
              />
            </div>

            {/* Hint */}
            <div
              className="mt-3 text-center text-xs text-white/70"
              onClick={(e) => e.stopPropagation()}
            >
              Tekan <kbd className="px-2 py-0.5 rounded bg-white/20 text-white font-mono text-xs">Esc</kbd> atau klik di luar gambar untuk menutup
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
};
