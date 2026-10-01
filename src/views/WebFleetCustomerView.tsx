import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, normalizePlat, formatPlat, getApiErrorMessage } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { Kendaraan, BookingService, SpkService, InvoicePembayaran, SpkItemPekerjaan, SpkItemPart, DokumenKendaraan, PekerjaanTambahan, PurchaseRequestPart } from '../types';
import { PaginationBar } from '../components/common/PaginationBar';
import { useAppStore } from '../store/useAppStore';
import { usePpnRate } from '../hooks/usePpnRate';
import { realtimeHub } from '../services/realtimeService';
import { ModalPortal } from '../components/common/ModalPortal';
import { ConfirmModal } from '../components/common/ConfirmModal';
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
import { 
  Truck, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Clock, 
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
  AlertTriangle
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-accent-subtle text-accent flex items-center justify-center font-black border border-accent/20 shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-black font-mono text-ink tracking-wide">{formatPlat(spk.no_polisi)}</h2>
                      <StatusBadge status={spk.status_spk} size="sm" />
                    </div>
                    <p className="text-xs text-ink-muted font-medium">{spk.nama_customer || '-'} • <span className="font-mono text-ink">{spk.no_spk}</span></p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-ink-subtle block text-xs">Layanan:</span>
                    <span className="text-ink font-bold">{spk.jenis_layanan || 'Service Kendaraan'}</span>
                  </div>
                  <div>
                    <span className="text-ink-subtle block text-xs">Waktu Check In:</span>
                    <span className="text-ink">{spk.created_at ? new Date(spk.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}</span>
                  </div>
                  <div>
                    <span className="text-ink-subtle block text-xs">Estimasi Selesai (ETA):</span>
                    <span className="text-accent font-bold font-mono">{(() => { const e = etaSpk(spk); return e.jam != null ? `${e.jam} Jam` : '-'; })()}</span>
                    <span className="text-ink-subtle block text-[10px]">{labelSumberEta(etaSpk(spk).sumber)}</span>
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

              {/* Stepper Progress Bar (image5.png Mockup 2 Stepper) */}
              <div className="py-6 px-2 overflow-x-auto">
                <div className="flex items-start justify-between min-w-[650px]">
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
                  ].map((s, idx) => (
                    <div key={s.step} className="flex-1 flex items-start">
                      <div className="flex flex-col items-center flex-1 text-center min-w-0">
                        <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
                          s.isWaitingPart
                            ? 'bg-status-red text-white ring-4 ring-status-red/20 shadow-md scale-110'
                            : s.current 
                            ? 'bg-accent text-white ring-4 ring-accent/20 shadow-md scale-110' 
                            : s.done 
                            ? 'bg-status-green text-white' 
                            : 'bg-surface text-ink-subtle border border-border'
                        }`}>
                          {s.done ? <CheckCircle2 className="w-5 h-5" /> : s.step}
                        </div>
                        <div className={`text-xs font-bold leading-tight ${s.isWaitingPart ? 'text-status-red' : s.current ? 'text-accent' : s.done ? 'text-status-green' : 'text-ink'}`}>
                          {s.title}
                        </div>
                        <div className="text-xs text-ink-subtle mt-0.5">{s.desc}</div>
                        <div className={`text-[11px] font-mono mt-0.5 leading-tight ${s.done ? 'text-status-green' : s.current ? 'text-accent' : 'text-ink-subtle/60'}`}>
                          {s.waktu ? fmtJam(s.waktu as string) : '—'}
                        </div>
                      </div>
                      {idx < 5 && (
                        <div className={`h-1 flex-1 mx-2 mt-4 rounded-full ${s.done ? 'bg-status-green' : 'bg-surface'}`}></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4 Detail Tabs di bawah Tracker Status Service */}
              <div className="border-t border-border pt-5 space-y-4">
                {/* Tab Navigation */}
                <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
                  <button
                    type="button"
                    onClick={() => setSubTab('progress')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 -mb-px shrink-0 ${
                      subTab === 'progress'
                        ? 'border-accent text-accent bg-accent-subtle'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Progress Pekerjaan
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('detail')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 -mb-px shrink-0 ${
                      subTab === 'detail'
                        ? 'border-accent text-accent bg-accent-subtle'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface'
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
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 -mb-px shrink-0 ${
                      subTab === 'catatan'
                        ? 'border-accent text-accent bg-accent-subtle'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface'
                    }`}
                  >
                    <FileCheck className="w-4 h-4" />
                    Catatan SA & Mekanik
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('dokumen')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 -mb-px shrink-0 ${
                      subTab === 'dokumen'
                        ? 'border-accent text-accent bg-accent-subtle'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface'
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
                    <div className="space-y-3 bg-surface/60 p-4 rounded-xl border border-border">
                      <span className="font-bold text-ink flex items-center gap-2">
                        <Clock className="w-4 h-4 text-accent" />
                        Timeline Riwayat Aktivitas Service:
                      </span>
                      <div className="space-y-3 relative pl-4 border-l-2 border-border ml-2">
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

                    <div className="space-y-3 bg-accent-subtle p-4 rounded-xl border border-accent/20">
                      <span className="font-bold text-ink flex items-center gap-2">
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

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    disabled={decidingEstimasi || approvalTotal === null}
                    onClick={() => {
                      onDecideEstimasi?.(spk, true);
                      setShowEstimasiWizard(false);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-status-green hover:bg-status-green/90 text-white font-bold text-xs shadow-md shadow-status-green/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui Estimasi (Mulai Service)</span>
                  </button>
                  <button
                    type="button"
                    disabled={decidingEstimasi}
                    onClick={() => {
                      onDecideEstimasi?.(spk, false);
                      setShowEstimasiWizard(false);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-status-red hover:bg-status-red/90 text-white font-bold text-xs shadow-md shadow-status-red/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak Estimasi</span>
                  </button>
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
    jenis_armada: 'Truk',
    merk: '',
    model: '',
    tahun: new Date().getFullYear(),
    no_rangka: '',
    no_mesin: '',
    asuransi: '',
    masa_berlaku_asuransi: '',
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

  const { data: bookingList } = useQuery({
    queryKey: ['booking-list'],
    queryFn: api.getBooking,
  });

  const { data: spkList } = useQuery({
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



  // Profil Customer & Kontak: form editable (tersimpan di tabel pengguna via /kim3/profil-simpan)
  const [profilEditing, setProfilEditing] = useState(false);
  const [profilForm, setProfilForm] = useState({
    nama_perusahaan: authUser?.nama_lengkap || '',
    alamat: authUser?.alamat || '',
    npwp: authUser?.npwp || '',
    no_telepon: authUser?.no_telepon || '',
    nama_pic: authUser?.nama_pic || '',
  });
  const simpanProfilMutation = useMutation({
    mutationFn: () =>
      api.updateProfil({
        nama_lengkap: (profilForm.nama_perusahaan.trim() || authUser?.nama_lengkap || '').trim(),
        nama_pic: profilForm.nama_pic.trim(),
        alamat: profilForm.alamat.trim(),
        npwp: profilForm.npwp.trim(),
        no_telepon: profilForm.no_telepon.trim(),
        foto_profil: authUser?.foto_profil || '',
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
  const myPelangganId = authUser?.id_pelanggan || null;
  const myCompanyName = (authUser?.nama_perusahaan || authUser?.nama_lengkap || '').toLowerCase().trim();

  // Status Verifikasi POS / Admin
  const isVerifiedByAdmin = authUser?.pos_verifikasi === true;

  // Predikat kepemilikan kendaraan (guard tambahan di atas filter tenant SQL)
  const isMyKendaraan = (k: Kendaraan) => {
    if (myPelangganId && k.id_pelanggan === myPelangganId) return true;
    if (myCompanyName && (
      (k.nama_pemilik && k.nama_pemilik.toLowerCase().trim() === myCompanyName) ||
      (k.nama_perusahaan && k.nama_perusahaan.toLowerCase().trim() === myCompanyName)
    )) return true;
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
    if (b.status === 'Dibatalkan') return false;

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
  const getBookingEffectiveStatus = useCallback((b: BookingService): 'Booked' | 'Check In' | 'Dibatalkan' => {
    if (b.status === 'Dibatalkan') return 'Dibatalkan';
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
    if (aStat === 'Dibatalkan' && bStat !== 'Dibatalkan') return 1;
    if (bStat === 'Dibatalkan' && aStat !== 'Dibatalkan') return -1;
    if (aStat === 'Check In' && bStat === 'Booked') return 1;
    if (bStat === 'Check In' && aStat === 'Booked') return -1;
    return `${a.tanggal_booking} ${a.jam_booking}`.localeCompare(`${b.tanggal_booking} ${b.jam_booking}`);
  });

  // ── Booking Saya: hanya menampilkan booking yang Aktif (Booked) ──────────────
  const [bookingViewPage, setBookingViewPage] = useState(1);
  const [bookingViewLimit, setBookingViewLimit] = useState(10);
  const bookingAktifList = myBookingSorted.filter((b) => getBookingEffectiveStatus(b) === 'Booked');
  const bookingFiltered = bookingAktifList;
  const bookingViewTotalPages = Math.max(1, Math.ceil(bookingFiltered.length / bookingViewLimit));
  const bookingViewSafePage = Math.min(bookingViewPage, bookingViewTotalPages);
  const bookingViewRows = bookingFiltered.slice(
    (bookingViewSafePage - 1) * bookingViewLimit,
    bookingViewSafePage * bookingViewLimit
  );
  React.useEffect(() => {
    setBookingViewPage(1);
  }, [bookingViewLimit]);

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
    if (effStatus === 'Dibatalkan') {
      return (
        <span className="text-xs px-2.5 py-1 rounded-xl bg-surface text-ink-subtle border border-border font-bold">
          Dibatalkan
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
    return (
      <button
        type="button"
        disabled={!st.allowed || batalkanBookingMutation.isPending}
        title={st.allowed ? 'Batalkan booking ini' : st.reason}
        onClick={() => setCancelBookingTarget(b)}
        className={`${compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'} rounded-xl font-bold transition-all ${
          st.allowed
            ? 'bg-status-red-bg text-status-red hover:bg-status-red hover:text-white border border-status-red/30 cursor-pointer'
            : 'bg-surface text-ink-subtle border border-border cursor-not-allowed'
        } disabled:opacity-60`}
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
    jenis_armada: 'Truk',
    merk: '',
    model: '',
    tahun: new Date().getFullYear(),
    nama_pemilik: currentUser || '',
    no_rangka: '',
    no_mesin: '',
    asuransi: '',
    masa_berlaku_asuransi: '',
    foto_kendaraan: '',
  });

  const tambahArmadaMutation = useMutation({
    mutationFn: async (data: typeof armadaForm) => {
      // Plat dinormalisasi (primary key walk-in); konflik pemilik ditolak server.
      const plat = normalizePlat(data.no_polisi);
      if (!plat) throw new Error('Nomor polisi wajib diisi.');
      const res = await api.tambahKendaraan({
        no_polisi: plat,
        jenis_armada: data.jenis_armada as any,
        merk: data.merk,
        model: data.model,
        tahun: Number(data.tahun) || new Date().getFullYear(),
        nama_pemilik: data.nama_pemilik || authUser?.nama_perusahaan || authUser?.nama_lengkap || 'Customer Fleet',
        no_rangka: data.no_rangka,
        no_mesin: data.no_mesin,
        asuransi: data.asuransi,
        masa_berlaku_asuransi: data.masa_berlaku_asuransi || undefined,
        // Endpoint /kim3/kendaraan-tambah memakai :foto_kendaraan_base64_data,
        // Dynamic API otomatis memetakan param `foto_kendaraan` (data URI).
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
        jenis_armada: 'Truk',
        merk: '',
        model: '',
        tahun: new Date().getFullYear(),
        nama_pemilik: currentUser || '',
        no_rangka: '',
        no_mesin: '',
        asuransi: '',
        masa_berlaku_asuransi: '',
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
        no_polisi: editArmadaData?.no_polisi || '',
        jenis_armada: data.jenis_armada as any,
        merk: data.merk,
        model: data.model,
        tahun: Number(data.tahun) || undefined,
        no_rangka: data.no_rangka,
        no_mesin: data.no_mesin,
        asuransi: data.asuransi,
        masa_berlaku_asuransi: data.masa_berlaku_asuransi || undefined,
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
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-amber-800 dark:text-amber-100">Akun Belum Terverifikasi oleh Admin</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">Menunggu Approval POS</span>
              </div>
              <p className="text-xs text-amber-700/90 dark:text-amber-200/90 mt-1 leading-relaxed">
                Akun kemitraan Anda saat ini menunggu verifikasi data oleh admin sistem POS. Anda belum dapat melakukan booking service atau menambahkan armada kendaraan baru sampai akun selesai diverifikasi oleh admin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MENU 0: DASHBOARD RINGKASAN KENDARAAN */}
      {fleetMenu === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-accent rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-raised/10 text-white/70 text-xs font-semibold mb-2">
                <Truck className="w-3.5 h-3.5 text-white/70" />
                Portal Monitoring Fleet KIM 3 Medan
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Selamat Datang, {currentUser || 'Pelanggan Fleet'}</h1>
              <p className="text-xs text-white/70 mt-1 max-w-xl leading-relaxed">
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
                className={`px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 ${
                  !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin' : undefined}
              >
                <Plus className="w-4 h-4" /> Booking Service
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Booking Terjadwal"
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
              title="Total Kendaraan Truk"
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
              tone="neutral"
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
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 ${
                !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin' : undefined}
            >
              <Plus className="w-4 h-4" />
              <span>Jadwalkan Service Baru</span>
            </button>
          </div>

          {/* Booking Saya: Daftar booking aktif */}
          <div className="rounded-xl border border-border bg-surface-raised p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" /> Daftar Booking Saya
              </h3>
              <span className="text-xs font-semibold text-accent px-2.5 py-0.5 rounded-full bg-accent-subtle">
                {bookingAktifList.length} Booking Aktif
              </span>
            </div>

            {bookingFiltered.length > 0 ? (
              <>
                <div className="space-y-2.5">
                  {bookingViewRows.map((b) => {
                    const effStatus = getBookingEffectiveStatus(b);
                    return (
                      <ListItemCard
                        key={b.id}
                        title={formatPlat(b.no_polisi)}
                        subtitle={`${b.jenis_layanan} • Jadwal: ${b.tanggal_booking} ${b.jam_booking} WIB`}
                        badge={
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-accent-subtle text-accent">
                            {effStatus}
                          </span>
                        }
                        actions={<BookingCancelButton b={b} />}
                      />
                    );
                  })}
                </div>
                <PaginationBar
                  page={bookingViewSafePage}
                  totalPages={bookingViewTotalPages}
                  totalRecords={bookingFiltered.length}
                  limit={bookingViewLimit}
                  label="booking"
                  onPageChange={setBookingViewPage}
                  onLimitChange={(l) => setBookingViewLimit(l)}
                />
              </>
            ) : (
              <EmptyState
                icon={Calendar}
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
            <p className="text-xs text-ink-subtle">
              Kendaraan yang telah tiba dan di-check-in di gerbang otomatis diproses ke Riwayat Kendaraan (History). Pembatalan booking dapat dilakukan maksimal 10 menit sebelum jadwal.
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
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-ink">Pilih kendaraan yang akan diservice:</span>
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
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-subtle hover:bg-accent-subtle text-accent text-xs font-bold rounded-xl border border-accent/30 transition shrink-0 ${
                            !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin' : undefined}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Kendaraan</span>
                        </button>
                      </div>

                      {/* Pencarian Plat Nomor / Model Kendaraan */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={bookingKendaraanSearch}
                          onChange={(e) => {
                            setBookingKendaraanSearch(e.target.value);
                            setBookingKendaraanPage(1);
                          }}
                          placeholder="Cari no. polisi / plat kendaraan..."
                          aria-label="Cari plat nomor kendaraan"
                          className="w-full pl-9 pr-9 py-2 rounded-xl border border-border bg-surface text-xs text-ink placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-hidden"
                        />
                        {bookingKendaraanSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setBookingKendaraanSearch('');
                              setBookingKendaraanPage(1);
                            }}
                            aria-label="Bersihkan pencarian"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-raised transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        {filteredBookingKendaraanList.length > 0 ? (
                          bookingKendaraanPaginated.map((k) => {
                            const isSelected = bookingForm.no_polisi === k.no_polisi;
                            return (
                              <label
                                key={k.id}
                                className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-accent bg-accent-subtle/50 shadow-xs ring-1 ring-accent/30'
                                    : 'border-border hover:border-accent/40 bg-surface-raised hover:bg-surface'
                                }`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  <input
                                    type="radio"
                                    name="booking_kendaraan"
                                    checked={isSelected}
                                    onChange={() => setBookingForm({ ...bookingForm, no_polisi: k.no_polisi })}
                                    className="text-accent shrink-0 w-4 h-4 cursor-pointer"
                                  />
                                  {k.foto_kendaraan ? (
                                    <img
                                      src={k.foto_kendaraan}
                                      alt=""
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewImage({
                                          url: k.foto_kendaraan!,
                                          title: formatPlat(k.no_polisi),
                                          subtitle: `${k.merk} ${k.model} (${k.tahun})`,
                                        });
                                      }}
                                      className="w-12 h-12 rounded-xl object-cover border border-border shrink-0 cursor-pointer hover:scale-105 transition-transform shadow-2xs"
                                      title="Klik untuk memperbesar foto"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0 border border-accent/20">
                                      <Truck className="w-6 h-6" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-md border border-border bg-surface font-mono font-black text-xs tracking-wider text-ink mb-1">
                                      {formatPlat(k.no_polisi)}
                                    </div>
                                    <div className="text-xs font-bold text-ink truncate">
                                      {k.merk} {k.model} {k.tahun ? `(${k.tahun})` : ''}
                                    </div>
                                    <div className="text-[11px] text-ink-muted truncate font-medium">
                                      {k.jenis_armada || 'Truk'}
                                    </div>
                                  </div>
                                </div>
                                <div className="shrink-0 pl-2">
                                  <span className="px-2.5 py-1 rounded-lg bg-status-green-bg text-status-green font-bold text-xs border border-status-green/30 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Kendaraan Aktif</span>
                                  </span>
                                </div>
                              </label>
                            );
                          })
                        ) : myKendaraanList.length > 0 ? (
                          <div className="p-6 text-center border border-dashed border-border rounded-xl bg-surface space-y-2">
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
                          <div className="p-6 text-center border-2 border-dashed border-border rounded-xl bg-surface space-y-2">
                            <p className="text-xs text-ink-muted font-medium">Belum ada kendaraan terdaftar untuk akun fleet Anda.</p>
                            <button
                              type="button"
                              onClick={() => setOpenTambahArmadaModal(true)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Daftarkan Truk Sekarang
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Pagination Bar untuk Pilihan Kendaraan */}
                      {filteredBookingKendaraanList.length > 0 && (
                        <PaginationBar
                          page={bookingKendaraanSafePage}
                          totalPages={bookingKendaraanTotalPages}
                          totalRecords={filteredBookingKendaraanList.length}
                          limit={bookingKendaraanLimit}
                          limitOptions={[5, 10, 20]}
                          label="kendaraan"
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
                    <div className="space-y-3.5">
                      <span className="text-xs font-bold text-ink block">Pilih jenis perbaikan atau service berkala:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          'Service Berkala (Ganti Oli & Filter)',
                          'Perbaikan Rem & Kaki-kaki',
                          'Tune Up & Performa Mesin',
                          'Kelistrikan & Starter / Alternator',
                          'Overhaul Mesin / Transmisi',
                          'Pemeriksaan Umum / Keluhan Khusus',
                        ].map((srv) => {
                          const isSelected = !isCustomService && bookingForm.jenis_layanan === srv;
                          return (
                            <button
                              key={srv}
                              type="button"
                              onClick={() => {
                                setIsCustomService(false);
                                setBookingForm({ ...bookingForm, jenis_layanan: srv });
                              }}
                              className={`p-3.5 rounded-xl border-2 text-left text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'border-accent bg-accent-subtle/50 text-ink font-bold shadow-xs ring-1 ring-accent/30'
                                  : 'border-border text-ink bg-surface-raised hover:bg-surface hover:border-accent/40 font-semibold'
                              }`}
                            >
                              <span>{srv}</span>
                              {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomService(true);
                            setBookingForm({
                              ...bookingForm,
                              jenis_layanan: customServiceText.trim() || 'Perbaikan Kustom',
                            });
                          }}
                          className={`p-3.5 rounded-xl border-2 text-left text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isCustomService
                              ? 'border-accent bg-accent-subtle/50 text-ink font-bold shadow-xs ring-1 ring-accent/30'
                              : 'border-dashed border-accent/60 text-accent hover:bg-accent-subtle/40 font-bold bg-surface-raised'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Plus className="w-4 h-4" /> Lainnya / Perbaikan Kustom (Ketik Sendiri)
                          </span>
                          <Edit3 className="w-4 h-4 shrink-0" />
                        </button>
                      </div>

                      {isCustomService && (
                        <div className="p-4 rounded-xl bg-accent-subtle/30 border border-accent/40 space-y-1.5">
                          <label className="block text-xs font-bold text-ink">
                            Tuliskan Jenis Layanan / Perbaikan Kustom Anda: <span className="text-status-red">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            autoFocus
                            placeholder="Contoh: Perbaikan Hidrolik Dump Truk, Las Bak, Spooring Truk, Servis AC..."
                            value={customServiceText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomServiceText(val);
                              setBookingForm({ ...bookingForm, jenis_layanan: val.trim() || 'Perbaikan Kustom' });
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-accent/50 text-xs focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised font-bold text-ink"
                          />
                          <p className="text-xs text-ink-muted">
                            Tulis jenis pekerjaan atau modifikasi khusus yang dibutuhkan kendaraan Anda.
                          </p>
                        </div>
                      )}

                      <div className="mt-3">
                        <label className="block text-xs font-bold text-ink mb-1.5">Jelaskan Keluhan Kendaraan:</label>
                        <textarea
                          rows={3}
                          value={bookingForm.keluhan}
                          onChange={(e) => setBookingForm({ ...bookingForm, keluhan: e.target.value })}
                          placeholder="Contoh: Rem bunyi saat pengereman dan tarikan mesin agak berat..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:border-accent focus:outline-hidden bg-surface-raised text-ink font-medium leading-relaxed"
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'jadwal',
                  label: 'Tanggal & Waktu',
                  content: (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-ink mb-1.5">
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
                            label="Pilih Jam Kedatangan (Slot)"
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
                  ),
                },
                {
                  id: 'konfirmasi',
                  label: 'Konfirmasi',
                  content: (
                    <div className="space-y-4">
                      <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border text-xs space-y-3">
                        <div className="font-bold text-sm text-ink border-b border-border pb-2.5 flex items-center justify-between">
                          <span>Ringkasan Pemesanan Booking Service</span>
                          <span className="px-2.5 py-0.5 rounded-md bg-accent-subtle text-accent text-xs font-bold border border-accent/20">Siap Konfirmasi</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                          <span className="text-ink-muted font-medium">Kendaraan:</span>
                          <span className="font-mono font-black text-ink text-sm bg-surface-raised px-2.5 py-0.5 rounded-md border border-border">
                            {formatPlat(bookingForm.no_polisi)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                          <span className="text-ink-muted font-medium">Jenis Layanan:</span>
                          <span className="font-bold text-ink">{bookingForm.jenis_layanan}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                          <span className="text-ink-muted font-medium">Jadwal Masuk:</span>
                          <span className="font-mono font-bold text-accent">{bookingForm.tanggal_booking} • Pukul {bookingForm.jam_booking} WIB</span>
                        </div>
                        <div className="pt-2 text-ink-muted">
                          <span className="font-bold text-ink block mb-1">Catatan Keluhan:</span>
                          <p className="text-ink font-medium leading-relaxed bg-surface-raised p-2.5 rounded-xl border border-border">
                            {bookingForm.keluhan || 'Tidak ada catatan keluhan khusus.'}
                          </p>
                        </div>
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
                <Truck className="w-5 h-5 text-accent" />
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
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-md shadow-accent/20 transition-all shrink-0 ${
                !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin' : undefined}
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kendaraan</span>
            </button>
          </div>

          {/* Pencarian kendaraan */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={armadaSearch}
              onChange={(e) => setArmadaSearch(e.target.value)}
              placeholder="Cari no. polisi, merk, model..."
              aria-label="Cari kendaraan"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-surface-raised text-xs text-ink placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-hidden"
            />
            {armadaSearch && (
              <button
                type="button"
                onClick={() => setArmadaSearch('')}
                aria-label="Bersihkan pencarian kendaraan"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {armadaRows.length > 0 ? (
            <>
            <div className="space-y-3.5">
              {armadaRows.map((k) => {
                const sedangDiBengkel = isKendaraanInBengkel(k.no_polisi);
                return (
                  <div
                    key={k.id}
                    className="bg-surface-raised rounded-2xl border border-border p-4 sm:p-5 hover:border-accent/40 hover:shadow-xs transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6"
                  >
                    {/* Left: Thumbnail & Identitas Utama */}
                    <div className="flex items-start sm:items-center gap-4 min-w-[240px] sm:min-w-[280px]">
                      {k.foto_kendaraan ? (
                        <div
                          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-surface border border-border shrink-0 cursor-pointer group/thumb"
                          onClick={() =>
                            setPreviewImage({
                              url: k.foto_kendaraan!,
                              title: formatPlat(k.no_polisi),
                              subtitle: `${k.merk} ${k.model} • ${k.jenis_armada || 'Truk'} (${k.tahun || '-'})`,
                            })
                          }
                          title="Klik untuk memperbesar foto unit"
                        >
                          <img
                            src={k.foto_kendaraan}
                            alt={formatPlat(k.no_polisi)}
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-surface border border-dashed border-border flex flex-col items-center justify-center gap-1 shrink-0 text-ink-subtle cursor-pointer hover:border-accent hover:text-accent transition-colors"
                          onClick={() => {
                            setEditArmadaForm({
                              jenis_armada: k.jenis_armada || 'Truk',
                              merk: k.merk || '',
                              model: k.model || '',
                              tahun: k.tahun || new Date().getFullYear(),
                              no_rangka: k.no_rangka || '',
                              no_mesin: k.no_mesin || '',
                              asuransi: k.asuransi || '',
                              masa_berlaku_asuransi: k.masa_berlaku_asuransi ? String(k.masa_berlaku_asuransi).slice(0, 10) : '',
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

                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm tracking-wider text-ink bg-surface px-2.5 py-1 rounded-lg border border-border">
                            {formatPlat(k.no_polisi)}
                          </span>
                          {sedangDiBengkel ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-status-amber-bg text-status-amber border border-status-amber/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-amber animate-pulse" />
                              Sedang di Bengkel
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-status-green-bg text-status-green border border-status-green/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-green" />
                              Aktif
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-ink truncate">
                          {k.merk} {k.model}
                        </h3>
                        <p className="text-[11px] text-ink-muted">
                          {k.jenis_armada || 'Truk'} • Pemilik: {k.nama_pemilik || currentUser || 'Perusahaan'}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Spesifikasi Teknis Kolom */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs py-2 sm:py-0 border-y sm:border-y-0 sm:border-l border-border/70 sm:pl-6 flex-1 min-w-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-ink-muted w-20 shrink-0">Jenis:</span>
                          <span className="font-medium text-ink truncate">{k.jenis_armada || 'Truk'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-ink-muted w-20 shrink-0">Tahun:</span>
                          <span className="font-medium text-ink truncate">{k.tahun || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-ink-muted w-20 shrink-0">No. Rangka:</span>
                          <span className="font-mono font-medium text-ink truncate" title={k.no_rangka || '-'}>
                            {k.no_rangka || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-ink-muted w-20 shrink-0">No. Mesin:</span>
                          <span className="font-mono font-medium text-ink truncate" title={k.no_mesin || '-'}>
                            {k.no_mesin || '-'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-ink-muted w-24 shrink-0">Asuransi:</span>
                          <span className="font-medium text-ink truncate">{k.asuransi || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-ink-muted w-24 shrink-0">Masa Berlaku:</span>
                          <span className="font-mono font-medium text-ink truncate">
                            {k.masa_berlaku_asuransi ? String(k.masa_berlaku_asuransi).slice(0, 10) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons (Booking, Edit, Hapus) */}
                    <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0">
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
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors ${
                          !isVerifiedByAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        title={!isVerifiedByAdmin ? 'Akun belum terverifikasi oleh admin' : undefined}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Booking Service</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditArmadaForm({
                            jenis_armada: k.jenis_armada || 'Truk',
                            merk: k.merk || '',
                            model: k.model || '',
                            tahun: k.tahun || new Date().getFullYear(),
                            no_rangka: k.no_rangka || '',
                            no_mesin: k.no_mesin || '',
                            asuransi: k.asuransi || '',
                            masa_berlaku_asuransi: k.masa_berlaku_asuransi ? String(k.masa_berlaku_asuransi).slice(0, 10) : '',
                            foto_kendaraan: k.foto_kendaraan || '',
                          });
                          setEditArmadaData(k);
                        }}
                        className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-raised hover:border-accent hover:text-accent text-ink-muted transition-colors cursor-pointer"
                        aria-label={`Edit unit ${k.no_polisi}`}
                        title="Edit spesifikasi unit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHapusArmadaTarget(k)}
                        className="p-2 rounded-xl border border-border bg-surface hover:bg-status-red-bg hover:border-status-red/40 hover:text-status-red text-ink-muted transition-colors cursor-pointer"
                        aria-label={`Hapus unit ${k.no_polisi}`}
                        title="Hapus unit kendaraan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                onClick={() => setOpenTambahArmadaModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Daftarkan Unit Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* MENU 4: DOKUMEN SAYA — berkas kendaraan + faktur otomatis (service & beli part) */}
      {fleetMenu === 'dokumen' && (
        <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Dokumen Saya</h2>
              <p className="text-xs text-ink-muted">Berkas legalitas kendaraan (STNK, BPKB, KIR, Asuransi)</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (myKendaraanList.length > 0) {
                  setDokumenForm(prev => ({ ...prev, no_polisi: myKendaraanList[0].no_polisi }));
                }
                setOpenTambahDokumenModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Dokumen Baru</span>
            </button>
          </div>

          {/* Filter kendaraan (plat nomor) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            <div className="relative sm:max-w-xs w-full">
              <Search className="w-4 h-4 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={dokumenFilterPlat}
                onChange={(e) => setDokumenFilterPlat(e.target.value)}
                aria-label="Filter dokumen per kendaraan"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-surface-raised text-xs text-ink focus:ring-2 focus:ring-accent focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="">Semua Kendaraan</option>
                {myKendaraanList.map((k) => (
                  <option key={k.id} value={k.no_polisi}>
                    {formatPlat(k.no_polisi)} — {k.merk} {k.model}
                  </option>
                ))}
              </select>
            </div>
            {dokumenFilterPlat && (
              <button
                type="button"
                onClick={() => setDokumenFilterPlat('')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-ink-muted hover:text-ink rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>

          {dokumenRows.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-ink-muted border-y border-border">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Nama Dokumen</th>
                      <th className="py-2.5 px-3 font-semibold">Jenis</th>
                      <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                      <th className="py-2.5 px-3 font-semibold">Masa Berlaku</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dokumenRows.map((item) => (
                      <tr key={`doc-${item.id}`} className="hover:bg-surface transition-colors">
                        <td className="py-3 px-3 font-semibold text-ink">{item.nama_dokumen}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-surface text-ink-muted">
                            {item.jenis_dokumen}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-ink">{formatPlat(item.no_polisi)}</td>
                        <td className="py-3 px-3 text-ink-muted font-mono">
                          {item.masa_berlaku ? new Date(item.masa_berlaku).toLocaleDateString('id-ID') : '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-accent-subtle text-accent hover:bg-accent hover:text-white rounded-xl text-xs font-bold transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Unduh
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: stacked card list (pengganti tabel di layar < md) */}
              <div className="block md:hidden space-y-2.5">
                {dokumenRows.map((item) => (
                  <div key={`doc-${item.id}`} className="rounded-xl border border-border p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-ink leading-snug">{item.nama_dokumen}</div>
                        <div className="font-mono text-xs font-bold text-ink-muted mt-0.5">{formatPlat(item.no_polisi)}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-bold shrink-0 bg-surface text-ink-muted">
                        {item.jenis_dokumen}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between text-xs text-ink-subtle">
                      <span>Masa Berlaku</span>
                      <span className="font-mono font-semibold text-ink-muted">
                        {item.masa_berlaku ? new Date(item.masa_berlaku).toLocaleDateString('id-ID') : '-'}
                      </span>
                    </div>

                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-accent-subtle text-accent active:bg-accent rounded-xl text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Dokumen
                    </a>
                  </div>
                ))}
              </div>

              <PaginationBar
                page={dokumenSafePage}
                totalPages={dokumenTotalPages}
                totalRecords={dokumenTerfilterList.length}
                limit={dokumenLimit}
                label="dokumen"
                onPageChange={setDokumenPage}
                onLimitChange={(l) => setDokumenLimit(l)}
              />
            </>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-xl bg-surface space-y-3">
              <div className="w-12 h-12 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mx-auto">
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
                onClick={() => {
                  if (myKendaraanList.length > 0) {
                    setDokumenForm(prev => ({ ...prev, no_polisi: myKendaraanList[0].no_polisi }));
                  }
                  setOpenTambahDokumenModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Unggah Dokumen Baru
              </button>
            </div>
          )}
        </div>
      )}

      {/* MENU 5: PROFIL CUSTOMER & KONTAK — editable, tersimpan di tabel pengguna */}
      {fleetMenu === 'profil' && (
        <div className="bg-surface-raised rounded-xl border border-border p-6 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-border pb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">Profil Customer & Kontak</h2>
              <p className="text-xs text-ink-muted">Informasi perusahaan dan kontak PIC penanggung jawab — dapat diperbarui langsung di sini</p>
            </div>
            {!profilEditing && (
              <button
                type="button"
                onClick={() => {
                  setProfilForm({
                    nama_perusahaan: authUser?.nama_lengkap || '',
                    alamat: authUser?.alamat || '',
                    npwp: authUser?.npwp || '',
                    no_telepon: authUser?.no_telepon || '',
                    nama_pic: authUser?.nama_pic || '',
                  });
                  setProfilEditing(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent-subtle text-accent hover:bg-accent hover:text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profil
              </button>
            )}
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
              <span className="font-bold text-ink block text-sm">Informasi Perusahaan:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-ink-subtle block text-xs mb-1">Nama Perusahaan / Entitas:</span>
                  {profilEditing ? (
                    <input
                      value={profilForm.nama_perusahaan}
                      onChange={(e) => setProfilForm((p) => ({ ...p, nama_perusahaan: e.target.value }))}
                      placeholder="cth: PT. Andi Jaya"
                      className="w-full px-3 py-2 bg-surface-raised border border-border rounded-xl text-xs text-ink placeholder-ink-subtle/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition"
                    />
                  ) : (
                    <span className="font-bold text-ink">{authUser?.nama_perusahaan || authUser?.nama_lengkap || currentUser || '-'}</span>
                  )}
                </div>
                <div>
                  <span className="text-ink-subtle block text-xs">ID Pelanggan / Kemitraan:</span>
                  <span className="font-mono font-bold text-accent">KIM3-CUST-{String(myPelangganId || authUser?.id_pelanggan || authUser?.id || 1).padStart(4, '0')}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-ink-subtle block text-xs mb-1">Alamat Perusahaan:</span>
                  {profilEditing ? (
                    <textarea
                      value={profilForm.alamat}
                      onChange={(e) => setProfilForm((p) => ({ ...p, alamat: e.target.value }))}
                      rows={2}
                      placeholder="cth: Jl. Industri Raya No. 88, Medan, Sumatera Utara"
                      className="w-full px-3 py-2 bg-surface-raised border border-border rounded-xl text-xs text-ink placeholder-ink-subtle/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition resize-none"
                    />
                  ) : (
                    <span className="font-semibold text-ink">{authUser?.alamat || '-'}</span>
                  )}
                </div>
                <div>
                  <span className="text-ink-subtle block text-xs mb-1">NPWP:</span>
                  {profilEditing ? (
                    <input
                      value={profilForm.npwp}
                      onChange={(e) => setProfilForm((p) => ({ ...p, npwp: e.target.value }))}
                      placeholder="cth: 01.234.567.8-901.000"
                      className="w-full px-3 py-2 bg-surface-raised border border-border rounded-xl text-xs text-ink placeholder-ink-subtle/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition"
                    />
                  ) : (
                    <span className="font-mono font-semibold text-ink">{authUser?.npwp || '-'}</span>
                  )}
                </div>
                <div>
                  <span className="text-ink-subtle block text-xs">Status Verifikasi Admin:</span>
                  {isVerifiedByAdmin ? (
                    <span className="font-semibold text-status-green inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Terverifikasi oleh Admin
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-600 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Belum Terverifikasi oleh Admin
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
              <span className="font-bold text-ink block text-sm">Kontak PIC / Penanggung Jawab:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-ink-subtle block text-xs mb-1">Nama PIC:</span>
                  {profilEditing ? (
                    <input
                      value={profilForm.nama_pic}
                      onChange={(e) => setProfilForm((p) => ({ ...p, nama_pic: e.target.value }))}
                      placeholder="cth: Budi Santoso"
                      className="w-full px-3 py-2 bg-surface-raised border border-border rounded-xl text-xs text-ink placeholder-ink-subtle/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition"
                    />
                  ) : (
                    <span className="font-bold text-ink">{authUser?.nama_pic || '-'}</span>
                  )}
                </div>
                <div>
                  <span className="text-ink-subtle block text-xs mb-1">No. Telepon / WhatsApp:</span>
                  {profilEditing ? (
                    <input
                      value={profilForm.no_telepon}
                      onChange={(e) => setProfilForm((p) => ({ ...p, no_telepon: e.target.value }))}
                      placeholder="cth: 0812-3456-7890"
                      className="w-full px-3 py-2 bg-surface-raised border border-border rounded-xl text-xs text-ink placeholder-ink-subtle/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition"
                    />
                  ) : (
                    <span className="font-semibold text-ink">{authUser?.no_telepon || '-'}</span>
                  )}
                </div>
                <div>
                  <span className="text-ink-subtle block text-xs">Email Login:</span>
                  <span className="font-mono font-semibold text-ink">{authUser?.email || '-'}</span>
                </div>
                <div>
                  <span className="text-ink-subtle block text-xs">Tipe Akun:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Mitra Fleet</span>
                </div>
              </div>
            </div>
          </div>

          {profilEditing && (
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end border-t border-border pt-4">
              <button
                type="button"
                disabled={simpanProfilMutation.isPending}
                onClick={() => setProfilEditing(false)}
                className="min-h-[40px] px-4 py-2 bg-surface border border-border text-ink-muted hover:text-ink rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={simpanProfilMutation.isPending || !profilForm.nama_perusahaan.trim()}
                onClick={() => simpanProfilMutation.mutate()}
                className="min-h-[40px] px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
              >
                {simpanProfilMutation.isPending ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {simpanProfilMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* MENU 6: HISTORY SERVICE */}
      {fleetMenu === 'history' && (
        <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Riwayat Kendaraan (History)</h2>
              <p className="text-xs text-ink-muted">Seluruh riwayat pengerjaan service unit kendaraan operasional Anda di Bengkel KIM 3</p>
            </div>
            <FilterChips
              options={[
                { id: 'semua', label: 'Semua', count: mySpkList.length },
                { id: 'sedang-diservis', label: 'Sedang Diservis', count: mySpkList.filter(s => s.status_spk !== 'Selesai' && s.status_spk !== 'FIR Closed').length },
                { id: 'selesai', label: 'Selesai', count: mySpkList.filter(s => s.status_spk === 'Selesai' || s.status_spk === 'FIR Closed').length },
              ]}
              selectedId={historyStatusFilter}
              onChange={(id) => setHistoryStatusFilter(id as 'semua' | 'sedang-diservis' | 'selesai')}
            />
          </div>

          {/* Pencarian riwayat (server-side lewat parameter `q`) */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Cari no. SPK, no. polisi, keluhan, atau status..."
              aria-label="Cari riwayat service"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-surface-raised text-xs text-ink placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-hidden"
            />
            {historySearch && (
              <button
                type="button"
                onClick={() => setHistorySearch('')}
                aria-label="Bersihkan pencarian riwayat"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-ink-subtle hover:text-ink transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {historyRows.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-ink-muted border-y border-border">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">No. Booking / SPK</th>
                      <th className="py-2.5 px-3 font-semibold">Kendaraan</th>
                      <th className="py-2.5 px-3 font-semibold">Layanan</th>
                      <th className="py-2.5 px-3 font-semibold">Tanggal Masuk</th>
                      <th className="py-2.5 px-3 font-semibold">Biaya</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyRows.map((spk) => (
                      <tr key={spk.id} onClick={() => setHistoryDetail(spk)} className="hover:bg-surface transition-colors cursor-pointer">
                        <td className="py-3 px-3 font-mono font-bold text-accent">{spk.no_spk}</td>
                        <td className="py-3 px-3 font-mono font-bold text-ink">{formatPlat(spk.no_polisi)}</td>
                        <td className="py-3 px-3 text-ink-muted">{spk.keluhan_customer}</td>
                        <td className="py-3 px-3 font-mono text-ink-muted">{new Date(spk.created_at).toLocaleDateString('id-ID')}</td>
                        <td className="py-3 px-3 font-mono font-bold text-ink">Rp {Number(spk.estimasi_biaya || 0).toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={spk.status_spk} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHistoryDetail(spk);
                            }}
                            title={`Lihat detail tracking ${spk.no_spk}`}
                            aria-label={`Lihat detail tracking ${spk.no_spk}`}
                            className="p-2 rounded-xl border border-border bg-surface-raised text-ink-muted hover:text-accent hover:border-accent/40 transition-colors inline-flex items-center gap-1.5 font-bold text-xs"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="hidden xl:inline">Detail</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: stacked card list (pengganti tabel di layar < md) */}
              <div className="block md:hidden space-y-2.5">
                {historyRows.map((spk) => (
                  <div key={spk.id} onClick={() => setHistoryDetail(spk)} className="rounded-xl border border-border p-3.5 cursor-pointer hover:border-accent/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-accent">{spk.no_spk}</div>
                        <div className="text-base font-black font-mono text-ink mt-0.5">{formatPlat(spk.no_polisi)}</div>
                      </div>
                      <StatusBadge status={spk.status_spk} size="sm" />
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-border space-y-1.5">
                      <p className="text-xs text-ink-muted leading-relaxed">{spk.keluhan_customer}</p>
                      <div className="flex items-center justify-between text-xs text-ink-subtle">
                        <span>Tanggal Masuk</span>
                        <span className="font-mono font-semibold text-ink-muted">
                          {new Date(spk.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-ink-subtle">
                        <span>Biaya</span>
                        <span className="font-mono font-bold text-ink">
                          Rp {Number(spk.estimasi_biaya || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryDetail(spk);
                      }}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-surface-raised hover:border-accent/40 text-ink-muted hover:text-accent font-bold text-xs transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Lihat Detail Service
                    </button>
                  </div>
                ))}
              </div>

              <PaginationBar
                page={historySafePage}
                totalPages={historyTotalPages}
                totalRecords={historyFiltered.length}
                limit={historyLimit}
                label="riwayat service"
                onPageChange={setHistoryPage}
                onLimitChange={(l) => {
                  setHistoryLimit(l);
                  setHistoryPage(1);
                }}
              />
            </>
          ) : historySearch.trim() ? (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-xl bg-surface space-y-3">
              <div className="w-12 h-12 rounded-xl bg-surface-raised text-ink-subtle flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Riwayat Tidak Ditemukan</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Tidak ada riwayat service yang cocok dengan pencarian{' '}
                  <span className="font-semibold text-ink">"{historySearch}"</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistorySearch('')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-subtle text-accent text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" /> Bersihkan Pencarian
              </button>
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-xl bg-surface space-y-3">
              <div className="w-12 h-12 rounded-xl bg-accent-subtle text-accent flex items-center justify-center mx-auto">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">
                  {historyStatusFilter === 'sedang-diservis'
                    ? 'Tidak Ada Unit Sedang Diservis'
                    : historyStatusFilter === 'selesai'
                    ? 'Belum Ada Riwayat Selesai'
                    : 'Belum Ada Riwayat Service'}
                </h3>
                <p className="text-xs text-ink-muted mt-1">
                  {historyStatusFilter === 'sedang-diservis'
                    ? 'Saat ini seluruh kendaraan Anda beroperasi prima dan tidak ada unit yang sedang dalam proses pengerjaan di bengkel.'
                    : 'Seluruh riwayat pengerjaan service kendaraan Anda di Bengkel KIM 3 akan tercatat dan dapat ditinjau di sini.'}
                </p>
              </div>
            </div>
          )}


        </div>
      )}

      {/* MODAL: Detail SPK Tracking (untuk Dashboard & History) */}
      <DetailModal
        open={!!historyDetail}
        onClose={() => setHistoryDetail(null)}
        title={historyDetail ? `Detail Service ${historyDetail.no_spk}` : 'Detail Service'}
        subtitle={historyDetail ? `${formatPlat(historyDetail.no_polisi)} • ${historyDetail.keluhan_customer || ''}` : undefined}
        badge={historyDetail ? <StatusBadge status={historyDetail.status_spk} /> : undefined}
        size="xl"
      >
        {historyDetail && (
          <SpkTrackingDetail
            spk={historyDetail}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 sm:py-8 md:py-10 bg-black/60 backdrop-blur-xs app-backdrop-in">
            <div className="bg-surface-raised rounded-2xl border border-border shadow-2xl max-w-xl w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden app-modal-in my-auto">
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-border flex items-center justify-between bg-surface shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Tambah Unit Kendaraan Baru</h3>
                  <p className="text-xs text-ink-muted">Daftarkan kendaraan operasional ke database Bengkel KIM 3</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenTambahArmadaModal(false)}
                className="p-1.5 rounded-xl text-ink-subtle hover:text-ink-muted hover:bg-surface transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!armadaForm.no_polisi.trim()) {
                  toast.warning('Nomor Polisi wajib diisi.');
                  return;
                }
                tambahArmadaMutation.mutate(armadaForm);
              }}
              className="px-6 sm:px-8 py-6 sm:py-7 overflow-y-auto space-y-5 flex-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">
                    No. Polisi <span className="text-status-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BK 9999 XX"
                    value={armadaForm.no_polisi}
                    onChange={(e) => setArmadaForm({ ...armadaForm, no_polisi: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">
                    Jenis Kendaraan <span className="text-status-red">*</span>
                  </label>
                  <select
                    value={armadaForm.jenis_armada}
                    onChange={(e) => setArmadaForm({ ...armadaForm, jenis_armada: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised"
                  >
                    <option value="Truk">Truk Engkel / Box</option>
                    <option value="Tronton">Tronton / Wingbox</option>
                    <option value="Trailer">Trailer / Kontainer</option>
                    <option value="Pick Up">Pick Up Operasional</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Merk</label>
                  <select
                    value={armadaForm.merk}
                    onChange={(e) => setArmadaForm({ ...armadaForm, merk: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised"
                  >
                    <option value="">-- Pilih Merk --</option>
                    <option value="Hino">Hino</option>
                    <option value="Mitsubishi Fuso">Mitsubishi Fuso</option>
                    <option value="Isuzu">Isuzu</option>
                    <option value="Toyota Dyna">Toyota Dyna</option>
                    <option value="Mercedes-Benz">Mercedes-Benz</option>
                    <option value="Volvo">Volvo</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Model / Seri</label>
                  <input
                    type="text"
                    placeholder="Contoh: Dutro 130HD"
                    value={armadaForm.model}
                    onChange={(e) => setArmadaForm({ ...armadaForm, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Tahun Pembuatan</label>
                  <input
                    type="number"
                    min="1995"
                    max={new Date().getFullYear() + 1}
                    value={armadaForm.tahun}
                    onChange={(e) => setArmadaForm({ ...armadaForm, tahun: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Nomor Rangka (VIN)</label>
                  <input
                    type="text"
                    placeholder="MHKHINO..."
                    value={armadaForm.no_rangka}
                    onChange={(e) => setArmadaForm({ ...armadaForm, no_rangka: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Nomor Mesin</label>
                  <input
                    type="text"
                    placeholder="J08E-..."
                    value={armadaForm.no_mesin}
                    onChange={(e) => setArmadaForm({ ...armadaForm, no_mesin: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Nama Asuransi (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Asuransi Astra / Sinarmas"
                    value={armadaForm.asuransi}
                    onChange={(e) => setArmadaForm({ ...armadaForm, asuransi: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Masa Berlaku Asuransi</label>
                  <input
                    type="date"
                    value={armadaForm.masa_berlaku_asuransi}
                    onChange={(e) => setArmadaForm({ ...armadaForm, masa_berlaku_asuransi: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <PhotoUploader
                  label="Foto Unit Kendaraan (Opsional)"
                  value={armadaForm.foto_kendaraan}
                  onChange={(url) => setArmadaForm({ ...armadaForm, foto_kendaraan: url })}
                />
                <p className="text-xs text-ink-subtle mt-1">
                  Foto tersimpan otomatis ke database (kompresi otomatis, maks. 15MB). Tampil di daftar kendaraan setelah unit disimpan.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpenTambahArmadaModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-ink-muted hover:bg-surface transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={tambahArmadaMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-md shadow-accent/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tambahArmadaMutation.isPending ? 'Menyimpan...' : 'Simpan Unit Kendaraan'}</span>
                </button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 sm:py-8 md:py-10 bg-black/60 backdrop-blur-xs app-backdrop-in">
            <div className="bg-surface-raised rounded-2xl border border-border shadow-2xl max-w-lg w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden app-modal-in my-auto">
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-border flex items-center justify-between bg-surface shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Unggah Dokumen Digital Kendaraan</h3>
                  <p className="text-xs text-ink-muted">Simpan arsip STNK, KIR, BPKB, atau polis asuransi unit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenTambahDokumenModal(false)}
                className="p-1.5 rounded-xl text-ink-subtle hover:text-ink-muted hover:bg-surface transition cursor-pointer"
              >
                <X className="w-5 h-5" />
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
              className="px-6 sm:px-8 py-6 sm:py-7 overflow-y-auto space-y-5 flex-1"
            >
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  Pilih Unit Kendaraan <span className="text-status-red">*</span>
                </label>
                <select
                  required
                  value={dokumenForm.no_polisi}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, no_polisi: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised"
                >
                  <option value="">-- Pilih Nomor Polisi --</option>
                  {myKendaraanList.map((k) => (
                    <option key={k.id} value={k.no_polisi}>
                      {formatPlat(k.no_polisi)} — {k.merk} {k.model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">
                    Jenis Dokumen <span className="text-status-red">*</span>
                  </label>
                  <select
                    value={dokumenForm.jenis_dokumen}
                    onChange={(e) => setDokumenForm({ ...dokumenForm, jenis_dokumen: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised"
                  >
                    <option value="STNK">STNK (Pajak Tahunan / 5 Tahunan)</option>
                    <option value="KIR">KIR (Uji Berkala Dishub)</option>
                    <option value="BPKB">BPKB Unit</option>
                    <option value="Asuransi">Polis Asuransi All Risk / TLO</option>
                    <option value="Izin Usaha">Izin Usaha Angkutan / Dishub</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Masa Berlaku Dokumen</label>
                  <input
                    type="date"
                    value={dokumenForm.masa_berlaku}
                    onChange={(e) => setDokumenForm({ ...dokumenForm, masa_berlaku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  Nama Dokumen / Keterangan Berkas <span className="text-status-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: STNK Pajak Berlaku s/d Mei 2027"
                  value={dokumenForm.nama_dokumen}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, nama_dokumen: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Catatan nomor seri atau barcode dokumen"
                  value={dokumenForm.keterangan}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-hidden"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpenTambahDokumenModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-ink-muted hover:bg-surface transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={tambahDokumenMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-md shadow-accent/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tambahDokumenMutation.isPending ? 'Menyimpan...' : 'Simpan Dokumen'}</span>
                </button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 sm:py-8 md:py-10 bg-black/60 backdrop-blur-xs app-backdrop-in">
            <div className="bg-surface-raised rounded-2xl border border-border shadow-2xl max-w-xl w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden app-modal-in my-auto">
            {/* Modal Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-border flex items-center justify-between bg-surface shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Edit Unit Kendaraan</h3>
                  <p className="text-xs text-ink-muted font-mono">{formatPlat(editArmadaData.no_polisi)} — No. polisi tidak dapat diubah</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditArmadaData(null)}
                className="p-1.5 rounded-xl text-ink-subtle hover:text-ink-muted hover:bg-surface transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                editArmadaMutation.mutate(editArmadaForm);
              }}
              className="px-6 sm:px-8 py-6 sm:py-7 overflow-y-auto space-y-5 flex-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Jenis Kendaraan</label>
                  <select
                    value={editArmadaForm.jenis_armada}
                    onChange={(e) => setEditArmadaForm({ ...editArmadaForm, jenis_armada: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised"
                  >
                    <option value="Truk">Truk Engkel / Box</option>
                    <option value="Tronton">Tronton / Wingbox</option>
                    <option value="Trailer">Trailer / Kontainer</option>
                    <option value="Pick Up">Pick Up Operasional</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Tahun Pembuatan</label>
                  <input
                    type="number"
                    min="1995"
                    max={new Date().getFullYear() + 1}
                    value={editArmadaForm.tahun}
                    onChange={(e) => setEditArmadaForm({ ...editArmadaForm, tahun: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Merk</label>
                  <select
                    value={editArmadaForm.merk}
                    onChange={(e) => setEditArmadaForm({ ...editArmadaForm, merk: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised"
                  >
                    <option value="">-- Pilih Merk --</option>
                    <option value="Hino">Hino</option>
                    <option value="Mitsubishi Fuso">Mitsubishi Fuso</option>
                    <option value="Isuzu">Isuzu</option>
                    <option value="Toyota Dyna">Toyota Dyna</option>
                    <option value="Mercedes-Benz">Mercedes-Benz</option>
                    <option value="Volvo">Volvo</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Model / Seri</label>
                  <input
                    type="text"
                    placeholder="Contoh: Dutro 130HD"
                    value={editArmadaForm.model}
                    onChange={(e) => setEditArmadaForm({ ...editArmadaForm, model: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Nomor Rangka (VIN)</label>
                  <input
                    type="text"
                    placeholder="MHKHINO..."
                    value={editArmadaForm.no_rangka}
                    onChange={(e) => setEditArmadaForm({ ...editArmadaForm, no_rangka: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Nomor Mesin</label>
                  <input
                    type="text"
                    placeholder="J08E-..."
                    value={editArmadaForm.no_mesin}
                    onChange={(e) => setEditArmadaForm({ ...editArmadaForm, no_mesin: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Nama Asuransi</label>
                  <input
                    type="text"
                    placeholder="Asuransi Astra / Sinarmas"
                    value={editArmadaForm.asuransi}
                    onChange={(e) => setEditArmadaForm({ ...editArmadaForm, asuransi: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Masa Berlaku Asuransi</label>
                  <input
                    type="date"
                    value={editArmadaForm.masa_berlaku_asuransi}
                    onChange={(e) => setEditArmadaForm({ ...editArmadaForm, masa_berlaku_asuransi: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <PhotoUploader
                  label="Foto Unit Kendaraan"
                  value={editArmadaForm.foto_kendaraan}
                  onChange={(url) => setEditArmadaForm({ ...editArmadaForm, foto_kendaraan: url })}
                />
                <p className="text-xs text-ink-subtle mt-1">
                  Biarkan kosong bila tidak ingin mengganti foto. Foto baru otomatis tersimpan ke database.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditArmadaData(null)}
                  className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-ink-muted hover:bg-surface transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editArmadaMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-md shadow-accent/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editArmadaMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
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
          message={`Unit ${formatPlat(hapusArmadaTarget.no_polisi)} (${hapusArmadaTarget.merk || '-'} ${hapusArmadaTarget.model || '-'}) akan dihapus permanen dari daftar kendaraan Anda. Riwayat service & faktur tetap tersimpan.`}
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
