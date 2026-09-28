import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import { isSpkAssignedToMechanic } from '../utils/spkAccess';
import { isTanggalHariIni } from '../utils/tanggal';
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
  Search,
  DollarSign
} from 'lucide-react';
import { SpkService, AntrianKunjungan, PurchaseRequestPart, InvoicePembayaran, PekerjaanTambahan } from '../types';

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
        {/* Banner */}
        <div className="rounded-xl bg-accent text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-2 backdrop-blur-sm">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Dashboard Operasional Service Advisor</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Halo, {currentUser || 'Service Advisor'}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl leading-relaxed">
              Pantau antrian unit yang baru check-in dari Pos Security, buat estimasi &amp; SPK, kelola kotak merah sparepart, dan lakukan serah terima kendaraan selesai.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab('sa-baru')}
                className="px-3.5 py-2 rounded-xl bg-surface-raised text-ink font-bold text-xs shadow-xs hover:bg-surface transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5 text-accent" /> + Penerimaan &amp; Buat SPK
              </button>
              <button
                onClick={() => setActiveTab('sa-list')}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> Daftar SPK Aktif ({spkAktif.length})
              </button>
              <button
                onClick={() => setActiveTab('sa-kotak-merah')}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Kotak Merah ({prKotakMerah.length})
              </button>
              <button
                onClick={() => setActiveTab('beli-part')}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" /> Jual Part Langsung
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            value={antrianMenunggu.length}
            title="Menunggu Penerimaan"
            subtitle="Gate Check-in Pos"
            icon={Truck}
            tone="blue"
            onClick={() => setActiveTab('sa-penerimaan')}
          />
          <StatCard
            value={spkAktif.length}
            title="SPK Aktif di Bengkel"
            subtitle="Dalam Proses Servis"
            icon={ClipboardList}
            tone="amber"
            onClick={() => setActiveTab('sa-list')}
          />
          <StatCard
            value={prKotakMerah.length}
            title="Part PO / Kotak Merah"
            subtitle="Menunggu SA & PO"
            icon={ShoppingBag}
            tone="red"
            onClick={() => setActiveTab('sa-kotak-merah')}
          />
          <StatCard
            value={spkSiapQc.length}
            title="Siap Serah Terima"
            subtitle="QC Passed & FIR Closed"
            icon={CheckCircle2}
            tone="green"
            onClick={() => setActiveTab('sa-list')}
          />
        </div>

        {/* 2-Col Content Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Antrian Unit Baru Masuk dari Pos Security */}
          <div className="lg:col-span-2 bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                  <Truck className="w-4 h-4 text-accent" />
                  Antrian Unit Masuk dari Pos Security
                </h2>
                <p className="text-xs text-ink-muted">Unit telah melalui gate check-in dan siap dibuatkan formulir SPK</p>
              </div>
              <button
                onClick={() => setActiveTab('sa-penerimaan')}
                className="text-xs font-bold text-accent hover:text-accent flex items-center gap-1 cursor-pointer"
              >
                Ke Menu SA <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-ink-muted border-y border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">No. Tiket</th>
                    <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                    <th className="py-2.5 px-3 font-semibold">Customer / Armada</th>
                    <th className="py-2.5 px-3 font-semibold">Waktu Masuk</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {antrianMenunggu.length > 0 ? (
                    antrianMenunggu.map((item) => (
                      <tr key={item.id} className="hover:bg-surface/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-accent">{item.no_tiket}</td>
                        <td className="py-3 px-3 font-bold text-ink">{item.no_polisi}</td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-ink">{item.nama_customer || '-'}</div>
                          <div className="text-xs text-ink-subtle">{item.jenis_armada} • {item.keperluan || 'Service'}</div>
                        </td>
                        <td className="py-3 px-3 text-ink-muted">
                          {item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              // Deep-link: buka form penerimaan SA langsung terisi antrian ini
                              setSaPendingAntrianId(item.id);
                              setActiveTab('sa-penerimaan');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <ClipboardList className="w-3 h-3" /> Buat SPK
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-subtle">
                        Tidak ada antrian unit menunggu penerimaan saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kotak Merah & Sparepart Attention */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-status-red-bg text-status-red flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Perhatian Kotak Merah</h3>
                  <p className="text-xs text-ink-muted">Sparepart PO &amp; Approval SA</p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {prKotakMerah.length > 0 ? (
                  prKotakMerah.slice(0, 3).map((item) => (
                    <div key={item.pr_id} className="p-3 rounded-lg border border-status-red/30 bg-status-red-bg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-status-red">{item.no_pr}</span>
                        <StatusBadge status={item.status_pr} size="sm" />
                      </div>
                      <div className="text-xs font-bold text-ink">
                        {item.no_polisi} - {item.nama_customer}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {item.catatan_pr || 'Pengadaan part khusus untuk SPK unit.'}
                      </div>
                      {item.estimasi_tanggal_ready_eta && (
                        <div className="pt-1.5 border-t border-status-red/30 flex items-center justify-between text-xs text-status-red font-semibold">
                          <span>ETA Kedatangan:</span>
                          <span>{item.estimasi_tanggal_ready_eta} {item.estimasi_jam_ready_eta ? `(${item.estimasi_jam_ready_eta})` : ''}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-ink-subtle text-xs">
                    Semua sparepart ready atau telah dikonfirmasi.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveTab('sa-kotak-merah')}
              className="w-full mt-4 py-2 px-3 rounded-xl bg-status-red text-white font-bold text-xs hover:bg-status-red/90 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Buka Alur Kotak Merah
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
        <div className="rounded-xl bg-accent text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-2 backdrop-blur-sm">
              <Wrench className="w-3.5 h-3.5" />
              <span>Dashboard Foreman &amp; Quality Control (QC)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Halo, {currentUser || 'Foreman'}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl leading-relaxed">
              Atur alokasi pengerjaan mekanik di stall, monitor waktu pengerjaan live stopwatch, verifikasi pekerjaan tambahan, dan lakukan inspeksi Final Inspection Report (FIR).
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab('foreman')}
                className="px-3 py-1.5 rounded-xl bg-surface-raised text-ink font-bold text-xs shadow-sm hover:bg-surface transition-all flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" /> Penugasan Mekanik &amp; QC
              </button>
              <button
                onClick={() => setActiveTab('mekanik')}
                className="px-3 py-1.5 rounded-xl bg-ink/40 hover:bg-ink/60 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" /> Live Monitoring Mekanik
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            value={spkMenungguAssign.length}
            title="SPK Menunggu Mekanik"
            subtitle="Perlu Penugasan"
            icon={AlertCircle}
            tone="red"
            onClick={() => setActiveTab('foreman')}
          />
          <StatCard
            value={spkSedangDikerjakan.length}
            title="Sedang Dikerjakan"
            subtitle="Stall Aktif"
            icon={Wrench}
            tone="amber"
            onClick={() => setActiveTab('foreman')}
          />
          <StatCard
            value={spkMenungguQc.length}
            title="Antrian QC & FIR"
            subtitle="Inspeksi Selesai"
            icon={CheckCircle}
            tone="accent"
            onClick={() => setActiveTab('foreman')}
          />
          <StatCard
            value={tambahanPending.length}
            title="Pekerjaan Tambahan"
            subtitle="Menunggu Approval"
            icon={AlertTriangle}
            tone="red"
            onClick={() => setActiveTab('foreman')}
          />
        </div>

        {/* 2-Col Content Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SPK Stall Management */}
          <div className="lg:col-span-2 bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-status-amber" />
                  Status Pengerjaan Stall &amp; Penugasan SPK
                </h2>
                <p className="text-xs text-ink-muted">Daftar SPK aktif dan alokasi mekanik penanggung jawab</p>
              </div>
              <button
                onClick={() => setActiveTab('foreman')}
                className="text-xs font-bold text-status-amber hover:text-status-amber flex items-center gap-1"
              >
                Buka Foreman <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-ink-muted border-y border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">No. SPK</th>
                    <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Mekanik</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {spkList.length > 0 ? (
                    spkList.slice(0, 5).map((spk) => (
                      <tr key={spk.id} className="hover:bg-surface/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-accent">{spk.no_spk}</td>
                        <td className="py-3 px-3 font-bold text-ink">{spk.no_polisi}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={spk.status_spk} size="sm" />
                        </td>
                        <td className="py-3 px-3 font-medium text-ink-muted">
                          {spk.nama_mekanik ? (
                            <span className="inline-flex items-center gap-1 text-ink">
                              <span className="w-2 h-2 rounded-full bg-status-green"></span>
                              {spk.nama_mekanik}
                            </span>
                          ) : (
                            <span className="text-status-red font-bold">Belum Ditugaskan</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setActiveTab('foreman')}
                            className="px-2.5 py-1 rounded-xl bg-status-amber hover:bg-status-amber/90 text-white font-bold text-xs transition-colors inline-flex items-center gap-1"
                          >
                            Kelola SPK
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-subtle">
                        Tidak ada SPK aktif saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Antrian QC & Validasi FIR */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-accent-subtle text-accent flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Antrian QC &amp; Validasi FIR</h3>
                  <p className="text-xs text-ink-muted">Pekerjaan selesai, siap uji fisik/jalan</p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {spkMenungguQc.length > 0 ? (
                  spkMenungguQc.map((spk) => (
                    <div key={spk.id} className="p-3 rounded-xl border border-accent/30 bg-accent-subtle space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-accent">{spk.no_spk}</span>
                        <StatusBadge status={spk.status_spk} size="sm" />
                      </div>
                      <div className="text-xs font-bold text-ink">
                        {spk.no_polisi} - {spk.nama_customer}
                      </div>
                      <div className="text-xs text-ink-muted">
                        Mekanik: <span className="font-semibold">{spk.nama_mekanik || '-'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-ink-subtle text-xs">
                    Tidak ada unit menunggu QC saat ini.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveTab('foreman')}
              className="w-full mt-4 py-2 px-3 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent-hover transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Buka Menu QC FIR
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
    // Strict: hanya WO yang ditugaskan ke mekanik login (by ID, fallback nama persis).
    // WO milik mekanik lain atau yang belum ditugaskan TIDAK tampil di sini.
    const mySpks = spkList.filter((s) => isSpkAssignedToMechanic(s, authUser, currentUser));
    const mySpkIds = new Set(mySpks.map((s) => s.id));
    const spkDone = mySpks.filter((s) => s.status_spk === 'Waiting QC' || s.status_spk === 'QC Passed' || s.status_spk === 'FIR Closed');
    const tambahanSaya = tambahanList.filter((t) => mySpkIds.has(t.id_spk));

    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-xl bg-accent text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-2 backdrop-blur-sm">
              <Clock className="w-3.5 h-3.5" />
              <span>Dashboard Mekanik Bengkel</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Halo, {currentUser || 'Mekanik'}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl leading-relaxed">
              Lihat perintah kerja SPK yang ditugaskan ke Anda, jalankan timer stopwatch pengerjaan, dan laporkan temuan kerusakan tambahan bila ditemukan saat servis.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab('mekanik')}
                className="px-3.5 py-2 rounded-xl bg-surface-raised text-ink font-bold text-xs shadow-sm hover:bg-surface transition-all flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" /> Buka Stopwatch &amp; Lembar Kerja
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            value={mySpks.length}
            title="Work Order Saya"
            subtitle="Tugas Aktif"
            icon={Wrench}
            tone="green"
            onClick={() => setActiveTab('mekanik')}
          />
          <StatCard
            value={spkDone.length}
            title="Selesai Dikerjakan"
            subtitle="Menunggu QC / Closed"
            icon={CheckCircle2}
            tone="blue"
            onClick={() => setActiveTab('mekanik')}
          />
          <StatCard
            value="Ready"
            title="Status Stopwatch"
            subtitle="Live Timer"
            icon={Clock}
            tone="amber"
            onClick={() => setActiveTab('mekanik')}
          />
          <StatCard
            value={tambahanSaya.length}
            title="Temuan Tambahan"
            subtitle="Kerusakan Baru"
            icon={AlertTriangle}
            tone="red"
            onClick={() => setActiveTab('mekanik')}
          />
        </div>

        {/* 2-Col Content Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-status-green" />
                  Daftar Perintah Kerja Ditugaskan
                </h2>
                <p className="text-xs text-ink-muted">Klik pengerjaan untuk membuka stopwatch live timer</p>
              </div>
              <button
                onClick={() => setActiveTab('mekanik')}
                className="text-xs font-bold text-status-green hover:text-status-green flex items-center gap-1"
              >
                Buka Stopwatch <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {mySpks.length > 0 ? (
                mySpks.map((spk) => {
                  const bisaDikerjakan = ['Estimasi Disetujui', 'Dalam Pengerjaan', 'Waiting Part', 'Pending'].includes(spk.status_spk as string);
                  const sudahSelesai = ['Waiting QC', 'QC Passed', 'FIR Closed', 'Selesai'].includes(spk.status_spk as string);
                  return (
                  <div key={spk.id} className="p-4 rounded-xl border border-border hover:border-accent/30 transition-all bg-surface/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent">{spk.no_spk}</span>
                        <span className="font-black text-ink text-sm">{spk.no_polisi}</span>
                        <StatusBadge status={spk.status_spk} size="sm" />
                      </div>
                      <p className="text-xs text-ink-muted font-medium">
                        Customer: {spk.nama_customer || '-'} • Keluhan: {spk.keluhan_customer || 'Perbaikan'}
                      </p>
                      <div className="text-xs text-ink-subtle">
                        Lead time estimasi: <span className="font-bold text-ink-muted">{spk.estimasi_waktu_jam || spk.lead_time_jam ? `${spk.estimasi_waktu_jam || spk.lead_time_jam} Jam` : '-'}</span>
                      </div>
                    </div>
                    {bisaDikerjakan ? (
                      <button
                        onClick={() => setActiveTab('mekanik')}
                        className="px-3.5 py-2 rounded-xl bg-status-green hover:bg-status-green/90 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Kerjakan / Timer
                      </button>
                    ) : (
                      <span className={`text-xs font-bold px-2.5 py-1.5 rounded-xl shrink-0 ${sudahSelesai ? 'bg-status-green-bg text-status-green' : 'bg-surface text-ink-subtle border border-border'}`}>
                        {sudahSelesai ? 'Selesai — menunggu QC Foreman' : 'Menunggu WO terbit'}
                      </span>
                    )}
                  </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-ink-subtle text-xs">
                  Tidak ada tugas SPK yang ditugaskan kepada Anda saat ini.
                </div>
              )}
            </div>
          </div>

          {/* SOP & Panduan Kerja Mekanik */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-status-green" />
              SOP Pengerjaan Bengkel KIM 3
            </h3>
            <ul className="text-xs text-ink-muted space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-status-green-bg text-status-green flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Pastikan cek fisik awal &amp; pasang cover pelindung sebelum mulai.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-status-green-bg text-status-green flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Jalankan live stopwatch saat mulai membongkar/memperbaiki unit.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-status-green-bg text-status-green flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Jika ada kerusakan lain, ajukan segera di form <strong>Temuan Tambahan</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-status-green-bg text-status-green flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
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
        {/* Banner */}
        <div className="rounded-xl bg-accent text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-2 backdrop-blur-sm">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Dashboard Admin Purchasing &amp; Pengadaan Sparepart</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Halo, {currentUser || 'Admin Purchasing'}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl leading-relaxed">
              Kelola permintaan pengadaan sparepart dari SA (Kotak Merah), bandingkan penawaran 2 vendor, terbitkan PO, dan pantau estimasi kedatangan (ETA) part.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab('purchasing')}
                className="px-3.5 py-2 rounded-xl bg-surface-raised text-ink font-bold text-xs shadow-xs hover:bg-surface transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-accent" /> Kelola PR &amp; Kotak Merah
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            value={prDiajukan.length}
            title="PR Masuk dari SA"
            subtitle="Menunggu Diproses"
            icon={AlertCircle}
            tone="red"
            onClick={() => setActiveTab('purchasing')}
          />
          <StatCard
            value={prDiproses.length}
            title="Bandingkan Vendor"
            subtitle="Penawaran 2 Vendor"
            icon={ShoppingBag}
            tone="amber"
            onClick={() => setActiveTab('purchasing')}
          />
          <StatCard
            value={poDiterbitkan.length}
            title="PO Dalam Pengiriman"
            subtitle="Monitoring ETA"
            icon={Truck}
            tone="blue"
            onClick={() => setActiveTab('purchasing')}
          />
          <StatCard
            value={purchasingList.length}
            title="Semua Pengadaan"
            subtitle="Total Permintaan"
            icon={CheckCircle2}
            tone="green"
            onClick={() => setActiveTab('purchasing')}
          />
        </div>

        {/* 2-Col Content Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-status-red" />
                  Antrian Purchase Request (PR) Kotak Merah
                </h2>
                <p className="text-xs text-ink-muted">Part yang tidak ready di stok gudang dan membutuhkan PO</p>
              </div>
              <button
                onClick={() => setActiveTab('purchasing')}
                className="text-xs font-bold text-status-red hover:text-status-red flex items-center gap-1 cursor-pointer"
              >
                Ke Menu Purchasing <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-ink-muted border-y border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">No. PR</th>
                    <th className="py-2.5 px-3 font-semibold">No. Polisi / Customer</th>
                    <th className="py-2.5 px-3 font-semibold">SA Pemohon</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchasingList.length > 0 ? (
                    purchasingList.slice(0, 5).map((item) => (
                      <tr key={item.pr_id} className="hover:bg-surface/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-status-red">{item.no_pr}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-ink">{item.no_polisi}</div>
                          <div className="text-xs text-ink-muted">{item.nama_customer || '-'}</div>
                        </td>
                        <td className="py-3 px-3 text-ink-muted">{item.nama_sa_pemohon || '-'}</td>
                        <td className="py-3 px-3">
                          <StatusBadge status={item.status_pr} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setActiveTab('purchasing')}
                            className={`px-2.5 py-1 rounded-xl font-bold text-xs transition-colors cursor-pointer ${item.no_po ? 'bg-status-blue hover:bg-status-blue/90 text-white' : 'bg-status-red hover:bg-status-red/90 text-white'}`}
                          >
                            {item.no_po ? 'Lihat PO' : 'Proses PO'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-subtle">
                        Tidak ada PR pending saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monitoring ETA Vendor */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Truck className="w-4 h-4 text-status-red" />
              Monitoring Pengiriman PO Vendor
            </h3>
            <div className="space-y-3">
              {poDiterbitkan.length > 0 ? (
                poDiterbitkan.map((po) => (
                  <div key={po.pr_id} className="p-3 rounded-lg border border-status-blue/30 bg-status-blue-bg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-accent">{po.no_po || '-'}</span>
                      <span className="text-xs font-bold text-accent bg-accent-subtle px-2 py-0.5 rounded">Vendor: {po.vendor_terpilih || '-'}</span>
                    </div>
                    <div className="text-xs font-bold text-ink">{po.no_polisi} - {po.nama_customer}</div>
                    <div className="text-xs text-ink-muted flex items-center justify-between pt-1 border-t border-status-blue/30">
                      <span>ETA Tiba:</span>
                      <span className="font-bold text-status-blue">{po.estimasi_tanggal_ready_eta || '-'} {po.estimasi_jam_ready_eta || ''}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-ink-subtle text-xs">
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
      .filter((inv) => inv.status_pembayaran === 'Paid' && isTanggalHariIni(inv.tanggal_bayar))
      .reduce((sum, inv) => sum + (inv.grand_total || 0), 0);

    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-xl bg-accent text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-2 backdrop-blur-sm">
              <Receipt className="w-3.5 h-3.5" />
              <span>Dashboard Kasir &amp; Faktur Tagihan</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Halo, {currentUser || 'Kasir'}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl leading-relaxed">
              Terbitkan faktur tagihan untuk SPK yang telah FIR Closed, catat pelunasan kas masuk, kelola transaksi beli part langsung, dan terbitkan memo keluar resmi.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab('kasir')}
                className="px-3.5 py-2 rounded-xl bg-surface-raised text-ink font-bold text-xs shadow-xs hover:bg-surface transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-accent" /> Kelola Kasir &amp; Faktur
              </button>
              <button
                onClick={() => setActiveTab('beli-part')}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Package className="w-4 h-4" /> Beli Part Langsung
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            value={spkSiapFaktur.length}
            title="SPK Siap Faktur"
            subtitle="QC & FIR Closed"
            icon={ClipboardList}
            tone="blue"
            onClick={() => setActiveTab('kasir')}
          />
          <StatCard
            value={invoiceUnpaid.length}
            title="Tagihan Unpaid"
            subtitle="Menunggu Pelunasan"
            icon={Receipt}
            tone="amber"
            onClick={() => setActiveTab('kasir')}
          />
          <StatCard
            value={`Rp ${(totalKasHariIni / 1000000).toFixed(1)} jt`}
            title="Kas Masuk Hari Ini"
            subtitle="Penerimaan Lunas"
            icon={DollarSign}
            tone="green"
            onClick={() => setActiveTab('kasir')}
          />
          <StatCard
            value={summary?.total_selesai ?? 0}
            title="Unit Selesai & Keluar"
            subtitle="Memo Keluar Resmi"
            icon={FileText}
            tone="accent"
            onClick={() => setActiveTab('kasir')}
          />
        </div>

        {/* 2-Col Content Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-status-green" />
                  SPK FIR Closed Siap Diterbitkan Faktur
                </h2>
                <p className="text-xs text-ink-muted">Unit telah lulus uji QC jalan &amp; FIR closed oleh SA &amp; Foreman</p>
              </div>
              <button
                onClick={() => setActiveTab('kasir')}
                className="text-xs font-bold text-status-green hover:text-status-green flex items-center gap-1"
              >
                Ke Menu Kasir <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-ink-muted border-y border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">No. SPK</th>
                    <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                    <th className="py-2.5 px-3 font-semibold">Customer</th>
                    <th className="py-2.5 px-3 font-semibold">Estimasi Total</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {spkSiapFaktur.length > 0 ? (
                    spkSiapFaktur.map((spk) => (
                      <tr key={spk.id} className="hover:bg-surface/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-accent">{spk.no_spk}</td>
                        <td className="py-3 px-3 font-bold text-ink">{spk.no_polisi}</td>
                        <td className="py-3 px-3 text-ink-muted">{spk.nama_customer || '-'}</td>
                        <td className="py-3 px-3 font-semibold text-ink">
                          Rp {(spk.estimasi_biaya || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setActiveTab('kasir')}
                            className="px-2.5 py-1 rounded-xl bg-status-green hover:bg-status-green/90 text-white font-bold text-xs transition-colors"
                          >
                            Terbitkan Faktur
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-subtle">
                        Tidak ada SPK menunggu faktur saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daftar Invoice Unpaid */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Receipt className="w-4 h-4 text-status-green" />
              Tagihan Faktur Unpaid
            </h3>
            <div className="space-y-3">
              {invoiceUnpaid.length > 0 ? (
                invoiceUnpaid.map((inv) => (
                  <div key={inv.id} className="p-3 rounded-xl border border-status-amber/30 bg-status-amber-bg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-accent">{inv.no_invoice}</span>
                      <StatusBadge status={inv.status_pembayaran} size="sm" />
                    </div>
                    <div className="text-xs font-bold text-ink">{inv.no_polisi} - {inv.nama_customer}</div>
                    <div className="text-xs font-black text-status-amber pt-1 border-t border-status-amber/30 flex items-center justify-between">
                      <span>Total:</span>
                      <span>Rp {(inv.grand_total || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-ink-subtle text-xs">
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
        {/* Banner */}
        <div className="rounded-xl bg-accent text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-2 backdrop-blur-sm">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Dashboard PIC Konfirmasi Kunjungan Tamu</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Halo, {currentUser || 'PIC Bengkel KIM 3'}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl leading-relaxed">
              Konfirmasi kedatangan tamu/vendor yang melapor di Pos Gerbang Security secara realtime dan pantau status izin masuk ke area fasilitas KIM 3.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab('pic-terkait')}
                className="px-3.5 py-2 rounded-xl bg-surface-raised text-ink font-bold text-xs shadow-xs hover:bg-surface transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-accent" /> Buka Konfirmasi Kunjungan
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            value={tamuMenunggu.length}
            title="Menunggu Konfirmasi"
            subtitle="Di Pos Gerbang"
            icon={Clock}
            tone="red"
            onClick={() => setActiveTab('pic-terkait')}
          />
          <StatCard
            value={tamuAktif.length}
            title="Di Area Bengkel"
            subtitle="Tamu Aktif"
            icon={UserCheck}
            tone="accent"
            onClick={() => setActiveTab('pic-terkait')}
          />
          <StatCard
            value={antrianList.filter((a) => a.tujuan_kedatangan === 'Kunjungan' && a.waktu_keluar && isTanggalHariIni(a.waktu_keluar)).length}
            title="Kunjungan Selesai"
            subtitle="Hari Ini"
            icon={CheckCircle2}
            tone="green"
            onClick={() => setActiveTab('pic-terkait')}
          />
        </div>

        {/* Content Feed */}
        <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-accent" />
                Daftar Tamu Menunggu Izin Masuk
              </h2>
              <p className="text-xs text-ink-muted">Petugas Security di gerbang membutuhkan konfirmasi penerimaan Anda</p>
            </div>
            <button
              onClick={() => setActiveTab('pic-terkait')}
              className="text-xs font-bold text-accent hover:text-accent flex items-center gap-1 cursor-pointer"
            >
              Layar Konfirmasi <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {tamuMenunggu.length > 0 ? (
              tamuMenunggu.map((tamu) => (
                <div key={tamu.id} className="p-4 rounded-xl border border-status-red/30 bg-status-red-bg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{tamu.no_tiket}</span>
                      <span className="font-bold text-ink text-sm">{tamu.no_polisi}</span>
                      <span className="text-xs font-semibold text-ink-muted">({tamu.nama_customer || 'Tamu'})</span>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Keperluan: <span className="font-semibold text-ink">{tamu.keperluan || '-'}</span>
                    </p>
                    <div className="text-xs text-ink-subtle">
                      Waktu tiba di gerbang: {tamu.waktu_masuk ? new Date(tamu.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('pic-terkait')}
                    className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Konfirmasi Masuk
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-ink-subtle text-xs">
                Tidak ada tamu yang sedang menunggu konfirmasi di pos gerbang.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: Ringkasan Seluruh Bengkel (Global)
  // ==========================================
  const renderGlobalOverview = () => {
    const globalKpis: {
      title: string;
      value: number | string;
      subtitle: string;
      icon: React.ComponentType<{ className?: string }>;
      tone: 'accent' | 'amber' | 'blue' | 'green' | 'red' | 'neutral';
      action: () => void;
    }[] = [
      {
        title: 'Total On Progress',
        value: loadingSummary ? '...' : (summary?.total_on_progress ?? 0),
        subtitle: 'Di Bengkel',
        icon: Truck,
        tone: 'blue',
        action: () => setActiveTab('security-onprogress'),
      },
      {
        title: 'Sedang Dikerjakan',
        value: loadingSummary ? '...' : (summary?.sedang_dikerjakan ?? 0),
        subtitle: 'Mekanik Aktif',
        icon: Wrench,
        tone: 'amber',
        action: () => setActiveTab('foreman'),
      },
      {
        title: 'Menunggu Part / PO',
        value: loadingSummary ? '...' : (summary?.menunggu_part_approval ?? 0),
        subtitle: 'Purchasing',
        icon: AlertCircle,
        tone: 'red',
        action: () => setActiveTab('purchasing'),
      },
      {
        title: 'Menunggu QC / FIR',
        value: loadingSummary ? '...' : (summary?.menunggu_qc ?? 0),
        subtitle: 'Foreman & SA',
        icon: Clock,
        tone: 'accent',
        action: () => setActiveTab('foreman'),
      },
      {
        title: 'Booking Hari Ini',
        value: loadingSummary ? '...' : (summary?.booking_hari_ini ?? 0),
        subtitle: 'Prioritas Masuk',
        icon: Calendar,
        tone: 'accent',
        action: () => setActiveTab('security-booking'),
      },
      {
        title: 'Selesai Hari Ini',
        value: loadingSummary ? '...' : (summary?.total_selesai ?? 0),
        subtitle: 'Siap Check Out',
        icon: CheckCircle2,
        tone: 'green',
        action: () => setActiveTab('kasir'),
      },
    ];

    return (
      <div className="space-y-6">
        {/* Hero Welcome Banner */}
        <div className="card-modern rounded-2xl bg-surface-raised border border-border p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-subtle text-accent text-xs font-semibold mb-2.5 border border-accent/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
              <span>Sistem Monitoring Digital Terintegrasi</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
              Ringkasan Operasional Bengkel KIM 3
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-1.5 leading-relaxed">
              Pantau pergerakan armada secara realtime dari Check In Pos Security, Penerimaan SA, Work Order Foreman, Pengadaan Sparepart Purchasing, hingga QC &amp; Check Out.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => { setRole('SA'); setActiveTab('sa'); }}
                className="px-3.5 py-1.5 rounded-xl bg-accent text-white font-bold text-xs shadow-xs hover:bg-accent-hover transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" /> Buka Menu SA
              </button>
              <button
                type="button"
                onClick={() => { setRole('Admin Purchasing'); setActiveTab('purchasing'); }}
                className="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-raised text-ink font-semibold text-xs border border-border transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-accent" /> Kotak Merah Purchasing
              </button>
              <button
                type="button"
                onClick={() => { setRole('Customer Fleet'); setActiveTab('fleet-dashboard'); }}
                className="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-raised text-ink font-semibold text-xs border border-border transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-accent" /> Web Fleet Customer
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {globalKpis.map((kpi, idx) => (
            <StatCard
              key={idx}
              value={kpi.value}
              title={kpi.title}
              subtitle={kpi.subtitle}
              icon={kpi.icon}
              tone={kpi.tone}
              onClick={kpi.action}
            />
          ))}
        </div>

        {/* Two Column Layout: Active Work Orders & Purchasing Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-modern bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-ink">Kendaraan Sedang Dikerjakan (SPK Aktif)</h2>
                <p className="text-xs text-ink-muted">Update status proses otomatis dari aktivitas SA &amp; Foreman</p>
              </div>
              <button
                onClick={() => setActiveTab('foreman')}
                className="text-xs font-bold text-accent hover:text-accent flex items-center gap-1 cursor-pointer"
              >
                Lihat Semua <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-ink-muted border-y border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">No. SPK</th>
                    <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                    <th className="py-2.5 px-3 font-semibold">Customer / Armada</th>
                    <th className="py-2.5 px-3 font-semibold">Status Pekerjaan</th>
                    <th className="py-2.5 px-3 font-semibold">PIC / Mekanik</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Lead Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {spkList && spkList.length > 0 ? (
                    spkList.slice(0, 5).map((spk) => (
                      <tr key={spk.id} className="hover:bg-surface/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-accent">{spk.no_spk}</td>
                        <td className="py-3 px-3 font-bold text-ink">{spk.no_polisi}</td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-ink">{spk.nama_customer || '-'}</div>
                          <div className="text-xs text-ink-subtle line-clamp-1">{spk.keluhan_customer}</div>
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={spk.status_spk} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-ink-muted font-medium">
                          {spk.nama_mekanik || spk.nama_foreman || 'Menunggu Assign'}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-ink-muted">
                          {spk.estimasi_waktu_jam || spk.lead_time_jam ? `${spk.estimasi_waktu_jam || spk.lead_time_jam} Jam` : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-ink-subtle">
                        Belum ada SPK aktif saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-status-red-bg text-status-red flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Perhatian Purchasing (Kotak Merah)</h3>
                  <p className="text-xs text-ink-muted">Part Tidak Ready &amp; Memerlukan Penawaran PO</p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {purchasingList && purchasingList.length > 0 ? (
                  purchasingList.slice(0, 3).map((item) => (
                    <div key={item.pr_id} className="p-3 rounded-lg border border-status-amber/30 bg-status-amber-bg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-accent">{item.no_pr}</span>
                        <StatusBadge status={item.status_pr} size="sm" />
                      </div>
                      <div className="text-xs font-bold text-ink">
                        {item.no_polisi} - {item.nama_customer}
                      </div>
                      <p className="text-xs text-ink-muted line-clamp-2">
                        {item.catatan_pr || 'Pengadaan sparepart untuk kelanjutan pekerjaan service.'}
                      </p>
                      {item.estimasi_tanggal_ready_eta && (
                        <div className="pt-1.5 border-t border-status-amber/30 flex items-center justify-between text-xs text-status-amber font-semibold">
                          <span>ETA Ready:</span>
                          <span>{item.estimasi_tanggal_ready_eta} {item.estimasi_jam_ready_eta ? `(${item.estimasi_jam_ready_eta})` : ''}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-ink-subtle text-xs">
                    Semua part ready di stock, tidak ada pending PR.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveTab('purchasing')}
              className="w-full mt-4 py-2 px-3 rounded-xl bg-status-red text-white font-bold text-xs hover:bg-status-red/90 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Buka Alur Purchasing
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main Return: with Role Switch Header
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* View Switcher Header */}
      <div className="card-modern rounded-xl p-3 bg-surface-raised border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse"></span>
          <span className="text-xs font-bold text-ink-muted">Tampilan Dashboard:</span>
          <span className="px-2.5 py-1 rounded-full bg-accent-subtle text-accent font-bold text-xs border border-accent/20">
            {viewMode === 'role' ? `Dashboard Khusus ${currentRole}` : 'Ringkasan Seluruh Bengkel'}
          </span>
        </div>

        {/* Toggle Buttons */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setViewMode('role')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'role'
                ? 'bg-surface-raised text-accent shadow-xs border border-border'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Dashboard {currentRole}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('global')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'global'
                ? 'bg-surface-raised text-accent shadow-xs border border-border'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Ringkasan Bengkel
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
