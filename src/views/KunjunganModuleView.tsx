import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { AntrianKunjungan } from '../types';
import { realtimeHub } from '../services/realtimeService';
import { ModalPortal } from '../components/common/ModalPortal';
import { toast } from '../components/common/Toast';
import {
  UserCheck,
  Truck,
  Clock,
  Check,
  X,
  User,
  Phone,
  FileText,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

/**
 * Modul Kunjungan Internal (SA, Foreman, Mekanik, Purchasing, Kasir, Warehouse).
 *
 * Sesuai alur Excel (sheet "Kunjungan"): Security check-in + menunjuk penerima
 * (PIC) → penerima MENERIMA / MENOLAK kunjungan → notifikasi balik ke Security.
 *
 * Data GET /kim3/antrian sudah ter-restrict di server: setiap user internal
 * hanya melihat kunjungan yang ditujukan ke dia (id_pic = user login).
 * Konfirmasi memakai endpoint /kim3/antrian-konfirmasi-pic yang sama dengan
 * modul PIC Terkait.
 */
export const KunjunganModuleView: React.FC = () => {
  const queryClient = useQueryClient();
  const { authUser, currentUser } = useAppStore();
  const [subTab, setSubTab] = useState<'masuk' | 'riwayat'>('masuk');
  const [rejecting, setRejecting] = useState<AntrianKunjungan | null>(null);
  const [catatanTolak, setCatatanTolak] = useState('');
  const [selected, setSelected] = useState<AntrianKunjungan | null>(null);

  // Kunjungan yang ditujukan ke user ini (server-side filter by id_pic)
  const { data: antrianList, isLoading, isFetching } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
  });

  // Khusus kunjungan tamu murni: tujuan "Kunjungan" / "Lainnya".
  // Service ditangani alur SPK (penerimaan SA), Beli Part ditangani alur
  // Penjualan Part Langsung — keduanya TIDAK masuk modul kunjungan ini,
  // baik di tab Masuk maupun Riwayat.
  const isKunjunganMurni = (a: AntrianKunjungan) =>
    a.tujuan_kedatangan === 'Kunjungan' || a.tujuan_kedatangan === 'Lainnya';

  const kunjunganMasuk: AntrianKunjungan[] = (antrianList || [])
    .filter(
      (a) =>
        isKunjunganMurni(a) &&
        (a.status_kunjungan === 'Check In' || a.status_kunjungan === 'Sedang Dikerjakan') &&
        (!a.status_konfirmasi_pic || a.status_konfirmasi_pic === 'Menunggu Konfirmasi')
    );

  const kunjunganRiwayat: AntrianKunjungan[] = (antrianList || [])
    .filter(
      (a) =>
        isKunjunganMurni(a) &&
        (a.status_konfirmasi_pic === 'Diterima' ||
          a.status_konfirmasi_pic === 'Ditolak' ||
          a.status_kunjungan === 'Keluar' ||
          a.status_kunjungan === 'Selesai' ||
          !!a.waktu_keluar)
    );

  const jumlahMenunggu = kunjunganMasuk.length;

  const konfirmasiMutation = useMutation({
    mutationFn: (payload: {
      id: number;
      status_konfirmasi_pic: 'Diterima' | 'Ditolak';
      catatan_pic?: string;
    }) => api.konfirmasiKunjunganPic(payload),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // Notifikasi balik ke Pos Security (penanda kunjungan diterima/ditolak)
      realtimeHub.publish({
        type: 'KUNJUNGAN_CONFIRMED',
        targetRoles: ['Security'],
        title: `Kunjungan ${variables.status_konfirmasi_pic}`,
        message: `Kunjungan #${variables.id} (${selected?.no_polisi || 'tamu'}) telah ${variables.status_konfirmasi_pic.toLowerCase()} oleh ${currentUser || 'penerima'}.`,
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

  const renderCard = (item: AntrianKunjungan) => {
    const sudahDikonfirmasi =
      item.status_konfirmasi_pic === 'Diterima' || item.status_konfirmasi_pic === 'Ditolak';

    return (
      <div
        key={item.id}
        className={`bg-surface-raised rounded-md border p-4 shadow-xs transition-all ${
          selected?.id === item.id ? 'border-accent ring-2 ring-accent/20' : 'border-border hover:shadow-md'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-md bg-accent-subtle text-accent flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-ink">{item.no_polisi}</span>
                <StatusBadge status={item.status_kunjungan} size="sm" />
                {sudahDikonfirmasi && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status_konfirmasi_pic === 'Diterima'
                        ? 'bg-status-green-bg text-status-green'
                        : 'bg-status-red-bg text-status-red'
                    }`}
                  >
                    {item.status_konfirmasi_pic}
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-muted font-semibold truncate mt-0.5">
                {item.nama_customer || 'Pelanggan'} • {item.tujuan_kedatangan}
              </div>
              <div className="text-[11px] text-ink-subtle mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatWaktu(item.waktu_masuk)}
                </span>
                {item.keperluan && <span className="truncate max-w-[240px]">• {item.keperluan}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelected(item)}
              className="px-3 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-raised text-ink-muted font-bold text-[11px]"
            >
              Detail
            </button>
            {!sudahDikonfirmasi && item.status_kunjungan === 'Check In' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    konfirmasiMutation.mutate({ id: item.id, status_konfirmasi_pic: 'Diterima' });
                  }}
                  disabled={konfirmasiMutation.isPending}
                  className="px-3 py-1.5 rounded-md bg-status-green hover:bg-status-green/90 disabled:opacity-50 text-white font-bold text-[11px] flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Terima
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(item)}
                  className="px-3 py-1.5 rounded-md bg-status-red-bg hover:bg-status-red/10 border border-status-red/30 text-status-red font-bold text-[11px] flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Tolak
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface-raised rounded-md p-4 sm:p-5 border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-ink">Kunjungan untuk Saya</h1>
            <p className="text-xs text-ink-muted">
              Khusus kunjungan tamu (non-service) — terima atau tolak kunjungan yang ditujukan ke Anda
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {jumlahMenunggu > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-status-amber-bg text-status-amber text-[11px] font-black">
              {jumlahMenunggu} menunggu konfirmasi
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-accent-subtle text-accent text-[11px] font-bold flex items-center gap-1">
            <User className="w-3 h-3" /> {currentUser || 'Penerima'}
          </span>
        </div>
      </div>

      {/* Sub-tab */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setSubTab('masuk')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
            subTab === 'masuk' ? 'bg-ink text-surface shadow-xs' : 'bg-surface-raised text-ink-muted hover:bg-surface border border-border'
          }`}
        >
          Masuk ({kunjunganMasuk.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('riwayat')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
            subTab === 'riwayat' ? 'bg-ink text-surface shadow-xs' : 'bg-surface-raised text-ink-muted hover:bg-surface border border-border'
          }`}
        >
          Riwayat ({kunjunganRiwayat.length})
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-ink-subtle text-xs bg-surface-raised rounded-md border border-border">
          Memuat kunjungan...
        </div>
      ) : subTab === 'masuk' ? (
        kunjunganMasuk.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {kunjunganMasuk.map(renderCard)}
          </div>
        ) : (
          <div className="p-8 text-center text-ink-subtle text-xs bg-surface-raised rounded-md border border-dashed border-border">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-ink-subtle" />
            Tidak ada kunjungan yang menunggu konfirmasi Anda.
            <div className="text-[11px] mt-1 text-ink-subtle">
              Kunjungan yang ditujukan ke Anda oleh Pos Security akan muncul di sini.
            </div>
          </div>
        )
      ) : kunjunganRiwayat.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {kunjunganRiwayat.map(renderCard)}
        </div>
      ) : (
        <div className="p-8 text-center text-ink-subtle text-xs bg-surface-raised rounded-md border border-dashed border-border">
          Belum ada riwayat kunjungan.
        </div>
      )}

      {/* Modal Detail */}
      {selected && (
        <ModalPortal onClose={() => setSelected(null)}>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface-raised rounded-t-md sm:rounded-md p-5 sm:p-6 max-w-md w-full shadow-xl border border-border space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-black text-ink">Detail Kunjungan</h3>
                  <p className="text-[11px] text-ink-muted">Tiket {selected.no_tiket || `#${selected.id}`}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-surface"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 bg-surface rounded-md border border-border">
                  <span className="font-black text-ink text-sm">{selected.no_polisi}</span>
                  <StatusBadge status={selected.status_kunjungan} size="sm" />
                </div>
                <div className="p-3 bg-surface rounded-md border border-border space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-ink-subtle flex items-center gap-1"><User className="w-3 h-3" /> Customer:</span>
                    <span className="font-semibold text-ink">{selected.nama_customer || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-subtle flex items-center gap-1"><Phone className="w-3 h-3" /> Kontak:</span>
                    <span className="font-medium text-ink">{selected.no_hp_customer || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-subtle flex items-center gap-1"><FileText className="w-3 h-3" /> Keperluan:</span>
                    <span className="font-medium text-ink text-right max-w-[55%] truncate">{selected.keperluan || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-subtle">Waktu Masuk:</span>
                    <span className="font-medium text-ink">{formatWaktu(selected.waktu_masuk)}</span>
                  </div>
                  {selected.catatan_security && (
                    <div className="pt-1.5 border-t border-border">
                      <span className="text-ink-subtle block">Catatan Security:</span>
                      <span className="text-ink-muted italic">{selected.catatan_security}</span>
                    </div>
                  )}
                </div>
              </div>

              {selected.status_kunjungan === 'Check In' &&
              (!selected.status_konfirmasi_pic || selected.status_konfirmasi_pic === 'Menunggu Konfirmasi') ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      konfirmasiMutation.mutate({ id: selected.id, status_konfirmasi_pic: 'Diterima' });
                    }}
                    disabled={konfirmasiMutation.isPending}
                    className="flex-1 py-2.5 bg-status-green hover:bg-status-green/90 disabled:opacity-50 text-white rounded-md font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Terima Kunjungan
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(selected)}
                    className="flex-1 py-2.5 bg-status-red-bg hover:bg-status-red/10 border border-status-red/30 text-status-red rounded-md font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> Tolak
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-status-green-bg rounded-md border border-status-green/30 text-status-green text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  Kunjungan ini sudah diproses ({selected.status_konfirmasi_pic || selected.status_kunjungan}).
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Tolak */}
      {rejecting && (
        <ModalPortal onClose={() => { setRejecting(null); setCatatanTolak(''); }}>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-raised rounded-md p-5 sm:p-6 max-w-sm w-full shadow-xl border border-border space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-black text-ink">Tolak Kunjungan</h3>
                <button
                  onClick={() => { setRejecting(null); setCatatanTolak(''); }}
                  className="p-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-surface"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-ink-muted">
                Tolak kunjungan <strong className="text-ink">{rejecting.no_polisi}</strong> ({rejecting.nama_customer || 'tamu'})? Security akan dinotifikasi agar tamu diarahkan ulang.
              </p>
              <textarea
                rows={3}
                placeholder="Alasan penolakan (opsional)..."
                value={catatanTolak}
                onChange={(e) => setCatatanTolak(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setRejecting(null); setCatatanTolak(''); }}
                  className="flex-1 py-2.5 bg-surface hover:bg-surface-raised border border-border text-ink-muted font-bold text-xs rounded-md"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={konfirmasiMutation.isPending}
                  onClick={() => konfirmasiMutation.mutate({ id: rejecting.id, status_konfirmasi_pic: 'Ditolak', catatan_pic: catatanTolak || undefined })}
                  className="flex-1 py-2.5 bg-status-red hover:bg-status-red/90 disabled:opacity-50 text-white font-bold text-xs rounded-md"
                >
                  {konfirmasiMutation.isPending ? 'Mengirim...' : 'TOLAK KUNJUNGAN'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* indikator refresh halus */}
      {isFetching && (
        <div className="fixed bottom-20 right-4 md:bottom-6 px-2.5 py-1 rounded-full bg-surface-raised border border-border text-[10px] font-bold text-ink-subtle shadow-md flex items-center gap-1.5">
          <Clock className="w-3 h-3 animate-pulse" /> sinkron...
        </div>
      )}
    </div>
  );
};

export default KunjunganModuleView;
