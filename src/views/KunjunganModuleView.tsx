import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage, formatPlat } from '../api/client';
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
import {
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  History,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { tanggalKey } from '../utils/tanggal';
import { PaginationBar } from '../components/common/PaginationBar';

type RiwayatFilterType = 'Semua' | 'Diterima' | 'Ditolak' | 'Selesai';

export const KunjunganModuleView: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser, kunjunganPendingId, setKunjunganPendingId, setApprovalModalOpen } = useAppStore();
  const [subTab, setSubTab] = useState<'masuk' | 'riwayat'>('masuk');
  const [riwayatFilter, setRiwayatFilter] = useState<RiwayatFilterType>('Semua');
  const [riwayatPage, setRiwayatPage] = useState(1);
  const [riwayatLimit, setRiwayatLimit] = useState(10);
  const [riwayatTanggal, setRiwayatTanggal] = useState('');
  const [rejecting, setRejecting] = useState<AntrianKunjungan | null>(null);
  const [rejectStep, setRejectStep] = useState(0);
  const [catatanTolak, setCatatanTolak] = useState('');
  const [selected, setSelected] = useState<AntrianKunjungan | null>(null);

  const { data: antrianList } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
  });

  const isKunjunganMurni = (a: AntrianKunjungan) =>
    a.tujuan_kedatangan === 'Kunjungan' || a.tujuan_kedatangan === 'Lainnya';

  const kunjunganMasuk: AntrianKunjungan[] = useMemo(() => {
    return (antrianList || []).filter(
      (a) =>
        isKunjunganMurni(a) &&
        (a.status_kunjungan === 'Check In' || a.status_kunjungan === 'Sedang Dikerjakan') &&
        (!a.status_konfirmasi_pic || a.status_konfirmasi_pic === 'Menunggu Konfirmasi')
    );
  }, [antrianList]);

  const kunjunganRiwayat: AntrianKunjungan[] = useMemo(() => {
    return (antrianList || []).filter(
      (a) =>
        isKunjunganMurni(a) &&
        (a.status_konfirmasi_pic === 'Diterima' ||
          a.status_konfirmasi_pic === 'Ditolak' ||
          a.status_kunjungan === 'Keluar' ||
          a.status_kunjungan === 'Selesai' ||
          !!a.waktu_keluar)
    );
  }, [antrianList]);

  const jumlahMenunggu = kunjunganMasuk.length;
  const jumlahDiterima = (antrianList || []).filter(
    (a) => isKunjunganMurni(a) && a.status_konfirmasi_pic === 'Diterima'
  ).length;

  const jumlahDitolak = (antrianList || []).filter(
    (a) => isKunjunganMurni(a) && a.status_konfirmasi_pic === 'Ditolak'
  ).length;

  const jumlahSelesai = (antrianList || []).filter(
    (a) =>
      isKunjunganMurni(a) &&
      a.status_konfirmasi_pic !== 'Ditolak' &&
      (a.status_kunjungan === 'Keluar' || a.status_kunjungan === 'Selesai' || !!a.waktu_keluar)
  ).length;

  // Filtered Riwayat based on filter chips
  // "Diterima" = semua tamu yang disetujui / di-approve oleh PIC
  const isSudahKeluar = (a: AntrianKunjungan) =>
    a.status_kunjungan === 'Keluar' || a.status_kunjungan === 'Selesai' || !!a.waktu_keluar;
  const filteredRiwayat = useMemo(() => {
    return kunjunganRiwayat.filter((item) => {
      if (riwayatTanggal && tanggalKey(item.waktu_masuk) !== riwayatTanggal) return false;
      if (riwayatFilter === 'Diterima') {
        return item.status_konfirmasi_pic === 'Diterima';
      }
      if (riwayatFilter === 'Ditolak') {
        return item.status_konfirmasi_pic === 'Ditolak';
      }
      if (riwayatFilter === 'Selesai') {
        return isSudahKeluar(item);
      }
      return true;
    });
  }, [kunjunganRiwayat, riwayatFilter, riwayatTanggal]);

  // Pagination riwayat di sisi client — endpoint /kim3/antrian mengirim seluruh baris
  // (parameters []), jadi halaman diatur di sini tanpa perubahan server.
  const riwayatTotal = filteredRiwayat.length;
  const riwayatTotalPages = Math.ceil(riwayatTotal / riwayatLimit) || 1;
  const riwayatSafePage = Math.min(riwayatPage, riwayatTotalPages);
  const paginatedRiwayat = useMemo(
    () =>
      filteredRiwayat.slice(
        (riwayatSafePage - 1) * riwayatLimit,
        riwayatSafePage * riwayatLimit
      ),
    [filteredRiwayat, riwayatSafePage, riwayatLimit]
  );

  const countRiwayatSemua = kunjunganRiwayat.length;
  const countRiwayatDiterima = kunjunganRiwayat.filter(
    (a) => a.status_konfirmasi_pic === 'Diterima'
  ).length;
  const countRiwayatDitolak = kunjunganRiwayat.filter((a) => a.status_konfirmasi_pic === 'Ditolak').length;
  const countRiwayatSudahKeluar = kunjunganRiwayat.filter(isSudahKeluar).length;

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
        message: `Kunjungan #${variables.id} (${(selected?.no_polisi || rejecting?.no_polisi) ? formatPlat(selected?.no_polisi || rejecting?.no_polisi) : 'tamu'}) telah ${variables.status_konfirmasi_pic.toLowerCase()} oleh ${currentUser || 'penerima'}.`,
        urgency: variables.status_konfirmasi_pic === 'Diterima' ? 'success' : 'warning',
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
      toast.error('Gagal mengirim konfirmasi kunjungan: ' + getApiErrorMessage(err)),
  });

  const formatWaktu = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const tabsConfig = [
    { id: 'masuk', label: 'Kunjungan Masuk', count: jumlahMenunggu, icon: Clock },
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
      
      {/* Header */}
      <SectionHeader
        title="Kunjungan untuk Saya"
        description="Khusus kunjungan tamu (non-service) — konfirmasi menerima atau menolak kunjungan yang ditujukan ke Anda."
        badge={
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent-subtle text-accent border border-accent/20">
            {currentUser || 'Penerima'}
          </span>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Menunggu Respon"
          value={jumlahMenunggu}
          subtitle="Perlu respon segera"
          icon={Clock}
          tone="amber"
          active={subTab === 'masuk'}
          onClick={() => setSubTab('masuk')}
        />
        <StatCard
          title="Tamu Diterima"
          value={jumlahDiterima}
          subtitle="Kunjungan disetujui"
          icon={CheckCircle2}
          tone="green"
          active={subTab === 'riwayat' && riwayatFilter === 'Diterima'}
          onClick={() => {
            setSubTab('riwayat');
            setRiwayatFilter('Diterima');
          }}
        />
        <StatCard
          title="Tamu Ditolak"
          value={jumlahDitolak}
          subtitle="Tidak diizinkan masuk"
          icon={XCircle}
          tone="red"
          active={subTab === 'riwayat' && riwayatFilter === 'Ditolak'}
          onClick={() => {
            setSubTab('riwayat');
            setRiwayatFilter('Ditolak');
          }}
        />
        <StatCard
          title="Kunjungan Selesai"
          value={jumlahSelesai}
          subtitle="Sudah check-out gerbang"
          icon={PackageCheck}
          tone="blue"
          active={subTab === 'riwayat' && riwayatFilter === 'Selesai'}
          onClick={() => {
            setSubTab('riwayat');
            setRiwayatFilter('Selesai');
          }}
        />
      </div>

      {/* Standardized TabBar */}
      <TabBar
        tabs={tabsConfig}
        activeTab={subTab}
        onChange={(id) => setSubTab(id as 'masuk' | 'riwayat')}
      />

      {/* Content Section */}
      <div className="card-modern p-5 space-y-4">
        {subTab === 'riwayat' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <FilterChips
              options={filterChipsData}
              selectedId={riwayatFilter}
              onChange={(id: string) => {
                setRiwayatFilter(id as RiwayatFilterType);
                setRiwayatPage(1);
              }}
            />
            <div className="flex items-center gap-2 shrink-0">
              <label
                className="flex items-center gap-1.5 bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs text-ink-muted cursor-pointer hover:border-accent/40 transition-colors"
                title="Filter tanggal kunjungan"
              >
                <Calendar className="w-3.5 h-3.5 text-ink-subtle" />
                <input
                  type="date"
                  value={riwayatTanggal}
                  onChange={(e) => {
                    setRiwayatTanggal(e.target.value);
                    setRiwayatPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-ink focus:outline-none cursor-pointer"
                  aria-label="Filter tanggal riwayat kunjungan"
                />
              </label>
              {riwayatTanggal && (
                <button
                  type="button"
                  onClick={() => {
                    setRiwayatTanggal('');
                    setRiwayatPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-status-red hover:bg-status-red-bg transition-colors"
                >
                  Reset tanggal
                </button>
              )}
            </div>
          </div>
        )}

        {subTab === 'masuk' ? (
          kunjunganMasuk.length > 0 ? (
            <div className="space-y-3">
              {kunjunganMasuk.map((item) => (
                <ListItemCard
                  key={item.id}
                  title={`${formatPlat(item.no_polisi)} — ${item.nama_customer || 'Pelanggan Tamu'}`}
                  subtitle={`Tiket: ${item.no_tiket} • Jam: ${formatWaktu(item.waktu_masuk)}`}
                  badge={<StatusBadge status={item.status_kunjungan} size="sm" />}
                  chips={item.keperluan ? [item.keperluan] : undefined}
                  onClick={() => setSelected(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="Tidak Ada Kunjungan Menunggu"
              description="Semua kunjungan yang ditujukan ke Anda telah diproses."
            />
          )
        ) : (
          filteredRiwayat.length > 0 ? (
            <>
              <div className="space-y-3">
                {paginatedRiwayat.map((item) => (
                  <ListItemCard
                    key={item.id}
                    title={`${formatPlat(item.no_polisi)} — ${item.nama_customer || 'Pelanggan Tamu'}`}
                    subtitle={`Tiket: ${item.no_tiket} • Masuk: ${formatWaktu(item.waktu_masuk)}${item.waktu_keluar ? ` • Keluar: ${formatWaktu(item.waktu_keluar)}` : ''}`}
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

              <PaginationBar
                page={riwayatSafePage}
                totalPages={riwayatTotalPages}
                totalRecords={riwayatTotal}
                limit={riwayatLimit}
                onPageChange={setRiwayatPage}
                onLimitChange={(l) => {
                  setRiwayatLimit(l);
                  setRiwayatPage(1);
                }}
                label="riwayat kunjungan"
              />
            </>
          ) : (
            <EmptyState
              icon={History}
              title="Belum Ada Riwayat Kunjungan"
              description="Riwayat tamu yang telah diproses akan tercatat di sini. Reset filter/tanggal bila data tidak muncul."
            />
          )
        )}
      </div>

      {/* Modal Detail Kunjungan */}
      {selected && (
        <DetailModal
          open={true}
          onClose={() => setSelected(null)}
          title={formatPlat(selected.no_polisi)}
          subtitle={`${selected.nama_customer || 'Pelanggan'} • Tiket ${selected.no_tiket || `#${selected.id}`}`}
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
              {selected.status_kunjungan === 'Check In' &&
              (!selected.status_konfirmasi_pic || selected.status_konfirmasi_pic === 'Menunggu Konfirmasi') && (
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
                    <span>Terima Kunjungan</span>
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
                <span className="text-ink-subtle">Nomor Telepon:</span>
                <span className="font-medium text-ink">{selected.no_hp_customer || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Keperluan:</span>
                <span className="font-medium text-ink">{selected.keperluan || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Waktu Masuk:</span>
                <span className="tabular-nums text-ink">{formatWaktu(selected.waktu_masuk)}</span>
              </div>
              {selected.waktu_keluar && (
                <div className="flex justify-between">
                  <span className="text-ink-subtle">Waktu Keluar:</span>
                  <span className="tabular-nums text-ink">{formatWaktu(selected.waktu_keluar)}</span>
                </div>
              )}
            </div>

            {selected.catatan_security && (
              <div className="p-3 bg-surface-raised rounded-xl border border-border text-ink-muted">
                <span className="text-ink-subtle block font-bold text-xs uppercase mb-0.5">Catatan Security:</span>
                <p>{selected.catatan_security}</p>
              </div>
            )}

            {selected.catatan_pic && (
              <div className="p-3 bg-surface-raised rounded-xl border border-border text-ink-muted">
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
          subtitle={`Tamu: ${formatPlat(rejecting.no_polisi)} • ${rejecting.nama_customer || 'Pelanggan'}`}
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
                      <span className="font-bold font-mono text-ink">{formatPlat(rejecting.no_polisi)}</span>
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
                  <label className="block text-xs font-semibold text-ink" htmlFor="kunjungan_catatan_tolak">
                    Alasan Penolakan (akan dibaca oleh Security):
                  </label>
                  <textarea
                    id="kunjungan_catatan_tolak"
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

export default KunjunganModuleView;
