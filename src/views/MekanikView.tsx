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
import { StepModal } from '../components/common/StepModal';
import { EmptyState } from '../components/common/EmptyState';

// Status WO yang sudah selesai dikerjakan mekanik: aksi kerja dikunci,
// tampil panel selesai (menunggu QC/closed).
const FINISHED_STATUSES = ['Waiting QC', 'QC Passed', 'FIR Closed', 'Selesai'];

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
  const [tambahanStep, setTambahanStep] = useState(1);
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

  // Auto select active job dynamically from mySpkList.
  // Prioritas: WO terbit siap dikerjakan, lalu yang sedang berjalan,
  // lalu WO aktif lainnya; terakhir yang sudah selesai.
  const myJob = (activeJobId ? mySpkList.find(s => s.id === activeJobId) : null)
    || (activeJob ? mySpkList.find(s => s.id === activeJob.id) || activeJob : null)
    || mySpkList.find(s => s.status_spk === 'Estimasi Disetujui')
    || mySpkList.find(s => s.status_spk === 'Dalam Pengerjaan')
    || mySpkList.find(s => !FINISHED_STATUSES.includes(s.status_spk as string))
    || mySpkList[0];

  // Status sebagai string polos (mencakup nilai legacy di luar union tipe)
  const myJobStatus: string = myJob?.status_spk || '';

  // Sparepart REAL inputan Foreman untuk WO aktif (tanpa data dummy).
  // START terkunci sampai daftar ini terisi (gerbang Excel tahap 5 -> 7).
  const myJobParts = (sparepartList || []).filter((p) => myJob && p.id_spk === myJob.id);

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
    <div className="space-y-5 max-w-3xl mx-auto mb-20 min-h-screen relative font-sans">
      
      {/* Header Cockpit App Style */}
      <div className="card-modern bg-surface-raised p-4 rounded-xl border border-border shadow-xs sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse"></span>
              <h1 className="text-base sm:text-lg font-black text-ink">Mekanik Bengkel</h1>
            </div>
            <p className="text-xs text-ink-muted">Mekanik: <strong className="text-ink">{currentUser}</strong> • Mode Sentuh (Touchscreen Tablet / HP)</p>
          </div>
        </div>

        {/* Live Job Timer Badge */}
        <div className="flex items-center justify-between flex-wrap gap-2 bg-surface text-ink px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold shadow-xs mt-3 border border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            {timerRunning ? (
              <Clock className="w-4 h-4 text-status-green shrink-0" />
            ) : (
              <Pause className="w-4 h-4 text-status-amber shrink-0" />
            )}
            <span className="truncate text-base font-bold tracking-wider">{formatTimer(jobTimerSeconds)}</span>
          </div>
          <div className="shrink-0 max-w-full">
            {timerRunning ? (
              <span className="text-xs uppercase font-bold tracking-wider bg-status-green-bg text-status-green border border-status-green/30 px-2.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-green"></span>
                Berjalan
              </span>
            ) : myJob?.status_spk === 'Waiting Part' || myJob?.status_spk === 'Pending' ? (
              <span className="text-xs uppercase font-bold tracking-wider bg-status-amber-bg text-status-amber border border-status-amber/30 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                Dijeda ({myJob.status_spk})
              </span>
            ) : isManualPaused ? (
              <span className="text-xs uppercase font-bold tracking-wider bg-surface-raised text-ink-muted border border-border px-2.5 py-0.5 rounded-full whitespace-nowrap">
                Dijeda Manual
              </span>
            ) : (
              <span className="text-xs uppercase font-bold tracking-wider bg-surface-raised text-ink-subtle border border-border px-2.5 py-0.5 rounded-full whitespace-nowrap">
                Siap
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Job Switcher (Chips Carousel) */}
      {mySpkList && mySpkList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <span className="text-xs font-bold text-ink-muted whitespace-nowrap shrink-0">Pilih Pekerjaan:</span>
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
                className={`px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all border flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-accent text-white border-accent shadow-xs'
                    : 'bg-surface-raised text-ink-muted border-border hover:border-accent/40'
                }`}
              >
                <span>{job.no_polisi}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  job.status_spk === 'Dalam Pengerjaan' ? 'bg-white text-accent' : 'bg-surface text-ink'
                }`}>
                  {job.status_spk}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {myJob ? (
        <div className="card-modern bg-surface-raised rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-5">
          
          {/* WO Header Banner */}
          <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="min-w-0">
              <span className="text-xs text-accent uppercase tracking-widest font-extrabold">Active Work Order</span>
              <div className="text-xl sm:text-2xl font-black font-mono mt-0.5 break-all tracking-tight text-ink">{myJob.no_spk}</div>
              <div className="text-xs text-ink-muted font-semibold truncate mt-0.5">{myJob.no_polisi} • {myJob.nama_customer}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setShowPrintSpk(myJob)}
                className="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface text-ink font-bold text-xs flex items-center gap-1.5 transition-colors border border-border shadow-xs cursor-pointer"
                title="Cetak SPK / Lembar Kerja A4"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak SPK (A4)
              </button>
              <StatusBadge status={myJob.status_spk} size="md" />
            </div>
          </div>

          {/* Keluhan & Detail Instruksi */}
          <div className="bg-surface p-4 rounded-md border border-border text-xs space-y-2">
            <span className="font-bold text-ink-muted uppercase tracking-wider text-xs block">Keluhan dari Customer & SA:</span>
            <p className="text-sm font-semibold text-ink leading-relaxed">
              "{myJob.keluhan_customer || 'Belum ada catatan keluhan'}"
            </p>
            {myJob.catatan_foreman && (
              <div className="pt-2 border-t border-border">
                <span className="font-bold text-ink-muted uppercase tracking-wider text-xs block mb-1">Instruksi Hasil Pengecekan Foreman:</span>
                <p className="text-xs text-ink leading-relaxed whitespace-pre-line">{myJob.catatan_foreman}</p>
              </div>
            )}
            <div className="pt-2 border-t border-border flex flex-wrap gap-4 text-ink-muted">
              <span>Odometer: <strong>{myJob.odometer_km?.toLocaleString()} KM</strong></span>
              <span>Foreman: <strong>{myJob.nama_foreman || 'Belum Ditugaskan'}</strong></span>
              <span>Lead Time: <strong>{myJob.estimasi_waktu_jam || myJob.lead_time_jam ? `${myJob.estimasi_waktu_jam || myJob.lead_time_jam} Jam` : '-'}</strong></span>
            </div>
          </div>

          {/* Banner Menunggu Part / Pending (Tahap 9 Excel) */}
          {(myJob.status_spk === 'Waiting Part' || myJob.status_spk === 'Pending') && (
            <div className="p-4 rounded-md bg-status-amber-bg border border-status-amber/30 text-status-amber flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-status-amber-bg text-status-amber flex items-center justify-center shrink-0 mt-0.5">
                <Pause className="w-5 h-5 text-status-amber" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="font-bold text-sm flex flex-wrap items-center gap-2">
                  <span className="break-words">Pekerjaan Dijeda: Menunggu Part ({myJob.status_spk})</span>
                  <span className="text-xs bg-status-amber/20 text-status-amber font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap">
                    TIMER AUTO-PAUSED
                  </span>
                </div>
                <p className="text-xs text-status-amber leading-relaxed">
                  Status unit dialihkan ke <strong>{myJob.status_spk}</strong> karena menunggu ketersediaan suku cadang. Timer pengerjaan otomatis dijeda dan akan melanjutkan otomatis saat status kembali ke <strong>Dalam Pengerjaan</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons: START / RESUME / PAUSE / FINISH JOB (Tahap 7, 9 & 10).
              WO finished (Waiting QC ke atas): aksi dikunci, tampil panel selesai. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {FINISHED_STATUSES.includes(myJobStatus) ? (
              <div className="p-4 rounded-xl bg-status-green-bg border border-status-green/30 text-status-green">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle className="w-5 h-5 shrink-0" /> Pekerjaan Selesai
                </div>
                <p className="text-xs mt-1.5 leading-relaxed">
                  {myJobStatus === 'Waiting QC' && 'Unit telah Anda selesaikan dan sedang menunggu inspeksi QC oleh Foreman. Tidak ada aksi tersisa di sini.'}
                  {myJobStatus === 'QC Passed' && 'QC lulus. Menunggu final check oleh SA.'}
                  {(myJobStatus === 'FIR Closed' || myJobStatus === 'Selesai') && 'Work order closed. Terima kasih.'}
                </p>
              </div>
            ) : myJob.status_spk === 'Waiting Part' || myJob.status_spk === 'Pending' ? (
              <button
                type="button"
                disabled={startJobMutation.isPending}
                onClick={() => {
                  setIsManualPaused(false);
                  setAutoPausedReason(null);
                  startJobMutation.mutate(myJob);
                }}
                className="py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-black text-sm shadow-md shadow-accent/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Play className="w-5 h-5 fill-current" /> RESUME JOB (LANJUTKAN PEKERJAAN)
              </button>
            ) : myJob.status_spk === 'Estimasi Disetujui' || (myJob.status_spk === 'Dalam Pengerjaan' && !timerRunning) ? (
              myJob.status_spk === 'Estimasi Disetujui' && myJobParts.length === 0 ? (
              // Gerbang Excel tahap 5 -> 7: WO terbit tapi Foreman belum input
              // sparepart -> START terkunci sampai daftar kebutuhan tersedia.
              <div className="py-3.5 px-4 rounded-xl bg-status-amber-bg border border-dashed border-status-amber/40 text-status-amber text-xs font-bold flex items-center justify-center gap-2 text-center">
                <Package className="w-4 h-4 shrink-0" />
                <span>START terkunci: Foreman belum menginput sparepart kebutuhan WO ini.</span>
              </div>
              ) : (
              <button
                type="button"
                disabled={startJobMutation.isPending}
                onClick={() => {
                  setIsManualPaused(false);
                  setAutoPausedReason(null);
                  if (myJob.status_spk === 'Dalam Pengerjaan') {
                    // Lanjutkan timer lokal (status sudah berjalan)
                    setTimerRunning(true);
                  } else {
                    // Gerbang Excel tahap 7: WO terbit (Estimasi Disetujui) + part tersedia → start job + timer
                    startJobMutation.mutate(myJob);
                  }
                }}
                className="py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-black text-sm shadow-md shadow-accent/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Play className="w-5 h-5 fill-current" /> {myJob.status_spk === 'Estimasi Disetujui' ? 'START JOB (MULAI PEKERJAAN)' : 'RESUME JOB (LANJUTKAN)'}
              </button>
              )
            ) : !timerRunning ? (
              // WO belum terbit: pengecekan / estimasi / approval / QC / selesai.
              // Mekanik tidak bisa start — tampilkan penahan informatif.
              <div className="py-3.5 px-4 rounded-xl bg-surface border border-dashed border-border text-ink-muted text-xs font-semibold flex items-center justify-center gap-2 text-center">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  {myJobStatus === 'Menunggu Pengecekan Mekanik' && 'Menunggu pengecekan & input hasil oleh Foreman'}
                  {myJobStatus === 'Estimasi Dibuat' && 'Menunggu estimasi biaya & waktu oleh SA'}
                  {(myJobStatus === 'Menunggu Approval Customer' || myJobStatus === 'Waiting Approval') && 'Menunggu persetujuan estimasi oleh Customer'}
                  {!['Menunggu Pengecekan Mekanik', 'Estimasi Dibuat', 'Menunggu Approval Customer', 'Waiting Approval'].includes(myJobStatus) && `Status "${myJobStatus}" — WO belum siap dikerjakan`}
                </span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={finishJobMutation.isPending}
                  onClick={() => finishJobMutation.mutate(myJob)}
                  className="flex-1 min-h-[48px] py-3.5 rounded-xl bg-status-green hover:bg-status-green/90 text-white font-black text-xs sm:text-sm shadow-md shadow-status-green/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" /> FINISH (QC)
                </button>
                <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsManualPaused(true);
                    setTimerRunning(false);
                  }}
                  className="flex-1 sm:flex-none min-h-[48px] py-3.5 px-3.5 rounded-xl bg-surface border border-border hover:bg-surface-raised text-ink-muted font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Pause manual (istirahat / kendala teknis)"
                >
                  <Pause className="w-4 h-4 shrink-0" /> PAUSE
                </button>
                <button
                  type="button"
                  disabled={pauseJobMutation.isPending}
                  onClick={() => pauseJobMutation.mutate(myJob)}
                  className="flex-1 sm:flex-none min-h-[48px] py-3.5 px-3.5 rounded-xl bg-status-amber hover:bg-status-amber/90 text-white font-bold text-xs shadow-md shadow-status-amber/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Pause / Pending karena menunggu sparepart"
                >
                  <Pause className="w-4 h-4 shrink-0" /> NUNGGU PART
                </button>
                </div>
              </div>
            )}

            {!FINISHED_STATUSES.includes(myJobStatus) && (
            <button
              type="button"
              onClick={() => {
                setActiveJob(myJob);
                setTambahanStep(1);
                setShowTambahanModal(true);
              }}
              className="py-3.5 rounded-xl bg-status-amber-bg/60 hover:bg-status-amber-bg text-status-amber border border-status-amber/40 font-black text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <PlusCircle className="w-5 h-5 text-status-amber" /> + TAMBAHAN PEKERJAAN
            </button>
            )}
          </div>

          {/* Sparepart inputan Foreman untuk WO ini (data real dari server) */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Package className="w-4 h-4 text-accent" /> Sparepart Terkait Pekerjaan Ini:
              </span>
              <span className="text-xs text-ink-subtle">
                {myJobParts.length > 0 ? `${myJobParts.length} item dari Foreman` : 'Ambil di Gudang KIM3'}
              </span>
            </div>

            {myJobParts.length > 0 ? (
              <div className="space-y-2">
                {myJobParts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-md bg-surface border border-border text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-ink truncate">{p.nama_part}</div>
                      <div className="text-xs text-ink-muted font-mono">Kode: {p.kode_part || '-'} | Qty: {p.jumlah} {p.satuan}</div>
                    </div>
                    <span className={`px-2.5 py-1 font-bold rounded-md text-xs flex items-center gap-1 whitespace-nowrap shrink-0 ${p.status_ketersediaan === 'Ready di Stock' ? 'bg-status-green-bg text-status-green' : 'bg-status-amber-bg text-status-amber'}`}>
                      <Check className="w-3.5 h-3.5 shrink-0" /> {p.status_ketersediaan || '-'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-md bg-status-amber-bg border border-dashed border-status-amber/40 text-status-amber text-xs font-semibold text-center">
                Belum ada sparepart diinput Foreman untuk WO ini. START terkunci sampai Foreman menginput kebutuhan part — hubungi Foreman.
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Tidak Ada SPK Ditugaskan"
          description="Belum ada SPK yang ditugaskan ke Anda hari ini. Tunggu distribusi pekerjaan dari Foreman."
        />
      )}

      {/* STEP MODAL TAMBAHAN PEKERJAAN */}
      {showTambahanModal && (
        <StepModal
          open={showTambahanModal}
          onClose={() => {
            setShowTambahanModal(false);
            setTambahanStep(1);
          }}
          title="Pengajuan Pekerjaan Tambahan"
          subtitle={`Unit ${activeJob?.no_polisi || myJob?.no_polisi || ''} • Foreman: ${myJob?.nama_foreman || 'Foreman'}`}
          currentStep={tambahanStep}
          onNext={() => setTambahanStep(2)}
          onBack={() => setTambahanStep(1)}
          onSubmit={() => submitTambahanMutation.mutate()}
          submitLabel="Kirim ke Foreman & SA"
          isPending={submitTambahanMutation.isPending}
          size="md"
          steps={[
            {
              id: 'kerusakan',
              label: 'Temuan Kerusakan',
              isValid: Boolean(tambahanForm.deskripsi_tambahan.trim() && tambahanForm.rekomendasi_perbaikan.trim()),
              content: (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-ink-muted mb-1.5">
                      Deskripsi Temuan Kerusakan Tambahan <span className="text-status-red">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Contoh: Ditemukan kebocoran oli pada seal power steering & as roda"
                      value={tambahanForm.deskripsi_tambahan}
                      onChange={(e) => setTambahanForm({ ...tambahanForm, deskripsi_tambahan: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-ink text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-muted mb-1.5">
                      Rekomendasi Tindakan & Part <span className="text-status-red">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Contoh: 1. Ganti Seal Oli Power Steering&#10;2. Kuras & Tambah Oli Power Steering"
                      value={tambahanForm.rekomendasi_perbaikan}
                      onChange={(e) => setTambahanForm({ ...tambahanForm, rekomendasi_perbaikan: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-ink text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                  </div>
                </div>
              ),
            },
            {
              id: 'estimasi',
              label: 'Estimasi & Catatan',
              isValid: true,
              content: (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink-muted mb-1.5">Estimasi Biaya Tambahan (Rp)</label>
                      <input
                        type="number"
                        placeholder="Contoh: 290000"
                        value={tambahanForm.estimasi_biaya_tambahan || ''}
                        onChange={(e) => setTambahanForm({ ...tambahanForm, estimasi_biaya_tambahan: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-ink font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink-muted mb-1.5">Waktu Tambahan (Jam)</label>
                      <input
                        type="number"
                        placeholder="Contoh: 1"
                        value={tambahanForm.estimasi_waktu_tambahan_jam || ''}
                        onChange={(e) => setTambahanForm({ ...tambahanForm, estimasi_waktu_tambahan_jam: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-ink font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-muted mb-1.5">Catatan Tambahan untuk Customer & SA</label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Perlu diganti agar tidak merembes ke belt alternator."
                      value={tambahanForm.catatan}
                      onChange={(e) => setTambahanForm({ ...tambahanForm, catatan: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
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
