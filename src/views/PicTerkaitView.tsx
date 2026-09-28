import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import { SectionHeader } from '../components/common/SectionHeader';
import { ListItemCard } from '../components/common/ListItemCard';
import { DetailModal } from '../components/common/DetailModal';
import { StepModal } from '../components/common/StepModal';
import { FilterChips } from '../components/common/FilterChips';
import { TabBar } from '../components/common/TabBar';
import { EmptyState } from '../components/common/EmptyState';
import { AntrianKunjungan } from '../types';
import { realtimeHub } from '../services/realtimeService';
import { toast } from '../components/common/Toast';
import { isTanggalHariIni } from '../utils/tanggal';
import {
  Users,
  Clock,
  Building2,
  CheckCircle2,
  History,
  Search,
  AlertCircle
} from 'lucide-react';

type RiwayatFilterType = 'Semua' | 'Diterima' | 'Ditolak' | 'Selesai';

export const PicTerkaitView: React.FC = () => {
  const queryClient = useQueryClient();
  const { authUser, currentRole, currentUser, kunjunganPendingId, setKunjunganPendingId, setApprovalModalOpen } = useAppStore();
  const [subTab, setSubTab] = useState<'masuk' | 'riwayat'>('masuk');
  const [rejecting, setRejecting] = useState<AntrianKunjungan | null>(null);
  const [rejectStep, setRejectStep] = useState(0);
  const [catatanTolak, setCatatanTolak] = useState('');
  const [selected, setSelected] = useState<AntrianKunjungan | null>(null);
  const [riwayatFilter, setRiwayatFilter] = useState<RiwayatFilterType>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: antrianList } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
  });

  // Realtime subscription for incoming guests or check-out events
  useEffect(() => {
    const unsub = realtimeHub.subscribe((event) => {
      if (
        event.type === 'KUNJUNGAN_ARRIVED' ||
        event.type === 'VEHICLE_CHECKED_OUT' ||
        event.type === 'VEHICLE_CHECKED_IN'
      ) {
        queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      }
    });
    return () => unsub();
  }, [queryClient]);

  // Scoped to PIC account
  const allKunjungan: AntrianKunjungan[] = useMemo(() => {
    return (antrianList || []).filter((a) => {
      if (a.tujuan_kedatangan !== 'Kunjungan') return false;
      if (currentRole === 'Super Admin') return true;
      if (authUser?.id && a.id_pic) {
        return a.id_pic === authUser.id;
      }
      if (authUser?.nama_lengkap && a.pic_tujuan) {
        const nama = authUser.nama_lengkap.toLowerCase();
        const picTujuan = a.pic_tujuan.toLowerCase();
        return picTujuan.includes(nama) || (authUser.email && picTujuan.includes(authUser.email.toLowerCase()));
      }
      return false;
    });
  }, [antrianList, currentRole, authUser]);

  // Notifikasi kunjungan masuk: tamu / dinas yang masih Check In & belum selesai konfirmasi
  const kunjunganMasuk = useMemo(() => {
    return allKunjungan.filter(
      (a) => a.status_kunjungan === 'Check In' && (!a.status_konfirmasi_pic || a.status_konfirmasi_pic === 'Menunggu Konfirmasi')
    );
  }, [allKunjungan]);

  // Deep-link approval realtime
  useEffect(() => {
    if (kunjunganPendingId == null) return;
    if (antrianList === undefined) return;
    const target = kunjunganMasuk.find((a) => a.id === kunjunganPendingId);
    if (target) {
      setSubTab('masuk');
      setSelected(target);
    }
    setKunjunganPendingId(null);
  }, [kunjunganPendingId, antrianList, kunjunganMasuk, setKunjunganPendingId]);

  useEffect(() => {
    setApprovalModalOpen(!!selected || !!rejecting);
  }, [selected, rejecting, setApprovalModalOpen]);

  // Riwayat kunjungan
  const kunjunganRiwayat = useMemo(() => {
    return allKunjungan.filter(
      (a) =>
        a.status_konfirmasi_pic === 'Diterima' ||
        a.status_konfirmasi_pic === 'Ditolak' ||
        a.status_kunjungan === 'Keluar' ||
        a.status_kunjungan === 'Selesai' ||
        !!a.waktu_keluar
    );
  }, [allKunjungan]);

  // Metrics for 4 Top Stat Cards
  const totalTamuHariIni = allKunjungan.filter((k) => isTanggalHariIni(k.waktu_masuk)).length;
  const menungguKonfirmasiCount = kunjunganMasuk.length;
  const tamuDiAreaBengkelCount = allKunjungan.filter(
    (a) =>
      a.status_konfirmasi_pic === 'Diterima' &&
      a.status_kunjungan !== 'Keluar' &&
      a.status_kunjungan !== 'Selesai' &&
      !a.waktu_keluar
  ).length;
  const tamuSelesaiCount = allKunjungan.filter(
    (a) => a.status_kunjungan === 'Keluar' || a.status_kunjungan === 'Selesai' || !!a.waktu_keluar
  ).length;

  // Filtering for Riwayat Tab — "Diterima" hanya tamu yang belum check-out
  const filteredRiwayat = useMemo(() => {
    return kunjunganRiwayat.filter((item) => {
      if (riwayatFilter === 'Diterima') {
        if (item.status_konfirmasi_pic !== 'Diterima') return false;
        if (item.status_kunjungan === 'Keluar' || item.status_kunjungan === 'Selesai' || !!item.waktu_keluar) return false;
      } else if (riwayatFilter === 'Ditolak') {
        if (item.status_konfirmasi_pic !== 'Ditolak') return false;
      } else if (riwayatFilter === 'Selesai') {
        const isKeluar = item.status_kunjungan === 'Keluar' || item.status_kunjungan === 'Selesai' || !!item.waktu_keluar;
        if (!isKeluar) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNopol = item.no_polisi.toLowerCase().includes(q);
        const matchNama = (item.nama_customer || '').toLowerCase().includes(q);
        const matchTiket = item.no_tiket.toLowerCase().includes(q);
        const matchMemo = (item.no_memo_keluar || '').toLowerCase().includes(q);
        if (!matchNopol && !matchNama && !matchTiket && !matchMemo) return false;
      }

      return true;
    });
  }, [kunjunganRiwayat, riwayatFilter, searchQuery]);

  const countRiwayatSemua = kunjunganRiwayat.length;
  // Konsisten dengan kartu statistik: "Diterima" hanya tamu yang MASIH di dalam
  // bengkel — yang sudah check-out masuk kategori Selesai.
  const isSudahKeluarPic = (a: AntrianKunjungan) =>
    a.status_kunjungan === 'Keluar' || a.status_kunjungan === 'Selesai' || !!a.waktu_keluar;
  const countRiwayatDiterima = kunjunganRiwayat.filter(
    (a) => a.status_konfirmasi_pic === 'Diterima' && !isSudahKeluarPic(a)
  ).length;
  const countRiwayatDitolak = kunjunganRiwayat.filter((a) => a.status_konfirmasi_pic === 'Ditolak').length;
  const countRiwayatSudahKeluar = kunjunganRiwayat.filter(
    (a) => a.status_kunjungan === 'Keluar' || a.status_kunjungan === 'Selesai' || !!a.waktu_keluar
  ).length;

  const konfirmasiMutation = useMutation({
    mutationFn: (payload: {
      id: number;
      status_konfirmasi_pic: 'Diterima' | 'Ditolak';
      catatan_pic?: string;
    }) => api.konfirmasiKunjunganPic(payload),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      realtimeHub.publish({
        type: 'KUNJUNGAN_CONFIRMED',
        targetRoles: ['Security'],
        title: `Kunjungan ${variables.status_konfirmasi_pic}`,
        message: `Kunjungan ID #${variables.id} telah ${variables.status_konfirmasi_pic.toLowerCase()} oleh PIC.`,
        urgency: variables.status_konfirmasi_pic === 'Diterima' ? 'info' : 'warning',
      });

      if (variables.status_konfirmasi_pic === 'Diterima') {
        toast.success('Kunjungan dikonfirmasi DITERIMA. Tamu dipersilakan masuk.');
      } else {
        toast.warning('Kunjungan DITOLAK dan Security sudah diberi tahu.');
      }
      setRejecting(null);
      setCatatanTolak('');
      setSelected(null);
      setSubTab('riwayat');
    },
    onError: (err: any) =>
      toast.error('Gagal mengirim konfirmasi kunjungan: ' + (err?.message || 'Coba lagi.')),
  });

  const formatJam = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch {
      return '-';
    }
  };

  const tabsConfig = [
    { id: 'masuk', label: 'Menunggu Konfirmasi', count: kunjunganMasuk.length, icon: Clock },
    { id: 'riwayat', label: 'Riwayat Kunjungan', count: kunjunganRiwayat.length, icon: History },
  ];

  const filterChipsData = [
    { id: 'Semua', label: 'Semua', count: countRiwayatSemua },
    { id: 'Diterima', label: 'Diterima', count: countRiwayatDiterima },
    { id: 'Ditolak', label: 'Ditolak', count: countRiwayatDitolak },
    { id: 'Selesai', label: 'Selesai', count: countRiwayatSudahKeluar },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Utama */}
      <SectionHeader
        title="PIC Terkait - Notifikasi Kunjungan"
        description="Konfirmasi kedatangan tamu atau dinas yang masuk melalui Pos Security sebelum diterima di area bengkel."
        badge={
          <span className="text-xs font-semibold text-ink-muted bg-surface-raised px-3 py-1 rounded-full border border-border">
            Akun PIC: <strong className="text-ink">{authUser?.nama_lengkap || currentUser}</strong>
          </span>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Tamu Hari Ini"
          value={totalTamuHariIni}
          subtitle="Semua kunjungan tercatat"
          icon={Users}
          tone="neutral"
        />
        <StatCard
          title="Menunggu Respon"
          value={menungguKonfirmasiCount}
          subtitle="Perlu respon segera"
          icon={Clock}
          tone="amber"
          active={subTab === 'masuk'}
          onClick={() => setSubTab('masuk')}
        />
        <StatCard
          title="Tamu di Bengkel"
          value={tamuDiAreaBengkelCount}
          subtitle="Aktif di dalam lokasi"
          icon={Building2}
          tone="blue"
          active={subTab === 'riwayat' && riwayatFilter === 'Diterima'}
          onClick={() => {
            setSubTab('riwayat');
            setRiwayatFilter('Diterima');
          }}
        />
        <StatCard
          title="Tamu Selesai"
          value={tamuSelesaiCount}
          subtitle="Sudah check-out gerbang"
          icon={CheckCircle2}
          tone="green"
          active={subTab === 'riwayat' && riwayatFilter === 'Selesai'}
          onClick={() => {
            setSubTab('riwayat');
            setRiwayatFilter('Selesai');
          }}
        />
      </div>

      {/* Navigation Subtabs (TabBar) */}
      <TabBar
        tabs={tabsConfig}
        activeTab={subTab}
        onChange={(id) => setSubTab(id as 'masuk' | 'riwayat')}
      />

      {/* SUBTAB 1: KUNJUNGAN MASUK (MENUNGGU KONFIRMASI) */}
      {subTab === 'masuk' && (
        <div className="card-modern p-5 space-y-4">
          {kunjunganMasuk.length > 0 ? (
            <div className="space-y-3">
              {kunjunganMasuk.map((item) => (
                <ListItemCard
                  key={item.id}
                  title={`${item.no_polisi} — ${item.nama_customer || 'Pelanggan Tamu'}`}
                  subtitle={`Tiket: ${item.no_tiket} • Jam: ${formatJam(item.waktu_masuk)}${item.jenis_armada ? ` • ${item.jenis_armada}` : ''}`}
                  badge={<StatusBadge
                    status={item.status_kunjungan === 'Keluar' ? 'Selesai' : item.status_kunjungan}
                    size="sm"
                  />}
                  chips={item.keperluan ? [item.keperluan] : undefined}
                  onClick={() => setSelected(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="Tidak Ada Kunjungan Menunggu"
              description={`Semua antrian tamu untuk ${authUser?.nama_lengkap || currentUser} telah selesai diproses.`}
            />
          )}
        </div>
      )}

      {/* SUBTAB 2: RIWAYAT KUNJUNGAN */}
      {subTab === 'riwayat' && (
        <div className="card-modern p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <FilterChips
              options={filterChipsData}
              selectedId={riwayatFilter}
              onChange={(val: string) => setRiwayatFilter(val as RiwayatFilterType)}
            />

            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nopol, tamu, memo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none text-ink"
              />
            </div>
          </div>

          {filteredRiwayat.length > 0 ? (
            <div className="space-y-3">
              {filteredRiwayat.map((item) => (
                <ListItemCard
                  key={item.id}
                  title={`${item.no_polisi} — ${item.nama_customer || 'Tamu'}`}
                  subtitle={`Tiket: ${item.no_tiket} • Masuk: ${formatJam(item.waktu_masuk)}${item.waktu_keluar ? ` • Keluar: ${formatJam(item.waktu_keluar)}` : ''}`}
                  badge={
                    <div className="flex items-center gap-1.5">
                      <StatusBadge
                        status={item.status_kunjungan === 'Keluar' ? 'Selesai' : item.status_kunjungan}
                        size="sm"
                      />
                      {item.status_konfirmasi_pic && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.status_konfirmasi_pic === 'Diterima'
                              ? 'bg-status-green-bg text-status-green'
                              : 'bg-status-red-bg text-status-red'
                          }`}
                        >
                          {item.status_konfirmasi_pic}
                        </span>
                      )}
                    </div>
                  }
                  chips={item.keperluan ? [item.keperluan] : undefined}
                  onClick={() => setSelected(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={History}
              title="Tidak Ada Riwayat Kunjungan"
              description="Tidak ada data kunjungan yang cocok dengan filter atau kata kunci saat ini."
            />
          )}
        </div>
      )}

      {/* DETAIL MODAL UNTUK ITEM TERPILIH */}
      {selected && (
        <DetailModal
          open={true}
          onClose={() => setSelected(null)}
          title={selected.no_polisi}
          subtitle={`${selected.nama_customer || 'Tamu tanpa nama'} • Tiket ${selected.no_tiket}`}
          badge={<StatusBadge
            status={selected.status_kunjungan === 'Keluar' ? 'Selesai' : selected.status_kunjungan}
            size="sm"
          />}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-xl border border-border text-ink font-semibold text-xs hover:bg-surface transition-colors cursor-pointer"
              >
                Tutup
              </button>
              {selected.status_kunjungan === 'Check In' && (!selected.status_konfirmasi_pic || selected.status_konfirmasi_pic === 'Menunggu Konfirmasi') && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejecting(selected);
                      setRejectStep(0);
                      setCatatanTolak('');
                    }}
                    className="px-3.5 py-2 rounded-xl border border-border text-status-red hover:bg-status-red-bg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Tolak Kunjungan
                  </button>
                  <button
                    type="button"
                    disabled={konfirmasiMutation.isPending}
                    onClick={() => {
                      konfirmasiMutation.mutate({ id: selected.id, status_konfirmasi_pic: 'Diterima' });
                    }}
                    className="px-4 py-2 rounded-xl bg-status-green hover:bg-status-green/90 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Terima Tamu</span>
                  </button>
                </div>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-subtle">Nama Customer:</span>
                <span className="font-semibold text-ink">{selected.nama_customer || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Jenis Kendaraan:</span>
                <span className="text-ink">{selected.jenis_armada || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Nomor Telepon:</span>
                <span className="font-medium text-ink">{selected.no_hp_customer || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Keperluan:</span>
                <span className="font-medium text-ink">{selected.keperluan || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Waktu Masuk:</span>
                <span className="tabular-nums text-ink">{formatJam(selected.waktu_masuk)}</span>
              </div>
              {selected.waktu_keluar && (
                <div className="flex justify-between">
                  <span className="text-ink-subtle">Waktu Keluar:</span>
                  <span className="tabular-nums text-ink">{formatJam(selected.waktu_keluar)}</span>
                </div>
              )}
            </div>

            {selected.catatan_security && (
              <div className="p-3 bg-surface rounded-xl border border-border text-ink-muted">
                <span className="text-ink-subtle block font-bold text-xs uppercase mb-0.5">Catatan Security:</span>
                <p>{selected.catatan_security}</p>
              </div>
            )}

            {selected.catatan_pic && (
              <div className="p-3 bg-surface rounded-xl border border-border text-ink-muted">
                <span className="text-ink-subtle block font-bold text-xs uppercase mb-0.5">Catatan PIC:</span>
                <p>{selected.catatan_pic}</p>
              </div>
            )}
          </div>
        </DetailModal>
      )}

      {/* Modal Tolak Kunjungan — StepModal 2 Langkah */}
      {rejecting && (
        <StepModal
          open={true}
          onClose={() => {
            setRejecting(null);
            setCatatanTolak('');
          }}
          title="Tolak Izin Kunjungan"
          subtitle={`Tamu: ${rejecting.no_polisi} • ${rejecting.nama_customer || 'Pelanggan'}`}
          currentStep={rejectStep}
          onNext={() => setRejectStep(1)}
          onBack={() => setRejectStep(0)}
          onSubmit={() =>
            konfirmasiMutation.mutate({
              id: rejecting.id,
              status_konfirmasi_pic: 'Ditolak',
              catatan_pic: catatanTolak.trim() || undefined,
            })
          }
          submitLabel="Konfirmasi Tolak"
          isPending={konfirmasiMutation.isPending}
          size="md"
          steps={[
            {
              id: 'ringkasan',
              label: 'Ringkasan Tamu',
              content: (
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
                    <div className="flex justify-between">
                      <span className="text-ink-subtle">No. Polisi:</span>
                      <span className="font-bold text-ink">{rejecting.no_polisi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-subtle">Nama Tamu:</span>
                      <span className="font-semibold text-ink">{rejecting.nama_customer || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-subtle">No. Telepon:</span>
                      <span className="text-ink">{rejecting.no_hp_customer || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-subtle">Keperluan:</span>
                      <span className="text-ink">{rejecting.keperluan || '-'}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-status-red-bg border border-status-red/20 rounded-xl text-status-red flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Penolakan akan diteruskan langsung ke pos security di gerbang masuk.</span>
                  </div>
                </div>
              ),
            },
            {
              id: 'alasan',
              label: 'Alasan Penolakan',
              content: (
                <div className="space-y-3 text-xs">
                  <label className="block text-xs font-semibold text-ink" htmlFor="pic_catatan_tolak">
                    Alasan Penolakan (akan dibaca oleh Security):
                  </label>
                  <textarea
                    id="pic_catatan_tolak"
                    rows={4}
                    placeholder="Tuliskan alasan penolakan kunjungan..."
                    value={catatanTolak}
                    onChange={(e) => setCatatanTolak(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none text-ink"
                  />
                </div>
              ),
            },
          ]}
        />
      )}

    </div>
  );
};

export default PicTerkaitView;
