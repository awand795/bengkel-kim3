import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { AntrianKunjungan } from '../types';
import {
  UserCheck,
  Truck,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  History,
  Inbox,
  RefreshCw
} from 'lucide-react';

export const PicTerkaitView: React.FC = () => {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'masuk' | 'riwayat'>('masuk');
  const [rejecting, setRejecting] = useState<AntrianKunjungan | null>(null);
  const [catatanTolak, setCatatanTolak] = useState('');
  const [selected, setSelected] = useState<AntrianKunjungan | null>(null);

  const { data: antrianList, isLoading, isFetching } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
  });

  // Notifikasi kunjungan masuk: tamu / dinas yang masih Check In
  const kunjunganMasuk =
    antrianList?.filter(
      (a) => a.tujuan_kedatangan === 'Kunjungan' && a.status_kunjungan === 'Check In'
    ) || [];

  // Riwayat kunjungan yang sudah dikonfirmasi / sudah keluar
  const kunjunganRiwayat =
    antrianList?.filter(
      (a) =>
        a.tujuan_kedatangan === 'Kunjungan' &&
        (a.status_konfirmasi_pic === 'Diterima' ||
          a.status_konfirmasi_pic === 'Ditolak' ||
          a.status_kunjungan !== 'Check In')
    ) || [];

  const konfirmasiMutation = useMutation({
    mutationFn: (payload: {
      id: number;
      status_konfirmasi_pic: 'Diterima' | 'Ditolak';
      catatan_pic?: string;
    }) => api.konfirmasiKunjunganPic(payload),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert(
        variables.status_konfirmasi_pic === 'Diterima'
          ? 'Kunjungan dikonfirmasi DITERIMA. Tamu dipersilakan masuk.'
          : 'Kunjungan DITOLAK dan Security sudah diberi tahu.'
      );
      setRejecting(null);
      setCatatanTolak('');
      setSelected(null);
      setSubTab('riwayat');
    },
    onError: (err: any) =>
      alert('Gagal mengirim konfirmasi kunjungan: ' + (err?.message || 'Coba lagi.')),
  });

  const renderKunjunganCard = (item: AntrianKunjungan) => {
    const sudahDikonfirmasi =
      item.status_konfirmasi_pic === 'Diterima' || item.status_konfirmasi_pic === 'Ditolak';

    return (
      <div
        key={item.id}
        className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
          selected?.id === item.id ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200 hover:shadow-md'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-black text-slate-900">{item.no_polisi}</span>
                <StatusBadge status={item.status_kunjungan} size="sm" />
                {sudahDikonfirmasi && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status_konfirmasi_pic === 'Diterima'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.status_konfirmasi_pic}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.nama_customer || 'Tamu tanpa nama'} • {item.jenis_armada || '-'}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 block">Waktu Masuk</span>
            <span className="text-xs font-mono font-bold text-slate-700">
              {new Date(item.waktu_masuk).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              WIB
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-slate-400 text-[10px] block">No. Tiket</span>
            <span className="font-mono font-semibold text-slate-700">{item.no_tiket}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-slate-400 text-[10px] block">PIC Tujuan</span>
            <span className="font-semibold text-slate-700">{item.pic_tujuan || '-'}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-slate-400 text-[10px] block">No. HP</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" /> {item.no_hp_customer || '-'}
            </span>
          </div>
        </div>

        {item.keperluan && (
          <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs">
            <span className="text-blue-500 text-[10px] block font-bold uppercase">Keperluan</span>
            <span className="text-slate-700">{item.keperluan}</span>
          </div>
        )}

        {item.catatan_security && (
          <p className="mt-2 text-[11px] text-slate-500 italic">Catatan Security: {item.catatan_security}</p>
        )}

        {item.catatan_pic && (
          <p className="mt-2 text-[11px] text-slate-500 italic">Catatan PIC: {item.catatan_pic}</p>
        )}

        {!sudahDikonfirmasi && item.status_kunjungan === 'Check In' && (
          <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={konfirmasiMutation.isPending}
              onClick={() => konfirmasiMutation.mutate({ id: item.id, status_konfirmasi_pic: 'Diterima' })}
              className="flex-1 min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Konfirmasi Diterima
            </button>
            <button
              type="button"
              disabled={konfirmasiMutation.isPending}
              onClick={() => {
                setRejecting(item);
                setCatatanTolak('');
              }}
              className="flex-1 min-h-[44px] py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" /> Tolak
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">PIC Terkait - Notifikasi Kunjungan</h1>
            <p className="text-xs text-slate-500">
              Konfirmasi tamu / dinas yang masuk melalui Pos Security sebelum diterima di area bengkel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFetching && (
            <span className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memperbarui...
            </span>
          )}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSubTab('masuk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                subTab === 'masuk' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Menunggu ({kunjunganMasuk.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('riwayat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                subTab === 'riwayat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riwayat ({kunjunganRiwayat.length})
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB: NOTIFIKASI KUNJUNGAN MASUK */}
      {subTab === 'masuk' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Memuat data kunjungan...
            </div>
          ) : kunjunganMasuk.length > 0 ? (
            kunjunganMasuk.map(renderKunjunganCard)
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak Ada Kunjungan Menunggu</h3>
              <p className="text-xs text-slate-500 mt-1">
                Semua tamu dengan tujuan "Kunjungan" sudah dikonfirmasi.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB: RIWAYAT KUNJUNGAN */}
      {subTab === 'riwayat' && (
        <div className="space-y-3">
          {kunjunganRiwayat.length > 0 ? (
            kunjunganRiwayat.map(renderKunjunganCard)
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <History className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Riwayat</h3>
              <p className="text-xs text-slate-500 mt-1">
                Riwayat kunjungan yang sudah dikonfirmasi akan tampil di sini.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL TOLAK KUNJUNGAN */}
      {rejecting && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tolak Kunjungan</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {rejecting.no_polisi} - {rejecting.nama_customer || 'Tamu'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Penolakan (opsional)
              </label>
              <textarea
                rows={3}
                value={catatanTolak}
                onChange={(e) => setCatatanTolak(e.target.value)}
                placeholder="Contoh: PIC tidak ada di tempat / jadwal penuh, silakan datang lain waktu."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="flex-1 min-h-[44px] py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={konfirmasiMutation.isPending}
                onClick={() =>
                  konfirmasiMutation.mutate({
                    id: rejecting.id,
                    status_konfirmasi_pic: 'Ditolak',
                    catatan_pic: catatanTolak || undefined,
                  })
                }
                className="flex-1 min-h-[44px] py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20"
              >
                {konfirmasiMutation.isPending ? 'Memproses...' : 'KONFIRMASI TOLAK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER NOTE */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
        <Building2 className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-sky-900 leading-relaxed">
          Bila tamu disetujui, Security otomatis melihat status kunjungan diperbarui pada monitor Pos Gerbang.
          Bila ditolak, tamu diminta menunggu konfirmasi ulang atau meninggalkan area.
        </p>
      </div>
    </div>
  );
};

export default PicTerkaitView;
