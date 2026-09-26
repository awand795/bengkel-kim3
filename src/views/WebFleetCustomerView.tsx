import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, normalizePlat, getApiErrorMessage } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { Kendaraan, BookingService, SpkService, InvoicePembayaran, SpkItemPekerjaan, SpkItemPart, DokumenKendaraan, PekerjaanTambahan, PurchaseRequestPart } from '../types';
import { PaginationBar } from '../components/common/PaginationBar';
import { PrintThermalInvoiceModal } from '../components/print/PrintThermalInvoiceModal';
import { useAppStore } from '../store/useAppStore';
import { usePpnRate } from '../hooks/usePpnRate';
import { realtimeHub } from '../services/realtimeService';
import { ModalPortal } from '../components/common/ModalPortal';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { toast } from '../components/common/Toast';
import { TimePickerInput } from '../components/common/TimePickerInput';
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
  Eye,
  Printer,
  ArrowLeft
} from 'lucide-react';

interface WebFleetCustomerViewProps {
  initialMenu?: 'dashboard' | 'booking' | 'status' | 'history' | 'kendaraan' | 'dokumen' | 'profil';
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

  // Filter detail pekerjaan, part, dan dokumen armada aktif
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

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-surface-raised hover:bg-surface text-ink font-bold text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Riwayat
        </button>
      )}
          
            {/* Active Card */}
            <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-surface text-ink-muted flex items-center justify-center font-black text-sm">
                    🚚
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-ink">{spk.no_polisi}</h2>
                      <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent text-[10px] font-bold">Service Berjalan</span>
                    </div>
                    <p className="text-xs text-ink-muted font-semibold">{spk.nama_customer || '-'} | {spk.no_spk}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-ink-subtle block text-[10px]">Layanan:</span>
                    <span className="text-ink">{spk.jenis_layanan || 'Service Kendaraan'}</span>
                  </div>
                  <div>
                    <span className="text-ink-subtle block text-[10px]">Waktu Check In:</span>
                    <span className="text-ink">{spk.created_at ? new Date(spk.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}</span>
                  </div>
                  <div>
                    <span className="text-ink-subtle block text-[10px]">Estimasi Selesai (ETA):</span>
                    <span className="text-accent font-bold">{spk.estimasi_waktu_jam ? `${spk.estimasi_waktu_jam} Jam` : `${spk.lead_time_jam || '-'} Jam`}</span>
                  </div>
                </div>
              </div>

              {/* Banner Menunggu Part: bahasa ramah customer, data live (part + ETA) */}
              {spk.status_spk === 'Waiting Part' && (
                <div className="mt-4 p-4 sm:p-5 rounded-md border-2 border-status-amber/50 bg-status-amber-bg text-status-amber shadow-xs space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-md bg-status-amber/30 text-status-amber flex items-center justify-center font-bold text-lg shrink-0">
                      📦
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-status-amber">
                          Armada Menunggu Sparepart
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-status-amber/30 text-status-amber text-[10px] font-black animate-pulse">
                          Estimasi Menyusul
                        </span>
                      </div>
                      <span className="text-[11px] text-status-amber font-semibold">
                        Suku cadang sedang kosong dan sudah kami pesankan — pengerjaan lanjut otomatis saat barang tiba.
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-status-amber leading-relaxed font-medium">
                    Unit {spk.no_polisi} dijeda sementara karena memerlukan suku cadang yang sedang dalam
                    proses pengadaan. Bapak/Ibu tidak perlu melakukan apa pun — estimasi waktu selesai akan
                    diperbarui otomatis di sini.
                  </p>

                  <div className="mt-2 pt-2 border-t border-status-amber/30 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface-raised/80 p-2.5 rounded-md border border-status-amber/30">
                      <span className="text-[10px] text-ink-muted block font-semibold">Suku Cadang Dipesan:</span>
                      {waitingParts.length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {waitingParts.map((w, idx) => (
                            <li key={idx} className="font-bold text-ink flex items-start justify-between gap-2">
                              <span>• {w.nama}</span>
                              <span className="text-[10px] text-status-amber font-bold whitespace-nowrap">Sedang dipesan</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="font-bold text-ink">Sedang dipesan ke distributor</span>
                      )}
                    </div>
                    <div className="bg-surface-raised/80 p-2.5 rounded-md border border-status-amber/30">
                      <span className="text-[10px] text-status-amber block font-semibold">Perkiraan Barang Tiba:</span>
                      <span className="font-mono font-bold text-status-amber">
                        {activePr?.estimasi_tanggal_ready_eta
                          ? `${activePr.estimasi_tanggal_ready_eta}${activePr.estimasi_jam_ready_eta ? ` (${activePr.estimasi_jam_ready_eta} WIB)` : ''}`
                          : 'Sedang kami konfirmasikan — progres tampil di sini otomatis'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Approval Estimasi UTAMA (Excel tahap 6, di atas stepper) */}
              {spk && ['Menunggu Approval Customer', 'Waiting Approval'].includes(spk.status_spk as string) && (
                <div className="mt-4 rounded-md border-2 border-accent/50 bg-accent-subtle/40 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-accent text-white flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-ink">
                          Estimasi Biaya & Waktu Perlu Persetujuan Anda
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-status-amber/30 text-status-amber text-[10px] font-bold animate-pulse">
                          Menunggu Approval
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-1.5 leading-relaxed font-medium">
                        Bengkel mengajukan estimasi berikut untuk {spk.no_spk} ({spk.no_polisi}).
                        Jika disetujui, Work Order resmi terbit dan mekanik mulai pengerjaan.
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-surface-raised/80 rounded-md border border-border p-2.5">
                          <span className="text-ink-subtle text-[10px] block">Total Estimasi Biaya</span>
                          <span className="font-black text-ink">
                            Rp {Number(spk.estimasi_biaya || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="bg-surface-raised/80 rounded-md border border-border p-2.5">
                          <span className="text-ink-subtle text-[10px] block">Estimasi Waktu Selesai</span>
                          <span className="font-black text-ink">
                            {spk.estimasi_waktu_jam || spk.lead_time_jam || 0} Jam
                          </span>
                        </div>
                      </div>

                      {/* PPN + Total Bayar: angka yang disetujui = angka yang ditagihkan */}
                      <div className="mt-2 bg-surface-raised/80 rounded-md border border-accent/30 p-2.5 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Subtotal:</span>
                          <span className="font-bold text-ink font-mono">Rp {approvalSubtotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">PPN{ppnRateCustomer !== null ? ` ${ppnRateCustomer}%` : ''}:</span>
                          <span className="font-bold text-ink font-mono">Rp {approvalPpn !== null ? approvalPpn.toLocaleString('id-ID') : '-'}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-border">
                          <span className="font-black text-ink">Total Bayar:</span>
                          <span className="font-black text-status-green font-mono">Rp {approvalTotal !== null ? approvalTotal.toLocaleString('id-ID') : '-'}</span>
                        </div>
                        {approvalTotal === null && (
                          <p className="text-[11px] text-status-red font-bold">
                            Tarif PPN belum diatur — tombol Setujui terkunci sampai admin mengisi Pengaturan Sistem.
                          </p>
                        )}
                      </div>

                      {activeParts.length > 0 && (
                        <div className="mt-2 bg-surface-raised/80 rounded-md border border-border p-2.5 text-xs">
                          <span className="text-ink-subtle text-[10px] block font-semibold mb-1">Rincian Sparepart</span>
                          {activeParts.map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-0.5">
                              <span className="text-ink font-medium">{p.nama_part} × {p.jumlah} {p.satuan}</span>
                              <span className="font-bold text-ink font-mono">Rp {Number(p.subtotal || 0).toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {activePekerjaan.length > 0 && (
                        <div className="mt-2 bg-surface-raised/80 rounded-md border border-border p-2.5 text-xs">
                          <span className="text-ink-subtle text-[10px] block font-semibold mb-1">Rincian Pekerjaan</span>
                          {activePekerjaan.map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-0.5">
                              <span className="text-ink font-medium">{p.nama_pekerjaan}</span>
                              <span className="font-bold text-ink font-mono">Rp {Number(p.biaya_jasa || 0).toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          disabled={decidingEstimasi || approvalTotal === null}
                          title={approvalTotal === null ? 'Tarif PPN belum diatur — hubungi bengkel' : `Setujui total Rp ${approvalTotal.toLocaleString('id-ID')}`}
                          onClick={() => onDecideEstimasi?.(spk, true)}
                          className="flex-1 min-h-[44px] py-2.5 px-4 bg-status-green hover:bg-status-green/90 disabled:opacity-60 text-white font-bold text-xs rounded-md shadow-md shadow-status-green/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Setujui Estimasi{approvalTotal !== null ? ` Rp ${approvalTotal.toLocaleString('id-ID')}` : ''}
                        </button>
                        <button
                          type="button"
                          disabled={decidingEstimasi}
                          onClick={() => onDecideEstimasi?.(spk, false)}
                          className="flex-1 min-h-[44px] py-2.5 px-4 bg-status-red hover:bg-status-red/90 disabled:opacity-60 text-white font-bold text-xs rounded-md shadow-md shadow-status-red/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" /> Tolak
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Approval Pekerjaan Tambahan (di atas stepper) */}
              {approvalTambahanList.length > 0 && (
                <div className="mt-4 space-y-3">
                  {approvalTambahanList.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-md border-2 border-status-amber/50 bg-status-amber-bg p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-md bg-status-amber-bg text-status-amber flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-status-amber">
                              Ada Pekerjaan Tambahan Perlu Persetujuan
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-status-amber/30 text-status-amber text-[10px] font-bold animate-pulse">
                              Menunggu Approval
                            </span>
                          </div>

                          <p className="text-xs text-status-amber mt-1.5 leading-relaxed font-medium">
                            {t.deskripsi_tambahan}
                          </p>
                          {t.rekomendasi_perbaikan && (
                            <p className="text-[11px] text-status-amber mt-1 italic">
                              Rekomendasi: {t.rekomendasi_perbaikan}
                            </p>
                          )}

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-surface-raised/80 rounded-md border border-status-amber/30 p-2.5">
                              <span className="text-status-amber/80 text-[10px] block">Estimasi Biaya Tambahan</span>
                              <span className="font-black text-status-amber">
                                Rp {Number(t.estimasi_biaya_tambahan || 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="bg-surface-raised/80 rounded-md border border-status-amber/30 p-2.5">
                              <span className="text-status-amber/80 text-[10px] block">Estimasi Waktu Tambahan</span>
                              <span className="font-black text-status-amber">
                                {t.estimasi_waktu_tambahan_jam || 0} Jam
                              </span>
                            </div>
                          </div>

                          {(t.diajukan_oleh_mekanik || t.diverifikasi_foreman) && (
                            <p className="text-[10px] text-status-amber mt-2">
                              {t.diajukan_oleh_mekanik ? `Diajukan mekanik: ${t.diajukan_oleh_mekanik}` : ''}
                              {t.diajukan_oleh_mekanik && t.diverifikasi_foreman ? ' • ' : ''}
                              {t.diverifikasi_foreman ? `Diverifikasi foreman: ${t.diverifikasi_foreman}` : ''}
                            </p>
                          )}

                          <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              disabled={approvingTambahan}
                              onClick={() =>
                                onApproveTambahan?.(t.id, 'Disetujui')
                              }
                              className="flex-1 min-h-[44px] py-2.5 px-4 bg-status-green hover:bg-status-green/90 disabled:opacity-60 text-white font-bold text-xs rounded-md shadow-md shadow-status-green/20 transition-all flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Setujui Pekerjaan Tambahan
                            </button>
                            <button
                              type="button"
                              disabled={approvingTambahan}
                              onClick={() =>
                                onApproveTambahan?.(t.id, 'Ditolak')
                              }
                              className="flex-1 min-h-[44px] py-2.5 px-4 bg-status-red hover:bg-status-red/90 disabled:opacity-60 text-white font-bold text-xs rounded-md shadow-md shadow-status-red/20 transition-all flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" /> Tolak
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stepper Progress Bar (image5.png Mockup 2 Stepper) */}
              <div className="py-6 px-2 overflow-x-auto">
                <div className="flex items-center justify-between min-w-[650px]">
                  {[
                    { step: 1, title: 'Check In', desc: 'Diterima Security', done: true },
                    { 
                      step: 2, 
                      title: spk.status_spk === 'Waiting Part' ? 'Waiting Part' : (spk.status_spk === 'Menunggu Approval Customer' || (spk.status_spk as string) === 'Waiting Approval') ? 'Menunggu Approval' : spk.status_spk === 'Waiting QC' ? 'Menunggu QC' : 'Proses Pekerjaan', 
                      desc: spk.status_spk === 'Waiting Part' ? 'Menunggu Part (Pending)' : (spk.status_spk === 'Menunggu Approval Customer' || (spk.status_spk as string) === 'Waiting Approval') ? 'Estimasi Diajukan' : spk.status_spk === 'Estimasi Disetujui' ? 'WO Terbit' : spk.status_spk === 'Waiting QC' ? 'Inspeksi Foreman' : spk.status_spk === 'Dalam Pengerjaan' ? 'Mekanik Aktif' : 'Selesai Dikerjakan', 
                      done: ['Estimasi Disetujui', 'Dalam Pengerjaan', 'Waiting QC', 'QC Passed', 'FIR Closed', 'Selesai'].includes(spk.status_spk as string), 
                      current: ['Waiting Part', 'Menunggu Approval Customer', 'Waiting Approval', 'Estimasi Disetujui', 'Dalam Pengerjaan', 'Waiting QC'].includes(spk.status_spk as string),
                      isWaitingPart: spk.status_spk === 'Waiting Part'
                    },
                    { step: 3, title: 'QC Passed', desc: 'Inspeksi Foreman', done: spk.status_spk === 'QC Passed' || spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai', current: spk.status_spk === 'Waiting QC' },
                    { step: 4, title: 'FIR Closed', desc: 'Final Check SA', done: spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai' },
                    { step: 5, title: 'Invoice', desc: 'Proses Kasir', done: spk.status_spk === 'Selesai' },
                    { step: 6, title: 'Check Out', desc: 'Armada Keluar', done: !!spk.waktu_check_out },
                  ].map((s, idx) => (
                    <div key={s.step} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1 text-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-all ${
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
                        <div className={`text-xs font-bold ${s.isWaitingPart ? 'text-status-red' : s.current ? 'text-accent' : 'text-ink'}`}>
                          {s.title}
                        </div>
                        <div className="text-[10px] text-ink-subtle mt-0.5">{s.desc}</div>
                      </div>
                      {idx < 5 && (
                        <div className={`h-1 flex-1 mx-2 rounded-full ${s.done ? 'bg-status-green' : 'bg-surface'}`}></div>
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
                      <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-accent-subtle text-accent">
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
                      <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-surface text-ink-muted">
                        {activeArmadaDocs.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* TAB 1: Progress Pekerjaan */}
                {subTab === 'progress' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="space-y-3 bg-surface/60 p-4 rounded-md border border-border">
                      <span className="font-bold text-ink flex items-center gap-2">
                        <Clock className="w-4 h-4 text-accent" />
                        Timeline Riwayat Aktivitas Service:
                      </span>
                      <div className="space-y-3 relative pl-4 border-l-2 border-border ml-2">
                        <div className="relative">
                          <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-status-green ring-4 ring-white"></div>
                          <div className="font-semibold text-ink">Kendaraan Masuk di Pos Security</div>
                          <div className="text-[11px] text-ink-muted">Pukul {spk.created_at ? new Date(spk.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'} | Pos Security KIM 3</div>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-accent ring-4 ring-white"></div>
                          <div className="font-semibold text-ink">Penerimaan & Cek Awal oleh SA</div>
                          <div className="text-[11px] text-ink-muted">Pukul {spk.created_at ? new Date(spk.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'} | SA: {spk.nama_sa || '-'} | Odometer: {spk.odometer_km ? `${spk.odometer_km.toLocaleString('id-ID')} KM` : '-'}</div>
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
                              : 'Pengerjaan Sedang Dilakukan oleh Mekanik'}
                          </div>
                          <div className="text-[11px] text-ink-muted">
                            Mekanik: {spk.nama_mekanik || 'Belum Ditugaskan'} | Status SPK: <span className="font-medium text-ink">{spk.status_spk}</span>
                          </div>
                          {spk.waktu_selesai_pekerjaan && (
                            <div className="text-[11px] text-ink-muted">
                              Selesai pukul {new Date(spk.waktu_selesai_pekerjaan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
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
                            <div className="text-[11px] text-ink-muted">
                              Inspeksi kualitas pengerjaan disetujui Foreman
                              {spk.tanggal_qc ? ` • ${new Date(spk.tanggal_qc).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} ${new Date(spk.tanggal_qc).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : ''}
                            </div>
                          </div>
                        )}
                        {(spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai') && (
                          <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-status-green ring-4 ring-white"></div>
                            <div className="font-semibold text-ink">FIR Closed — Final Check SA</div>
                            <div className="text-[11px] text-ink-muted">
                              Pemeriksaan akhir lolos, invoice diterbitkan
                              {spk.waktu_fir_closed ? ` • ${new Date(spk.waktu_fir_closed).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} ${new Date(spk.waktu_fir_closed).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : ''}
                            </div>
                          </div>
                        )}
                        {activeInvoiceLunas && activeInvoice && (
                          <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-status-green ring-4 ring-white"></div>
                            <div className="font-semibold text-ink">Pembayaran Lunas</div>
                            <div className="text-[11px] text-ink-muted">
                              {activeInvoice.no_invoice} • Rp {Number(activeInvoice.grand_total || 0).toLocaleString('id-ID')}
                              {activeInvoice.tanggal_bayar ? ` • ${new Date(activeInvoice.tanggal_bayar).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} ${new Date(activeInvoice.tanggal_bayar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : ''}
                              {activeInvoice.metode_pembayaran ? ` • ${activeInvoice.metode_pembayaran}` : ''}
                            </div>
                          </div>
                        )}
                        {spk.waktu_check_out && (
                          <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-status-green ring-4 ring-white"></div>
                            <div className="font-semibold text-ink">Armada Keluar Bengkel</div>
                            <div className="text-[11px] text-ink-muted">
                              Check-out pos Security • {new Date(spk.waktu_check_out).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} {new Date(spk.waktu_check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 bg-accent-subtle p-4 rounded-md border border-accent/20">
                      <span className="font-bold text-ink flex items-center gap-2">
                        <Info className="w-4 h-4 text-accent" />
                        Status Terkini & Petunjuk:
                      </span>
                      <p className="text-ink-muted leading-relaxed">
                        Kendaraan <span className="font-semibold text-ink">{spk.no_polisi}</span>{' '}
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
                      <div className="bg-surface-raised p-3 rounded-md border border-accent/30 text-ink-muted space-y-1">
                        <div className="font-medium text-ink">Estimasi Selesai:</div>
                        <div>{spk.estimasi_waktu_jam ? `${spk.estimasi_waktu_jam} Jam kerja` : 'Hari ini, estimasi 2-3 jam kerja'}</div>
                      </div>
                      <div className="text-[11px] text-ink-muted pt-1">
                        Pembaruan status sistem berjalan realtime tanpa perlu konfirmasi manual via chat/telepon.
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Detail Pekerjaan & Sparepart */}
                {subTab === 'detail' && (
                  <div className="space-y-4 pt-1 text-xs">
                    {/* Daftar Jasa */}
                    <div className="border border-border rounded-md overflow-hidden">
                      <div className="bg-surface px-4 py-2.5 font-bold text-ink flex justify-between items-center">
                        <span>Daftar Pekerjaan / Jasa Service</span>
                        <span className="text-[11px] text-ink-muted font-normal">
                          {activePekerjaan.length > 0 ? `${activePekerjaan.length} Item Jasa` : 'Estimasi Paket'}
                        </span>
                      </div>
                      <div className="divide-y divide-border bg-surface-raised">
                        {activePekerjaan.length > 0 ? (
                          activePekerjaan.map((p, idx) => (
                            <div key={idx} className="p-3 flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-ink">{p.nama_pekerjaan || p.kategori}</div>
                                <div className="text-[11px] text-ink-subtle">Durasi: {p.estimasi_durasi_jam ? `${p.estimasi_durasi_jam} Jam` : '60 Menit'}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-ink">Rp {(p.biaya_jasa || 0).toLocaleString('id-ID')}</div>
                                <span className="text-[10px] text-status-green bg-status-green-bg px-2 py-0.5 rounded-full font-medium">{p.status_pekerjaan || 'Disetujui'}</span>
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
                    <div className="border border-border rounded-md overflow-hidden">
                      <div className="bg-surface px-4 py-2.5 font-bold text-ink flex justify-between items-center">
                        <span>Daftar Sparepart & Material</span>
                        <span className="text-[11px] text-ink-muted font-normal">
                          {activeParts.length > 0 ? `${activeParts.length} Item Part` : '0 Item Part'}
                        </span>
                      </div>
                      <div className="divide-y divide-border bg-surface-raised">
                        {activeParts.length > 0 ? (
                          activeParts.map((pt, idx) => (
                            <div key={idx} className="p-3 flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-ink">{pt.nama_part}</div>
                                <div className="text-[11px] text-ink-subtle">Jumlah: {pt.jumlah} {pt.satuan || 'pcs'}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-ink">Rp {((pt.harga_satuan || 0) * (pt.jumlah || 1)).toLocaleString('id-ID')}</div>
                                <span className="text-[10px] text-ink-muted bg-surface px-2 py-0.5 rounded-full font-medium">{pt.status_ketersediaan || 'Ready di Stock'}</span>
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
                    <div className="bg-status-amber-bg p-4 rounded-md border border-status-amber/30 space-y-1.5">
                      <div className="font-bold text-status-amber flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-status-amber" />
                        Keluhan Awal Customer (Driver / PIC Armada):
                      </div>
                      <p className="text-ink font-medium italic pl-6">
                        "{spk.keluhan_customer || '-'}"
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-surface p-4 rounded-md border border-border space-y-2">
                        <div className="font-bold text-ink flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-accent" />
                          Catatan Service Advisor (SA):
                        </div>
                        <div className="text-ink-muted text-xs">
                          {spk.catatan_sa || spk.catatan_kondisi_awal || 'Belum ada catatan dari Service Advisor.'}
                        </div>
                        {spk.odometer_km ? (
                          <div className="text-[11px] text-ink-muted pt-1.5 border-t border-border">
                            Odometer tercatat: <strong>{spk.odometer_km.toLocaleString('id-ID')} KM</strong>
                          </div>
                        ) : null}
                      </div>

                      <div className="bg-surface p-4 rounded-md border border-border space-y-2">
                        <div className="font-bold text-ink flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-ink-muted" />
                          Catatan & Temuan Teknisi / Foreman:
                        </div>
                        <div className="text-ink-muted text-xs">
                          {spk.catatan_foreman || 'Belum ada catatan temuan teknisi untuk unit ini.'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-status-green-bg p-3 rounded-md border border-status-green/30 text-ink-muted flex items-center gap-2">
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
                        <div className="border border-border rounded-md p-3 bg-surface space-y-2 text-center">
                          <div className="text-[11px] font-semibold text-ink-muted">Foto Masuk Pos Security</div>
                          <div className="h-32 bg-surface rounded-md flex flex-col items-center justify-center text-ink-subtle gap-1 overflow-hidden">
                            {(spk as any).foto_kendaraan_masuk ? (
                              <img src={(spk as any).foto_kendaraan_masuk} alt="Kendaraan Masuk" className="h-full w-full object-cover" />
                            ) : (
                              <>
                                <Camera className="w-6 h-6" />
                                <span className="text-[10px]">Tersimpan di Security Log</span>
                              </>
                            )}
                          </div>
                          <div className="text-[10px] text-ink-muted">Tampak Depan & Nopol</div>
                        </div>

                        <div className="border border-border rounded-md p-3 bg-surface space-y-2 text-center">
                          <div className="text-[11px] font-semibold text-ink-muted">Foto Sebelum Pengerjaan</div>
                          <div className="h-32 bg-surface rounded-md flex flex-col items-center justify-center text-ink-subtle gap-1">
                            <Camera className="w-6 h-6" />
                            <span className="text-[10px]">Kondisi Awal Komponen</span>
                          </div>
                          <div className="text-[10px] text-ink-muted">Dokumentasi SA / Mekanik</div>
                        </div>

                        <div className="border border-border rounded-md p-3 bg-surface space-y-2 text-center">
                          <div className="text-[11px] font-semibold text-ink-muted">Foto Setelah Pengerjaan</div>
                          <div className="h-32 bg-surface rounded-md flex flex-col items-center justify-center text-ink-subtle gap-1">
                            {spk.status_spk === 'QC Passed' || spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai' ? (
                              <>
                                <CheckCircle2 className="w-6 h-6 text-status-green" />
                                <span className="text-[10px] text-status-green font-medium">Verifikasi QC Disetujui</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-6 h-6 text-ink-subtle" />
                                <span className="text-[10px]">Menunggu Pekerjaan Selesai</span>
                              </>
                            )}
                          </div>
                          <div className="text-[10px] text-ink-muted">Inspeksi Akhir Foreman</div>
                        </div>
                      </div>
                    </div>

                    {/* Dokumen Terkait Armada */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <span className="font-bold text-ink block">Berkas & Dokumen Armada Ini:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 rounded-md border border-border bg-surface-raised hover:border-accent/30 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-5 h-5 text-accent" />
                            <div>
                              <div className="font-semibold text-ink">SPK_{spk.no_spk}.pdf</div>
                              <div className="text-[10px] text-ink-subtle">Surat Perintah Kerja Resmi</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toast.info('Mengunduh Berkas', `Salinan Surat Perintah Kerja ${spk.no_spk} sedang diunduh.`)}
                            className="p-1.5 text-accent hover:bg-accent-subtle rounded-md"
                            title="Unduh SPK"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>

                        {activeArmadaDocs.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-surface-raised hover:border-accent/30 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <FileCheck className="w-5 h-5 text-status-green" />
                              <div>
                                <div className="font-semibold text-ink">{doc.nama_dokumen || doc.jenis_dokumen}</div>
                                <div className="text-[10px] text-ink-subtle">Berlaku s/d: {doc.masa_berlaku || '-'}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toast.info('Mengunduh Berkas', `Dokumen ${doc.nama_dokumen} sedang diunduh.`)}
                              className="p-1.5 text-ink-muted hover:bg-surface rounded-md"
                              title="Unduh Dokumen"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {activeArmadaDocs.length === 0 && (
                          <div className="flex items-center justify-between p-3 rounded-md border border-border bg-surface-raised">
                            <div className="flex items-center gap-2.5">
                              <FileCheck className="w-5 h-5 text-ink-muted" />
                              <div>
                                <div className="font-semibold text-ink">Kartu_Riwayat_Service.pdf</div>
                                <div className="text-[10px] text-ink-subtle">Riwayat Perawatan Rutin Bengkel KIM3</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toast.info('Mengunduh Riwayat', `Riwayat service armada ${spk.no_polisi} sedang disiapkan.`)}
                              className="p-1.5 text-accent hover:bg-accent-subtle rounded-md"
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

    </div>
  );
};

export const WebFleetCustomerView: React.FC<WebFleetCustomerViewProps> = ({ initialMenu }) => {
  const queryClient = useQueryClient();
  const { setActiveTab, currentUser, authUser } = useAppStore();
  const [fleetMenu, setFleetMenu] = useState<'dashboard' | 'booking' | 'status' | 'history' | 'kendaraan' | 'dokumen' | 'profil'>(
    initialMenu || 'dashboard'
  );

  React.useEffect(() => {
    if (initialMenu) {
      setFleetMenu(initialMenu);
    }
  }, [initialMenu]);

  // Pindah menu (mis. via sidebar) = kembali ke tampilan awal menu tersebut:
  // tutup halaman detail riwayat & modal faktur yang menggantung.
  React.useEffect(() => {
    setHistoryDetail(null);
    setPreviewInvoice(null);
    setShowPrintInvoice(false);
  }, [fleetMenu]);

  // Booking Wizard Step (image5.png Mockup 1)
  const [bookingStep, setBookingStep] = useState<number>(1);
  const [isCustomService, setIsCustomService] = useState(false);
  const [customServiceText, setCustomServiceText] = useState('');
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
  // jadi daftar armada & riwayat service diambil per halaman (page + limit) dan
  // pencariannya dikirim ke server lewat parameter `q` (ILIKE di SQL).
  const [armadaPage, setArmadaPage] = useState(1);
  const [armadaLimit, setArmadaLimit] = useState(10);
  const [armadaSearch, setArmadaSearch] = useState('');
  const [armadaQuery, setArmadaQuery] = useState('');

  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historySearch, setHistorySearch] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  // Modal preview faktur + cetak struk (History)
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePembayaran | null>(null);
  const [showPrintInvoice, setShowPrintInvoice] = useState(false);
  // Halaman khusus detail riwayat SPK (tersembunyi dari sidebar)
  const [historyDetail, setHistoryDetail] = useState<SpkService | null>(null);

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

  // Daftar armada per halaman (server-side pagination + search)
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

  // Multi-tenant Customer Scoping:
  // Pelanggan ID & Nama Perusahaan dari sesi login akun mitra aktif
  const myPelangganId = authUser?.id_pelanggan || null;
  const myCompanyName = (authUser?.nama_perusahaan || authUser?.nama_lengkap || '').toLowerCase().trim();

  // Predikat kepemilikan armada (guard tambahan di atas filter tenant SQL)
  const isMyKendaraan = (k: Kendaraan) => {
    if (myPelangganId && k.id_pelanggan === myPelangganId) return true;
    if (myCompanyName && (
      (k.nama_pemilik && k.nama_pemilik.toLowerCase().trim() === myCompanyName) ||
      (k.nama_perusahaan && k.nama_perusahaan.toLowerCase().trim() === myCompanyName)
    )) return true;
    return false;
  };

  // Filter Kendaraan milik armada customer yang sedang login
  const myKendaraanList = (kendaraanList || []).filter((k) => isMyKendaraan(k));

  // Himpunan plat nomor kendaraan armada customer
  const myPlateSet = new Set(myKendaraanList.map((k) => k.no_polisi.toUpperCase().replace(/\s+/g, '')));

  // Filter SPK khusus armada customer yang sedang login
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

  // Filter faktur milik armada customer yang sedang login
  const myInvoiceList = (invoiceList || []).filter((inv) => {
    if (inv.id_spk && mySpkList.some((s) => s.id === inv.id_spk)) return true;
    if (myPelangganId && inv.id_pelanggan === myPelangganId) return true;
    if (inv.no_polisi && myPlateSet.has(inv.no_polisi.toUpperCase().replace(/\s+/g, ''))) return true;
    return false;
  });

  // Baris yang sedang ditampilkan pada daftar armada & riwayat service.
  // Server sudah memfilter per tenant di SQL, guard di sini hanya jaring pengaman
  // agar data mitra lain tidak pernah ikut tampil.
  const armadaRows = (armadaPageData?.rows || []).filter((k) => isMyKendaraan(k));
  const historyRows = (historyPageData?.rows || []).filter((s) => isMySpk(s));

  // Kalau jumlah data menyusut (mis. filter pencarian aktif) sampai halaman aktif
  // melewati halaman terakhir, tarik kembali ke halaman terakhir yang valid.
  React.useEffect(() => {
    const meta = armadaPageData?.pagination;
    if (meta && meta.total_pages > 0 && armadaPage > meta.total_pages) {
      setArmadaPage(meta.total_pages);
    }
  }, [armadaPageData, armadaPage]);

  React.useEffect(() => {
    const meta = historyPageData?.pagination;
    if (meta && meta.total_pages > 0 && historyPage > meta.total_pages) {
      setHistoryPage(meta.total_pages);
    }
  }, [historyPageData, historyPage]);

  // Filter Booking khusus customer yang sedang login
  const myBookingList = (bookingList || []).filter((b) => {
    if (myPelangganId && b.id_pelanggan === myPelangganId) return true;
    if (myCompanyName && b.nama_perusahaan && b.nama_perusahaan.toLowerCase().trim() === myCompanyName) return true;
    if (b.no_polisi && myPlateSet.has(b.no_polisi.toUpperCase().replace(/\s+/g, ''))) return true;
    return false;
  });

  // Aturan cancel booking: status masih Booked dan minimal 10 menit sebelum
  // jadwal (tanggal_booking + jam_booking). Server juga menolak bila status
  // sudah berubah / sudah ada check-in dari booking tersebut.
  const getCancelState = (b: BookingService): { allowed: boolean; reason: string } => {
    if (b.status !== 'Booked') {
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

  // Booking Saya: urut jadwal terdekat, yang Dibatalkan di bawah
  const myBookingSorted = [...myBookingList].sort((a, b) => {
    if (a.status === 'Dibatalkan' && b.status !== 'Dibatalkan') return 1;
    if (b.status === 'Dibatalkan' && a.status !== 'Dibatalkan') return -1;
    return `${a.tanggal_booking} ${a.jam_booking}`.localeCompare(`${b.tanggal_booking} ${b.jam_booking}`);
  });

  // Jadwal Booking Terdekat: hanya yang masih Booked DAN jadwalnya belum lewat.
  // Booking yang sudah check-in (Diproses), Selesai, Dibatalkan, atau terlewat
  // tidak tampil di kartu ringkas (tetap ada di tab Booking Saya).
  const upcomingBookings = myBookingSorted.filter((b) => {
    if (b.status !== 'Booked') return false;
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
        message: `Booking ${b?.no_booking || ''} (${b?.no_polisi || ''}) jadwal ${b?.tanggal_booking || ''} ${b?.jam_booking || ''} dibatalkan customer.`,
        linkTab: 'security-booking',
        urgency: 'warning',
      });
      toast.success('Booking Dibatalkan', 'Jadwal Anda telah dibatalkan.');
    },
    onError: (err: any) =>
      toast.error('Gagal Membatalkan', err?.message || 'Coba beberapa saat lagi.'),
  });

  // Tombol Batalkan Booking (dipakai di Dashboard & seksi Booking Saya).
  // Terkunci bila aturan H-10 menit / status tidak memungkinkan.
  const BookingCancelButton = ({ b, compact = false }: { b: BookingService; compact?: boolean }) => {
    if (b.status === 'Dibatalkan') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-ink-subtle border border-border font-bold">
          Dibatalkan
        </span>
      );
    }
    const st = getCancelState(b);
    return (
      <button
        type="button"
        disabled={!st.allowed || batalkanBookingMutation.isPending}
        title={st.allowed ? 'Batalkan booking ini' : st.reason}
        onClick={() => {
          if (window.confirm(`Batalkan booking ${b.no_booking} (${b.no_polisi}) jadwal ${b.tanggal_booking} ${b.jam_booking}?`)) {
            batalkanBookingMutation.mutate(b.id);
          }
        }}
        className={`${compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px]'} rounded-md font-bold transition-all ${
          st.allowed
            ? 'bg-status-red-bg text-status-red hover:bg-status-red hover:text-white border border-status-red/30'
            : 'bg-surface text-ink-subtle border border-border cursor-not-allowed'
        } disabled:opacity-60`}
      >
        Batalkan
      </button>
    );
  };

  // Filter Dokumen khusus armada milik customer yang sedang login
  const myDokumenList = (dokumenList || []).filter((d) => {
    if (myPelangganId && d.id_pelanggan === myPelangganId) return true;
    if (myCompanyName && d.nama_perusahaan && d.nama_perusahaan.toLowerCase().trim() === myCompanyName) return true;
    if (d.no_polisi && myPlateSet.has(d.no_polisi.toUpperCase().replace(/\s+/g, ''))) return true;
    return false;
  });

  // Active SPK being monitored: ambil SPK aktif milik customer yang sedang berjalan
  const activeTrackSpk = mySpkList.find(s => s.status_spk !== 'Selesai' && s.status_spk !== 'FIR Closed') || mySpkList[0];

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
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      if (setuju) {
        realtimeHub.publish({
          type: 'SPK_STATUS_CHANGED',
          targetRoles: ['SA'],
          title: 'Estimasi Disetujui Customer',
          message: `Estimasi ${spk?.no_spk} (${spk?.no_polisi}) disetujui. WO terbit — mekanik siap start.`,
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
            message: `Estimasi ${spk?.no_spk} unit ${spk?.no_polisi} disetujui customer. Silakan START JOB.`,
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
          message: `Estimasi ${spk?.no_spk} (${spk?.no_polisi}) ditolak. Mohon revisi & kirim ulang.`,
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
        message: `Customer telah membuat booking service nopol ${bookingForm.no_polisi} (${bookingForm.jenis_layanan}) untuk ${bookingForm.tanggal_booking} jam ${bookingForm.jam_booking}.`,
        linkTab: 'security-booking',
        urgency: 'info',
      });
      toast.success(
        'Booking Service Berhasil Dibuat!',
        `Armada ${bookingForm.no_polisi} dijadwalkan pada ${bookingForm.tanggal_booking} jam ${bookingForm.jam_booking} WIB.`
      );
      setBookingStep(1);
      // Mendarat di dashboard agar booking baru langsung terlihat di
      // "Jadwal Booking Terdekat" (bukan Riwayat yang hanya berisi SPK).
      setFleetMenu('dashboard');
      setActiveTab('fleet-dashboard');
    },
    onError: (err: any) =>
      toast.error('Gagal Membuat Booking', err?.message || 'Periksa kembali koneksi atau data formulir Anda.'),
  });

  // Tambah Armada State & Mutation
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
      toast.success('Unit Armada Ditambahkan', `Kendaraan ${plat} berhasil didaftarkan ke sistem.`);

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
          title: 'Riwayat Armada Ditemukan',
          message: `Plat ${plat} memiliki riwayat (${parts.join(', ')}) yang kini masuk ke akun Anda.`,
          linkTab: 'fleet-status',
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
      toast.error('Gagal Menambahkan Unit', getApiErrorMessage(err, 'Periksa kembali kelengkapan data armada Anda.')),
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
      toast.success('Dokumen Berhasil Disimpan', `Berkas ${dokumenForm.nama_dokumen} untuk armada ${dokumenForm.no_polisi} aman tersimpan.`);
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
      
      {/* MENU 0: DASHBOARD RINGKASAN ARMADA */}
      {fleetMenu === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-accent rounded-md p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-raised/10 text-white/70 text-xs font-semibold mb-2">
                <Truck className="w-3.5 h-3.5 text-white/70" />
                Portal Monitoring Fleet KIM 3 Medan
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Selamat Datang, {currentUser || 'Pelanggan Fleet'}</h1>
              <p className="text-xs text-white/70 mt-1 max-w-xl leading-relaxed">
                Pantau status perbaikan armada, jadwalkan booking perawatan berkala, serta kelola dokumen perizinan STNK & KIR secara realtime.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFleetMenu('booking');
                  setActiveTab('fleet-booking');
                }}
                className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-md transition-all shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Booking Service
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-surface-raised p-4 sm:p-5 rounded-md border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted">Total Armada Truk</span>
                <div className="w-8 h-8 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-ink">{myKendaraanList.length}</span>
                <span className="text-[11px] text-ink-subtle ml-2 font-medium">Unit Terdaftar</span>
              </div>
            </div>

            <div className="bg-surface-raised p-4 sm:p-5 rounded-md border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted">Sedang Diservis</span>
                <div className="w-8 h-8 rounded-md bg-status-amber-bg text-status-amber flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-status-amber">
                  {mySpkList.filter(s => s.status_spk !== 'Selesai' && s.status_spk !== 'FIR Closed').length}
                </span>
                <span className="text-[11px] text-ink-subtle ml-2 font-medium">Di Bengkel KIM 3</span>
              </div>
            </div>

            <div className="bg-surface-raised p-4 sm:p-5 rounded-md border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted">Booking Terjadwal</span>
                <div className="w-8 h-8 rounded-md bg-status-green-bg text-status-green flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-status-green">
                  {upcomingBookings.length}
                </span>
                <span className="text-[11px] text-ink-subtle ml-2 font-medium">Antrian Masuk</span>
              </div>
            </div>

            <div className="bg-surface-raised p-4 sm:p-5 rounded-md border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted">Dokumen Digital</span>
                <div className="w-8 h-8 rounded-md bg-status-red-bg text-status-red flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-ink">{myDokumenList.length}</span>
                <span className="text-[11px] text-ink-subtle ml-2 font-medium">STNK & KIR</span>
              </div>
            </div>
          </div>

          {/* Active Unit Live Tracker Highlight (adaptif: progres vs selesai) */}
          {activeTrackSpk ? (
            <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-accent-subtle text-accent flex items-center justify-center font-black">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-ink">{activeTrackSpk.no_polisi}</span>
                      {activeTrackSpk.status_spk === 'Selesai' || activeTrackSpk.status_spk === 'FIR Closed' ? (
                        <span className="px-2 py-0.5 rounded-full bg-status-green-bg text-status-green text-[10px] font-bold">
                          Selesai
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent text-[10px] font-bold animate-pulse">
                          Sedang Dikerjakan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted font-semibold">{activeTrackSpk.no_spk} • {activeTrackSpk.keluhan_customer}</p>
                  </div>
                </div>
                {activeTrackSpk.status_spk === 'Selesai' || activeTrackSpk.status_spk === 'FIR Closed' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryDetail(activeTrackSpk);
                      setFleetMenu('history');
                      setActiveTab('fleet-history');
                    }}
                    className="px-3.5 py-2 bg-surface hover:bg-surface text-ink text-xs font-bold rounded-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    Lihat Riwayat Service <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFleetMenu('status');
                      setActiveTab('fleet-status');
                    }}
                    className="px-3.5 py-2 bg-surface hover:bg-surface text-ink text-xs font-bold rounded-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    Lihat Detail Tracker <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-surface rounded-md">
                  <span className="text-ink-subtle text-[10px] block">Status SPK:</span>
                  <span className="font-bold text-ink">{activeTrackSpk.status_spk}</span>
                </div>
                <div className="p-3 bg-surface rounded-md">
                  <span className="text-ink-subtle text-[10px] block">Estimasi Lead Time:</span>
                  <span className="font-bold text-accent">{activeTrackSpk.estimasi_waktu_jam || activeTrackSpk.lead_time_jam || '-'} Jam Pengerjaan</span>
                </div>
                <div className="p-3 bg-surface rounded-md">
                  <span className="text-ink-subtle text-[10px] block">Estimasi Biaya:</span>
                  <span className="font-bold text-status-green">Rp {Number(activeTrackSpk.estimasi_biaya || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-raised rounded-md border border-border p-6 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-status-green-bg text-status-green flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-ink">Semua Unit Armada Beroperasi Prima</h3>
              <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto">
                Saat ini tidak ada unit armada Anda yang sedang menginap atau diservis di bengkel KIM 3.
              </p>
            </div>
          )}

          {/* Quick Previews: Jadwal Booking & Unit Terdaftar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Bookings */}
            <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" /> Jadwal Booking Terdekat
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setFleetMenu('booking');
                    setActiveTab('fleet-booking');
                  }}
                  className="text-xs font-bold text-accent hover:text-accent-hover"
                >
                  + Buat Baru
                </button>
              </div>

              {upcomingBookings.length > 0 ? (
                <div className="space-y-2.5">
                  {upcomingBookings.slice(0, 3).map((b) => (
                    <div key={b.id} className="p-3 rounded-md border border-border bg-surface flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-ink text-xs">{b.no_polisi}</span>
                        <p className="text-[11px] text-ink-muted truncate">{b.jenis_layanan}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <span className="font-mono text-xs font-semibold text-accent block">
                          {b.tanggal_booking} {b.jam_booking}
                        </span>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-subtle text-accent font-bold">
                            {b.status}
                          </span>
                          <BookingCancelButton b={b} compact />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-subtle py-4 text-center">Belum ada booking service terjadwal.</p>
              )}
            </div>

            {/* Quick Fleet Units */}
            <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Truck className="w-4 h-4 text-accent" /> Armada Truk Anda
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setFleetMenu('kendaraan');
                    setActiveTab('fleet-kendaraan');
                  }}
                  className="text-xs font-bold text-accent hover:text-accent-hover"
                >
                  Lihat Semua
                </button>
              </div>

              {myKendaraanList.length > 0 ? (
                <div className="space-y-2.5">
                  {myKendaraanList.slice(0, 3).map((k) => (
                    <div key={k.id} className="p-3 rounded-md border border-border bg-surface flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {k.foto_kendaraan ? (
                          <img src={k.foto_kendaraan} alt={k.no_polisi} className="w-12 h-12 rounded-md object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                            <Truck className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-ink text-xs">{k.no_polisi}</span>
                          <p className="text-[11px] text-ink-muted truncate">{k.merk} {k.model} • {k.jenis_armada}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-green-bg text-status-green font-bold">
                        Aktif
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-subtle py-4 text-center">Belum ada armada terdaftar.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State for Status if no active SPK */}
      {fleetMenu === 'status' && !activeTrackSpk && (
        <div className="bg-surface-raised rounded-md border border-border p-8 text-center shadow-xs max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-md bg-accent-subtle text-accent flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink">Tidak Ada Servis Berjalan</h2>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Saat ini tidak ada unit armada Anda yang sedang dalam proses pengerjaan di Bengkel KIM 3 Medan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFleetMenu('booking');
              setActiveTab('fleet-booking');
            }}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-md shadow-xs transition-all inline-flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" /> Jadwalkan Booking Service
          </button>
        </div>
      )}

      {/* MENU 1: STATUS SERVICE REALTIME TRACKER (image5.png Mockup 2) */}
      {fleetMenu === 'status' && activeTrackSpk && (
        <SpkTrackingDetail
          spk={activeTrackSpk}
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

      {/* MENU 2: BOOKING SERVICE 4-STEP WIZARD (image5.png Mockup 1) */}
      {fleetMenu === 'booking' && (
        <div className="bg-surface-raised rounded-md border border-border p-6 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-ink">Booking Service Armada Perusahaan</h2>
            <p className="text-xs text-ink-muted">Jadwalkan service armada Anda untuk mendapatkan antrian prioritas di Bengkel KIM 3</p>
          </div>

          {/* Booking Saya: jadwal milik customer + batalkan (maks. H-10 menit) */}
          <div className="rounded-md border border-border bg-surface p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" /> Booking Saya
              </h3>
              <span className="text-[11px] font-bold text-ink-muted">
                {myBookingSorted.filter((b) => b.status !== 'Dibatalkan').length} aktif
              </span>
            </div>
            {myBookingSorted.length > 0 ? (
              <div className="space-y-2">
                {myBookingSorted.map((b) => (
                  <div key={b.id} className="p-3 rounded-md border border-border bg-surface-raised flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-ink text-xs">{b.no_polisi}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${b.status === 'Dibatalkan' ? 'bg-surface text-ink-subtle border border-border' : b.status === 'Check In' ? 'bg-status-green-bg text-status-green' : 'bg-accent-subtle text-accent'}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted truncate">{b.jenis_layanan} • {b.tanggal_booking} {b.jam_booking}</p>
                    </div>
                    <BookingCancelButton b={b} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-subtle py-3 text-center">Belum ada booking. Buat jadwal baru lewat wizard di bawah.</p>
            )}
            <p className="text-[11px] text-ink-subtle">
              Pembatalan maksimal 10 menit sebelum jadwal kedatangan. Setelah check-in, pembatalan via Security/SA.
            </p>
          </div>

          {/* 4 Steps Indicator */}
          <div className="flex items-center justify-between text-xs font-semibold">
            {[
              { num: 1, label: 'Pilih Kendaraan' },
              { num: 2, label: 'Pilih Layanan' },
              { num: 3, label: 'Tanggal & Waktu' },
              { num: 4, label: 'Konfirmasi' },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  bookingStep === step.num ? 'bg-accent text-white shadow-xs' : bookingStep > step.num ? 'bg-status-green text-white' : 'bg-surface text-ink-muted'
                }`}>
                  {step.num}
                </div>
                <span className={`hidden sm:inline ${bookingStep === step.num ? 'text-accent font-bold' : 'text-ink-muted'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* STEP 1: PILIH KENDARAAN */}
          {bookingStep === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Pilih armada yang akan diservice:</span>
                <button
                  type="button"
                  onClick={() => setOpenTambahArmadaModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-subtle hover:bg-accent-subtle text-accent text-xs font-bold rounded-md border border-accent/30 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Kendaraan</span>
                </button>
              </div>
              <div className="space-y-2">
                {myKendaraanList.length > 0 ? (
                  myKendaraanList.map((k) => (
                    <label
                      key={k.id}
                      className={`flex items-center justify-between p-3.5 rounded-md border cursor-pointer transition-all ${
                        bookingForm.no_polisi === k.no_polisi
                          ? 'border-accent bg-accent-subtle shadow-xs'
                          : 'border-border hover:border-border bg-surface-raised'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="radio"
                          name="booking_kendaraan"
                          checked={bookingForm.no_polisi === k.no_polisi}
                          onChange={() => setBookingForm({ ...bookingForm, no_polisi: k.no_polisi })}
                          className="text-accent shrink-0"
                        />
                        {k.foto_kendaraan ? (
                          <img src={k.foto_kendaraan} alt={k.no_polisi} className="w-11 h-11 rounded-md object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-md bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                            <Truck className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-black text-ink">{k.no_polisi}</div>
                          <div className="text-xs text-ink-muted truncate">{k.merk} {k.model} ({k.tahun})</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-status-green-bg text-status-green font-bold text-[10px] border border-status-green/30">
                        Armada Aktif
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="p-6 text-center border-2 border-dashed border-border rounded-md bg-surface space-y-2">
                    <p className="text-xs text-ink-muted">Belum ada armada terdaftar untuk akun fleet Anda.</p>
                    <button
                      type="button"
                      onClick={() => setOpenTambahArmadaModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-md transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Daftarkan Truk Sekarang
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!bookingForm.no_polisi || myKendaraanList.length === 0}
                onClick={() => setBookingStep(2)}
                className="w-full mt-4 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-xs rounded-md shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Lanjut: Pilih Layanan <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: PILIH LAYANAN */}
          {bookingStep === 2 && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-ink block">Pilih jenis perbaikan atau service berkala:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Service Berkala (Ganti Oli & Filter)',
                  'Perbaikan Rem & Kaki-kaki',
                  'Tune Up & Performa Mesin',
                  'Kelistrikan & Starter / Alternator',
                  'Overhaul Mesin / Transmisi',
                  'Pemeriksaan Umum / Keluhan Khusus',
                ].map((srv) => (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => {
                      setIsCustomService(false);
                      setBookingForm({ ...bookingForm, jenis_layanan: srv });
                    }}
                    className={`p-3 rounded-md border text-left text-xs font-semibold transition-all cursor-pointer ${
                      !isCustomService && bookingForm.jenis_layanan === srv
                        ? 'border-accent bg-accent-subtle text-accent font-bold shadow-xs'
                        : 'border-border text-ink-muted hover:bg-surface'
                    }`}
                  >
                    {srv}
                  </button>
                ))}

                {/* Option 7: Custom Input */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomService(true);
                    setBookingForm({
                      ...bookingForm,
                      jenis_layanan: customServiceText.trim() || 'Perbaikan Kustom',
                    });
                  }}
                  className={`p-3 rounded-md border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                    isCustomService
                      ? 'border-accent bg-accent-subtle text-accent font-bold shadow-xs'
                      : 'border-dashed border-accent/40 text-accent hover:bg-accent-subtle/30'
                  }`}
                >
                  <span>+ Lainnya / Perbaikan Kustom (Ketik Sendiri)</span>
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {/* Free-text input field when custom service is selected */}
              {isCustomService && (
                <div className="p-3.5 rounded-md bg-accent-subtle/30 border border-accent/40 animate-in fade-in zoom-in-98 duration-150">
                  <label className="block text-xs font-bold text-accent mb-1.5">
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
                    className="w-full px-3.5 py-2.5 rounded-md border border-accent/50 text-xs focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised font-bold text-ink"
                  />
                  <p className="text-[11px] text-ink-subtle mt-1.5">
                    Tulis jenis pekerjaan atau modifikasi khusus yang dibutuhkan armada Anda.
                  </p>
                </div>
              )}

              <div className="mt-3">
                <label className="block text-xs font-bold text-ink-muted mb-1">Jelaskan Keluhan Kendaraan:</label>
                <textarea
                  rows={2}
                  value={bookingForm.keluhan}
                  onChange={(e) => setBookingForm({ ...bookingForm, keluhan: e.target.value })}
                  placeholder="Contoh: Rem bunyi saat pengereman dan tarikan mesin agak berat..."
                  className="w-full px-3 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setBookingStep(1)}
                  className="flex-1 py-2.5 bg-surface hover:bg-surface text-ink-muted font-bold text-xs rounded-md cursor-pointer border border-border"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isCustomService && !customServiceText.trim()) {
                      toast.warning('Isi Jenis Layanan Kustom', 'Silakan ketik jenis perbaikan kustom Anda terlebih dahulu.');
                      return;
                    }
                    setBookingStep(3);
                  }}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-md shadow-xs cursor-pointer"
                >
                  Lanjut: Jadwal
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PILIH TANGGAL & WAKTU */}
          {bookingStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">
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
                    className="w-full px-3.5 py-2.5 rounded-md border border-border font-mono text-xs focus:ring-2 focus:ring-accent focus:border-accent focus:outline-hidden bg-surface-raised font-bold text-ink"
                  />
                  <div className="text-[10px] text-ink-subtle mt-1">
                    Pilih hari ini atau tanggal kedatangan berikutnya
                  </div>
                </div>
                <div>
                  {/* Gmail/Calendar style Interactive Time Picker */}
                  <TimePickerInput
                    label="Pilih Jam Kedatangan (Slot)"
                    required
                    selectedDate={bookingForm.tanggal_booking}
                    value={bookingForm.jam_booking}
                    onChange={(time) => setBookingForm({ ...bookingForm, jam_booking: time })}
                  />
                  <div className="text-[10px] text-ink-subtle mt-1">
                    Jam operasional bengkel: 07:30 - 17:00 WIB
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setBookingStep(2)}
                  className="flex-1 py-2.5 bg-surface hover:bg-surface text-ink-muted font-bold text-xs rounded-md cursor-pointer border border-border"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => {
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
                  }}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-md shadow-xs cursor-pointer"
                >
                  Lanjut: Konfirmasi
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: KONFIRMASI */}
          {bookingStep === 4 && (
            <div className="space-y-4">
              <div className="bg-surface p-4 rounded-md border border-border text-xs space-y-2">
                <div className="font-bold text-sm text-ink border-b border-border pb-2">Ringkasan Pemesanan Booking Service</div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">Armada:</span>
                  <span className="font-bold text-ink">{bookingForm.no_polisi}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">Jenis Layanan:</span>
                  <span className="font-bold text-ink">{bookingForm.jenis_layanan}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-muted">Jadwal Masuk:</span>
                  <span className="font-mono font-bold text-accent">{bookingForm.tanggal_booking} ({bookingForm.jam_booking} WIB)</span>
                </div>
                <div className="pt-2 border-t border-border text-ink-muted italic">
                  "{bookingForm.keluhan}"
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setBookingStep(3)}
                  className="flex-1 py-2.5 bg-surface hover:bg-surface text-ink-muted font-bold text-xs rounded-md"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={createBookingMutation.isPending}
                  onClick={() => createBookingMutation.mutate()}
                  className="flex-1 py-2.5 bg-status-green hover:bg-status-green/90 text-white font-bold text-xs rounded-md shadow-md shadow-status-green/20"
                >
                  {createBookingMutation.isPending ? 'Menyimpan...' : 'KONFIRMASI BOOKING'}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MENU 3: KENDARAAN SAYA (image5.png Mockup 4) */}
      {fleetMenu === 'kendaraan' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">Armada Kendaraan Perusahaan</h2>
              <p className="text-xs text-ink-muted">Daftar unit truk dan kendaraan operasional armada Anda</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenTambahArmadaModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-md shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Unit Armada</span>
            </button>
          </div>

          {/* Pencarian armada (server-side lewat parameter `q`) */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={armadaSearch}
              onChange={(e) => setArmadaSearch(e.target.value)}
              placeholder="Cari no. polisi, merk, model, atau jenis armada..."
              aria-label="Cari armada"
              className="w-full pl-9 pr-9 py-2.5 rounded-md border border-border bg-surface-raised text-xs text-ink placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-hidden"
            />
            {armadaSearch && (
              <button
                type="button"
                onClick={() => setArmadaSearch('')}
                aria-label="Bersihkan pencarian armada"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-ink-subtle hover:text-ink transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {armadaRows.length > 0 ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {armadaRows.map((k) => (
                <div key={k.id} className="bg-surface-raised rounded-md border border-border p-5 shadow-xs flex flex-col justify-between overflow-hidden">
                  {k.foto_kendaraan ? (
                    <div className="-m-5 mb-0 h-40 bg-surface overflow-hidden">
                      <img src={k.foto_kendaraan} alt={k.no_polisi} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="-m-5 mb-0 h-28 bg-accent-subtle text-accent flex flex-col items-center justify-center gap-1">
                      <Truck className="w-8 h-8" />
                      <span className="text-[10px] font-semibold text-ink-muted">Belum ada foto unit</span>
                    </div>
                  )}
                  <div className="pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-ink">{k.no_polisi}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-status-green-bg text-status-green text-[10px] font-bold">
                        Aktif
                      </span>
                    </div>
                    <div className="text-xs text-ink-muted font-bold mt-0.5">{k.merk} {k.model} ({k.jenis_armada})</div>

                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-ink-subtle block text-[10px]">Tahun Pembuatan:</span>
                        <span className="font-semibold text-ink">{k.tahun || '-'}</span>
                      </div>
                      <div>
                        <span className="text-ink-subtle block text-[10px]">Asuransi:</span>
                        <span className="font-semibold text-ink">{k.asuransi || '-'}</span>
                      </div>
                      <div>
                        <span className="text-ink-subtle block text-[10px]">No. Rangka:</span>
                        <span className="font-mono text-[11px] text-ink-muted">{k.no_rangka || '-'}</span>
                      </div>
                      <div>
                        <span className="text-ink-subtle block text-[10px]">No. Mesin:</span>
                        <span className="font-mono text-[11px] text-ink-muted">{k.no_mesin || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingForm({ ...bookingForm, no_polisi: k.no_polisi });
                        setFleetMenu('booking');
                      }}
                      className="w-full py-2 bg-accent-subtle text-accent hover:bg-accent-subtle font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Jadwalkan Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <PaginationBar
              page={armadaPage}
              totalPages={armadaPageData?.pagination?.total_pages ?? 1}
              totalRecords={armadaPageData?.pagination?.total_records ?? armadaRows.length}
              limit={armadaLimit}
              label="armada"
              isLoading={armadaFetching}
              onPageChange={setArmadaPage}
              onLimitChange={(l) => {
                setArmadaLimit(l);
                setArmadaPage(1);
              }}
            />
            </>
          ) : armadaQuery ? (
            <div className="bg-surface-raised rounded-md border border-border p-8 text-center shadow-xs max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-md bg-surface text-ink-subtle flex items-center justify-center mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Armada Tidak Ditemukan</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Tidak ada unit yang cocok dengan pencarian{' '}
                  <span className="font-semibold text-ink">"{armadaQuery}"</span>. Coba kata kunci lain.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setArmadaSearch('')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-subtle text-accent text-xs font-bold rounded-md transition cursor-pointer"
              >
                <X className="w-4 h-4" /> Bersihkan Pencarian
              </button>
            </div>
          ) : (
            <div className="bg-surface-raised rounded-md border border-border p-8 text-center shadow-xs max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-md bg-accent-subtle text-accent flex items-center justify-center mx-auto">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Belum Ada Armada Terdaftar</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Daftarkan kendaraan operasional atau armada truk perusahaan Anda untuk mulai memanfaatkan fitur pemantauan & booking service.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenTambahArmadaModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-md shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Daftarkan Unit Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* MENU 4: DOKUMEN SAYA (image5.png Mockup 5) */}
      {fleetMenu === 'dokumen' && (
        <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Dokumen Digital Armada (STNK, BPKB, KIR, Asuransi)</h2>
              <p className="text-xs text-ink-muted">Kelola dan unduh berkas perizinan kendaraan secara terpusat</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (myKendaraanList.length > 0) {
                  setDokumenForm(prev => ({ ...prev, no_polisi: myKendaraanList[0].no_polisi }));
                }
                setOpenTambahDokumenModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-md shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Dokumen Baru</span>
            </button>
          </div>

          {myDokumenList.length > 0 ? (
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
                    {myDokumenList.map((doc) => (
                      <tr key={doc.id} className="hover:bg-surface transition-colors">
                        <td className="py-3 px-3 font-semibold text-ink">{doc.nama_dokumen}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-surface text-ink-muted rounded text-[10px] font-bold">
                            {doc.jenis_dokumen}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-ink">{doc.no_polisi}</td>
                        <td className="py-3 px-3 text-ink-muted font-mono">
                          {doc.masa_berlaku ? new Date(doc.masa_berlaku).toLocaleDateString('id-ID') : '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-accent-subtle text-accent hover:bg-accent hover:text-white rounded-md text-xs font-bold transition-colors"
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
                {myDokumenList.map((doc) => (
                  <div key={doc.id} className="rounded-md border border-border p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-ink leading-snug">{doc.nama_dokumen}</div>
                        <div className="font-mono text-[11px] font-bold text-ink-muted mt-0.5">{doc.no_polisi}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-surface text-ink-muted rounded text-[10px] font-bold shrink-0">
                        {doc.jenis_dokumen}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-ink-subtle">
                      <span>Masa Berlaku</span>
                      <span className="font-mono font-semibold text-ink-muted">
                        {doc.masa_berlaku ? new Date(doc.masa_berlaku).toLocaleDateString('id-ID') : '-'}
                      </span>
                    </div>

                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-accent-subtle text-accent active:bg-accent-subtle rounded-md text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Dokumen
                    </a>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-md bg-surface space-y-3">
              <div className="w-12 h-12 rounded-md bg-status-red-bg text-status-red flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Belum Ada Dokumen Digital</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Unggah berkas STNK, KIR, atau polis asuransi armada Anda agar tersimpan rapi dan mudah diakses.
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-md transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Unggah Dokumen Baru
              </button>
            </div>
          )}
        </div>
      )}

      {/* MENU 5: PROFIL PERUSAHAAN (image5.png Mockup 6) */}
      {fleetMenu === 'profil' && (
        <div className="bg-surface-raised rounded-md border border-border p-6 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-ink">Profil Pelanggan Fleet</h2>
            <p className="text-xs text-ink-muted">Informasi entitas perusahaan dan kontak PIC penanggung jawab</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-md bg-surface border border-border space-y-3">
              <span className="font-bold text-ink block text-sm">Informasi Perusahaan:</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-ink-subtle block text-[10px]">Nama Perusahaan / Entitas:</span>
                  <span className="font-bold text-ink">{authUser?.nama_perusahaan || authUser?.nama_lengkap || currentUser || 'Customer Fleet'}</span>
                </div>
                <div>
                  <span className="text-ink-subtle block text-[10px]">ID Pelanggan / Kemitraan:</span>
                  <span className="font-mono font-bold text-accent">KIM3-CUST-{String(myPelangganId || authUser?.id_pelanggan || 1).padStart(4, '0')}</span>
                </div>
                <div>
                  <span className="text-ink-subtle block text-[10px]">Tipe Kemitraan:</span>
                  <span className="font-semibold text-ink">Prioritas Bengkel Mitra KIM 3</span>
                </div>
                <div>
                  <span className="text-ink-subtle block text-[10px]">Status Akun:</span>
                  <span className="font-semibold text-status-green">Aktif Terverifikasi</span>
                </div>
                <div className="col-span-2">
                  <span className="text-ink-subtle block text-[10px]">Area Operasional:</span>
                  <span className="font-semibold text-ink">Kawasan Industri Medan (KIM 1, 2, 3) & Sekitarnya</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-md bg-surface border border-border space-y-3">
              <span className="font-bold text-ink block text-sm">Kontak PIC / Penanggung Jawab:</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-ink-subtle block text-[10px]">Nama PIC:</span>
                  <span className="font-bold text-ink">{authUser?.nama_lengkap || currentUser || '-'}</span>
                </div>
                <div>
                  <span className="text-ink-subtle block text-[10px]">Email Login:</span>
                  <span className="font-mono font-semibold text-ink">{authUser?.email || '-'}</span>
                </div>
                <div>
                  <span className="text-ink-subtle block text-[10px]">Peran Pengguna:</span>
                  <span className="font-semibold text-ink">Customer Fleet</span>
                </div>
                <div>
                  <span className="text-ink-subtle block text-[10px]">Notifikasi Terhubung:</span>
                  <span className="font-semibold text-ink">Web Portal & Realtime Push</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENU 6: HISTORY SERVICE (image5.png Mockup 3) */}
      {fleetMenu === 'history' && historyDetail && (
        <SpkTrackingDetail
          spk={historyDetail}
          onBack={() => setHistoryDetail(null)}
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
      {fleetMenu === 'history' && !historyDetail && (
        <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs">
          <div className="border-b border-border pb-3 mb-4">
            <h2 className="text-base font-bold text-ink">Riwayat Service Armada (History)</h2>
            <p className="text-xs text-ink-muted">Histori lengkap pengerjaan service dan penggantian part armada Anda</p>
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
              className="w-full pl-9 pr-9 py-2.5 rounded-md border border-border bg-surface-raised text-xs text-ink placeholder:text-ink-subtle focus:ring-2 focus:ring-accent focus:outline-hidden"
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
                      <th className="py-2.5 px-3 font-semibold text-center">Faktur</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyRows.map((spk) => {
                      const paidInv = myInvoiceList.find(
                        (inv) => inv.id_spk === spk.id &&
                          (inv.status_pembayaran === 'Paid' || inv.status_pembayaran === 'Lunas')
                      );
                      return (
                      <tr key={spk.id} onClick={() => setHistoryDetail(spk)} className="hover:bg-surface transition-colors cursor-pointer">
                        <td className="py-3 px-3 font-mono font-bold text-accent">{spk.no_spk}</td>
                        <td className="py-3 px-3 font-bold text-ink">{spk.no_polisi}</td>
                        <td className="py-3 px-3 text-ink-muted">{spk.keluhan_customer}</td>
                        <td className="py-3 px-3 font-mono text-ink-muted">{new Date(spk.created_at).toLocaleDateString('id-ID')}</td>
                        <td className="py-3 px-3 font-mono font-bold text-ink">Rp {Number(spk.estimasi_biaya || 0).toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={spk.status_spk} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-center">
                          {paidInv ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewInvoice(paidInv);
                              }}
                              title={`Lihat faktur ${paidInv.no_invoice}`}
                              aria-label={`Lihat faktur ${paidInv.no_invoice}`}
                              className="p-2 rounded-md bg-accent-subtle text-accent hover:bg-accent hover:text-white transition-colors inline-flex items-center gap-1.5 font-bold text-[11px]"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="hidden xl:inline">Lihat</span>
                            </button>
                          ) : (
                            <span className="text-ink-subtle">–</span>
                          )}
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
                            className="p-2 rounded-md border border-border bg-surface-raised text-ink-muted hover:text-accent hover:border-accent/40 transition-colors inline-flex items-center gap-1.5 font-bold text-[11px]"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="hidden xl:inline">Detail</span>
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: stacked card list (pengganti tabel di layar < md) */}
              <div className="block md:hidden space-y-2.5">
                {historyRows.map((spk) => {
                  const paidInv = myInvoiceList.find(
                    (inv) => inv.id_spk === spk.id &&
                      (inv.status_pembayaran === 'Paid' || inv.status_pembayaran === 'Lunas')
                  );
                  return (
                  <div key={spk.id} onClick={() => setHistoryDetail(spk)} className="rounded-md border border-border p-3.5 cursor-pointer hover:border-accent/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] font-bold text-accent">{spk.no_spk}</div>
                        <div className="text-base font-black text-ink mt-0.5">{spk.no_polisi}</div>
                      </div>
                      <StatusBadge status={spk.status_spk} size="sm" />
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-border space-y-1.5">
                      <p className="text-xs text-ink-muted leading-relaxed">{spk.keluhan_customer}</p>
                      <div className="flex items-center justify-between text-[11px] text-ink-subtle">
                        <span>Tanggal Masuk</span>
                        <span className="font-mono font-semibold text-ink-muted">
                          {new Date(spk.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-ink-subtle">
                        <span>Biaya</span>
                        <span className="font-mono font-bold text-ink">
                          Rp {Number(spk.estimasi_biaya || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {paidInv && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewInvoice(paidInv);
                        }}
                        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white font-bold text-xs transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat Faktur • {paidInv.no_invoice}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryDetail(spk);
                      }}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md border border-border bg-surface-raised hover:border-accent/40 text-ink-muted hover:text-accent font-bold text-xs transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Lihat Detail Service
                    </button>
                  </div>
                  );
                })}
              </div>

              <PaginationBar
                page={historyPage}
                totalPages={historyPageData?.pagination?.total_pages ?? 1}
                totalRecords={historyPageData?.pagination?.total_records ?? historyRows.length}
                limit={historyLimit}
                label="riwayat service"
                isLoading={historyFetching}
                onPageChange={setHistoryPage}
                onLimitChange={(l) => {
                  setHistoryLimit(l);
                  setHistoryPage(1);
                }}
              />
            </>
          ) : historyQuery ? (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-md bg-surface space-y-3">
              <div className="w-12 h-12 rounded-md bg-surface-raised text-ink-subtle flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Riwayat Tidak Ditemukan</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Tidak ada riwayat service yang cocok dengan pencarian{' '}
                  <span className="font-semibold text-ink">"{historyQuery}"</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistorySearch('')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-subtle text-accent text-xs font-bold rounded-md transition cursor-pointer"
              >
                <X className="w-4 h-4" /> Bersihkan Pencarian
              </button>
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-md bg-surface space-y-3">
              <div className="w-12 h-12 rounded-md bg-accent-subtle text-accent flex items-center justify-center mx-auto">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Belum Ada Riwayat Service</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Seluruh riwayat pengerjaan service armada Anda di Bengkel KIM 3 akan tercatat dan dapat ditinjau di sini.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL: Preview Faktur & Pembayaran */}
      {previewInvoice && (
        <ModalPortal onClose={() => setPreviewInvoice(null)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-surface-raised rounded-md border border-border shadow-2xl max-w-2xl w-full my-8 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">Faktur Pembayaran</h3>
                    <p className="text-[11px] text-ink-muted font-mono">{previewInvoice.no_invoice}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 rounded-md text-ink-subtle hover:text-ink-muted hover:bg-surface transition cursor-pointer"
                  aria-label="Tutup faktur"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-ink">{previewInvoice.no_polisi}</div>
                    <div className="text-xs text-ink-muted">
                      Invoice: {previewInvoice.tanggal_invoice ? new Date(previewInvoice.tanggal_invoice).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {previewInvoice.tanggal_bayar
                        ? `Lunas: ${new Date(previewInvoice.tanggal_bayar).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`
                        : 'Belum dibayar'}
                      {previewInvoice.metode_pembayaran ? ` • ${previewInvoice.metode_pembayaran}` : ''}
                    </div>
                  </div>
                  <StatusBadge status={previewInvoice.status_pembayaran} size="md" />
                </div>

                <div className="rounded-md border border-border bg-surface p-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-ink-muted">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold">Rp {Number(previewInvoice.subtotal || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center justify-between text-ink-muted">
                    <span>PPN</span>
                    <span className="font-mono font-semibold">Rp {Number(previewInvoice.ppn_nominal || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="font-bold text-ink text-sm">Grand Total</span>
                    <span className="font-mono font-black text-status-green text-sm">Rp {Number(previewInvoice.grand_total || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {(previewInvoice.status_pembayaran !== 'Paid' && previewInvoice.status_pembayaran !== 'Lunas') && (
                  <p className="text-[11px] text-status-amber font-semibold">
                    Menunggu pembayaran — tunjukkan nomor faktur ini ke Kasir.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPreviewInvoice(null)}
                    className="px-4 py-2.5 rounded-md border border-border hover:bg-surface text-ink font-bold text-xs transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintInvoice(true)}
                    className="px-4 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    CETAK STRUK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Struk thermal faktur (print / PDF via dialog browser) */}
      {showPrintInvoice && previewInvoice && (
        <PrintThermalInvoiceModal
          invoice={previewInvoice}
          onClose={() => setShowPrintInvoice(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH ARMADA KENDARAAN BARU                                     */}
      {/* ========================================================================= */}
      {openTambahArmadaModal && (
        <ModalPortal onClose={() => setOpenTambahArmadaModal(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
            <div className="bg-surface-raised rounded-md border border-border shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Tambah Unit Armada Baru</h3>
                  <p className="text-[11px] text-ink-muted">Daftarkan kendaraan operasional ke database Bengkel KIM 3</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenTambahArmadaModal(false)}
                className="p-1.5 rounded-md text-ink-subtle hover:text-ink-muted hover:bg-surface transition cursor-pointer"
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
              className="p-6 overflow-y-auto space-y-4"
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
                    className="w-full px-3.5 py-2 rounded-md border border-border text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">
                    Jenis Armada <span className="text-status-red">*</span>
                  </label>
                  <select
                    value={armadaForm.jenis_armada}
                    onChange={(e) => setArmadaForm({ ...armadaForm, jenis_armada: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-md border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised"
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
                    className="w-full px-3 py-2 rounded-md border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised"
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
                    className="w-full px-3 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-hidden"
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
                    className="w-full px-3 py-2 rounded-md border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden"
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
                    className="w-full px-3.5 py-2 rounded-md border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Nomor Mesin</label>
                  <input
                    type="text"
                    placeholder="J08E-..."
                    value={armadaForm.no_mesin}
                    onChange={(e) => setArmadaForm({ ...armadaForm, no_mesin: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-md border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden uppercase"
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
                    className="w-full px-3.5 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Masa Berlaku Asuransi</label>
                  <input
                    type="date"
                    value={armadaForm.masa_berlaku_asuransi}
                    onChange={(e) => setArmadaForm({ ...armadaForm, masa_berlaku_asuransi: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-md border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <PhotoUploader
                  label="Foto Unit Armada (Opsional)"
                  value={armadaForm.foto_kendaraan}
                  onChange={(url) => setArmadaForm({ ...armadaForm, foto_kendaraan: url })}
                />
                <p className="text-[11px] text-ink-subtle mt-1">
                  Foto tersimpan otomatis ke database (kompresi otomatis, maks. 15MB). Tampil di daftar armada setelah unit disimpan.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpenTambahArmadaModal(false)}
                  className="px-4 py-2.5 rounded-md border border-border text-xs font-bold text-ink-muted hover:bg-surface transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={tambahArmadaMutation.isPending}
                  className="px-5 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-md shadow-accent/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tambahArmadaMutation.isPending ? 'Menyimpan...' : 'Simpan Unit Armada'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UNGGAH DOKUMEN DIGITAL ARMADA                                   */}
      {/* ========================================================================= */}
      {openTambahDokumenModal && (
        <ModalPortal onClose={() => setOpenTambahDokumenModal(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
            <div className="bg-surface-raised rounded-md border border-border shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Unggah Dokumen Digital Armada</h3>
                  <p className="text-[11px] text-ink-muted">Simpan arsip STNK, KIR, BPKB, atau polis asuransi unit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenTambahDokumenModal(false)}
                className="p-1.5 rounded-md text-ink-subtle hover:text-ink-muted hover:bg-surface transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!dokumenForm.no_polisi || !dokumenForm.nama_dokumen.trim()) {
                  toast.warning('Pilih armada dan isi nama dokumen.');
                  return;
                }
                tambahDokumenMutation.mutate(dokumenForm);
              }}
              className="p-6 overflow-y-auto space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  Pilih Unit Armada <span className="text-status-red">*</span>
                </label>
                <select
                  required
                  value={dokumenForm.no_polisi}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, no_polisi: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-md border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised"
                >
                  <option value="">-- Pilih Nomor Polisi --</option>
                  {myKendaraanList.map((k) => (
                    <option key={k.id} value={k.no_polisi}>
                      {k.no_polisi} — {k.merk} {k.model}
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
                    className="w-full px-3 py-2 rounded-md border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-hidden bg-surface-raised"
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
                    className="w-full px-3 py-2 rounded-md border border-border text-xs font-mono focus:ring-2 focus:ring-accent focus:outline-hidden"
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
                  className="w-full px-3.5 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Catatan nomor seri atau barcode dokumen"
                  value={dokumenForm.keterangan}
                  onChange={(e) => setDokumenForm({ ...dokumenForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-hidden"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpenTambahDokumenModal(false)}
                  className="px-4 py-2.5 rounded-md border border-border text-xs font-bold text-ink-muted hover:bg-surface transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={tambahDokumenMutation.isPending}
                  className="px-5 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-md shadow-accent/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
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

    </div>
  );
};
