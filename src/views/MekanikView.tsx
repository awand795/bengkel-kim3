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

export const MekanikView: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'tugas' | 'riwayat'>('tugas');
  const [activeJob, setActiveJob] = useState<SpkService | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [jobTimerSeconds, setJobTimerSeconds] = useState(3600); // 1 hour simulated
  const [timerRunning, setTimerRunning] = useState(false);
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [autoPausedReason, setAutoPausedReason] = useState<string | null>(null);
  const [showTambahanModal, setShowTambahanModal] = useState(false);
  const [showPrintSpk, setShowPrintSpk] = useState<SpkService | null>(null);

  // Form Tambahan Pekerjaan State (image1.png Mockup 6)
  const [tambahanForm, setTambahanForm] = useState({
    deskripsi_tambahan: 'Ditemukan kebocoran oli pada seal power steering & as roda',
    rekomendasi_perbaikan: '1. Ganti Seal Oli Power Steering\n2. Kuras & Tambah Oli Power Steering',
    estimasi_biaya_tambahan: 290000,
    estimasi_waktu_tambahan_jam: 1,
    catatan: 'Perlu diganti agar tidak merembes ke belt alternator.',
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

  // Auto select active job dynamically from spkList
  const myJob = (activeJobId ? spkList?.find(s => s.id === activeJobId) : null)
    || (activeJob ? spkList?.find(s => s.id === activeJob.id) || activeJob : null)
    || spkList?.find(s => s.nama_mekanik?.includes(currentUser) || s.status_spk === 'Dalam Pengerjaan')
    || spkList?.[0];

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
      alert('Pekerjaan dimulai/dilanjutkan! Timer pengerjaan berjalan otomatis.');
    },
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
      alert('Pekerjaan Selesai (Finish Job)! Status otomatis beralih ke "Waiting QC" untuk diperiksa Foreman.');
    },
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
      alert('Pekerjaan dijeda (Pause)! Status unit dialihkan ke "Waiting Part (Pending)" untuk menunggu suku cadang.');
    },
    onError: (err: any) => alert('Gagal menjeda pekerjaan: ' + err?.message),
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
        diverifikasi_foreman: myJob?.nama_foreman || 'Foreman',
        catatan: tambahanForm.catatan,
      });
    },
    onSuccess: () => {
      setShowTambahanModal(false);
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      alert('Pekerjaan Tambahan berhasil disubmit dan menunggu approval.');
    },
  });

  return (
    <div className="space-y-4 max-w-[480px] mx-auto mb-20 bg-slate-50 min-h-screen relative shadow-[0_0_15px_rgba(0,0,0,0.05)]">
      
      {/* Header Mobile App Style */}
      <div className="bg-white px-4 py-3 shadow-xs border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900">Mekanik Bengkel (Tablet / HP)</h1>
            <p className="text-xs text-slate-500">Mekanik: {currentUser} | Mode Touchscreen</p>
          </div>
        </div>

        {/* Live Job Timer Badge */}
        <div className="flex items-center justify-between bg-slate-900 text-white px-3.5 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold shadow-xs mt-2">
          <div className="flex items-center gap-2">
            {timerRunning ? (
              <Clock className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : (
              <Pause className="w-4 h-4 text-amber-400" />
            )}
            <span>{formatTimer(jobTimerSeconds)}</span>
          </div>
          <div>
            {timerRunning ? (
              <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                ● Berjalan
              </span>
            ) : myJob?.status_spk === 'Waiting Part' || myJob?.status_spk === 'Pending' ? (
              <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/30 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full animate-pulse">
                Auto-Paused ({myJob.status_spk})
              </span>
            ) : isManualPaused ? (
              <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                Dijeda Manual
              </span>
            ) : (
              <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                Siap
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Job Switcher (Chips Carousel) */}
      {spkList && spkList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Pilih Pekerjaan:</span>
          {spkList.map((job) => {
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{job.no_polisi}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  job.status_spk === 'Dalam Pengerjaan' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {job.status_spk}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {myJob ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          
          {/* WO Header Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-blue-300 uppercase tracking-widest font-bold">Active Work Order</span>
              <div className="text-xl sm:text-2xl font-black font-mono mt-0.5">{myJob.no_spk}</div>
              <div className="text-xs text-slate-300 font-semibold">{myJob.no_polisi} - {myJob.nama_customer}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintSpk(myJob)}
                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                title="Cetak SPK / Lembar Kerja A4"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak SPK (A4)
              </button>
              <StatusBadge status={myJob.status_spk} size="md" />
            </div>
          </div>

          {/* Keluhan & Detail Instruksi */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">Keluhan dari Customer & SA:</span>
            <p className="text-sm font-semibold text-slate-900 leading-relaxed">
              "{myJob.keluhan_customer || 'Pemeriksaan rem dan pergantian oli berkala'}"
            </p>
            <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-4 text-slate-600">
              <span>Odometer: <strong>{myJob.odometer_km?.toLocaleString()} KM</strong></span>
              <span>Foreman: <strong>{myJob.nama_foreman || 'Foreman'}</strong></span>
              <span>Lead Time: <strong>{myJob.lead_time_jam} Jam</strong></span>
            </div>
          </div>

          {/* Banner Menunggu Part / Pending (Tahap 9 Excel) */}
          {(myJob.status_spk === 'Waiting Part' || myJob.status_spk === 'Pending') && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Pause className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm flex items-center gap-2">
                  <span>Pekerjaan Dijeda: Menunggu Part ({myJob.status_spk})</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                    TIMER AUTO-PAUSED
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
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
                className="py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
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
                className="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> {isManualPaused ? 'RESUME JOB (LANJUTKAN)' : 'START JOB (MULAI PEKERJAAN)'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={finishJobMutation.isPending}
                  onClick={() => finishJobMutation.mutate(myJob)}
                  className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> FINISH (QC)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualPaused(true);
                    setTimerRunning(false);
                  }}
                  className="py-3.5 px-3 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs shadow-md shadow-slate-600/20 transition-all flex items-center justify-center gap-1"
                  title="Pause manual (istirahat / kendala teknis)"
                >
                  <Pause className="w-4 h-4" /> PAUSE
                </button>
                <button
                  type="button"
                  disabled={pauseJobMutation.isPending}
                  onClick={() => pauseJobMutation.mutate(myJob)}
                  className="py-3.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1"
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
              className="py-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5 text-amber-700" /> + TAMBAHAN PEKERJAAN
            </button>
          </div>

          {/* Permintaan Sparepart Tab (image1.png Mockup Mekanik) */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" /> Sparepart Terkait Pekerjaan Ini:
              </span>
              <span className="text-[11px] text-slate-400">Ambil di Gudang KIM3</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <div className="font-bold text-slate-900">Brake Pad / Kampas Rem Depan (Canter)</div>
                  <div className="text-[11px] text-slate-500 font-mono">Kode: SP-001 | Qty: 2 Set</div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ready di Stock
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <div className="font-bold text-slate-900">Oli Rimula R4 10W-40 (4L)</div>
                  <div className="text-[11px] text-slate-500 font-mono">Kode: SP-045 | Qty: 1 Galon</div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ready di Stock
                </span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          Belum ada SPK yang ditugaskan ke Anda hari ini.
        </div>
      )}

      {/* MODAL TAMBAHAN PEKERJAAN (image1.png Tahap 8) */}
      {showTambahanModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Form Tambahan Pekerjaan (If Needed)</h3>
                <p className="text-xs text-slate-500">Mekanik menemukan kerusakan tambahan saat pengerjaan</p>
              </div>
              <button
                onClick={() => setShowTambahanModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Temuan Kerusakan Tambahan:
                </label>
                <textarea
                  rows={2}
                  value={tambahanForm.deskripsi_tambahan}
                  onChange={(e) => setTambahanForm({ ...tambahanForm, deskripsi_tambahan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rekomendasi Tindakan & Part:
                </label>
                <textarea
                  rows={2}
                  value={tambahanForm.rekomendasi_perbaikan}
                  onChange={(e) => setTambahanForm({ ...tambahanForm, rekomendasi_perbaikan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimasi Biaya Tambahan (Rp)</label>
                  <input
                    type="number"
                    value={tambahanForm.estimasi_biaya_tambahan}
                    onChange={(e) => setTambahanForm({ ...tambahanForm, estimasi_biaya_tambahan: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Waktu Tambahan (Jam)</label>
                  <input
                    type="number"
                    value={tambahanForm.estimasi_waktu_tambahan_jam}
                    onChange={(e) => setTambahanForm({ ...tambahanForm, estimasi_waktu_tambahan_jam: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan untuk Customer & SA</label>
                <input
                  type="text"
                  value={tambahanForm.catatan}
                  onChange={(e) => setTambahanForm({ ...tambahanForm, catatan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTambahanModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitTambahanMutation.isPending}
                onClick={() => submitTambahanMutation.mutate()}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20"
              >
                {submitTambahanMutation.isPending ? 'Mengirim...' : 'KIRIM KE FOREMAN & SA'}
              </button>
            </div>
          </div>
        </div>
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
