import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
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
  ExternalLink
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { setActiveTab, setRole } = useAppStore();

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: api.getDashboardSummary,
    refetchInterval: 10000,
  });

  const { data: spkList } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 10000,
  });

  const { data: antrianList } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 10000,
  });

  const { data: purchasingList } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
  });

  const kpiCards = [
    {
      title: 'Total On Progress',
      value: summary?.total_on_progress ?? 0,
      icon: Truck,
      color: 'bg-blue-500 text-white',
      border: 'border-blue-200',
      badge: 'Di Bengkel',
      action: () => setActiveTab('security'),
    },
    {
      title: 'Sedang Dikerjakan',
      value: summary?.sedang_dikerjakan ?? 0,
      icon: Wrench,
      color: 'bg-amber-500 text-white',
      border: 'border-amber-200',
      badge: 'Mekanik Aktif',
      action: () => setActiveTab('foreman'),
    },
    {
      title: 'Menunggu Part / Approval',
      value: summary?.menunggu_part_approval ?? 0,
      icon: AlertCircle,
      color: 'bg-purple-500 text-white',
      border: 'border-purple-200',
      badge: 'Purchasing & SA',
      action: () => setActiveTab('purchasing'),
    },
    {
      title: 'Menunggu QC / FIR Closed',
      value: summary?.menunggu_qc ?? 0,
      icon: Clock,
      color: 'bg-sky-500 text-white',
      border: 'border-sky-200',
      badge: 'Foreman & SA',
      action: () => setActiveTab('foreman'),
    },
    {
      title: 'Booking Hari Ini',
      value: summary?.booking_hari_ini ?? 0,
      icon: Calendar,
      color: 'bg-indigo-500 text-white',
      border: 'border-indigo-200',
      badge: 'Prioritas Masuk',
      action: () => setActiveTab('security'),
    },
    {
      title: 'Selesai Hari Ini',
      value: summary?.total_selesai ?? 0,
      icon: CheckCircle2,
      color: 'bg-emerald-500 text-white',
      border: 'border-emerald-200',
      badge: 'Siap Check Out',
      action: () => setActiveTab('kasir'),
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Hero Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-[11px] font-semibold mb-2 backdrop-blur-sm">
            <span>✨ Sistem Monitoring Digital Terintegrasi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Monitoring Operasional Bengkel KIM 3
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 leading-relaxed">
            Pantau pergerakan armada secara realtime dari Check In Pos Security, Penerimaan SA, Work Order Foreman, Pengadaan Sparepart Purchasing, hingga QC & Check Out.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={() => { setRole('SA'); setActiveTab('sa'); }}
              className="px-3 py-1.5 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-sm hover:bg-blue-50 transition-all flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" /> Buka Menu SA
            </button>
            <button
              onClick={() => { setRole('Admin Purchasing'); setActiveTab('purchasing'); }}
              className="px-3 py-1.5 rounded-xl bg-blue-800/80 hover:bg-blue-800 text-white font-semibold text-xs border border-blue-400/30 transition-all flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Kotak Merah Purchasing
            </button>
            <button
              onClick={() => { setRole('Customer Fleet'); setActiveTab('fleet'); }}
              className="px-3 py-1.5 rounded-xl bg-blue-800/80 hover:bg-blue-800 text-white font-semibold text-xs border border-blue-400/30 transition-all flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" /> Web Fleet Customer
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
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl ${kpi.color} flex items-center justify-center shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">{kpi.badge}</span>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {loadingSummary ? '...' : kpi.value}
                </div>
                <div className="text-xs font-semibold text-slate-600 mt-0.5 line-clamp-1">{kpi.title}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                <span>Detail</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Active Work Orders & Purchasing Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active SPK Work Orders (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Kendaraan Sedang Dikerjakan (SPK Aktif)</h2>
              <p className="text-xs text-slate-500">Update status proses otomatis dari aktivitas SA & Foreman</p>
            </div>
            <button
              onClick={() => setActiveTab('foreman')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Lihat Semua <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">No. SPK</th>
                  <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                  <th className="py-2.5 px-3 font-semibold">Customer / Armada</th>
                  <th className="py-2.5 px-3 font-semibold">Status Pekerjaan</th>
                  <th className="py-2.5 px-3 font-semibold">PIC / Mekanik</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Lead Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {spkList && spkList.length > 0 ? (
                  spkList.slice(0, 5).map((spk) => (
                    <tr key={spk.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{spk.no_spk}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{spk.no_polisi}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{spk.nama_customer || '-'}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{spk.keluhan_customer}</div>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={spk.status_spk} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {spk.nama_mekanik || spk.nama_foreman || 'Menunggu Assign'}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-700">
                        {spk.lead_time_jam ? `${spk.lead_time_jam} Jam` : '6 Jam'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Belum ada SPK aktif saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Purchasing & Sparepart Pending Alert (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Perhatian Purchasing (Kotak Merah)</h3>
                <p className="text-[11px] text-slate-500">Part Tidak Ready & Memerlukan Penawaran PO</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {purchasingList && purchasingList.length > 0 ? (
                purchasingList.slice(0, 3).map((item) => (
                  <div key={item.pr_id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700">{item.no_pr}</span>
                      <StatusBadge status={item.status_pr} size="sm" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {item.no_polisi} - {item.nama_customer}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {item.catatan_pr || 'Pengadaan sparepart untuk kelanjutan pekerjaan service.'}
                    </p>
                    {item.estimasi_tanggal_ready_eta && (
                      <div className="pt-1.5 border-t border-amber-200/60 flex items-center justify-between text-[10px] text-amber-900 font-semibold">
                        <span>ETA Ready:</span>
                        <span>{item.estimasi_tanggal_ready_eta} ({item.estimasi_jam_ready_eta || '14:00'})</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Semua part ready di stock, tidak ada pending PR.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('purchasing')}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Buka Alur Purchasing
          </button>
        </div>

      </div>

    </div>
  );
};
