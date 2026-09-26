import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { isSpkAssignedToMechanic } from '../utils/spkAccess';
import { 
  Truck, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ArrowRight, 
  ShieldAlert, 
  ShoppingBag, 
  ExternalLink,
  ClipboardList,
  Receipt,
  UserCheck,
  Package,
  FileText,
  AlertTriangle,
  PlayCircle,
  CheckCircle,
  PlusCircle,
  DollarSign,
  Sparkles,
  Inbox
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { currentRole, currentUser, authUser, setActiveTab, setRole, setSaPendingAntrianId } = useAppStore();
  const [viewMode, setViewMode] = useState<'role' | 'global'>('role');

  // Queries
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: api.getDashboardSummary,
    refetchInterval: 10000,
  });

  const { data: spkList = [] } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 10000,
  });

  const { data: antrianList = [] } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 10000,
  });

  const { data: purchasingList = [] } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
    refetchInterval: 10000,
  });

  const { data: invoiceList = [] } = useQuery({
    queryKey: ['invoice-list'],
    queryFn: api.getInvoiceList,
    refetchInterval: 15000,
  });

  const { data: tambahanList = [] } = useQuery({
    queryKey: ['tambahan-pekerjaan'],
    queryFn: api.getTambahanPekerjaan,
    refetchInterval: 15000,
  });

  // ==========================================
  // RENDER: SA (Service Advisor) Dashboard
  // ==========================================
  const renderSaDashboard = () => {
    const antrianMenunggu = antrianList.filter(
      (a) => a.tujuan_kedatangan === 'Service' && a.status_kunjungan === 'Check In'
    );
    const spkAktif = spkList.filter((s) => s.status_spk !== 'Selesai' && s.status_spk !== 'FIR Closed');
    const prKotakMerah = purchasingList.filter(
      (p) => p.status_pr === 'Diajukan' || p.status_pr === 'Diproses Purchasing' || p.status_konfirmasi_sa === 'Menunggu Konfirmasi'
    );
    const spkSiapQc = spkList.filter((s) => s.status_spk === 'Waiting QC' || s.status_spk === 'QC Passed');

    return (
      <div className="space-y-6">
        {/* Modern Welcome Banner */}
        <div className="rounded-2xl bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 sm:p-7 shadow-sm border border-teal-700/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-teal-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-semibold mb-2.5 backdrop-blur-md">
              <ClipboardList className="w-3.5 h-3.5 text-teal-300" />
              <span>Dashboard Service Advisor (SA)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Selamat bertugas, {currentUser || 'Service Advisor'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed">
              Pantau antrian unit dari Pos Security, buat estimasi &amp; SPK, kelola alur sparepart kotak merah, dan proses serah terima unit selesai.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab('sa-penerimaan')}
                className="px-4 py-2 rounded-xl bg-white text-teal-950 font-bold text-xs shadow-xs hover:bg-teal-50 active:scale-98 transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-teal-700" /> Penerimaan &amp; Buat SPK
              </button>
              <button
                onClick={() => setActiveTab('purchasing')}
                className="px-3.5 py-2 rounded-xl bg-teal-800/80 hover:bg-teal-700/80 text-white font-medium text-xs border border-teal-600/40 transition-all flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-rose-300" /> Kotak Merah ({prKotakMerah.length})
              </button>
              <button
                onClick={() => setActiveTab('beli-part')}
                className="px-3.5 py-2 rounded-xl bg-teal-800/80 hover:bg-teal-700/80 text-white font-medium text-xs border border-teal-600/40 transition-all flex items-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5 text-teal-300" /> Jual Part Langsung
              </button>
            </div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => setActiveTab('sa-penerimaan')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">Gate In</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{antrianMenunggu.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Menunggu Penerimaan SA</div>
          </div>

          <div 
            onClick={() => setActiveTab('sa')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <ClipboardList className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">WIP</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{spkAktif.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">SPK Aktif di Bengkel</div>
          </div>

          <div 
            onClick={() => setActiveTab('purchasing')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60">Kotak Merah</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{prKotakMerah.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Part PO / Approval SA</div>
          </div>

          <div 
            onClick={() => setActiveTab('sa')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">Siap Serah</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{spkSiapQc.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">QC &amp; Serah Terima</div>
          </div>
        </div>

        {/* 2-Col Content Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Antrian Unit Baru Masuk dari Pos Security */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-teal-600" />
                  Antrian Unit Masuk dari Pos Security
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Unit telah melalui gate check-in dan siap dibuatkan formulir SPK</p>
              </div>
              <button
                onClick={() => setActiveTab('sa-penerimaan')}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 group"
              >
                Ke Menu SA <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4 font-semibold">No. Tiket</th>
                    <th className="py-3 px-4 font-semibold">No. Polisi</th>
                    <th className="py-3 px-4 font-semibold">Customer / Armada</th>
                    <th className="py-3 px-4 font-semibold">Waktu Masuk</th>
                    <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {antrianMenunggu.length > 0 ? (
                    antrianMenunggu.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-700">{item.no_tiket}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item.no_polisi}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{item.nama_customer || '-'}</div>
                          <div className="text-[11px] text-slate-400">{item.jenis_armada} • {item.keperluan || 'Service'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSaPendingAntrianId(item.id);
                              setActiveTab('sa-penerimaan');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <ClipboardList className="w-3 h-3" /> Buat SPK
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <Inbox className="w-7 h-7 mx-auto mb-1.5 opacity-50" />
                        Tidak ada antrian unit menunggu penerimaan saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kotak Merah & Sparepart Attention */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Perhatian Kotak Merah</h3>
                  <p className="text-[11px] text-slate-500">Sparepart PO &amp; Approval SA</p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {prKotakMerah.length > 0 ? (
                  prKotakMerah.slice(0, 3).map((item) => (
                    <div key={item.pr_id} className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-rose-700">{item.no_pr}</span>
                        <StatusBadge status={item.status_pr} size="sm" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {item.no_polisi} - {item.nama_customer}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-2">
                        {item.catatan_pr || 'Pengadaan part khusus untuk SPK unit.'}
                      </div>
                      {item.estimasi_tanggal_ready_eta && (
                        <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px] text-rose-700 font-semibold">
                          <span>ETA Kedatangan:</span>
                          <span>{item.estimasi_tanggal_ready_eta} ({item.estimasi_jam_ready_eta || '14:00'})</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5 text-emerald-500 opacity-80" />
                    Semua sparepart ready atau telah dikonfirmasi.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveTab('purchasing')}
              className="w-full mt-5 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" /> Buka Alur Kotak Merah
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: Foreman Dashboard
  // ==========================================
  const renderForemanDashboard = () => {
    const spkMenungguAssign = spkList.filter((s) => !s.nama_mekanik || s.status_spk === 'Menunggu Pengecekan Mekanik');
    const spkSedangDikerjakan = spkList.filter((s) => s.status_spk === 'Dalam Pengerjaan' || s.status_spk === 'Pengecekan Mekanik');
    const spkMenungguQc = spkList.filter((s) => s.status_spk === 'Waiting QC');
    const tambahanPending = tambahanList.filter((t) => t.status_approval_customer === 'Menunggu Approval');

    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-2xl bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 sm:p-7 shadow-sm border border-teal-700/40 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-semibold mb-2.5 backdrop-blur-md">
              <Wrench className="w-3.5 h-3.5 text-amber-300" />
              <span>Dashboard Foreman &amp; Quality Control (QC)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Selamat bertugas, {currentUser || 'Foreman'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed">
              Atur alokasi pengerjaan mekanik di stall, monitor waktu live stopwatch, verifikasi pekerjaan tambahan, dan lakukan inspeksi Final Inspection Report (FIR).
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab('foreman')}
                className="px-4 py-2 rounded-xl bg-white text-teal-950 font-bold text-xs shadow-xs hover:bg-teal-50 transition-all flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" /> Penugasan Mekanik &amp; QC
              </button>
              <button
                onClick={() => setActiveTab('mekanik')}
                className="px-3.5 py-2 rounded-xl bg-teal-800/80 hover:bg-teal-700/80 text-white font-medium text-xs border border-teal-600/40 transition-all flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-teal-300" /> Live Monitoring Mekanik
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => setActiveTab('foreman')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60">Butuh Assign</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{spkMenungguAssign.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">SPK Menunggu Mekanik</div>
          </div>

          <div 
            onClick={() => setActiveTab('foreman')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">Stall Aktif</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{spkSedangDikerjakan.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Sedang Dikerjakan</div>
          </div>

          <div 
            onClick={() => setActiveTab('foreman')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-teal-700 uppercase bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">Inspeksi</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{spkMenungguQc.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Antrian QC &amp; FIR</div>
          </div>

          <div 
            onClick={() => setActiveTab('foreman')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60">Job Tambahan</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{tambahanPending.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Menunggu Approval</div>
          </div>
        </div>

        {/* 2-Col Content Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  Status Pengerjaan Stall &amp; Penugasan SPK
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Daftar SPK aktif dan alokasi mekanik penanggung jawab</p>
              </div>
              <button
                onClick={() => setActiveTab('foreman')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 group"
              >
                Buka Foreman <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4 font-semibold">No. SPK</th>
                    <th className="py-3 px-4 font-semibold">No. Polisi</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Mekanik</th>
                    <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {spkList.length > 0 ? (
                    spkList.slice(0, 5).map((spk) => (
                      <tr key={spk.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-700">{spk.no_spk}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{spk.no_polisi}</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={spk.status_spk} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {spk.nama_mekanik ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-800 font-semibold">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              {spk.nama_mekanik}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold">Belum Ditugaskan</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setActiveTab('foreman')}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-2xs"
                          >
                            Kelola SPK
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        Tidak ada SPK aktif saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Antrian QC & Validasi FIR */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-2xs">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Antrian QC &amp; Validasi FIR</h3>
                  <p className="text-[11px] text-slate-500">Pekerjaan selesai, siap uji fisik/jalan</p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {spkMenungguQc.length > 0 ? (
                  spkMenungguQc.map((spk) => (
                    <div key={spk.id} className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-teal-800">{spk.no_spk}</span>
                        <StatusBadge status={spk.status_spk} size="sm" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {spk.no_polisi} - {spk.nama_customer}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Mekanik: <span className="font-semibold text-slate-700">{spk.nama_mekanik || '-'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5 text-emerald-500 opacity-80" />
                    Tidak ada unit menunggu QC saat ini.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveTab('foreman')}
              className="w-full mt-5 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Buka Menu QC FIR
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: Mekanik Dashboard
  // ==========================================
  const renderMekanikDashboard = () => {
    const mySpks = spkList.filter((s) => isSpkAssignedToMechanic(s, authUser, currentUser));
    const mySpkIds = new Set(mySpks.map((s) => s.id));
    const spkDone = mySpks.filter((s) => s.status_spk === 'Waiting QC' || s.status_spk === 'QC Passed' || s.status_spk === 'FIR Closed');
    const tambahanSaya = tambahanList.filter((t) => mySpkIds.has(t.id_spk));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 sm:p-7 shadow-sm border border-teal-700/40 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-semibold mb-2.5 backdrop-blur-md">
              <Clock className="w-3.5 h-3.5 text-teal-300" />
              <span>Dashboard Mekanik Bengkel</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Selamat bekerja, {currentUser || 'Mekanik'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed">
              Lihat perintah kerja SPK yang ditugaskan kepada Anda, jalankan timer live stopwatch pengerjaan, dan laporkan temuan tambahan kerusakan saat servis.
            </p>
            <div className="mt-5">
              <button
                onClick={() => setActiveTab('mekanik')}
                className="px-4 py-2.5 rounded-xl bg-white text-teal-950 font-bold text-xs shadow-xs hover:bg-teal-50 transition-all flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4 text-emerald-600" /> Buka Stopwatch &amp; Lembar Kerja
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => setActiveTab('mekanik')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">Aktif</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{mySpks.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Work Order Saya</div>
          </div>

          <div 
            onClick={() => setActiveTab('mekanik')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">Selesai</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{spkDone.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Selesai Dikerjakan</div>
          </div>

          <div 
            onClick={() => setActiveTab('mekanik')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">Live Timer</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">Ready</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Status Stopwatch</div>
          </div>

          <div 
            onClick={() => setActiveTab('mekanik')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60">Temuan</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{tambahanSaya.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Temuan Tambahan</div>
          </div>
        </div>

        {/* 2-Col Content Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  Daftar Perintah Kerja Ditugaskan
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Buka pengerjaan untuk menjalankan live timer</p>
              </div>
              <button
                onClick={() => setActiveTab('mekanik')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group"
              >
                Buka Stopwatch <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-3">
              {mySpks.length > 0 ? (
                mySpks.map((spk) => {
                  const bisaDikerjakan = ['Estimasi Disetujui', 'Dalam Pengerjaan', 'Waiting Part', 'Pending'].includes(spk.status_spk as string);
                  const sudahSelesai = ['Waiting QC', 'QC Passed', 'FIR Closed', 'Selesai'].includes(spk.status_spk as string);
                  return (
                    <div key={spk.id} className="p-4 rounded-xl border border-slate-200/80 hover:border-teal-300 transition-all bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal-700">{spk.no_spk}</span>
                          <span className="font-black text-slate-900 text-sm">{spk.no_polisi}</span>
                          <StatusBadge status={spk.status_spk} size="sm" />
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          Customer: {spk.nama_customer || '-'} • Keluhan: {spk.keluhan_customer || 'Perbaikan'}
                        </p>
                        <div className="text-[11px] text-slate-400">
                          Lead time estimasi: <span className="font-bold text-slate-600">{spk.estimasi_waktu_jam || spk.lead_time_jam ? `${spk.estimasi_waktu_jam || spk.lead_time_jam} Jam` : '-'}</span>
                        </div>
                      </div>
                      {bisaDikerjakan ? (
                        <button
                          onClick={() => setActiveTab('mekanik')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Kerjakan / Timer
                        </button>
                      ) : (
                        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0 ${sudahSelesai ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          {sudahSelesai ? 'Selesai — menunggu QC' : 'Menunggu WO'}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-10 text-center text-slate-400 text-xs">
                  <Inbox className="w-7 h-7 mx-auto mb-1.5 opacity-50" />
                  Tidak ada tugas SPK yang ditugaskan kepada Anda saat ini.
                </div>
              )}
            </div>
          </div>

          {/* SOP Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              SOP Pengerjaan Bengkel KIM 3
            </h3>
            <ul className="text-xs text-slate-600 space-y-3">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span>Pastikan cek fisik awal &amp; pasang cover pelindung sebelum mulai.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span>Jalankan live stopwatch saat mulai membongkar/memperbaiki unit.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span>Jika ada kerusakan lain, ajukan segera di form <strong>Temuan Tambahan</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                <span>Setelah selesai, laporkan ke Foreman untuk dilakukan uji QC FIR.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: Admin Purchasing Dashboard
  // ==========================================
  const renderPurchasingDashboard = () => {
    const prDiajukan = purchasingList.filter((p) => p.status_pr === 'Diajukan');
    const prDiproses = purchasingList.filter((p) => p.status_pr === 'Diproses Purchasing');
    const poDiterbitkan = purchasingList.filter((p) => p.status_pr === 'PO Diterbitkan');

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 sm:p-7 shadow-sm border border-teal-700/40 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-semibold mb-2.5 backdrop-blur-md">
              <ShoppingBag className="w-3.5 h-3.5 text-rose-300" />
              <span>Dashboard Admin Purchasing &amp; Pengadaan Sparepart</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Selamat bertugas, {currentUser || 'Purchasing'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed">
              Kelola permintaan pengadaan sparepart dari SA (Kotak Merah), bandingkan penawaran 2 vendor, terbitkan PO, dan pantau estimasi kedatangan (ETA) part.
            </p>
            <div className="mt-5">
              <button
                onClick={() => setActiveTab('purchasing')}
                className="px-4 py-2.5 rounded-xl bg-white text-teal-950 font-bold text-xs shadow-xs hover:bg-teal-50 transition-all flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-rose-600" /> Kelola PR &amp; Kotak Merah
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => setActiveTab('purchasing')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60">PR Baru</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{prDiajukan.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">PR Masuk dari SA</div>
          </div>

          <div 
            onClick={() => setActiveTab('purchasing')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">Bandingkan</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{prDiproses.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Penawaran 2 Vendor</div>
          </div>

          <div 
            onClick={() => setActiveTab('purchasing')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">Monitoring ETA</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{poDiterbitkan.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">PO Dalam Pengiriman</div>
          </div>

          <div 
            onClick={() => setActiveTab('purchasing')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">Total PR</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{purchasingList.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Semua Pengadaan</div>
          </div>
        </div>

        {/* 2-Col Content Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-rose-600" />
                  Antrian Purchase Request (PR) Kotak Merah
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Part yang tidak ready di gudang dan membutuhkan PO</p>
              </div>
              <button
                onClick={() => setActiveTab('purchasing')}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 group"
              >
                Ke Menu Purchasing <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4 font-semibold">No. PR</th>
                    <th className="py-3 px-4 font-semibold">No. Polisi / Customer</th>
                    <th className="py-3 px-4 font-semibold">SA Pemohon</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchasingList.length > 0 ? (
                    purchasingList.slice(0, 5).map((item) => (
                      <tr key={item.pr_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-700">{item.no_pr}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{item.no_polisi}</div>
                          <div className="text-[11px] text-slate-500">{item.nama_customer || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{item.nama_sa_pemohon || '-'}</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={item.status_pr} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setActiveTab('purchasing')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-2xs ${item.no_po ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}
                          >
                            {item.no_po ? 'Lihat PO' : 'Proses PO'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        Tidak ada PR pending saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monitoring ETA Vendor */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-rose-600" />
              Monitoring Pengiriman PO Vendor
            </h3>
            <div className="space-y-3">
              {poDiterbitkan.length > 0 ? (
                poDiterbitkan.map((po) => (
                  <div key={po.pr_id} className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-teal-800">{po.no_po || 'PO-2026'}</span>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">Vendor: {po.vendor_terpilih || 'Vendor Utama'}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800">{po.no_polisi} - {po.nama_customer}</div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-blue-200/60">
                      <span>ETA Tiba:</span>
                      <span className="font-bold text-blue-700">{po.estimasi_tanggal_ready_eta || 'Hari ini'} {po.estimasi_jam_ready_eta}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada PO aktif dalam pengiriman.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: Admin Invoice / Kasir Dashboard
  // ==========================================
  const renderKasirDashboard = () => {
    const spkSiapFaktur = spkList.filter((s) => s.status_spk === 'FIR Closed' || s.status_spk === 'QC Passed');
    const invoiceUnpaid = invoiceList.filter((inv) => inv.status_pembayaran === 'Unpaid');
    const totalKasHariIni = invoiceList
      .filter((inv) => inv.status_pembayaran === 'Paid')
      .reduce((sum, inv) => sum + (inv.grand_total || 0), 0);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 sm:p-7 shadow-sm border border-teal-700/40 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-semibold mb-2.5 backdrop-blur-md">
              <Receipt className="w-3.5 h-3.5 text-emerald-300" />
              <span>Dashboard Kasir &amp; Faktur Tagihan</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Selamat bertugas, {currentUser || 'Kasir'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed">
              Terbitkan faktur tagihan untuk SPK yang telah FIR Closed, catat pelunasan kas masuk, kelola transaksi beli part langsung, dan terbitkan memo keluar resmi.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab('kasir')}
                className="px-4 py-2 rounded-xl bg-white text-teal-950 font-bold text-xs shadow-xs hover:bg-teal-50 transition-all flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-600" /> Kelola Kasir &amp; Faktur
              </button>
              <button
                onClick={() => setActiveTab('beli-part')}
                className="px-3.5 py-2 rounded-xl bg-teal-800/80 hover:bg-teal-700/80 text-white font-medium text-xs border border-teal-600/40 transition-all flex items-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5 text-teal-300" /> Beli Part Langsung
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => setActiveTab('kasir')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <ClipboardList className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">Siap Faktur</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{spkSiapFaktur.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">SPK FIR Closed</div>
          </div>

          <div 
            onClick={() => setActiveTab('kasir')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">Belum Lunas</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{invoiceUnpaid.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Tagihan Unpaid</div>
          </div>

          <div 
            onClick={() => setActiveTab('kasir')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">Penerimaan</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              Rp {(totalKasHariIni / 1000000).toFixed(1)} jt
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Kas Masuk Hari Ini</div>
          </div>

          <div 
            onClick={() => setActiveTab('kasir')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-teal-700 uppercase bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">Memo Keluar</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{summary?.total_selesai ?? 2}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Unit Selesai &amp; Keluar</div>
          </div>
        </div>

        {/* 2-Col Content Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  SPK FIR Closed Siap Diterbitkan Faktur
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Unit telah lulus uji QC jalan &amp; FIR closed oleh SA &amp; Foreman</p>
              </div>
              <button
                onClick={() => setActiveTab('kasir')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group"
              >
                Ke Menu Kasir <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4 font-semibold">No. SPK</th>
                    <th className="py-3 px-4 font-semibold">No. Polisi</th>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Estimasi Total</th>
                    <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {spkSiapFaktur.length > 0 ? (
                    spkSiapFaktur.map((spk) => (
                      <tr key={spk.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-700">{spk.no_spk}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{spk.no_polisi}</td>
                        <td className="py-3.5 px-4 text-slate-600">{spk.nama_customer || '-'}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          Rp {(spk.estimasi_biaya || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setActiveTab('kasir')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs"
                          >
                            Terbitkan Faktur
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        Tidak ada SPK menunggu faktur saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daftar Invoice Unpaid */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-600" />
              Tagihan Faktur Unpaid
            </h3>
            <div className="space-y-3">
              {invoiceUnpaid.length > 0 ? (
                invoiceUnpaid.map((inv) => (
                  <div key={inv.id} className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-teal-800">{inv.no_invoice}</span>
                      <StatusBadge status={inv.status_pembayaran} size="sm" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">{inv.no_polisi} - {inv.nama_customer}</div>
                    <div className="text-xs font-black text-amber-800 pt-2 border-t border-amber-200/60 flex items-center justify-between">
                      <span>Total:</span>
                      <span>Rp {(inv.grand_total || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Semua faktur telah lunas dibayarkan.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: PIC Terkait Dashboard
  // ==========================================
  const renderPicTerkaitDashboard = () => {
    const tamuMenunggu = antrianList.filter(
      (a) => a.tujuan_kedatangan === 'Kunjungan' && (!a.status_konfirmasi_pic || a.status_konfirmasi_pic === 'Menunggu Konfirmasi')
    );
    const tamuAktif = antrianList.filter(
      (a) => a.tujuan_kedatangan === 'Kunjungan' && a.status_konfirmasi_pic === 'Diterima' && !a.waktu_keluar
    );

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 sm:p-7 shadow-sm border border-teal-700/40 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-semibold mb-2.5 backdrop-blur-md">
              <UserCheck className="w-3.5 h-3.5 text-teal-300" />
              <span>Dashboard PIC Konfirmasi Kunjungan Tamu</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Selamat bertugas, {currentUser || 'PIC Bengkel KIM 3'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed">
              Konfirmasi kedatangan tamu/vendor yang melapor di Pos Gerbang Security secara realtime dan pantau status izin masuk ke area fasilitas KIM 3.
            </p>
            <div className="mt-5">
              <button
                onClick={() => setActiveTab('pic-terkait')}
                className="px-4 py-2.5 rounded-xl bg-white text-teal-950 font-bold text-xs shadow-xs hover:bg-teal-50 transition-all flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-teal-700" /> Buka Konfirmasi Kunjungan
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div 
            onClick={() => setActiveTab('pic-terkait')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60">Menunggu</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{tamuMenunggu.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Konfirmasi Diperlukan</div>
          </div>

          <div 
            onClick={() => setActiveTab('pic-terkait')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">Di Area</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{tamuAktif.length}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Tamu Sedang Berkunjung</div>
          </div>

          <div 
            onClick={() => setActiveTab('pic-terkait')}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">Selesai</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {antrianList.filter(a => a.tujuan_kedatangan === 'Kunjungan' && a.waktu_keluar).length}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Tamu Telah Pulang</div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: Ringkasan Seluruh Bengkel (Global)
  // ==========================================
  const renderGlobalOverview = () => {
    const kpiCards = [
      {
        title: 'Total On Progress',
        value: summary?.total_on_progress ?? 0,
        icon: Truck,
        color: 'bg-blue-50 text-blue-600',
        badge: 'Di Bengkel',
        action: () => setActiveTab('security-onprogress'),
      },
      {
        title: 'Sedang Dikerjakan',
        value: summary?.sedang_dikerjakan ?? 0,
        icon: Wrench,
        color: 'bg-amber-50 text-amber-600',
        badge: 'Mekanik Aktif',
        action: () => setActiveTab('foreman'),
      },
      {
        title: 'Menunggu Part / PO',
        value: summary?.menunggu_part_approval ?? 0,
        icon: AlertCircle,
        color: 'bg-rose-50 text-rose-600',
        badge: 'Purchasing',
        action: () => setActiveTab('purchasing'),
      },
      {
        title: 'Menunggu QC / FIR',
        value: summary?.menunggu_qc ?? 0,
        icon: Clock,
        color: 'bg-teal-50 text-teal-600',
        badge: 'Foreman & SA',
        action: () => setActiveTab('foreman'),
      },
      {
        title: 'Booking Hari Ini',
        value: summary?.booking_hari_ini ?? 0,
        icon: Calendar,
        color: 'bg-indigo-50 text-indigo-600',
        badge: 'Prioritas Masuk',
        action: () => setActiveTab('security-booking'),
      },
      {
        title: 'Selesai Hari Ini',
        value: summary?.total_selesai ?? 0,
        icon: CheckCircle2,
        color: 'bg-emerald-50 text-emerald-600',
        badge: 'Siap Check Out',
        action: () => setActiveTab('kasir'),
      },
    ];

    return (
      <div className="space-y-6">
        {/* Hero Welcome Banner */}
        <div className="rounded-2xl bg-linear-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 sm:p-7 shadow-sm border border-teal-700/40 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-semibold mb-2.5 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Sistem Monitoring Digital Terintegrasi</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Ringkasan Operasional Bengkel KIM 3
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1.5 leading-relaxed">
              Pantau pergerakan armada secara realtime dari Check In Pos Security, Penerimaan SA, Work Order Foreman, Pengadaan Sparepart Purchasing, hingga QC &amp; Check Out.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                onClick={() => { setRole('SA'); setActiveTab('sa'); }}
                className="px-4 py-2 rounded-xl bg-white text-teal-950 font-bold text-xs shadow-xs hover:bg-teal-50 transition-all flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5 text-teal-700" /> Buka Menu SA
              </button>
              <button
                onClick={() => { setRole('Admin Purchasing'); setActiveTab('purchasing'); }}
                className="px-3.5 py-2 rounded-xl bg-teal-800/80 hover:bg-teal-700/80 text-white font-medium text-xs border border-teal-600/40 transition-all flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-rose-300" /> Kotak Merah Purchasing
              </button>
              <button
                onClick={() => { setRole('Customer Fleet'); setActiveTab('fleet-dashboard'); }}
                className="px-3.5 py-2 rounded-xl bg-teal-800/80 hover:bg-teal-700/80 text-white font-medium text-xs border border-teal-600/40 transition-all flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5 text-teal-300" /> Web Fleet Customer
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {kpiCards.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                onClick={kpi.action}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl ${kpi.color} flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.badge}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                    {loadingSummary ? '...' : kpi.value}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-1 line-clamp-1">{kpi.title}</div>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-teal-700 group-hover:translate-x-0.5 transition-transform">
                  <span>Detail</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Two Column Layout: Active Work Orders & Purchasing Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Kendaraan Sedang Dikerjakan (SPK Aktif)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Update status proses otomatis dari aktivitas SA &amp; Foreman</p>
              </div>
              <button
                onClick={() => setActiveTab('foreman')}
                className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 group"
              >
                Lihat Semua <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4 font-semibold">No. SPK</th>
                    <th className="py-3 px-4 font-semibold">No. Polisi</th>
                    <th className="py-3 px-4 font-semibold">Customer / Armada</th>
                    <th className="py-3 px-4 font-semibold">Status Pekerjaan</th>
                    <th className="py-3 px-4 font-semibold">PIC / Mekanik</th>
                    <th className="py-3 px-4 font-semibold text-right">Lead Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {spkList && spkList.length > 0 ? (
                    spkList.slice(0, 5).map((spk) => (
                      <tr key={spk.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-700">{spk.no_spk}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{spk.no_polisi}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{spk.nama_customer || '-'}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">{spk.keluhan_customer}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={spk.status_spk} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {spk.nama_mekanik || spk.nama_foreman || 'Menunggu Assign'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-600">
                          {spk.estimasi_waktu_jam || spk.lead_time_jam ? `${spk.estimasi_waktu_jam || spk.lead_time_jam} Jam` : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Belum ada SPK aktif saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Perhatian Purchasing (Kotak Merah)</h3>
                  <p className="text-[11px] text-slate-500">Part Tidak Ready &amp; Memerlukan Penawaran PO</p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {purchasingList && purchasingList.length > 0 ? (
                  purchasingList.slice(0, 3).map((item) => (
                    <div key={item.pr_id} className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-teal-800">{item.no_pr}</span>
                        <StatusBadge status={item.status_pr} size="sm" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {item.no_polisi} - {item.nama_customer}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {item.catatan_pr || 'Pengadaan sparepart untuk kelanjutan pekerjaan service.'}
                      </p>
                      {item.estimasi_tanggal_ready_eta && (
                        <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-800 font-semibold">
                          <span>ETA Ready:</span>
                          <span>{item.estimasi_tanggal_ready_eta} ({item.estimasi_jam_ready_eta || '14:00'})</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Semua part ready di stock, tidak ada pending PR.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveTab('purchasing')}
              className="w-full mt-5 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" /> Buka Alur Purchasing
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main Return: with Modern Pill Switcher Header
  return (
    <div className="space-y-5">
      {/* View Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5 px-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
          <span className="text-xs font-medium text-slate-500">Tampilan Mode:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200/60">
            {viewMode === 'role' ? `Dashboard Khusus ${currentRole}` : 'Ringkasan Seluruh Bengkel'}
          </span>
        </div>

        {/* Toggle Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('role')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'role'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👤 Dashboard {currentRole}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('global')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'global'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌐 Ringkasan Bengkel
          </button>
        </div>
      </div>

      {/* Render selected view */}
      {viewMode === 'global' ? (
        renderGlobalOverview()
      ) : (
        <>
          {currentRole === 'SA' && renderSaDashboard()}
          {currentRole === 'Foreman' && renderForemanDashboard()}
          {currentRole === 'Mekanik' && renderMekanikDashboard()}
          {currentRole === 'Admin Purchasing' && renderPurchasingDashboard()}
          {currentRole === 'Admin Invoice' && renderKasirDashboard()}
          {currentRole === 'PIC Terkait' && renderPicTerkaitDashboard()}
          {currentRole !== 'SA' && 
           currentRole !== 'Foreman' && 
           currentRole !== 'Mekanik' && 
           currentRole !== 'Admin Purchasing' && 
           currentRole !== 'Admin Invoice' && 
           currentRole !== 'PIC Terkait' && 
           renderGlobalOverview()}
        </>
      )}
    </div>
  );
};

export default DashboardView;
