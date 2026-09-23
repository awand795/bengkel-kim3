import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { AntrianKunjungan } from '../types';
import { realtimeHub } from '../services/realtimeService';
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
  RefreshCw,
  Users,
  Clock,
  LogIn,
  LogOut,
  Search,
  FileText
} from 'lucide-react';

type RiwayatFilterType = 'Semua' | 'Diterima' | 'Ditolak' | 'Sudah Keluar';

export const PicTerkaitView: React.FC = () => {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'masuk' | 'riwayat'>('masuk');
  const [rejecting, setRejecting] = useState<AntrianKunjungan | null>(null);
  const [catatanTolak, setCatatanTolak] = useState('');
  const [selected, setSelected] = useState<AntrianKunjungan | null>(null);
  const [riwayatFilter, setRiwayatFilter] = useState<RiwayatFilterType>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: antrianList, isLoading, isFetching } = useQuery({
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

  // Murni hasil fetch API antrian Kunjungan tanpa mock data
  const allKunjungan: AntrianKunjungan[] = (antrianList || []).filter(
    (a) => a.tujuan_kedatangan === 'Kunjungan'
  );

  // Notifikasi kunjungan masuk: tamu / dinas yang masih Check In & belum selesai konfirmasi
  const kunjunganMasuk = allKunjungan.filter(
    (a) => a.status_kunjungan === 'Check In' && (!a.status_konfirmasi_pic || a.status_konfirmasi_pic === 'Menunggu Konfirmasi')
  );

  // Riwayat kunjungan: yang sudah dikonfirmasi (Diterima / Ditolak) atau sudah keluar/selesai
  const kunjunganRiwayat = allKunjungan.filter(
    (a) =>
      a.status_konfirmasi_pic === 'Diterima' ||
      a.status_konfirmasi_pic === 'Ditolak' ||
      a.status_kunjungan === 'Keluar' ||
      a.status_kunjungan === 'Selesai' ||
      !!a.waktu_keluar
  );

  // Metrics for 4 Top Stat Cards
  const totalTamuHariIni = allKunjungan.length;
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

  // Filtering for Riwayat Tab
  const filteredRiwayat = kunjunganRiwayat.filter((item) => {
    // Quick status filter
    if (riwayatFilter === 'Diterima') {
      if (item.status_konfirmasi_pic !== 'Diterima') return false;
    } else if (riwayatFilter === 'Ditolak') {
      if (item.status_konfirmasi_pic !== 'Ditolak') return false;
    } else if (riwayatFilter === 'Sudah Keluar') {
      const isKeluar = item.status_kunjungan === 'Keluar' || item.status_kunjungan === 'Selesai' || !!item.waktu_keluar;
      if (!isKeluar) return false;
    }

    // Text search filter
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

  // Counts for Riwayat filter pills
  const countRiwayatSemua = kunjunganRiwayat.length;
  const countRiwayatDiterima = kunjunganRiwayat.filter((a) => a.status_konfirmasi_pic === 'Diterima').length;
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

      // Notify Security in real time
      realtimeHub.publish({
        type: 'KUNJUNGAN_CONFIRMED',
        targetRoles: ['Security'],
        title: `Kunjungan ${variables.status_konfirmasi_pic}`,
        message: `Kunjungan ID #${variables.id} telah ${variables.status_konfirmasi_pic.toLowerCase()} oleh PIC.`,
        urgency: variables.status_konfirmasi_pic === 'Diterima' ? 'info' : 'warning',
      });

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
    const sudahKeluar =
      item.status_kunjungan === 'Keluar' || item.status_kunjungan === 'Selesai' || !!item.waktu_keluar;

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

    return (
      <div
        key={item.id}
        className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
          selected?.id === item.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:shadow-md'
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
                {sudahKeluar && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    Sudah Keluar
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.nama_customer || 'Tamu tanpa nama'} • {item.jenis_armada || '-'}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 block">Waktu Masuk Gerbang</span>
            <span className="text-xs font-mono font-bold text-slate-700">
              {formatJam(item.waktu_masuk)}
            </span>
          </div>
        </div>

        {/* INFO DETAIL JAM CHECK IN & CHECK OUT (Highlight Stage 6) */}
        <div className="mt-3.5 p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <LogIn className="w-3 h-3 text-emerald-600" /> Jam Check In
            </span>
            <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
              {formatJam(item.waktu_masuk)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <LogOut className="w-3 h-3 text-blue-600" /> Jam Check Out
            </span>
            {item.waktu_keluar ? (
              <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                {formatJam(item.waktu_keluar)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Masih di Bengkel
              </span>
            )}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> Durasi / Status
            </span>
            <span className="font-semibold text-slate-700 text-xs mt-0.5 block truncate">
              {item.durasi ? item.durasi : item.waktu_keluar ? 'Kunjungan Selesai' : 'Sedang Berlangsung'}
            </span>
          </div>
        </div>

        {/* INFO TIKET, PIC, DAN TELEPON */}
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block">No. Tiket</span>
            <span className="font-mono font-semibold text-slate-700">{item.no_tiket}</span>
          </div>
          <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block">PIC Tujuan</span>
            <span className="font-semibold text-slate-700">{item.pic_tujuan || '-'}</span>
          </div>
          <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block">No. HP</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" /> {item.no_hp_customer || '-'}
            </span>
          </div>
        </div>

        {/* KEPERLUAN */}
        {item.keperluan && (
          <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs">
            <span className="text-blue-500 text-[10px] block font-bold uppercase tracking-wider">Keperluan Tamu</span>
            <span className="text-slate-700 font-medium">{item.keperluan}</span>
          </div>
        )}

        {/* MEMO KELUAR JIKA ADA */}
        {item.no_memo_keluar && (
          <div className="mt-2 px-3 py-2 bg-sky-50/80 border border-sky-200 rounded-xl text-xs flex items-center justify-between">
            <span className="text-[11px] text-sky-800 font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-600" /> Memo Keluar Otomatis:
            </span>
            <span className="font-mono font-bold text-sky-900 bg-white px-2 py-0.5 rounded-md border border-sky-200">
              {item.no_memo_keluar}
            </span>
          </div>
        )}

        {item.catatan_security && (
          <p className="mt-2 text-[11px] text-slate-500 italic">Catatan Security: {item.catatan_security}</p>
        )}

        {item.catatan_pic && (
          <p className="mt-1 text-[11px] text-slate-500 italic">Catatan PIC: {item.catatan_pic}</p>
        )}

        {/* ACTION BUTTONS UNTUK TAB MENUNGGU KONFIRMASI */}
        {!sudahDikonfirmasi && item.status_kunjungan === 'Check In' && (
          <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={konfirmasiMutation.isPending}
              onClick={() => konfirmasiMutation.mutate({ id: item.id, status_konfirmasi_pic: 'Diterima' })}
              className="flex-1 min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
              className="flex-1 min-h-[44px] py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4" /> Tolak
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* HEADER UTAMA */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">PIC Terkait - Notifikasi Kunjungan</h1>
            <p className="text-xs text-slate-500">
              Konfirmasi tamu & dinas yang masuk melalui Pos Security sebelum diterima di area bengkel
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                subTab === 'masuk' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Menunggu ({kunjunganMasuk.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('riwayat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                subTab === 'riwayat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riwayat ({kunjunganRiwayat.length})
            </button>
          </div>
        </div>
      </div>

      {/* 4 KARTU METRIK RINGKAS DI ATAS HALAMAN (STAGE 6 - PERSIS PERMINTAAN USER) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Tamu Hari Ini */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Tamu Hari Ini</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{totalTamuHariIni}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Semua kunjungan tercatat</p>
        </div>

        {/* Card 2: Menunggu Konfirmasi */}
        <div
          onClick={() => setSubTab('masuk')}
          className="bg-white rounded-2xl p-4 border border-amber-200/80 bg-amber-50/20 shadow-xs hover:border-amber-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Menunggu Konfirmasi</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900">{menungguKonfirmasiCount}</div>
          <p className="text-[11px] text-amber-700/80 mt-0.5">Perlu respon PIC segera</p>
        </div>

        {/* Card 3: Tamu di Area Bengkel */}
        <div
          onClick={() => {
            setSubTab('riwayat');
            setRiwayatFilter('Diterima');
          }}
          className="bg-white rounded-2xl p-4 border border-emerald-200/80 bg-emerald-50/20 shadow-xs hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Tamu di Area Bengkel</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900">{tamuDiAreaBengkelCount}</div>
          <p className="text-[11px] text-emerald-700/80 mt-0.5">Sedang aktif di dalam lokasi</p>
        </div>

        {/* Card 4: Tamu Selesai */}
        <div
          onClick={() => {
            setSubTab('riwayat');
            setRiwayatFilter('Sudah Keluar');
          }}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tamu Selesai</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{tamuSelesaiCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Sudah check-out gerbang</p>
        </div>
      </div>

      {/* SUBTAB 1: NOTIFIKASI KUNJUNGAN MASUK (MENUNGGU KONFIRMASI) */}
      {subTab === 'masuk' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Memuat data kunjungan masuk...
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
                Semua tamu dengan tujuan "Kunjungan" saat ini sudah dikonfirmasi.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: RIWAYAT KUNJUNGAN DENGAN FILTER STATUS CEPAT & INFO CHECK IN / OUT */}
      {subTab === 'riwayat' && (
        <div className="space-y-4">
          {/* TOOLBAR FILTER STATUS CEPAT (STAGE 6: Semua / Diterima / Ditolak / Sudah Keluar) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">Filter Status:</span>
              
              {/* Filter: Semua */}
              <button
                type="button"
                onClick={() => setRiwayatFilter('Semua')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  riwayatFilter === 'Semua'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Semua
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  riwayatFilter === 'Semua' ? 'bg-blue-700 text-white' : 'bg-white text-slate-600'
                }`}>
                  {countRiwayatSemua}
                </span>
              </button>

              {/* Filter: Diterima */}
              <button
                type="button"
                onClick={() => setRiwayatFilter('Diterima')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  riwayatFilter === 'Diterima'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                }`}
              >
                Diterima
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  riwayatFilter === 'Diterima' ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-800'
                }`}>
                  {countRiwayatDiterima}
                </span>
              </button>

              {/* Filter: Ditolak */}
              <button
                type="button"
                onClick={() => setRiwayatFilter('Ditolak')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  riwayatFilter === 'Ditolak'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
                }`}
              >
                Ditolak
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  riwayatFilter === 'Ditolak' ? 'bg-rose-700 text-white' : 'bg-white text-rose-800'
                }`}>
                  {countRiwayatDitolak}
                </span>
              </button>

              {/* Filter: Sudah Keluar */}
              <button
                type="button"
                onClick={() => setRiwayatFilter('Sudah Keluar')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  riwayatFilter === 'Sudah Keluar'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Sudah Keluar
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  riwayatFilter === 'Sudah Keluar' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
                }`}>
                  {countRiwayatSudahKeluar}
                </span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nopol / tamu / memo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* LIST KARTU RIWAYAT */}
          {filteredRiwayat.length > 0 ? (
            <div className="space-y-3">
              {filteredRiwayat.map(renderKunjunganCard)}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <History className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak Ada Kunjungan Ditemukan</h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || riwayatFilter !== 'Semua'
                  ? 'Tidak ada data kunjungan yang cocok dengan filter atau kata kunci saat ini.'
                  : 'Riwayat kunjungan yang sudah diproses akan tampil di sini.'}
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
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
                className="flex-1 min-h-[44px] py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
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
                className="flex-1 min-h-[44px] py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 cursor-pointer"
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
