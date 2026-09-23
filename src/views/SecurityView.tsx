import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { useAppStore } from '../store/useAppStore';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  LogOut, 
  FileText, 
  Search, 
  CheckCircle2, 
  Printer, 
  Truck, 
  PlusCircle,
  X,
  Eye,
  Download,
  Filter,
  Car,
  Wrench,
  Users,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Info,
  Phone,
  User,
  ArrowRight,
  LayoutDashboard,
  MapPin,
  Camera
} from 'lucide-react';
import { AntrianKunjungan, BookingService, MemoKeluar } from '../types';
import { realtimeHub } from '../services/realtimeService';
import { PrintMemoKeluarModal } from '../components/print/PrintMemoKeluarModal';

interface SecurityViewProps {
  initialTab?: 'dashboard' | 'checkin' | 'booking' | 'onprogress' | 'selesai' | 'memo';
}

export const SecurityView: React.FC<SecurityViewProps> = ({ initialTab = 'onprogress' }) => {
  const queryClient = useQueryClient();
  const { activeTab, setActiveTab, currentUser } = useAppStore();

  // Tab State: dashboard | checkin | booking | onprogress | selesai | memo
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'checkin' | 'booking' | 'onprogress' | 'selesai' | 'memo'>(initialTab);

  // Sync tab with props change
  useEffect(() => {
    if (initialTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  // Sync tab with external activeTab if coming from Sidebar
  useEffect(() => {
    if (activeTab.startsWith('security-')) {
      const sub = activeTab.replace('security-', '') as any;
      if (['dashboard', 'checkin', 'booking', 'onprogress', 'selesai', 'memo'].includes(sub)) {
        setCurrentTab(sub);
      }
    }
  }, [activeTab]);

  // Global filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [selesaiTimeRange, setSelesaiTimeRange] = useState<'Semua' | 'Hari Ini' | 'Kemarin' | 'Minggu Ini' | 'Bulan Ini'>('Semua');

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Modals and selection state
  const [selectedBooking, setSelectedBooking] = useState<BookingService | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<MemoKeluar | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<AntrianKunjungan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<AntrianKunjungan | null>(null);
  const [showPrintMemo, setShowPrintMemo] = useState<MemoKeluar | null>(null);

  // Check In Form State
  const [formCheckin, setFormCheckin] = useState({
    no_polisi: '',
    nama_customer: '',
    no_hp_customer: '',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service' as 'Service' | 'Beli Part' | 'Kunjungan' | 'Lainnya',
    pic_tujuan: '',
    keperluan: '',
    foto_kendaraan_masuk: '',
    catatan_security: '',
    id_booking: undefined as number | undefined,
  });

  // Check Out Form State
  const [formCheckout, setFormCheckout] = useState({
    barang_dibawa_keluar: false,
    detail_barang_keluar: '',
    foto_kendaraan_keluar: '',
    foto_barang: '',
    no_memo_keluar: '',
  });

  // Queries
  const { data: rawAntrianList } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
  });

  const { data: rawBookingList } = useQuery({
    queryKey: ['booking-list'],
    queryFn: api.getBooking,
  });

  const { data: rawMemoList } = useQuery({
    queryKey: ['memo-list'],
    queryFn: api.getMemoKeluarList,
  });

  // Query dynamic user/officer list for PIC Tujuan
  const { data: penggunaList } = useQuery({
    queryKey: ['pengguna-list'],
    queryFn: api.getPengguna,
  });

  const picPetugasList = (penggunaList || []).filter(
    (u) => u.peran !== 'Customer Fleet' && u.status_aktif !== false
  );

  // Murni data dari API server Darkosync
  const bookingList: BookingService[] = rawBookingList || [];
  const antrianData: AntrianKunjungan[] = rawAntrianList || [];
  const memoList: MemoKeluar[] = rawMemoList || [];

  // Initialize selected items
  useEffect(() => {
    if (!selectedBooking && bookingList.length > 0) {
      setSelectedBooking(bookingList[0]);
    }
  }, [bookingList]);

  useEffect(() => {
    if (!selectedMemo && memoList.length > 0) {
      setSelectedMemo(memoList[0]);
    }
  }, [memoList]);

  // Derived lists
  const onProgressList = antrianData.filter(a => a.status_kunjungan !== 'Keluar' && a.status_kunjungan !== 'Selesai');
  const selesaiList = antrianData.filter(a => a.status_kunjungan === 'Keluar' || a.status_kunjungan === 'Selesai');

  // Stats calculation for Screen 2 (Excel Sheet 4 Panel 2)
  const countTotalOnProgress = onProgressList.length;
  const countSedangDikerjakan = onProgressList.filter(a => a.status_kunjungan === 'Sedang Dikerjakan').length;
  const countMenungguPart = onProgressList.filter(a => a.status_kunjungan === 'Menunggu Part').length;
  const countMenungguQC = onProgressList.filter(a => a.status_kunjungan === 'Menunggu QC').length;

  // Filtered queries
  const filteredBookingList = bookingList.filter(b => 
    b.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.nama_customer || b.nama_perusahaan || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOnProgressList = onProgressList.filter(item =>
    item.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.nama_customer || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSelesaiList = selesaiList.filter(item =>
    item.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.nama_customer || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMemoList = memoList.filter(m =>
    m.no_memo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.nama_customer || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check-In Mutation
  const checkinMutation = useMutation({
    mutationFn: async (data: typeof formCheckin) => {
      const ticketNo = `ANT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      return api.checkInSecurity({
        no_tiket: ticketNo,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // Publish Realtime Event
      if (formCheckin.tujuan_kedatangan === 'Kunjungan') {
        realtimeHub.publish({
          type: 'KUNJUNGAN_ARRIVED',
          targetRoles: ['PIC Terkait'],
          title: 'Tamu Tiba di Pos Security',
          message: `Tamu ${formCheckin.nama_customer || 'Pengunjung'} (${formCheckin.no_polisi}) telah tiba di Pos Security menuju ${formCheckin.pic_tujuan}.`,
          linkTab: 'pic-terkait',
          urgency: 'urgent',
        });
      } else if (formCheckin.tujuan_kedatangan === 'Beli Part') {
        realtimeHub.publish({
          type: 'VEHICLE_CHECKED_IN',
          targetRoles: ['Admin Invoice', 'Admin Purchasing'],
          title: 'Customer Beli Part Datang',
          message: `${formCheckin.nama_customer || 'Pelanggan'} (${formCheckin.no_polisi}) tiba di pos untuk pembelian part.`,
          linkTab: 'beli-part',
          urgency: 'info',
        });
      } else {
        realtimeHub.publish({
          type: 'VEHICLE_CHECKED_IN',
          targetRoles: ['SA', 'Customer Fleet'],
          title: 'Kendaraan Masuk Bengkel',
          message: `Unit ${formCheckin.no_polisi} (${formCheckin.nama_customer || 'Pelanggan'}) telah di-check in di pos security. Siap untuk inspeksi SA.`,
          linkTab: 'sa',
          urgency: 'urgent',
        });
      }

      alert('Kendaraan berhasil di-Check In oleh Pos Security KIM 3!');
      setShowCheckinModal(false);
      setFormCheckin({
        no_polisi: '',
        nama_customer: '',
        no_hp_customer: '',
        jenis_armada: 'Truk',
        tujuan_kedatangan: 'Service',
        pic_tujuan: '',
        keperluan: '',
        foto_kendaraan_masuk: '',
        catatan_security: '',
        id_booking: undefined,
      });
      changeTab('onprogress');
    },
    onError: (err: any) => alert('Gagal check in: ' + err?.message),
  });

  // Check-Out Mutation
  const checkoutMutation = useMutation({
    mutationFn: async (item: AntrianKunjungan) => {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const seq = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0');
      const memoNo = `MK-${yy}${mm}${dd}-${seq}`;
      
      // Update antrian checkout
      await api.checkOutSecurity({
        id: item.id,
        barang_dibawa_keluar: formCheckout.barang_dibawa_keluar,
        detail_barang_keluar: formCheckout.detail_barang_keluar,
        foto_kendaraan_keluar: formCheckout.foto_kendaraan_keluar,
        foto_barang: formCheckout.foto_barang,
        no_memo_keluar: memoNo,
      });

      // Terbitkan memo keluar resmi
      return api.buatMemoKeluar({
        no_memo: memoNo,
        id_antrian: item.id,
        no_polisi: item.no_polisi,
        jenis_armada: item.jenis_armada || 'Truk',
        nama_customer: item.nama_customer || '-',
        tujuan_kedatangan: item.tujuan_kedatangan,
        foto_keluar: formCheckout.foto_kendaraan_keluar,
        catatan: formCheckout.barang_dibawa_keluar 
          ? `Pekerjaan selesai. Barang dibawa keluar: ${formCheckout.detail_barang_keluar}` 
          : 'Pekerjaan telah selesai dan kendaraan dalam kondisi baik.',
        petugas_security: currentUser || 'Petugas Security',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['memo-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      realtimeHub.publish({
        type: 'VEHICLE_CHECKED_OUT',
        targetRoles: ['Customer Fleet', 'SA'],
        title: 'Kendaraan Telah Keluar Bengkel',
        message: `Unit ${showCheckoutModal?.no_polisi || 'kendaraan'} telah resmi check-out & keluar melalui pos Security.`,
        linkTab: 'fleet-status',
        urgency: 'success',
      });

      alert('Kendaraan berhasil Check Out dan Memo Keluar resmi diterbitkan!');
      setShowCheckoutModal(null);
      changeTab('memo');
    },
    onError: (err: any) => alert('Gagal check out: ' + err?.message),
  });

  const changeTab = (tab: 'dashboard' | 'checkin' | 'booking' | 'onprogress' | 'selesai' | 'memo') => {
    setCurrentTab(tab);
    setActiveTab(`security-${tab}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Pos Security Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">SECURITY – BENGKEL KIM3</h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-black tracking-wide border border-blue-200">
                POS UTAMA
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gate Control &amp; Validasi Nopol Booking, Monitoring Armada Realtime, dan Penerbitan Memo Keluar
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFormCheckin({
                no_polisi: '',
                nama_customer: '',
                no_hp_customer: '',
                jenis_armada: 'Truk',
                tujuan_kedatangan: 'Service',
                pic_tujuan: '',
                keperluan: '',
                foto_kendaraan_masuk: '',
                catatan_security: '',
                id_booking: undefined,
              });
              changeTab('checkin');
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            + CHECK IN KENDARAAN MASUK
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 0. DASHBOARD RINGKASAN POS SECURITY                      */}
      {/* ========================================================= */}
      {currentTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => changeTab('booking')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-blue-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Booking Hari Ini</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{bookingList.length} Unit</div>
              <p className="text-[11px] text-blue-600 font-semibold mt-1 flex items-center gap-1">
                Buka List Booking →
              </p>
            </div>

            <div 
              onClick={() => changeTab('onprogress')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-orange-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Armada di Dalam Bengkel</span>
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-orange-600 mt-2">{onProgressList.length} Unit</div>
              <p className="text-[11px] text-orange-600 font-semibold mt-1 flex items-center gap-1">
                Pantau On Progress →
              </p>
            </div>

            <div 
              onClick={() => changeTab('selesai')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-emerald-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Keluar / Selesai Hari Ini</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">{selesaiList.length} Unit</div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                Histori Keluar →
              </p>
            </div>

            <div 
              onClick={() => changeTab('memo')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-purple-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Memo Keluar Diterbitkan</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-700 mt-2">{memoList.length} Surat</div>
              <p className="text-[11px] text-purple-600 font-semibold mt-1 flex items-center gap-1">
                Arsip &amp; Cetak Memo →
              </p>
            </div>
          </div>

          {/* Gate Control Live Stream */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900">Live Aktivitas Gerbang Masuk &amp; Keluar Pos Security</h2>
                <p className="text-xs text-slate-500">Pencatatan realtime seluruh armada yang melintas di pos gerbang</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckinModal(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold text-xs transition-colors"
              >
                + Check In Langsung
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {antrianData.slice(0, 6).map((item) => (
                <div key={`feed-${item.id}`} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      item.status_kunjungan === 'Selesai' || item.status_kunjungan === 'Keluar'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status_kunjungan === 'Selesai' || item.status_kunjungan === 'Keluar' ? (
                        <LogOut className="w-4 h-4" />
                      ) : (
                        <Truck className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{item.no_polisi}</span>
                        <span className="text-[11px] font-semibold text-slate-600">({item.nama_customer})</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-600">
                          {item.tujuan_kedatangan}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Masuk: {new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB 
                        {item.waktu_keluar && ` • Keluar: ${new Date(item.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status_kunjungan} size="sm" />
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(item)}
                      className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Detail →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CHECK-IN KENDARAAN MASUK (Dedicated Split-View Form & Histori) */}
      {/* ========================================================= */}
      {currentTab === 'checkin' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-xs">
                  POS SECURITY GERBANG
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs text-blue-100 font-medium">Live Recording &amp; Realtime Sync</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
                Check In Kendaraan Masuk
              </h2>
              <p className="text-xs text-blue-100/90 mt-1 max-w-xl">
                Catat nomor polisi, jenis armada, tujuan kedatangan, dan dokumentasi fisik saat armada tiba di gerbang KIM 3.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl px-4 py-3 text-center border border-white/10">
                <div className="text-[10px] text-blue-200 uppercase font-bold">Total Masuk</div>
                <div className="text-2xl font-black">{antrianData.length}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl px-4 py-3 text-center border border-white/10">
                <div className="text-[10px] text-blue-200 uppercase font-bold">On Progress</div>
                <div className="text-2xl font-black text-orange-300">{onProgressList.length}</div>
              </div>
            </div>
          </div>

          {/* Split Layout: Left = Form Check-In, Right = Riwayat Check-In Hari Ini */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Input Form (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Formulir Validasi Gerbang</h3>
                    <p className="text-xs text-slate-500">Lengkapi data armada sebelum diarahkan ke area bengkel</p>
                  </div>
                </div>
                {formCheckin.id_booking && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                    Terkait Booking #{formCheckin.id_booking}
                  </span>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  checkinMutation.mutate(formCheckin);
                }}
                className="space-y-6 text-xs"
              >
                {/* Bagian 1: Identitas Kendaraan */}
                <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-500" /> Identitas Kendaraan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">
                        Nomor Polisi (Plat Nomor) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: BK 1234 AB"
                          value={formCheckin.no_polisi}
                          onChange={(e) => setFormCheckin({ ...formCheckin, no_polisi: e.target.value.toUpperCase() })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm sm:text-base font-black uppercase tracking-wider focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Jenis Armada</label>
                      <select
                        value={formCheckin.jenis_armada}
                        onChange={(e) => setFormCheckin({ ...formCheckin, jenis_armada: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs"
                      >
                        <option value="Truk">Truk (Canter / Dutro / Tronton / Fuso)</option>
                        <option value="Mobil">Mobil Pribadi / Operasional</option>
                        <option value="Pickup">Pickup / Box Kecil</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bagian 2: Detail Kedatangan */}
                <div className="bg-blue-50/40 p-4 sm:p-5 rounded-2xl border border-blue-100">
                  <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" /> Detail Kedatangan
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-2">Tujuan Kedatangan <span className="text-rose-500">*</span></label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { id: 'Service', label: '1. Service', desc: 'Perbaikan / Service Truk' },
                          { id: 'Beli Part', label: '2. Beli Part', desc: 'Pembelian Part (Kasir)' },
                          { id: 'Kunjungan', label: '3. Kunjungan', desc: 'Tamu Dinas / Kantor' },
                          { id: 'Lainnya', label: '4. Lainnya', desc: 'Keperluan Lain' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              let defaultPic = '';
                              if (t.id === 'Service') {
                                const saUser = picPetugasList.find((p) => p.peran === 'SA');
                                defaultPic = saUser ? `${saUser.nama_lengkap} (SA)` : '';
                              } else if (t.id === 'Beli Part') {
                                const partUser = picPetugasList.find((p) => p.peran === 'Admin Purchasing' || p.peran === 'Admin Invoice');
                                defaultPic = partUser ? `${partUser.nama_lengkap} (${partUser.peran})` : '';
                              }
                              setFormCheckin({
                                ...formCheckin,
                                tujuan_kedatangan: t.id as any,
                                pic_tujuan: defaultPic || formCheckin.pic_tujuan,
                              });
                            }}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              formCheckin.tujuan_kedatangan === t.id
                                ? 'border-blue-600 bg-white text-blue-900 shadow-md ring-2 ring-blue-600/20'
                                : 'border-transparent bg-white hover:border-blue-200 text-slate-700 shadow-xs'
                            }`}
                          >
                            <div className="text-xs font-black">{t.label}</div>
                            <div className="text-[10px] text-slate-500 mt-1">{t.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">PIC / Petugas Tujuan</label>
                        <select
                          value={formCheckin.pic_tujuan}
                          onChange={(e) => setFormCheckin({ ...formCheckin, pic_tujuan: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs"
                        >
                          <option value="">-- Pilih PIC / Petugas Tujuan --</option>
                          {picPetugasList.map((p) => (
                            <option key={p.id} value={`${p.nama_lengkap} (${p.peran})`}>
                              {p.nama_lengkap} ({p.peran})
                            </option>
                          ))}
                          <option value="Admin Office">Admin Office</option>
                          <option value="Management">Management</option>
                          <option value="PIC Terkait">Lainnya / PIC Terkait</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">Keperluan Singkat / Keluhan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Ganti oli rutin, servis rem, meeting"
                          value={formCheckin.keperluan}
                          onChange={(e) => setFormCheckin({ ...formCheckin, keperluan: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bagian 3: Data Customer & Dokumentasi */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" /> Data Pengemudi / PIC
                    </h4>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Nama Customer / Perusahaan</label>
                      <input
                        type="text"
                        placeholder="Contoh: PT. Andi Jaya"
                        value={formCheckin.nama_customer}
                        onChange={(e) => setFormCheckin({ ...formCheckin, nama_customer: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">No. HP Driver / PIC</label>
                      <input
                        type="text"
                        placeholder="0812-xxxx-xxxx"
                        value={formCheckin.no_hp_customer}
                        onChange={(e) => setFormCheckin({ ...formCheckin, no_hp_customer: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-slate-500" /> Dokumentasi & Catatan
                    </h4>
                    <PhotoUploader
                      label="Foto Kendaraan Saat Masuk Gerbang"
                      value={formCheckin.foto_kendaraan_masuk}
                      onChange={(url) => setFormCheckin({ ...formCheckin, foto_kendaraan_masuk: url })}
                      bucket="foto_kendaraan"
                    />
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">Catatan Security</label>
                      <textarea
                        rows={2}
                        placeholder="Catatan kondisi awal fisik atau kelengkapan armada..."
                        value={formCheckin.catatan_security}
                        onChange={(e) => setFormCheckin({ ...formCheckin, catatan_security: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setFormCheckin({
                        no_polisi: '',
                        nama_customer: '',
                        no_hp_customer: '',
                        jenis_armada: 'Truk',
                        tujuan_kedatangan: 'Service',
                        pic_tujuan: '',
                        keperluan: '',
                        foto_kendaraan_masuk: '',
                        catatan_security: '',
                        id_booking: undefined,
                      });
                    }}
                    className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={checkinMutation.isPending}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <PlusCircle className="w-5 h-5" />
                    {checkinMutation.isPending ? 'Menyimpan ke Sistem...' : 'SUBMIT CHECK-IN KENDARAAN'}
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT COLUMN: Riwayat Check-In Hari Ini (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Riwayat Check-In Hari Ini</h3>
                    <p className="text-xs text-slate-500">Daftar unit yang baru masuk gerbang</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">
                    {antrianData.length} Unit
                  </span>
                </div>

                {/* Quick List */}
                <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto space-y-2 pt-2">
                  {antrianData.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-xs">Belum ada kendaraan yang di-check in hari ini</p>
                    </div>
                  ) : (
                    antrianData.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 px-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-black text-xs tracking-wider">
                              {item.no_polisi}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                              {item.tujuan_kedatangan}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-800">
                            {item.nama_customer || '-'}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>
                              {item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-slate-600">{item.pic_tujuan || '-'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <StatusBadge status={item.status_kunjungan} />
                          <button
                            type="button"
                            onClick={() => setShowDetailModal(item)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            Detail →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Informational Alert Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Setiap kendaraan yang selesai di-check in akan otomatis memicu <strong>notifikasi realtime</strong> ke Service Advisor, Warehouse, atau PIC terkait serta mengupdate antrian bengkel.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. LIST NOPOL YANG TELAH BOOKING (Excel Screen 1)         */}
      {/* ========================================================= */}
      {currentTab === 'booking' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            
            {/* Header & Filter Controls matching screenshot */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                  LIST NOPOL YANG TELAH BOOKING
                </h2>
              </div>

              {/* Search & Date Filter Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari No. Polisi / Nama Customer"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-3.5 pr-8 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-64 bg-white"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
                  <span className="text-slate-400 font-medium">Tanggal</span>
                  <span className="font-bold text-slate-800">{todayFormatted}</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  Filter
                </button>
              </div>
            </div>

            {/* Table: No, No. Polisi, Nama Customer, Tujuan Kunjungan, Jenis Armada, Tgl Booking, Jam Booking, Status */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold w-12">No.</th>
                    <th className="py-2.5 px-3 font-bold">No. Polisi</th>
                    <th className="py-2.5 px-3 font-bold">Nama Customer</th>
                    <th className="py-2.5 px-3 font-bold">Tujuan Kunjungan</th>
                    <th className="py-2.5 px-3 font-bold">Jenis Armada</th>
                    <th className="py-2.5 px-3 font-bold">Tgl Booking</th>
                    <th className="py-2.5 px-3 font-bold">Jam Booking</th>
                    <th className="py-2.5 px-3 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookingList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        Tidak ada data booking kendaraan.
                      </td>
                    </tr>
                  ) : (
                    filteredBookingList.map((b, idx) => {
                      const isSelected = selectedBooking?.id === b.id;
                      return (
                        <tr 
                          key={b.id}
                          onClick={() => setSelectedBooking(b)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/90 font-medium' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-3 px-3 text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="py-3 px-3 font-black text-slate-900 tracking-wide">{b.no_polisi}</td>
                          <td className="py-3 px-3 text-slate-800 font-medium">{b.nama_customer || b.nama_perusahaan}</td>
                          <td className="py-3 px-3 text-slate-600">{b.tujuan_kunjungan || b.jenis_layanan}</td>
                          <td className="py-3 px-3 text-slate-600">{b.jenis_armada || 'Truk'}</td>
                          <td className="py-3 px-3 text-slate-700 font-medium">{b.tanggal_booking}</td>
                          <td className="py-3 px-3 font-bold text-slate-800 font-mono">{b.jam_booking}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold text-[11px]">
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div>Menampilkan {filteredBookingList.length > 0 ? `1 - ${filteredBookingList.length}` : '0'} dari {bookingList.length} data</div>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded border border-slate-200 text-slate-400 hover:bg-slate-50">&lt;</button>
                <button className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold">1</button>
                <button className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">2</button>
                <button className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">3</button>
                <span className="px-1 text-slate-400">...</span>
                <button className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">5</button>
                <button className="px-2 py-1 rounded border border-slate-200 text-slate-400 hover:bg-slate-50">&gt;</button>
              </div>
            </div>

            {/* Detail Booking Card with '+ PILIH & ISI OTOMATIS' */}
            {selectedBooking && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    DETAIL BOOKING
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-slate-400 text-[10px]">No. Polisi</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">{selectedBooking.no_polisi}</div>
                      <div className="text-slate-400 text-[10px] mt-1.5">Jenis Armada</div>
                      <div className="font-bold text-slate-800">{selectedBooking.jenis_armada || 'Truk'}</div>
                      <div className="text-slate-400 text-[10px] mt-1.5">Tujuan Kunjungan</div>
                      <div className="font-semibold text-slate-800">{selectedBooking.tujuan_kunjungan || 'Service'}</div>
                    </div>

                    <div>
                      <div className="text-slate-400 text-[10px]">Nama Customer</div>
                      <div className="font-bold text-slate-900 mt-0.5">{selectedBooking.nama_customer || selectedBooking.nama_perusahaan || '-'}</div>
                      <div className="text-slate-400 text-[10px] mt-1.5">No. Telepon</div>
                      <div className="font-mono text-slate-700 font-semibold">{selectedBooking.no_telepon || '-'}</div>
                      <div className="text-slate-400 text-[10px] mt-1.5">PIC / Driver</div>
                      <div className="font-semibold text-slate-800">{selectedBooking.pic_driver || '-'}</div>
                    </div>

                    <div>
                      <div className="text-slate-400 text-[10px]">Tanggal Booking</div>
                      <div className="font-bold text-slate-900 mt-0.5">{selectedBooking.tanggal_booking}</div>
                      <div className="text-slate-400 text-[10px] mt-1.5">Jam Booking</div>
                      <div className="font-mono font-bold text-blue-600">{selectedBooking.jam_booking}</div>
                      <div className="text-slate-400 text-[10px] mt-1.5">Keterangan</div>
                      <div className="text-slate-600 italic text-[11px] truncate">{selectedBooking.keterangan || '-'}</div>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const saUser = picPetugasList.find((p) => p.peran === 'SA');
                      setFormCheckin({
                        no_polisi: selectedBooking.no_polisi,
                        nama_customer: selectedBooking.nama_customer || selectedBooking.nama_perusahaan || '',
                        no_hp_customer: selectedBooking.no_telepon || '',
                        jenis_armada: selectedBooking.jenis_armada || 'Truk',
                        tujuan_kedatangan: (selectedBooking.tujuan_kunjungan as any) || 'Service',
                        pic_tujuan: saUser ? `${saUser.nama_lengkap} (SA)` : '',
                        keperluan: selectedBooking.keterangan || selectedBooking.jenis_layanan || '',
                        foto_kendaraan_masuk: '',
                        catatan_security: `Booking ID: ${selectedBooking.no_booking}`,
                        id_booking: selectedBooking.id,
                      });
                      changeTab('checkin');
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    + PILIH &amp; ISI OTOMATIS
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SELURUH NOPOL STATUS ON PROGRESS (Excel Screen 2)      */}
      {/* ========================================================= */}
      {currentTab === 'onprogress' && (
        <div className="space-y-5">
          
          {/* 4 Cards Status Summary at the top matching Excel screenshot */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            
            {/* Total On Progress */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold leading-tight">Total On Progress</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{countTotalOnProgress} <span className="text-xs font-medium text-slate-400">Unit</span></div>
              </div>
            </div>

            {/* Sedang Dikerjakan */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold leading-tight">Sedang Dikerjakan</div>
                <div className="text-xl font-black text-orange-600 mt-0.5">{countSedangDikerjakan} <span className="text-xs font-medium text-slate-400">Unit</span></div>
              </div>
            </div>

            {/* Menunggu Part / Approval */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold leading-tight">Menunggu Part / Approval</div>
                <div className="text-xl font-black text-purple-700 mt-0.5">{countMenungguPart} <span className="text-xs font-medium text-slate-400">Unit</span></div>
              </div>
            </div>

            {/* Menunggu QC */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold leading-tight">Menunggu QC</div>
                <div className="text-xl font-black text-teal-700 mt-0.5">{countMenungguQC} <span className="text-xs font-medium text-slate-400">Unit</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                  SELURUH NOPOL YANG MASIH BERADA DIBENGKEL (STATUS ON PROGRESS)
                </h2>
              </div>

              {/* Search & Date Filter Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari No. Polisi / Nama Customer"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-3.5 pr-8 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-64 bg-white"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
                  <span className="text-slate-400 font-medium">Tanggal</span>
                  <span className="font-bold text-slate-800">{todayFormatted}</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  Filter
                </button>
              </div>
            </div>

            {/* Table: No, No. Polisi, Nama Customer, Jenis Armada, Tujuan, Masuk, Status, PIC / Mekanik, Aksi */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold w-12">No.</th>
                    <th className="py-2.5 px-3 font-bold">No. Polisi</th>
                    <th className="py-2.5 px-3 font-bold">Nama Customer</th>
                    <th className="py-2.5 px-3 font-bold">Jenis Armada</th>
                    <th className="py-2.5 px-3 font-bold">Tujuan</th>
                    <th className="py-2.5 px-3 font-bold">Masuk</th>
                    <th className="py-2.5 px-3 font-bold text-center">Status</th>
                    <th className="py-2.5 px-3 font-bold">PIC / Mekanik</th>
                    <th className="py-2.5 px-3 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOnProgressList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                        Tidak ada kendaraan yang sedang diproses.
                      </td>
                    </tr>
                  ) : (
                    filteredOnProgressList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-slate-500 font-semibold">{idx + 1}</td>
                        <td className="py-3 px-3 font-black text-slate-900 tracking-wide">{item.no_polisi}</td>
                        <td className="py-3 px-3 text-slate-800 font-medium">{item.nama_customer}</td>
                        <td className="py-3 px-3 text-slate-600">{item.jenis_armada}</td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{item.tujuan_kedatangan}</td>
                        <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                          <div>{item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                          <div className="text-slate-400 font-medium">{item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <StatusBadge status={item.status_kunjungan} size="sm" />
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {item.nama_mekanik || item.pic_tujuan || '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {/* Tombol Detail dan Check Out berdampingan sesuai instruksi user */}
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowDetailModal(item)}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
                            >
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCheckoutModal(item);
                                setFormCheckout({
                                  barang_dibawa_keluar: false,
                                  detail_barang_keluar: '',
                                  foto_kendaraan_keluar: '',
                                  foto_barang: '',
                                  no_memo_keluar: '',
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" /> Check Out
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div>Menampilkan 1 - {filteredOnProgressList.length} dari {onProgressList.length} data</div>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded border border-slate-200 text-slate-400 hover:bg-slate-50">&lt;</button>
                <button className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold">1</button>
                <button className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">2</button>
                <button className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">3</button>
                <button className="px-2 py-1 rounded border border-slate-200 text-slate-400 hover:bg-slate-50">&gt;</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SELURUH NOPOL TELAH MENINGGALKAN BENGKEL (Excel 3)     */}
      {/* ========================================================= */}
      {currentTab === 'selesai' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  3
                </span>
                <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                  SELURUH NOPOL YANG TELAH MENINGGALKAN BENGKEL
                </h2>
              </div>

              {/* Search & Date Filter Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari No. Polisi / Nama Customer"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-3.5 pr-8 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-64 bg-white"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
                  <span className="text-slate-400 font-medium">Tanggal</span>
                  <span className="font-bold text-slate-800">{todayFormatted}</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  Filter
                </button>
              </div>
            </div>

            {/* Filter Pills matching Excel screenshot: Semua, Hari Ini, Kemarin, Minggu Ini, Bulan Ini */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['Semua', 'Hari Ini', 'Kemarin', 'Minggu Ini', 'Bulan Ini'] as const).map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setSelesaiTimeRange(pill)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selesaiTimeRange === pill
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Table: No, No. Polisi, Nama Customer, Jenis Armada, Tujuan, Masuk, Keluar, Status, Aksi */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold w-12">No.</th>
                    <th className="py-2.5 px-3 font-bold">No. Polisi</th>
                    <th className="py-2.5 px-3 font-bold">Nama Customer</th>
                    <th className="py-2.5 px-3 font-bold">Jenis Armada</th>
                    <th className="py-2.5 px-3 font-bold">Tujuan</th>
                    <th className="py-2.5 px-3 font-bold">Masuk</th>
                    <th className="py-2.5 px-3 font-bold">Keluar</th>
                    <th className="py-2.5 px-3 font-bold text-center">Status</th>
                    <th className="py-2.5 px-3 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSelesaiList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                        Tidak ada riwayat kendaraan selesai.
                      </td>
                    </tr>
                  ) : (
                    filteredSelesaiList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-slate-500 font-semibold">{idx + 1}</td>
                        <td className="py-3 px-3 font-black text-slate-900 tracking-wide">{item.no_polisi}</td>
                        <td className="py-3 px-3 text-slate-800 font-medium">{item.nama_customer}</td>
                        <td className="py-3 px-3 text-slate-600">{item.jenis_armada}</td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{item.tujuan_kedatangan}</td>
                        <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                          <div>{item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                          <div className="text-slate-400 font-medium">{item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                          <div>{item.waktu_keluar ? new Date(item.waktu_keluar).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                          <div className="text-slate-400 font-medium">{item.waktu_keluar ? new Date(item.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            Selesai
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setShowDetailModal(item)}
                            className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div>Menampilkan 1 - {filteredSelesaiList.length} dari {selesaiList.length} data</div>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded border border-slate-200 text-slate-400 hover:bg-slate-50">&lt;</button>
                <button className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold">1</button>
                <button className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">2</button>
                <button className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">3</button>
                <button className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">4</button>
                <button className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">5</button>
                <button className="px-2 py-1 rounded border border-slate-200 text-slate-400 hover:bg-slate-50">&gt;</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MEMO KELUAR & PREVIEW RESMI (Excel Screen 4)           */}
      {/* ========================================================= */}
      {currentTab === 'memo' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
              4
            </span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              MEMO KELUAR
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left Pane: LIST MEMO KELUAR (5 cols on lg) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  LIST MEMO KELUAR
                </h3>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[140px]">
                  <input
                    type="text"
                    placeholder="Cari No. Polisi / Nama Customer"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-7 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-[11px] text-slate-700">
                  <span className="text-slate-400 font-medium">Tanggal</span>
                  <span className="font-bold text-slate-800">{todayFormatted}</span>
                  <Calendar className="w-3 h-3 text-slate-400 ml-0.5" />
                </div>

                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1"
                >
                  <Filter className="w-3 h-3 text-slate-500" />
                  Filter
                </button>
              </div>

              {/* Table: No., No. Memo, No. Polisi, Nama Customer, Keluar, Aksi */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-2.5 font-bold w-8">No.</th>
                      <th className="py-2.5 px-2.5 font-bold">No. Memo</th>
                      <th className="py-2.5 px-2.5 font-bold">No. Polisi</th>
                      <th className="py-2.5 px-2.5 font-bold">Nama Customer</th>
                      <th className="py-2.5 px-2.5 font-bold">Keluar</th>
                      <th className="py-2.5 px-2.5 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMemoList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                          Tidak ada data memo keluar.
                        </td>
                      </tr>
                    ) : (
                      filteredMemoList.map((m, idx) => {
                        const isSelected = selectedMemo?.id === m.id;
                        return (
                          <tr 
                            key={m.id}
                            onClick={() => setSelectedMemo(m)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/90 font-medium' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="py-2.5 px-2.5 text-slate-500 font-semibold">{idx + 1}</td>
                            <td className="py-2.5 px-2.5 font-mono font-bold text-blue-700">{m.no_memo}</td>
                            <td className="py-2.5 px-2.5 font-bold text-slate-900">{m.no_polisi}</td>
                            <td className="py-2.5 px-2.5 text-slate-800">{m.nama_customer}</td>
                            <td className="py-2.5 px-2.5 text-slate-600 font-mono text-[11px]">
                              <div>{new Date(m.waktu_keluar || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div className="text-slate-400 font-medium">{new Date(m.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="py-2.5 px-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5 text-slate-500">
                              <button
                                type="button"
                                title="Lihat Preview"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMemo(m);
                                }}
                                className="p-1 hover:text-blue-600 rounded transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Cetak Memo A4"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMemo(m);
                                  setShowPrintMemo(m);
                                }}
                                className="p-1 hover:text-slate-900 rounded transition-colors"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div>Menampilkan 1 - {filteredMemoList.length} dari {memoList.length} data</div>
                <div className="flex items-center gap-1">
                  <button className="px-2 py-0.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50">&lt;</button>
                  <button className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold">1</button>
                  <button className="px-2 py-0.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">2</button>
                  <button className="px-2 py-0.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">3</button>
                  <button className="px-2 py-0.5 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">4</button>
                  <button className="px-2 py-0.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50">&gt;</button>
                </div>
              </div>
            </div>

            {/* Right Pane: PREVIEW MEMO KELUAR (Formal Letter Format) (6 cols on lg) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              {selectedMemo ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      PREVIEW MEMO KELUAR
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">Format Resmi Pos Security</span>
                  </div>

                  {/* Formal Letter Paper Area */}
                  <div id="formal-memo-printable" className="p-6 bg-white rounded-xl border border-slate-300 shadow-sm space-y-4 text-xs font-sans">
                    
                    {/* Official Letterhead / Kop Surat */}
                    <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                      <div>
                        <div className="text-base font-black text-slate-900 tracking-wider">BENGKEL KIM 3 MEDAN</div>
                        <div className="text-[10px] text-slate-600">Kawasan Industri Medan III, Jl. Pelita Raya No. 88</div>
                        <div className="text-[10px] text-slate-500">Security Division &amp; Gate Control Portal</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-slate-900 tracking-tight">MEMO KELUAR</div>
                        <div className="font-mono text-xs font-black text-blue-700">{selectedMemo.no_memo}</div>
                      </div>
                    </div>

                    {/* Date & Time Row */}
                    <div className="grid grid-cols-2 gap-4 text-xs pb-1 border-b border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Tanggal Keluar:</span>
                        <span className="font-bold text-slate-800">
                          {new Date(selectedMemo.waktu_keluar || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-right sm:text-left">
                        <span className="text-slate-400 text-[10px] block">Jam Keluar:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {new Date(selectedMemo.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                        </span>
                      </div>
                    </div>

                    {/* DATA KENDARAAN */}
                    <div>
                      <div className="text-[11px] font-black uppercase text-slate-900 tracking-wide mb-2">
                        DATA KENDARAAN
                      </div>
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
                        <div className="flex">
                          <span className="w-28 text-slate-500">No. Polisi</span>
                          <span className="font-black text-slate-900">: {selectedMemo.no_polisi}</span>
                        </div>
                        <div className="flex">
                          <span className="w-28 text-slate-500">Jenis Armada</span>
                          <span className="font-semibold text-slate-800">: {selectedMemo.jenis_armada || 'Truk'}</span>
                        </div>
                        <div className="flex">
                          <span className="w-28 text-slate-500">Nama Customer</span>
                          <span className="font-semibold text-slate-800">: {selectedMemo.nama_customer}</span>
                        </div>
                        <div className="flex">
                          <span className="w-28 text-slate-500">Tujuan Kunjungan</span>
                          <span className="font-semibold text-slate-800">: {selectedMemo.tujuan_kedatangan}</span>
                        </div>
                      </div>
                    </div>

                    {/* KETERANGAN */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-black uppercase text-slate-900 tracking-wide mb-1.5">
                        KETERANGAN
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-slate-500">Status</span>
                          <span className="font-bold text-emerald-700">: Selesai</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-20 text-slate-500 shrink-0">Catatan</span>
                          <span className="text-slate-700">: {selectedMemo.catatan || 'Pekerjaan telah selesai dan kendaraan dalam kondisi baik.'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Official Signature Box matching Excel */}
                    <div className="pt-5 flex items-end justify-between text-center">
                      <div>
                        <div className="text-[10px] text-slate-400 mb-8">Penerima / Driver,</div>
                        <div className="font-bold text-slate-800 border-t border-slate-300 pt-1 px-3">
                          ( {selectedMemo.nama_customer || 'Driver'} )
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="text-[10px] text-slate-400 mb-2">Dibuat oleh,</div>
                        
                        {/* Signature graphic/stamp simulation */}
                        <div className="w-20 h-10 border border-blue-400 rounded-lg bg-blue-50/50 flex items-center justify-center text-[10px] text-blue-700 font-serif italic mb-1 transform -rotate-3">
                          Security
                        </div>

                        <div className="font-black text-slate-900 text-xs">
                          {selectedMemo.petugas_security || '( Petugas Security )'}
                        </div>
                        <div className="text-[10px] text-slate-400">Security Bengkel KIM 3</div>
                      </div>
                    </div>

                  </div>

                  {/* Print & Export Buttons matching Excel */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPrintMemo(selectedMemo)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      CETAK MEMO (A4)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      EXPORT PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Pilih salah satu memo dari tabel di sebelah kiri untuk melihat preview resmi.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CHECK-IN KENDARAAN MASUK                            */}
      {/* ========================================================= */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Check-In Kendaraan Masuk</h3>
                  <p className="text-xs text-slate-500">Pencatatan gerbang pos security Bengkel KIM 3</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCheckinModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); checkinMutation.mutate(formCheckin); }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nomor Polisi (Plat Nomor) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BK 1234 AB"
                    value={formCheckin.no_polisi}
                    onChange={(e) => setFormCheckin({ ...formCheckin, no_polisi: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black uppercase tracking-wider focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Armada</label>
                  <select
                    value={formCheckin.jenis_armada}
                    onChange={(e) => setFormCheckin({ ...formCheckin, jenis_armada: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="Truk">Truk (Canter / Dutro / Tronton)</option>
                    <option value="Mobil">Mobil Pribadi / Operasional</option>
                    <option value="Pickup">Pickup / Box Kecil</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tujuan Kedatangan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Service', label: '1. Service', desc: 'Perbaikan unit' },
                    { id: 'Beli Part', label: '2. Beli Part', desc: 'Pembelian part' },
                    { id: 'Kunjungan', label: '3. Kunjungan', desc: 'Tamu / Dinas' },
                    { id: 'Lainnya', label: '4. Lainnya', desc: 'Keperluan lain' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        let defaultPic = '';
                        if (t.id === 'Service') {
                          const saUser = picPetugasList.find((p) => p.peran === 'SA');
                          defaultPic = saUser ? `${saUser.nama_lengkap} (SA)` : '';
                        } else if (t.id === 'Beli Part') {
                          const partUser = picPetugasList.find((p) => p.peran === 'Admin Purchasing' || p.peran === 'Admin Invoice');
                          defaultPic = partUser ? `${partUser.nama_lengkap} (${partUser.peran})` : '';
                        }
                        setFormCheckin({
                          ...formCheckin,
                          tujuan_kedatangan: t.id as any,
                          pic_tujuan: defaultPic || formCheckin.pic_tujuan,
                        });
                      }}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        formCheckin.tujuan_kedatangan === t.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{t.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Customer / Perusahaan</label>
                  <input
                    type="text"
                    placeholder="Contoh: PT. Andi Jaya"
                    value={formCheckin.nama_customer}
                    onChange={(e) => setFormCheckin({ ...formCheckin, nama_customer: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. HP Driver / PIC</label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={formCheckin.no_hp_customer}
                    onChange={(e) => setFormCheckin({ ...formCheckin, no_hp_customer: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PIC / Petugas Tujuan</label>
                  <select
                    value={formCheckin.pic_tujuan}
                    onChange={(e) => setFormCheckin({ ...formCheckin, pic_tujuan: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Pilih PIC / Petugas Tujuan --</option>
                    {picPetugasList.map((p) => (
                      <option key={p.id} value={`${p.nama_lengkap} (${p.peran})`}>
                        {p.nama_lengkap} ({p.peran})
                      </option>
                    ))}
                    <option value="Admin Office">Admin Office</option>
                    <option value="Management">Management</option>
                    <option value="PIC Terkait">Lainnya / PIC Terkait</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Keperluan Singkat / Keluhan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Service berkala, ganti kampas rem"
                    value={formCheckin.keperluan}
                    onChange={(e) => setFormCheckin({ ...formCheckin, keperluan: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <PhotoUploader
                label="Foto Kendaraan Saat Masuk Gerbang (Opsional)"
                value={formCheckin.foto_kendaraan_masuk}
                onChange={(url) => setFormCheckin({ ...formCheckin, foto_kendaraan_masuk: url })}
                bucket="foto_kendaraan"
              />

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Security</label>
                <textarea
                  rows={2}
                  placeholder="Catatan kondisi awal fisik atau kelengkapan armada..."
                  value={formCheckin.catatan_security}
                  onChange={(e) => setFormCheckin({ ...formCheckin, catatan_security: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={checkinMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {checkinMutation.isPending ? 'Menyimpan...' : 'SUBMIT CHECK IN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CHECK-OUT KENDARAAN (Mencatat barang & terbit memo) */}
      {/* ========================================================= */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Proses Check Out Kendaraan</h3>
                <p className="text-xs text-slate-500 font-mono">{showCheckoutModal.no_polisi} - {showCheckoutModal.nama_customer}</p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Tujuan Kedatangan:</span>
                  <span className="font-semibold text-blue-700">{showCheckoutModal.tujuan_kedatangan}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-slate-600">
                  <span>Waktu Masuk:</span>
                  <span className="font-mono">{new Date(showCheckoutModal.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={formCheckout.barang_dibawa_keluar}
                    onChange={(e) => setFormCheckout({ ...formCheckout, barang_dibawa_keluar: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ada Barang yang Dibawa Keluar? (Sparepart bekas / box / dokumen)</span>
                </label>
              </div>

              {formCheckout.barang_dibawa_keluar && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rincian Barang yang Dibawa Keluar <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1 Dus Sparepart Bekas, Dokumen Faktur"
                    value={formCheckout.detail_barang_keluar}
                    onChange={(e) => setFormCheckout({ ...formCheckout, detail_barang_keluar: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Foto Keluar */}
              <PhotoUploader
                label="Foto Kendaraan Saat Keluar Gerbang (Kamera/File)"
                value={formCheckout.foto_kendaraan_keluar}
                onChange={(url) => setFormCheckout({ ...formCheckout, foto_kendaraan_keluar: url })}
                bucket="foto_kendaraan"
              />

              {formCheckout.barang_dibawa_keluar && (
                <PhotoUploader
                  label="Foto Barang Bawaan (Opsional)"
                  value={formCheckout.foto_barang}
                  onChange={(url) => setFormCheckout({ ...formCheckout, foto_barang: url })}
                  bucket="foto_barang"
                />
              )}

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>Setelah konfirmasi, sistem akan secara otomatis menerbitkan <strong>Memo Keluar (Surat Jalan)</strong> resmi untuk armada ini.</span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={checkoutMutation.isPending}
                  onClick={() => checkoutMutation.mutate(showCheckoutModal)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  {checkoutMutation.isPending ? 'Menerbitkan Memo...' : 'KONFIRMASI KELUAR & TERBITKAN MEMO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAIL HISTORI KENDARAAN                            */}
      {/* ========================================================= */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Rincian Histori Kunjungan Kendaraan</h3>
                <p className="text-xs text-slate-500 font-mono">{showDetailModal.no_polisi} - {showDetailModal.nama_customer}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">No. Tiket Antrian</span>
                  <span className="font-mono font-bold text-blue-700">{showDetailModal.no_tiket}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Jenis Armada</span>
                  <span className="font-bold text-slate-800">{showDetailModal.jenis_armada || 'Truk'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Waktu Masuk</span>
                  <span className="font-medium text-slate-700">
                    {new Date(showDetailModal.waktu_masuk).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Waktu Keluar</span>
                  <span className="font-medium text-slate-700">
                    {showDetailModal.waktu_keluar ? new Date(showDetailModal.waktu_keluar).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '- (Masih di dalam)'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block mb-1">Status Kunjungan</span>
                <StatusBadge status={showDetailModal.status_kunjungan} />
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block mb-1">Keperluan / Penugasan PIC</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                  {showDetailModal.keperluan || 'Service berkala dan pemeliharaan armada.'}
                </div>
              </div>

              {showDetailModal.detail_barang_keluar && (
                <div>
                  <span className="text-slate-400 text-[10px] block mb-1">Barang Bawaan Saat Keluar</span>
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 font-medium">
                    {showDetailModal.detail_barang_keluar}
                  </div>
                </div>
              )}

              {showDetailModal.no_memo_keluar && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-purple-600 font-bold block">No. Memo Keluar:</span>
                    <span className="font-mono font-black text-purple-900">{showDetailModal.no_memo_keluar}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const memo = memoList.find(m => m.no_memo === showDetailModal.no_memo_keluar);
                      if (memo) setSelectedMemo(memo);
                      setShowDetailModal(null);
                      changeTab('memo');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
                  >
                    Buka Memo →
                  </button>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Memo Keluar A4 Modal */}
      {showPrintMemo && (
        <PrintMemoKeluarModal
          memo={showPrintMemo}
          onClose={() => setShowPrintMemo(null)}
        />
      )}

    </div>
  );
};
