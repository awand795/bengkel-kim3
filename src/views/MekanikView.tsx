import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { SpkService } from '../types';
import { realtimeHub } from '../services/realtimeService';
import { 
  Play, 
  Square, 
  Pause, 
  PlusCircle, 
  Clock, 
  Wrench, 
  Package, 
  AlertCircle,
  CheckCircle,
  Check,
  X,
  Printer
} from 'lucide-react';
import { PrintSpkModal } from '../components/print/PrintSpkModal';
import { ModalPortal } from '../components/common/ModalPortal';
import { toast } from '../components/common/Toast';
import { isSpkAssignedToMechanic } from '../utils/spkAccess';

export const MekanikView: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser, authUser, currentRole } = useAppStore();
  const [activeTab, setActiveTab] = useState<'tugas' | 'riwayat'>('tugas');
  const [activeJob, setActiveJob] = useState<SpkService | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [jobTimerSeconds, setJobTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [autoPausedReason, setAutoPausedReason] = useState<string | null>(null);
  const [showTambahanModal, setShowTambahanModal] = useState(false);
  const [showPrintSpk, setShowPrintSpk] = useState<SpkService | null>(null);

  // Form Tambahan Pekerjaan State
  const [tambahanForm, setTambahanForm] = useState({
    deskripsi_tambahan: '',
    rekomendasi_perbaikan: '',
    estimasi_biaya_tambahan: 0,
    estimasi_waktu_tambahan_jam: 0,
    catatan: '',
  });

  // Queries
  const { data: spkList } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 8000,
  });

  const { data: sparepartList } = useQuery({
    queryKey: ['part-list'],
    queryFn: () => api.getPartSpk(),
  });

  // Filter SPK spesifik untuk Mekanik yang bertugas (kecuali Super Admin atau Foreman yang dapat melihat seluruh antrian bengkel).
  // Strict: hanya WO yang ditugaskan ke mekanik login (by ID, fallback nama persis).
  const mySpkList = (spkList || []).filter((s) => {
    if (currentRole === 'Super Admin' || currentRole === 'Foreman') return true;
    return isSpkAssignedToMechanic(s, authUser, currentUser);
  });

  // Auto select active job dynamically from mySpkList
  const myJob = (activeJobId ? mySpkList.find(s => s.id === activeJobId) : null)
    || (activeJob ? mySpkList.find(s => s.id === activeJob.id) || activeJob : null)
    || mySpkList.find(s => s.status_spk === 'Dalam Pengerjaan')
    || mySpkList[0];

  // 1. Realtime listener: auto-refresh spk-list on status changes across tabs/server
  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((event) => {
      if (
        event.type === 'SPK_STATUS_CHANGED' ||
        event.type === 'PART_READY' ||
        event.type === 'PURCHASE_REQUEST_CREATED'
      ) {
        queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // 2. Auto-pause / Auto-resume timer effect based on SPK status
  useEffect(() => {
    if (!myJob) return;

    const currentStatus = myJob.status_spk;

    // Auto-pause if status changes to Waiting Part or Pending
    if (currentStatus === 'Waiting Part' || currentStatus === 'Pending') {
      if (timerRunning) {
        setTimerRunning(false);
        setAutoPausedReason(currentStatus);
      }
    } 
    // Auto-resume if status changes back to Dalam Pengerjaan (and wasn't manually paused)
    else if (currentStatus === 'Dalam Pengerjaan') {
      if (autoPausedReason && !timerRunning && !isManualPaused) {
        setTimerRunning(true);
        setAutoPausedReason(null);
      }
    } 
    // Stop timer if finished or in QC
    else if (
      currentStatus === 'Waiting QC' || 
      currentStatus === 'QC Passed' || 
      currentStatus === 'FIR Closed' || 
      currentStatus === 'Selesai'
    ) {
      if (timerRunning) {
        setTimerRunning(false);
        setAutoPausedReason(null);
      }
    }
  }, [myJob?.status_spk, isManualPaused, timerRunning, autoPausedReason]);

  // 3. Second ticker timer effect
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setJobTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start Job Mutation
  const startJobMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      return api.updateSpkStatus({
        id: spk.id,
        status_spk: 'Dalam Pengerjaan',
      });
    },
    onSuccess: () => {
      setIsManualPaused(false);
      setAutoPausedReason(null);
      setTimerRunning(true);
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      toast.success('Pekerjaan dimulai/dilanjutkan! Timer pengerjaan berjalan otomatis.');
    },
    onError: (err: any) => toast.error('Gagal memulai pekerjaan: ' + (err?.message || 'Terjadi kesalahan.')),
  });

  // Finish Job Mutation
  const finishJobMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      return api.updateSpkStatus({
        id: spk.id,
        status_spk: 'Waiting QC',
      });
    },
    onSuccess: () => {
      setIsManualPaused(false);
      setAutoPausedReason(null);
      setTimerRunning(false);
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      toast.success('Pekerjaan Selesai (Finish Job)! Status beralih ke "Waiting QC" untuk diperiksa Foreman.');
    },
    onError: (err: any) => toast.error('Gagal menyelesaikan pekerjaan: ' + (err?.message || 'Terjadi kesalahan.')),
  });

  // Pause / Pending Part Mutation (Tahap 9 Excel)
  const pauseJobMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      return api.updateSpkStatus({
        id: spk.id,
        status_spk: 'Waiting Part',
      });
    },
    onSuccess: () => {
      setTimerRunning(false);
      setAutoPausedReason('Waiting Part');
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      toast.warning('Pekerjaan dijeda (Pause)! Status unit dialihkan ke "Waiting Part" menunggu suku cadang.');
    },
    onError: (err: any) => toast.error('Gagal menjeda pekerjaan: ' + (err?.message || 'Terjadi kesalahan.')),
  });

  // Submit Tambahan Pekerjaan
  const submitTambahanMutation = useMutation({
    mutationFn: async () => {
      if (!activeJob && !myJob) return;
      const targetSpk = activeJob || myJob;
      return api.ajukanTambahanPekerjaan({
        id_spk: targetSpk!.id,
        deskripsi_tambahan: tambahanForm.deskripsi_tambahan,
        rekomendasi_perbaikan: tambahanForm.rekomendasi_perbaikan,
        estimasi_biaya_tambahan: tambahanForm.estimasi_biaya_tambahan,
        estimasi_waktu_tambahan_jam: tambahanForm.estimasi_waktu_tambahan_jam,
        diajukan_oleh_mekanik: currentUser,
        diverifikasi_foreman: myJob?.nama_foreman || undefined,
        catatan: tambahanForm.catatan,
      });
    },
    onSuccess: () => {
      setShowTambahanModal(false);
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      toast.success('Pekerjaan Tambahan berhasil disubmit dan menunggu approval.');
    },
    onError: (err: any) => toast.error('Gagal mengajukan pekerjaan tambahan: ' + (err?.message || 'Terjadi kesalahan.')),
  });

  return (
    <div className="space-y-4 max-w-[480px] mx-auto mb-20 bg-surface min-h-screen relative shadow-[0_0_15px_rgba(0,0,0,0.05)]">
      
      {/* Header Mobile App Style */}
      <div className="bg-surface-raised px-4 py-3 shadow-xs border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-black text-ink">Mekanik Bengkel (Tablet / HP)</h1>
            <p className="text-xs text-ink-muted">Mekanik: {currentUser} | Mode Touchscreen</p>
          </div>
        </div>

        {/* Live Job Timer Badge */}
        <div className="flex items-center justify-between bg-ink text-white px-3.5 py-2 rounded-md font-mono text-xs sm:text-sm font-bold shadow-xs mt-2">
          <div className="flex items-center gap-2">
            {timerRunning ? (
              <Clock className="w-4 h-4 text-status-green animate-spin" />
            ) : (
              <Pause className="w-4 h-4 text-status-amber" />
            )}
            <span>{formatTimer(jobTimerSeconds)}</span>
          </div>
          <div>
            {timerRunning ? (
              <span className="text-[10px] uppercase font-bold tracking-wider bg-status-green/30 text-status-green border border-status-green/40 px-2 py-0.5 rounded-full">
                ● Berjalan
              </span>
            ) : myJob?.status_spk === 'Waiting Part' || myJob?.status_spk === 'Pending' ? (
              <span className="text-[10px] uppercase font-bold tracking-wider bg-status-amber/30 text-status-amber border border-status-amber/40 px-2 py-0.5 rounded-full animate-pulse">
                Auto-Paused ({myJob.status_spk})
              </span>
            ) : isManualPaused ? (
              <span className="text-[10px] uppercase font-bold tracking-wider bg-ink/80 text-surface/80 px-2 py-0.5 rounded-full">
                Dijeda Manual
              </span>
            ) : (
              <span className="text-[10px] uppercase font-bold tracking-wider bg-ink/80 text-surface/70 px-2 py-0.5 rounded-full">
                Siap
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Job Switcher (Chips Carousel) */}
      {mySpkList && mySpkList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-ink-muted whitespace-nowrap">Pilih Pekerjaan:</span>
          {mySpkList.map((job) => {
            const isSelected = (activeJobId || myJob?.id) === job.id;
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => {
                  setActiveJob(job);
                  setActiveJobId(job.id);
                  setIsManualPaused(false);
                  setAutoPausedReason(null);
                  setTimerRunning(job.status_spk === 'Dalam Pengerjaan');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-ink text-white border-ink shadow-xs'
                    : 'bg-surface-raised text-ink-muted border-border hover:border-border'
                }`}
              >
                <span>{job.no_polisi}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  job.status_spk === 'Dalam Pengerjaan' ? 'bg-status-blue text-white' : 'bg-surface text-ink'
                }`}>
                  {job.status_spk}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {myJob ? (
        <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs space-y-5">
          
          {/* WO Header Banner */}
          <div className="p-4 rounded-md bg-ink text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-white/70 uppercase tracking-widest font-bold">Active Work Order</span>
              <div className="text-xl sm:text-2xl font-black font-mono mt-0.5">{myJob.no_spk}</div>
              <div className="text-xs text-white/70 font-semibold">{myJob.no_polisi} - {myJob.nama_customer}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintSpk(myJob)}
                className="px-3 py-1.5 rounded-md bg-surface-raised/20 hover:bg-surface-raised/30 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                title="Cetak SPK / Lembar Kerja A4"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak SPK (A4)
              </button>
              <StatusBadge status={myJob.status_spk} size="md" />
            </div>
          </div>

          {/* Keluhan & Detail Instruksi */}
          <div className="bg-surface p-4 rounded-md border border-border text-xs space-y-2">
            <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px] block">Keluhan dari Customer & SA:</span>
            <p className="text-sm font-semibold text-ink leading-relaxed">
              "{myJob.keluhan_customer || 'Pemeriksaan rem dan pergantian oli berkala'}"
            </p>
            <div className="pt-2 border-t border-border flex flex-wrap gap-4 text-ink-muted">
              <span>Odometer: <strong>{myJob.odometer_km?.toLocaleString()} KM</strong></span>
              <span>Foreman: <strong>{myJob.nama_foreman || 'Belum Ditugaskan'}</strong></span>
              <span>Lead Time: <strong>{myJob.lead_time_jam} Jam</strong></span>
            </div>
          </div>

          {/* Banner Menunggu Part / Pending (Tahap 9 Excel) */}
          {(myJob.status_spk === 'Waiting Part' || myJob.status_spk === 'Pending') && (
            <div className="p-4 rounded-md bg-status-amber-bg border border-status-amber/30 text-status-amber flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-status-amber-bg text-status-amber flex items-center justify-center shrink-0 mt-0.5">
                <Pause className="w-5 h-5 text-status-amber" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>Pekerjaan Dijeda: Menunggu Part ({myJob.status_spk})</span>
                  <span className="text-[10px] bg-status-amber/20 text-status-amber font-extrabold px-2 py-0.5 rounded-full">
                    TIMER AUTO-PAUSED
                  </span>
                </div>
                <p className="text-xs text-status-amber leading-relaxed">
                  Status unit dialihkan ke <strong>{myJob.status_spk}</strong> karena menunggu ketersediaan suku cadang. Timer pengerjaan otomatis dijeda dan akan melanjutkan otomatis saat status kembali ke <strong>Dalam Pengerjaan</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons: START / RESUME / PAUSE / FINISH JOB (Tahap 7, 9 & 10) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {myJob.status_spk === 'Waiting Part' || myJob.status_spk === 'Pending' ? (
              <button
                type="button"
                disabled={startJobMutation.isPending}
                onClick={() => {
                  setIsManualPaused(false);
                  setAutoPausedReason(null);
                  startJobMutation.mutate(myJob);
                }}
                className="py-3.5 rounded-md bg-accent hover:bg-accent-hover text-white font-black text-sm shadow-md shadow-accent/20 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> RESUME JOB (LANJUTKAN PEKERJAAN)
              </button>
            ) : !timerRunning ? (
              <button
                type="button"
                disabled={startJobMutation.isPending}
                onClick={() => {
                  setIsManualPaused(false);
                  setAutoPausedReason(null);
                  if (myJob.status_spk === 'Dalam Pengerjaan') {
                    setTimerRunning(true);
                  } else {
                    startJobMutation.mutate(myJob);
                  }
                }}
                className="py-3.5 rounded-md bg-accent hover:bg-accent-hover text-white font-black text-sm shadow-md shadow-accent/20 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> {isManualPaused ? 'RESUME JOB (LANJUTKAN)' : 'START JOB (MULAI PEKERJAAN)'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={finishJobMutation.isPending}
                  onClick={() => finishJobMutation.mutate(myJob)}
                  className="flex-1 py-3.5 rounded-md bg-status-green hover:bg-status-green/90 text-white font-black text-xs sm:text-sm shadow-md shadow-status-green/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> FINISH (QC)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualPaused(true);
                    setTimerRunning(false);
                  }}
                  className="py-3.5 px-3 rounded-md bg-surface border border-border hover:bg-surface-raised text-ink-muted font-bold text-xs transition-all flex items-center justify-center gap-1"
                  title="Pause manual (istirahat / kendala teknis)"
                >
                  <Pause className="w-4 h-4" /> PAUSE
                </button>
                <button
                  type="button"
                  disabled={pauseJobMutation.isPending}
                  onClick={() => pauseJobMutation.mutate(myJob)}
                  className="py-3.5 px-3 rounded-md bg-status-amber hover:bg-status-amber/90 text-white font-bold text-xs shadow-md shadow-status-amber/20 transition-all flex items-center justify-center gap-1"
                  title="Pause / Pending karena menunggu sparepart"
                >
                  <Pause className="w-4 h-4" /> NUNGGU PART
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveJob(myJob);
                setShowTambahanModal(true);
              }}
              className="py-3.5 rounded-md bg-status-amber-bg hover:bg-status-amber/10 text-status-amber border border-status-amber/30 font-black text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5 text-status-amber" /> + TAMBAHAN PEKERJAAN
            </button>
          </div>

          {/* Permintaan Sparepart Tab (image1.png Mockup Mekanik) */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Package className="w-4 h-4 text-accent" /> Sparepart Terkait Pekerjaan Ini:
              </span>
              <span className="text-[11px] text-ink-subtle">Ambil di Gudang KIM3</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-border text-xs">
                <div>
                  <div className="font-bold text-ink">Brake Pad / Kampas Rem Depan (Canter)</div>
                  <div className="text-[11px] text-ink-muted font-mono">Kode: SP-001 | Qty: 2 Set</div>
                </div>
                <span className="px-2.5 py-1 bg-status-green-bg text-status-green font-bold rounded-md text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ready di Stock
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-border text-xs">
                <div>
                  <div className="font-bold text-ink">Oli Rimula R4 10W-40 (4L)</div>
                  <div className="text-[11px] text-ink-muted font-mono">Kode: SP-045 | Qty: 1 Galon</div>
                </div>
                <span className="px-2.5 py-1 bg-status-green-bg text-status-green font-bold rounded-md text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ready di Stock
                </span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="p-12 bg-surface-raised rounded-md border border-border text-center text-ink-subtle text-xs">
          Belum ada SPK yang ditugaskan ke Anda hari ini.
        </div>
      )}

      {/* MODAL TAMBAHAN PEKERJAAN (image1.png Tahap 8) */}
      {showTambahanModal && (
        <ModalPortal onClose={() => setShowTambahanModal(false)}>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface-raised rounded-t-md sm:rounded-md p-5 sm:p-6 max-w-lg w-full shadow-xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Form Tambahan Pekerjaan (If Needed)</h3>
                <p className="text-xs text-ink-muted">Mekanik menemukan kerusakan tambahan saat pengerjaan</p>
              </div>
              <button
                onClick={() => setShowTambahanModal(false)}
                className="p-1.5 rounded-md text-ink-subtle hover:text-ink-muted hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  Deskripsi Temuan Kerusakan Tambahan:
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Ditemukan kebocoran oli pada seal power steering & as roda"
                  value={tambahanForm.deskripsi_tambahan}
                  onChange={(e) => setTambahanForm({ ...tambahanForm, deskripsi_tambahan: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  Rekomendasi Tindakan & Part:
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: 1. Ganti Seal Oli Power Steering&#10;2. Kuras & Tambah Oli Power Steering"
                  value={tambahanForm.rekomendasi_perbaikan}
                  onChange={(e) => setTambahanForm({ ...tambahanForm, rekomendasi_perbaikan: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Estimasi Biaya Tambahan (Rp)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 290000"
                    value={tambahanForm.estimasi_biaya_tambahan || ''}
                    onChange={(e) => setTambahanForm({ ...tambahanForm, estimasi_biaya_tambahan: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-md border border-border font-mono font-bold text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Waktu Tambahan (Jam)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 1"
                    value={tambahanForm.estimasi_waktu_tambahan_jam || ''}
                    onChange={(e) => setTambahanForm({ ...tambahanForm, estimasi_waktu_tambahan_jam: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-md border border-border font-mono font-bold text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">Catatan Tambahan untuk Customer & SA</label>
                <input
                  type="text"
                  placeholder="Contoh: Perlu diganti agar tidak merembes ke belt alternator."
                  value={tambahanForm.catatan}
                  onChange={(e) => setTambahanForm({ ...tambahanForm, catatan: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTambahanModal(false)}
                className="flex-1 py-2.5 bg-surface hover:bg-surface-raised border border-border text-ink-muted font-bold text-xs rounded-md"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitTambahanMutation.isPending}
                onClick={() => submitTambahanMutation.mutate()}
                className="flex-1 py-2.5 bg-status-amber hover:bg-status-amber/90 text-white font-bold text-xs rounded-md shadow-md shadow-status-amber/20"
              >
                {submitTambahanMutation.isPending ? 'Mengirim...' : 'KIRIM KE FOREMAN & SA'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Printable SPK A4 Modal */}
      {showPrintSpk && (
        <PrintSpkModal
          spk={showPrintSpk}
          onClose={() => setShowPrintSpk(null)}
        />
      )}

    </div>
  );
};
