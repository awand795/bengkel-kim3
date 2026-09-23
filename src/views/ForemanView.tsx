import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { SpkService } from '../types';
import { 
  Wrench, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  AlertTriangle, 
  Send,
  Check,
  X,
  Printer,
  Search,
  Filter
} from 'lucide-react';
import { PrintSpkModal } from '../components/print/PrintSpkModal';

export const ForemanView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hasil-pengecekan' | 'qc-fir'>('dashboard');
  const [selectedSpk, setSelectedSpk] = useState<SpkService | null>(null);
  const [showPrintSpk, setShowPrintSpk] = useState<SpkService | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Perlu Ditugaskan' | 'Dalam Pengerjaan' | 'Waiting QC'>('Semua');

  // Assign Mekanik State
  const [selectedMekanik, setSelectedMekanik] = useState('Andi Wijaya');

  // Input Perbaikan Hasil Pengecekan State (image1.png Mockup 5)
  const [hasilPengecekan, setHasilPengecekan] = useState({
    rekomendasi: '1. Ganti Kampas Rem Depan\n2. Bubut / Ganti Disc Brake Depan\n3. Ganti Minyak Rem',
    estimasi_biaya: 1110000,
    estimasi_waktu_jam: 6,
    catatan_tambahan: 'Piringan rem sudah beralur dalam, disarankan sekalian ganti kampas dan minyak rem.',
  });

  // Quality Control FIR State (image1.png Mockup QC)
  const [firForm, setFirForm] = useState({
    pekerjaan_sesuai_wo: true,
    fungsi_normal: true,
    bebas_kebocoran: true,
    test_jalan: true,
    kebersihan: true,
    catatan_foreman: 'Pekerjaan selesai dengan baik, pengereman responsif dan tidak ada getaran lagi.',
  });

  // Queries
  const { data: spkList } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 8000,
  });

  // Mutations
  const assignMekanikMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      return api.updateSpkStatus({
        id: spk.id,
        status_spk: 'Dalam Pengerjaan',
        nama_foreman: 'Joko Susilo',
        nama_mekanik: selectedMekanik,
        catatan_foreman: `Ditugaskan oleh Foreman ke ${selectedMekanik}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      alert(`Mekanik ${selectedMekanik} berhasil ditugaskan untuk SPK ini!`);
      setSelectedSpk(null);
    },
  });

  const submitHasilPengecekanMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      return api.updateSpkStatus({
        id: spk.id,
        status_spk: 'Estimasi Dibuat',
        estimasi_biaya: hasilPengecekan.estimasi_biaya,
        estimasi_waktu_jam: hasilPengecekan.estimasi_waktu_jam,
        catatan_foreman: hasilPengecekan.rekomendasi + '\n' + hasilPengecekan.catatan_tambahan,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      alert('Rekomendasi perbaikan & estimasi berhasil disubmit ke SA!');
      setActiveTab('dashboard');
    },
  });

  const submitQcMutation = useMutation({
    mutationFn: async ({ spk, passed }: { spk: SpkService; passed: boolean }) => {
      const firNo = `FIR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      if (passed) {
        await api.inputQcFir({
          no_fir: firNo,
          id_spk: spk.id,
          nama_foreman: 'Joko Susilo',
          pekerjaan_sesuai_wo: firForm.pekerjaan_sesuai_wo,
          fungsi_normal: firForm.fungsi_normal,
          bebas_kebocoran: firForm.bebas_kebocoran,
          test_jalan: firForm.test_jalan,
          kebersihan: firForm.kebersihan,
          catatan_foreman: firForm.catatan_foreman,
          status_qc: 'QC Passed',
        });

        return api.updateSpkStatus({
          id: spk.id,
          status_spk: 'QC Passed',
          catatan_foreman: `QC PASSED (${firNo}): ${firForm.catatan_foreman}`,
        });
      } else {
        return api.updateSpkStatus({
          id: spk.id,
          status_spk: 'Dalam Pengerjaan',
          catatan_foreman: `QC Ditolak: ${firForm.catatan_foreman} (Kembalikan ke Mekanik)`,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert(variables.passed ? 'QC Passed! Diserahkan ke SA untuk Final Check & FIR Closed.' : 'QC Tidak Sesuai. SPK dikembalikan ke Mekanik.');
      setSelectedSpk(null);
      setActiveTab('dashboard');
    },
  });

  // Derived statistics and filtering
  const totalSpkCount = spkList?.length || 0;
  const unassignedCount = spkList?.filter(s => !s.nama_mekanik || s.nama_mekanik === 'Belum ditugaskan').length || 0;
  const inProgressCount = spkList?.filter(s => s.status_spk === 'Dalam Pengerjaan').length || 0;
  const waitingQcCount = spkList?.filter(s => s.status_spk === 'Waiting QC' || s.status_spk === 'QC Passed').length || 0;

  const filteredSpkList = (spkList || []).filter((spk) => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch = !query ||
      spk.no_spk?.toLowerCase().includes(query) ||
      spk.no_polisi?.toLowerCase().includes(query) ||
      spk.nama_customer?.toLowerCase().includes(query) ||
      spk.keluhan_customer?.toLowerCase().includes(query) ||
      spk.nama_mekanik?.toLowerCase().includes(query);

    if (!matchSearch) return false;
    if (statusFilter === 'Perlu Ditugaskan') {
      return !spk.nama_mekanik || spk.nama_mekanik === 'Belum ditugaskan';
    }
    if (statusFilter === 'Dalam Pengerjaan') {
      return spk.status_spk === 'Dalam Pengerjaan';
    }
    if (statusFilter === 'Waiting QC') {
      return spk.status_spk === 'Waiting QC' || spk.status_spk === 'QC Passed';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Dashboard Foreman</h1>
            <p className="text-xs text-slate-500">Distribusi Pekerjaan, Pengecekan Mekanik, dan Quality Control (FIR)</p>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dashboard SPK
          </button>
          <button
            onClick={() => setActiveTab('hasil-pengecekan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'hasil-pengecekan' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Input Perbaikan (Hasil Cek)
          </button>
          <button
            onClick={() => setActiveTab('qc-fir')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'qc-fir' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quality Control (QC / FIR)
          </button>
        </div>
      </div>

      {/* Mini KPI Banners for Foreman */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('Semua')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Semua' ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total SPK</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalSpkCount}</div>
          <span className="text-[10px] text-slate-400">Seluruh SPK aktif</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Perlu Ditugaskan')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Perlu Ditugaskan' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Perlu Ditugaskan</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 mt-1">{unassignedCount}</div>
          <span className="text-[10px] text-amber-700">Belum ada mekanik</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Dalam Pengerjaan')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Dalam Pengerjaan' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">Dalam Pengerjaan</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-900 mt-1">{inProgressCount}</div>
          <span className="text-[10px] text-blue-600">Teknisi aktif di pit</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Waiting QC')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Waiting QC' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Siap QC (FIR)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">{waitingQcCount}</div>
          <span className="text-[10px] text-emerald-600">Siap diinspeksi</span>
        </div>
      </div>

      {/* TAB 1: DASHBOARD SPK FOREMAN */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Daftar SPK (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Daftar SPK Menunggu &amp; On Progress</h2>
                <p className="text-xs text-slate-500">Foreman review pekerjaan dan tugaskan mekanik</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
                {filteredSpkList.length} SPK Ditemukan
              </span>
            </div>

            {/* Live Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari No. Polisi, No. SPK, Customer, atau Mekanik..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Chips */}
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['Semua', 'Perlu Ditugaskan', 'Dalam Pengerjaan', 'Waiting QC'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* List SPK */}
            <div className="space-y-3">
              {filteredSpkList.length > 0 ? (
                filteredSpkList.map((spk) => (
                  <div
                    key={spk.id}
                    onClick={() => setSelectedSpk(spk)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                      selectedSpk?.id === spk.id
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700">{spk.no_spk}</span>
                      <StatusBadge status={spk.status_spk} size="sm" />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <div className="text-sm font-black text-slate-900">{spk.no_polisi}</div>
                        <div className="text-xs text-slate-600">{spk.nama_customer}</div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-slate-400 block text-[10px]">Lead Time:</span>
                        <span className="font-bold text-blue-700">{spk.lead_time_jam ? `${spk.lead_time_jam} Jam` : '6 Jam'}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-100 line-clamp-1">
                      <span className="font-semibold text-slate-700">Keluhan:</span> {spk.keluhan_customer}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Mekanik: <strong className="text-slate-800">{spk.nama_mekanik || 'Belum ditugaskan'}</strong></span>
                      <span className="text-blue-600 font-semibold">Pilih untuk Aksi →</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Tidak ditemukan SPK yang sesuai dengan pencarian atau filter "{statusFilter}".
                </div>
              )}
            </div>
          </div>

          {/* Panel Distribusi & Aksi Foreman (1 Col) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            {selectedSpk ? (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Armada Terpilih</span>
                  <h3 className="text-lg font-black text-slate-900">{selectedSpk.no_polisi}</h3>
                  <p className="text-xs text-slate-600">{selectedSpk.nama_customer}</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Status Saat Ini:</span>
                    <StatusBadge status={selectedSpk.status_spk} size="sm" />
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Service Advisor:</span>
                    <span className="font-bold text-slate-800">{selectedSpk.nama_sa}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Keluhan:</span>
                    <p className="p-2 bg-slate-50 rounded-lg text-slate-800 font-medium">
                      {selectedSpk.keluhan_customer}
                    </p>
                  </div>
                </div>

                {/* Assign Mekanik Section */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Pilih Mekanik untuk Pengerjaan:
                  </label>
                  <select
                    value={selectedMekanik}
                    onChange={(e) => setSelectedMekanik(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Andi Wijaya">Andi Wijaya (Spesialis Rem & Kaki-kaki)</option>
                    <option value="Dedi Kurniawan">Dedi Kurniawan (Spesialis Mesin & Transmisi)</option>
                    <option value="Budi Santoso">Budi Santoso (Mekanik Umum)</option>
                    <option value="Riki Prayoga">Riki Prayoga (Mekanik Kelistrikan)</option>
                  </select>

                  <button
                    type="button"
                    disabled={assignMekanikMutation.isPending}
                    onClick={() => assignMekanikMutation.mutate(selectedSpk)}
                    className="w-full mt-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <UserCheck className="w-4 h-4" /> TUGASKAN KE MEKANIK
                  </button>
                </div>

                {/* Quick Link to Hasil Cek or QC */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    onClick={() => setActiveTab('hasil-pengecekan')}
                    className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs transition-colors"
                  >
                    Input Hasil Pengecekan Fisik →
                  </button>
                  {selectedSpk.status_spk === 'Waiting QC' && (
                    <button
                      onClick={() => setActiveTab('qc-fir')}
                      className="w-full py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold text-xs transition-colors shadow-xs"
                    >
                      Buka Form Quality Control (QC) →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPrintSpk(selectedSpk)}
                    className="w-full py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak Lembar SPK (A4)
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Wrench className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Pilih salah satu SPK di sebelah kiri untuk menugaskan mekanik atau melakukan inspeksi.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: INPUT PERBAIKAN HASIL PENGECEKAN (image1.png Mockup 5) */}
      {activeTab === 'hasil-pengecekan' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs max-w-2xl mx-auto">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900">Input Perbaikan Hasil Pengecekan Mekanik & Foreman</h2>
            <p className="text-xs text-slate-500">Pengecekan fisik komponen yang perlu diperbaiki / diganti untuk disubmit ke SA</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pilih SPK Armada:</label>
              <select
                value={selectedSpk?.id || ''}
                onChange={(e) => {
                  const spk = spkList?.find(s => s.id === Number(e.target.value));
                  setSelectedSpk(spk || null);
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih SPK Armada --</option>
                {spkList?.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.no_spk} - {s.no_polisi} ({s.nama_customer})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hasil Pengecekan & Rekomendasi Perbaikan
              </label>
              <textarea
                rows={4}
                value={hasilPengecekan.rekomendasi}
                onChange={(e) => setHasilPengecekan({ ...hasilPengecekan, rekomendasi: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estimasi Biaya Part & Jasa (Rp)</label>
                <input
                  type="number"
                  value={hasilPengecekan.estimasi_biaya}
                  onChange={(e) => setHasilPengecekan({ ...hasilPengecekan, estimasi_biaya: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estimasi Waktu Pengerjaan (Jam)</label>
                <input
                  type="number"
                  value={hasilPengecekan.estimasi_waktu_jam}
                  onChange={(e) => setHasilPengecekan({ ...hasilPengecekan, estimasi_waktu_jam: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan Foreman</label>
              <textarea
                rows={2}
                value={hasilPengecekan.catatan_tambahan}
                onChange={(e) => setHasilPengecekan({ ...hasilPengecekan, catatan_tambahan: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              disabled={!selectedSpk || submitHasilPengecekanMutation.isPending}
              onClick={() => selectedSpk && submitHasilPengecekanMutation.mutate(selectedSpk)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> SUBMIT KE SA BY SISTEM
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: QUALITY CONTROL (QC) & FIR (image1.png Mockup QC) */}
      {activeTab === 'qc-fir' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs max-w-2xl mx-auto">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 className="text-base font-bold text-slate-900">Final Inspection Report (FIR) - Quality Control</h2>
            </div>
            <p className="text-xs text-slate-500">Foreman periksa hasil kerja mekanik sebelum diserahkan ke SA</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pilih SPK Armada untuk QC:</label>
              <select
                value={selectedSpk?.id || ''}
                onChange={(e) => {
                  const spk = spkList?.find(s => s.id === Number(e.target.value));
                  setSelectedSpk(spk || null);
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih SPK Selesai Dikerjakan --</option>
                {spkList?.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.no_spk} - {s.no_polisi} ({s.status_spk})
                  </option>
                ))}
              </select>
            </div>

            {/* Checklist FIR */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="block text-xs font-bold text-slate-800">5 Parameter Wajib Inspeksi Akhir:</span>
              
              {[
                { key: 'pekerjaan_sesuai_wo', label: '1. Pekerjaan Sesuai WO', desc: 'Item jasa & part terpasang sesuai SPK' },
                { key: 'fungsi_normal', label: '2. Fungsi Normal', desc: 'Sistem rem, kelistrikan, dan mesin bekerja optimal' },
                { key: 'bebas_kebocoran', label: '3. Bebas Kebocoran', desc: 'Tidak ada kebocoran oli, minyak rem, atau cairan pendingin' },
                { key: 'test_jalan', label: '4. Test Jalan', desc: 'Uji jalan singkat tidak ada getaran dan bunyi abnormal' },
                { key: 'kebersihan', label: '5. Kebersihan', desc: 'Kabin, ruang mesin, dan bodi armada bersih dari oli mekanik' },
              ].map((param) => (
                <label key={param.key} className="flex items-start gap-3 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={(firForm as any)[param.key]}
                    onChange={(e) => setFirForm({ ...firForm, [param.key]: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{param.label}</div>
                    <div className="text-[11px] text-slate-500">{param.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Hasil QC Foreman</label>
              <textarea
                rows={2}
                value={firForm.catatan_foreman}
                onChange={(e) => setFirForm({ ...firForm, catatan_foreman: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={!selectedSpk || submitQcMutation.isPending}
                onClick={() => selectedSpk && submitQcMutation.mutate({ spk: selectedSpk, passed: false })}
                className="py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> TIDAK SESUAI (KEMBALIKAN)
              </button>

              <button
                type="button"
                disabled={!selectedSpk || submitQcMutation.isPending}
                onClick={() => selectedSpk && submitQcMutation.mutate({ spk: selectedSpk, passed: true })}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> QC PASSED (KE SA)
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
