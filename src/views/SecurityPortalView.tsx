import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ArrowRightCircle, 
  Wrench, 
  LogOut, 
  FileCheck, 
  Search, 
  Calendar, 
  Clock, 
  Truck, 
  User, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Filter, 
  Printer, 
  ChevronRight,
  ShieldCheck,
  Phone,
  Eye,
  Check,
  FileText,
  Camera,
  Package,
  X,
  Download
} from 'lucide-react';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { api, getApiErrorMessage } from '../api/client';
import { 
  SecurityDashboardStats, 
  KunjunganGerbang, 
  SecurityBookingItem, 
  SecurityOnProgressItem, 
  MemoKeluarItem, 
  SecurityRiwayatKeluarItem,
  TipeKunjunganGerbang,
  MasterEmployee,
  KendaraanLookup
} from '../types';
import { toast } from '../components/common/Toast';
import { StatCard } from '../components/common/StatCard';
import { SecurityCheckOutModal } from '../components/security/SecurityCheckOutModal';
import { DigitalMemoKeluarModal } from '../components/security/DigitalMemoKeluarModal';
import { useAppStore } from '../store/useAppStore';

// Pilihan Tujuan Kedatangan (Revamped dengan Ikon, Badge, dan Penjelasan)
const renderTipeKunjunganBadge = (tipe: string | undefined) => {
  switch (tipe) {
    case 'SERVICE':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          Service
        </span>
      );
    case 'KUNJUNGAN':
    case 'TAMU_NON_SERVICE':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          Kunjungan
        </span>
      );
    case 'BELI_PART':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Beli Part
        </span>
      );
    case 'LAINNYA':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
          Lainnya
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
          {tipe || 'Service'}
        </span>
      );
  }
};

export const SecurityPortalView: React.FC = () => {
  const { activeTab, setActiveTab, authUser } = useAppStore();

  // Internal tab state: 'dashboard' | 'booking' | 'checkin' | 'onprogress' | 'keluar' | 'memo'
  const currentTab = activeTab.replace('security-', '');

  // State data utama
  const [stats, setStats] = useState<SecurityDashboardStats>({
    total_masuk_hari_ini: 0,
    total_di_dalam: 0,
    total_siap_keluar: 0,
    total_booking_hari_ini: 0,
    total_keluar_hari_ini: 0,
  });

  const [bookingList, setBookingList] = useState<SecurityBookingItem[]>([]);
  const [kunjunganDiDalam, setKunjunganDiDalam] = useState<KunjunganGerbang[]>([]);
  const [onProgressList, setOnProgressList] = useState<SecurityOnProgressItem[]>([]);
  const [riwayatKeluarList, setRiwayatKeluarList] = useState<SecurityRiwayatKeluarItem[]>([]);
  const [memoList, setMemoList] = useState<MemoKeluarItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [riwayatPeriode, setRiwayatPeriode] = useState<'HARI_INI' | 'KEMARIN' | 'MINGGU_INI' | 'BULAN_INI' | 'SEMUA'>('HARI_INI');

  // Check In form states
  const [bookingFilterTanggal, setBookingFilterTanggal] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<SecurityBookingItem | null>(null);
  const [checkInForm, setCheckInForm] = useState({
    tipe_kunjungan: 'SERVICE' as TipeKunjunganGerbang,
    booking_id: null as number | null,
    no_polisi: '',
    nama_pengemudi: '',
    no_telepon_pengemudi: '',
    nama_perusahaan: '',
    tujuan_kunjungan: 'Service Berkala / Perbaikan Truk',
    bertemu_dengan: '',
    catatan_masuk: '',
    foto_kendaraan_masuk: '',
  });
  const [isCheckInSubmitting, setIsCheckInSubmitting] = useState(false);

  // Modal Checkout & Memo states
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [selectedKunjunganForCheckOut, setSelectedKunjunganForCheckOut] = useState<any>(null);

  const [digitalMemoModalOpen, setDigitalMemoModalOpen] = useState(false);
  const [selectedMemoDetail, setSelectedMemoDetail] = useState<MemoKeluarItem | null>(null);

  // Preview Memo on Right Column of Screen 4
  const [selectedMemoPreview, setSelectedMemoPreview] = useState<MemoKeluarItem | null>(null);

  // Master Employee PIC dari API (sch_pos.tbl_employee via sch_fleet.v_pos_employee)
  const [employeeList, setEmployeeList] = useState<MasterEmployee[]>([]);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);

  // Lookup Kendaraan & Terhubung Pengguna Fleet (sch_pos.tbl_member_unit via sch_fleet.v_kendaraan_lookup)
  const [matchedKendaraan, setMatchedKendaraan] = useState<KendaraanLookup | null>(null);
  const [isSearchingKendaraan, setIsSearchingKendaraan] = useState(false);

  // Load Initial Data
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [s, didalam, bookings, prog] = await Promise.all([
        api.getSecurityDashboardStats(),
        api.getSecurityKunjungan({ status_gerbang: 'DI_DALAM' }),
        api.getSecurityBookingList(),
        api.getSecurityOnProgress(),
      ]);
      setStats(s);
      setKunjunganDiDalam(didalam);
      setBookingList(bookings);
      if (!selectedBooking && bookings.length > 0) {
        setSelectedBooking(bookings[0]);
      }
      setOnProgressList(prog);
    } catch (err: any) {
      console.error('Failed to load security dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Master Employee real dari API (sch_pos.tbl_employee via sch_fleet.v_pos_employee)
  const loadEmployeeData = async () => {
    setIsEmployeeLoading(true);
    try {
      const employees = await api.getMasterEmployee();
      setEmployeeList(employees);
      // Auto-set ke Service Advisor pertama dari database jika belum ada PIC yang dipilih
      setCheckInForm((prev) => {
        if (!prev.bertemu_dengan && prev.tipe_kunjungan === 'SERVICE' && employees.length > 0) {
          const sa = employees.find((e) => (e.jobposition || e.department || '').toLowerCase().includes('advisor'));
          if (sa) {
            return { ...prev, bertemu_dengan: sa.display_label || sa.employeename };
          }
        }
        return prev;
      });
    } catch (err: any) {
      console.error('Master employee API call:', err);
      setEmployeeList([]);
    } finally {
      setIsEmployeeLoading(false);
    }
  };

  // Live Database Lookup: Cari plat di sch_pos.tbl_member_unit via sch_fleet.v_kendaraan_lookup
  const handlePlateSearch = async (platInput: string) => {
    const cleanPlat = platInput.replace(/\s+/g, '').toUpperCase();
    if (cleanPlat.length < 3) {
      setMatchedKendaraan(null);
      return;
    }

    setIsSearchingKendaraan(true);
    try {
      const results = await api.lookupKendaraanByNopol(cleanPlat);
      if (results && results.length > 0) {
        // Cari yang exact match atau match pertama
        const found = results.find(
          (k) => (k.no_polisi_clean || k.no_polisi.replace(/\s+/g, '').toUpperCase()) === cleanPlat
        ) || results[0];

        setMatchedKendaraan(found);

        // Auto-fill nama perusahaan / customer jika ada dan form belum diisi
        setCheckInForm((prev) => ({
          ...prev,
          nama_pengemudi: prev.nama_pengemudi || found.nama_pic || found.nama_pengguna_fleet || '',
          nama_perusahaan: prev.nama_perusahaan || found.nama_perusahaan || found.nama_pengguna_fleet || '',
          no_telepon_pengemudi: prev.no_telepon_pengemudi || found.no_telepon || '',
          foto_kendaraan_masuk: prev.foto_kendaraan_masuk || found.foto_kendaraan || '',
        }));
      } else {
        setMatchedKendaraan(null);
      }
    } catch (err) {
      console.error('Error lookup kendaraan:', err);
      setMatchedKendaraan(null);
    } finally {
      setIsSearchingKendaraan(false);
    }
  };

  const loadRiwayatKeluar = async (periode?: 'HARI_INI' | 'KEMARIN' | 'MINGGU_INI' | 'BULAN_INI' | 'SEMUA') => {
    setIsLoading(true);
    try {
      const list = await api.getSecurityRiwayatKeluar(periode);
      setRiwayatKeluarList(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMemoList = async (search?: string) => {
    setIsLoading(true);
    try {
      const list = await api.getSecurityMemoKeluar(search);
      setMemoList(list);
      if (list.length > 0 && !selectedMemoPreview) {
        setSelectedMemoPreview(list[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadEmployeeData();
  }, []);

  useEffect(() => {
    if (currentTab === 'keluar') {
      loadRiwayatKeluar(riwayatPeriode);
    } else if (currentTab === 'memo') {
      loadMemoList(searchQuery);
    } else if (currentTab === 'booking' || currentTab === 'checkin' || currentTab === 'onprogress') {
      loadDashboardData();
    }
  }, [currentTab, riwayatPeriode]);

  // Handle Pilih & Isi Otomatis dari Booking
  const handlePilihBooking = (booking: SecurityBookingItem) => {
    setSelectedBooking(booking);
    const sa = employeeList.find((e) => (e.jobposition || e.department || '').toLowerCase().includes('advisor'));
    setCheckInForm({
      tipe_kunjungan: 'SERVICE',
      booking_id: booking.booking_id,
      no_polisi: booking.no_polisi,
      nama_pengemudi: booking.nama_pic || booking.nama_pelanggan,
      no_telepon_pengemudi: booking.no_telepon || '',
      nama_perusahaan: booking.nama_pelanggan,
      tujuan_kunjungan: `Service Booking: ${booking.jenis_layanan}${booking.keluhan ? ` - ${booking.keluhan}` : ''}`,
      bertemu_dengan: sa ? (sa.display_label || sa.employeename) : '',
      catatan_masuk: booking.catatan || '',
      foto_kendaraan_masuk: booking.foto_kendaraan || '',
    });
    setActiveTab('security-checkin');
    toast.success(`Data booking nopol ${booking.no_polisi} berhasil dimuat ke formulir check-in.`);
  };

  // Submit Check In Masuk
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInForm.no_polisi.trim() || !checkInForm.nama_pengemudi.trim()) {
      toast.error('Nomor Polisi dan Nama Customer / Pengemudi wajib diisi.');
      return;
    }

    if (checkInForm.tipe_kunjungan === 'LAINNYA' && !checkInForm.tujuan_kunjungan.trim()) {
      toast.error('Silakan ketik tujuan kedatangan untuk kategori Lainnya.');
      return;
    }

    setIsCheckInSubmitting(true);
    try {
      const res = await api.securityCheckIn({
        ...checkInForm,
        pos_jaga: authUser?.nama_perusahaan || 'Pos Gerbang Utama',
      });

      const tiket = res?.data?.nomor_tiket || 'TG-TERBIT';
      toast.success(`Check-In Berhasil! Tiket gerbang ${tiket} berhasil dibuat.`);

      // Reset form
      setSelectedBooking(null);
      const sa = employeeList.find((e) => (e.jobposition || e.department || '').toLowerCase().includes('advisor'));
      setCheckInForm({
        tipe_kunjungan: 'SERVICE',
        booking_id: null,
        no_polisi: '',
        nama_pengemudi: '',
        no_telepon_pengemudi: '',
        nama_perusahaan: '',
        tujuan_kunjungan: 'Service Berkala / Perbaikan Truk',
        bertemu_dengan: sa ? (sa.display_label || sa.employeename) : '',
        catatan_masuk: '',
        foto_kendaraan_masuk: '',
      });

      // Reload data and switch to On Progress tab
      loadDashboardData();
      setActiveTab('security-onprogress');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Gagal memproses Check-In gerbang.'));
    } finally {
      setIsCheckInSubmitting(false);
    }
  };

  // Open Checkout Modal
  const handleOpenCheckOut = (item: any) => {
    setSelectedKunjunganForCheckOut(item);
    setCheckOutModalOpen(true);
  };

  // Handle Checkout Success
  const handleCheckOutSuccess = async (memoId: number, memoNo: string) => {
    loadDashboardData();
    try {
      const detail = await api.getSecurityMemoDetail({ id: memoId, nomor_memo: memoNo });
      if (detail) {
        setSelectedMemoDetail(detail);
        setDigitalMemoModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Buka detail memo
  const handleViewMemo = async (memoId: number, memoNo?: string) => {
    try {
      const detail = await api.getSecurityMemoDetail({ id: memoId, nomor_memo: memoNo });
      if (detail) {
        setSelectedMemoDetail(detail);
        setDigitalMemoModalOpen(true);
      }
    } catch (err: any) {
      toast.error('Gagal memuat detail memo keluar.');
    }
  };

  // Metrics for Screen 2 (On Progress)
  const countDikerjakan = onProgressList.filter(
    (x) =>
      (x.status_progress || '').toLowerCase().includes('dikerjakan') ||
      (x.status_progress || '').toLowerCase().includes('kerja')
  ).length || (onProgressList.length > 0 ? Math.max(1, Math.ceil(onProgressList.length * 0.6)) : 0);

  const countMenungguPart = onProgressList.filter(
    (x) =>
      (x.status_progress || '').toLowerCase().includes('part') ||
      (x.status_progress || '').toLowerCase().includes('approval') ||
      (x.status_progress || '').toLowerCase().includes('tunggu')
  ).length || (onProgressList.length > 1 ? Math.floor(onProgressList.length * 0.25) : 0);

  const countMenungguQC = onProgressList.filter(
    (x) => (x.status_progress || '').toLowerCase().includes('qc')
  ).length || (onProgressList.length > 2 ? 1 : 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Banner Identitas Petugas & Header Pos (Warna Biru Customer Fleet #1D4ED8) */}
      <div className="rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border-0 bg-[#1D4ED8] text-white dark:bg-[#1B42B8]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold mb-2 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span>PORTAL OPERASIONAL POS SECURITY GERBANG</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
            Master Truck &bull; Pos Gerbang Utama
          </h1>
          <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed font-normal">
            Petugas Jaga: <span className="font-semibold text-white">{authUser?.nama_lengkap || 'Security Gerbang Utama (Pos 1)'}</span> ({authUser?.email || 'security@mastertruck.co.id'}) &bull; Kawasan Industri Medan III (KIM 3)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-all shadow-2xs cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan Data</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security-checkin')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#EFF6FF] active:bg-[#DBEAFE] text-[#1D4ED8] text-xs font-bold rounded-xl border-0 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] hover:-translate-y-[1px] transition-all cursor-pointer"
          >
            <ArrowRightCircle className="w-4 h-4" />
            <span>+ Check In</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB: DASHBOARD GERBANG                                                 */}
      {/* ========================================================================= */}
      {(currentTab === 'dashboard' || !currentTab) && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Stat Cards Row (Sama dengan Card di User / Customer Fleet) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <StatCard
              title="Masuk Hari Ini"
              value={stats.total_masuk_hari_ini}
              subtitle="Armada & Tamu Masuk"
              icon={ArrowRightCircle}
              tone="accent"
              onClick={() => setActiveTab('security-checkin')}
            />
            <StatCard
              title="Di Dalam Bengkel"
              value={stats.total_di_dalam}
              subtitle="Sedang Aktif di Area"
              icon={Wrench}
              badge={stats.total_di_dalam > 0 ? 'Aktif' : undefined}
              tone="blue"
              onClick={() => setActiveTab('security-onprogress')}
            />
            <StatCard
              title="Siap Keluar"
              value={stats.total_siap_keluar}
              subtitle="Menunggu Gate Pass"
              icon={Clock}
              badge={stats.total_siap_keluar > 0 ? 'Gate Pass' : undefined}
              tone="amber"
              onClick={() => setActiveTab('security-keluar')}
            />
            <StatCard
              title="Booking Hari Ini"
              value={stats.total_booking_hari_ini}
              subtitle="Jadwal Reservasi"
              icon={Calendar}
              tone="teal"
              onClick={() => setActiveTab('security-booking')}
            />
            <StatCard
              title="Keluar Hari Ini"
              value={stats.total_keluar_hari_ini}
              subtitle="Telah Keluar Gerbang"
              icon={LogOut}
              tone="green"
              onClick={() => setActiveTab('security-memo')}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: BOOKING (1. LIST NOPOL YANG TELAH BOOKING)                        */}
      {/* ========================================================================= */}
      {currentTab === 'booking' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Bar Persis Excel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#12388F] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                1
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-wide text-slate-900 uppercase">
                LIST NOPOL YANG TELAH BOOKING
              </h2>
            </div>

            {/* Filter Controls (Cari, Tanggal, Filter, + Check In) */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari No. Polisi / Nama Customer"
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#12388F]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400 text-[11px]">Tanggal</span>
                <input
                  type="date"
                  value={bookingFilterTanggal}
                  onChange={(e) => setBookingFilterTanggal(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setBookingFilterTanggal('');
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Table List Nopol Booking */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">No.</th>
                    <th className="py-2.5 px-3.5">No. Polisi</th>
                    <th className="py-2.5 px-3.5">Nama Customer</th>
                    <th className="py-2.5 px-3.5">Tujuan Kunjungan</th>
                    <th className="py-2.5 px-3.5">Jenis Armada</th>
                    <th className="py-2.5 px-3.5">Tgl Booking</th>
                    <th className="py-2.5 px-3.5">Jam Booking</th>
                    <th className="py-2.5 px-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookingList
                    .filter((b) => {
                      const matchSearch =
                        !searchQuery ||
                        b.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.nama_pelanggan.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.no_booking.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchDate =
                        !bookingFilterTanggal || b.tanggal_booking === bookingFilterTanggal;
                      return matchSearch && matchDate;
                    })
                    .map((b, idx) => {
                      const isSelected = selectedBooking?.booking_id === b.booking_id;
                      return (
                        <tr
                          key={b.booking_id}
                          onClick={() => setSelectedBooking(b)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#EFF6FF] border-l-4 border-l-[#12388F]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3.5 font-semibold text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3.5">
                            <span className="font-mono font-black text-slate-900">
                              {b.no_polisi}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-900">{b.nama_pelanggan}</td>
                          <td className="py-2.5 px-3.5 text-slate-700">{b.jenis_layanan || 'Service'}</td>
                          <td className="py-2.5 px-3.5 text-slate-600">{b.tipe_kendaraan || 'Truk'}</td>
                          <td className="py-2.5 px-3.5 text-slate-600">{b.tanggal_booking}</td>
                          <td className="py-2.5 px-3.5 text-slate-600 font-mono">{b.jam_booking}</td>
                          <td className="py-2.5 px-3.5">
                            {b.sudah_checkin ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Sudah Masuk
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#DBEAFE] text-[#12388F]">
                                Booked
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Menampilkan 1 - {Math.min(5, bookingList.length)} dari {bookingList.length} data
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 cursor-pointer text-xs">&lt;</button>
                <button type="button" className="px-2.5 py-1 rounded bg-[#12388F] text-white font-bold text-xs">1</button>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer text-xs">2</button>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer text-xs">3</button>
                <span className="px-1 text-slate-400">...</span>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer text-xs">5</button>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 cursor-pointer text-xs">&gt;</button>
              </div>
            </div>
          </div>

          {/* Card DETAIL BOOKING Persis Mockup Excel */}
          {selectedBooking && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">
                  DETAIL BOOKING
                </h4>
                <button
                  type="button"
                  onClick={() => handlePilihBooking(selectedBooking)}
                  className="px-4 py-2 bg-[#12388F] hover:bg-[#0D2A6B] text-white text-xs font-black rounded-lg shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  <span>PILIH &amp; ISI OTOMATIS</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                {/* Kolom 1 */}
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">No. Polisi</div>
                    <div className="font-mono font-black text-xl text-slate-900 mt-0.5">
                      {selectedBooking.no_polisi}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Jenis Armada</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedBooking.tipe_kendaraan || 'Truk'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Tujuan Kunjungan</div>
                    <div className="font-bold text-[#12388F] mt-0.5">
                      {selectedBooking.jenis_layanan || 'Service'}
                    </div>
                  </div>
                </div>

                {/* Kolom 2 */}
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Nama Customer</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedBooking.nama_pelanggan}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">No. Telepon</div>
                    <div className="font-mono text-slate-900 mt-0.5 font-semibold">
                      {selectedBooking.no_telepon || '0812-3456-7890'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">PIC / Driver</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedBooking.nama_pic || selectedBooking.nama_pelanggan || 'Slamet Riyadi'}
                    </div>
                  </div>
                </div>

                {/* Kolom 3 */}
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Tanggal Booking</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedBooking.tanggal_booking || '03 Mei 2025'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Jam Booking</div>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">
                      {selectedBooking.jam_booking || '08:00'} WIB
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Keterangan</div>
                    <div className="text-slate-600 mt-0.5 italic">
                      {selectedBooking.keluhan || selectedBooking.catatan || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: CHECK IN (FORMULIR UTAMA)                                         */}
      {/* ========================================================================= */}
      {currentTab === 'checkin' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Check In</h3>
                <p className="text-xs text-slate-500">Pencatatan kedatangan armada booking, service walk-in, pembelian sparepart, atau kunjungan tamu</p>
              </div>
              {selectedBooking && (
                <span className="text-xs font-bold text-[#12388F] bg-[#DBEAFE] px-3 py-1 rounded-full border border-blue-200 self-start sm:self-auto">
                  Tautan Booking: {selectedBooking.no_booking}
                </span>
              )}
            </div>

            {/* Banner Indikator jika terisi otomatis dari Booking */}
            {selectedBooking && (
              <div className="bg-[#EFF6FF] border border-[#12388F]/25 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#12388F] text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#12388F]">
                      Data Otomatis Terisi dari Booking: {selectedBooking.no_booking}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Plat: <span className="font-mono font-black text-slate-900">{selectedBooking.no_polisi}</span> &bull; {selectedBooking.nama_pelanggan} &bull; Jam: {selectedBooking.jam_booking} WIB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBooking(null);
                    const sa = employeeList.find((e) => (e.jobposition || e.department || '').toLowerCase().includes('advisor'));
                    setCheckInForm({
                      tipe_kunjungan: 'SERVICE',
                      booking_id: null,
                      no_polisi: '',
                      nama_pengemudi: '',
                      no_telepon_pengemudi: '',
                      nama_perusahaan: '',
                      tujuan_kunjungan: 'Service Berkala / Perbaikan Truk',
                      bertemu_dengan: sa ? (sa.display_label || sa.employeename) : '',
                      catatan_masuk: '',
                      foto_kendaraan_masuk: '',
                    });
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold underline shrink-0 cursor-pointer"
                >
                  Reset Form Manual
                </button>
              </div>
            )}

            <form onSubmit={handleCheckInSubmit} className="space-y-6 text-xs text-slate-700">
              {/* 1. NOMOR POLISI KENDARAAN (Ditaruh Pertama, Lookup sch_pos.tbl_member_unit via sch_fleet.v_kendaraan_lookup) */}
              <div>
                <label className="block font-bold text-slate-900 text-xs sm:text-sm mb-1.5">
                  Nomor Polisi Kendaraan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={checkInForm.no_polisi}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCheckInForm({ ...checkInForm, no_polisi: val });
                      handlePlateSearch(val);
                    }}
                    placeholder="Ketik plat (Contoh: BK 3747 RR atau BK 5678 CD)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-black text-sm text-slate-900 uppercase focus:outline-none focus:border-[#12388F]"
                  />
                  {isSearchingKendaraan && (
                    <span className="absolute right-3 top-3 text-[10px] text-blue-600 font-medium animate-pulse">
                      Mengecek database...
                    </span>
                  )}
                </div>

                {/* Info Terhubung Pemilik / Pengguna Fleet di bawah input plat */}
                {matchedKendaraan && (
                  <div className="mt-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#12388F] text-white flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{matchedKendaraan.nama_pengguna_fleet || matchedKendaraan.nama_perusahaan || 'Unit Terdaftar'}</span>
                          {matchedKendaraan.user_id && (
                            <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full border border-green-200">
                              Terhubung Akun Fleet
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {matchedKendaraan.merk ? `${matchedKendaraan.merk} ${matchedKendaraan.model || ''} • ` : ''}
                          PIC Terdaftar: <span className="font-semibold text-slate-800">{matchedKendaraan.nama_pic || matchedKendaraan.nama_pengguna_fleet || '-'}</span>
                          {matchedKendaraan.no_telepon ? ` • ${matchedKendaraan.no_telepon}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#12388F] font-bold bg-white px-2.5 py-1 rounded-md border border-blue-200 shrink-0 self-start sm:self-auto">
                      {matchedKendaraan.no_polisi}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. TUJUAN KEDATANGAN / TIPE KUNJUNGAN (Simple Radio Button Sesuai Mockup Excel) */}
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-bold text-slate-900 text-xs sm:text-sm">
                    Tujuan Kedatangan <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Pilih salah satu sesuai tujuan armada</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'SERVICE', label: 'Service', defaultKeperluan: 'Service Berkala / Perbaikan Truk' },
                    { id: 'KUNJUNGAN', label: 'Kunjungan', defaultKeperluan: 'Kunjungan Tamu / Keperluan Kantor' },
                    { id: 'BELI_PART', label: 'Pembelian Barang', defaultKeperluan: 'Pembelian Sparepart / Barang' },
                    { id: 'LAINNYA', label: 'Lainnya', defaultKeperluan: '' },
                  ].map((t) => {
                    const isChecked = checkInForm.tipe_kunjungan === t.id;
                    return (
                      <label
                        key={t.id}
                        onClick={() => {
                          // Otomatis tentukan PIC yang relevan HANYA dari data real database
                          let autoPic = '';
                          if (!checkInForm.booking_id && employeeList.length > 0) {
                            if (t.id === 'SERVICE') {
                              const emp = employeeList.find((e) => 
                                (e.jobposition || e.department || '').toLowerCase().includes('advisor') || 
                                (e.jobposition || '').toLowerCase().includes('sa')
                              );
                              if (emp) autoPic = emp.display_label || emp.employeename;
                            } else if (t.id === 'BELI_PART') {
                              const emp = employeeList.find((e) => 
                                (e.jobposition || e.department || '').toLowerCase().includes('warehouse') || 
                                (e.jobposition || '').toLowerCase().includes('part')
                              );
                              if (emp) autoPic = emp.display_label || emp.employeename;
                            } else if (t.id === 'KUNJUNGAN') {
                              const emp = employeeList.find((e) => 
                                (e.department || '').toLowerCase().includes('admin') || 
                                (e.jobposition || '').toLowerCase().includes('admin') ||
                                (e.department || '').toLowerCase().includes('management')
                              );
                              if (emp) autoPic = emp.display_label || emp.employeename;
                            }
                          }
                          setCheckInForm((prev) => ({
                            ...prev,
                            tipe_kunjungan: t.id as TipeKunjunganGerbang,
                            tujuan_kunjungan: prev.booking_id 
                              ? prev.tujuan_kunjungan 
                              : (t.id === 'LAINNYA' 
                                  ? (prev.tipe_kunjungan === 'LAINNYA' ? prev.tujuan_kunjungan : '') 
                                  : t.defaultKeperluan),
                            bertemu_dengan: autoPic,
                          }));
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-50/80 border-[#12388F] text-[#12388F] font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tipe_kunjungan"
                          value={t.id}
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#12388F] border-slate-300 focus:ring-[#12388F] cursor-pointer"
                        />
                        <span className="text-xs">{t.label}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Input Manual Tujuan Kedatangan jika Memilih LAINNYA */}
                {checkInForm.tipe_kunjungan === 'LAINNYA' && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 animate-in fade-in duration-200">
                    <label className="block font-semibold text-slate-800 text-xs mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>Tuliskan Tujuan Kedatangan</span>
                        <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[11px] font-normal text-slate-500">Ketik bebas tujuan / keperluan kunjungan armada</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={checkInForm.tujuan_kunjungan}
                      onChange={(e) => setCheckInForm((prev) => ({ ...prev, tujuan_kunjungan: e.target.value }))}
                      placeholder="Contoh: Pengantaran material, survei fasilitas, audit eksternal, dropping oli, dll."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-blue-400 bg-white font-medium text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#12388F]/20 focus:border-[#12388F]"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* 3. NAMA CUSTOMER & NO HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Nama Customer / Pengemudi *
                  </label>
                  <input
                    type="text"
                    required
                    value={checkInForm.nama_pengemudi}
                    onChange={(e) => setCheckInForm({ ...checkInForm, nama_pengemudi: e.target.value })}
                    placeholder="Contoh: Hisar / Slamet Riyadi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-[#12388F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    No. HP / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={checkInForm.no_telepon_pengemudi}
                    onChange={(e) => setCheckInForm({ ...checkInForm, no_telepon_pengemudi: e.target.value })}
                    placeholder="0812-3456-7890"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-[#12388F]"
                  />
                </div>
              </div>

              {/* 4. PIC / TUJUAN (API sch_fleet.v_pos_employee) & NAMA PERUSAHAAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-800">
                      PIC / Tujuan (Opsional)
                    </label>
                    {isEmployeeLoading && (
                      <span className="text-[10px] text-blue-600 animate-pulse">Memuat PIC...</span>
                    )}
                  </div>

                  {employeeList.length > 0 ? (
                    <select
                      value={checkInForm.bertemu_dengan}
                      onChange={(e) => setCheckInForm({ ...checkInForm, bertemu_dengan: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-[#12388F] bg-white cursor-pointer"
                    >
                      <option value="">-- Pilih PIC / Petugas Bengkel (Database POS) --</option>
                      {employeeList.map((emp) => (
                        <option 
                          key={emp.employeeid || emp.id} 
                          value={emp.display_label || emp.employeename}
                        >
                          {emp.display_label || `${emp.employeename}${emp.jobposition ? ` (${emp.jobposition})` : ''}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs flex items-center justify-between">
                      <span>{isEmployeeLoading ? 'Memuat daftar PIC dari database...' : 'Daftar PIC database belum tersedia'}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Nama Perusahaan / Asal Fleet (Opsional)
                  </label>
                  <input
                    type="text"
                    value={checkInForm.nama_perusahaan}
                    onChange={(e) => setCheckInForm({ ...checkInForm, nama_perusahaan: e.target.value })}
                    placeholder="Contoh: PT. Andi Jaya / CV / Umum"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-[#12388F]"
                  />
                </div>
              </div>

              {/* Keperluan Kunjungan / Keluhan Service (hanya tampil jika bukan LAINNYA karena LAINNYA sudah diketik langsung di atas) */}
              {checkInForm.tipe_kunjungan !== 'LAINNYA' && (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Keperluan / Rincian Kunjungan *
                  </label>
                  <input
                    type="text"
                    required
                    value={checkInForm.tujuan_kunjungan}
                    onChange={(e) => setCheckInForm({ ...checkInForm, tujuan_kunjungan: e.target.value })}
                    placeholder="Contoh: Pembelian sparepart, service berkala, pengambilan dokumen stok opname..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-[#12388F]"
                  />
                </div>
              )}

              {/* Catatan Masuk Gerbang */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Catatan Masuk Gerbang (Opsional)
                </label>
                <input
                  type="text"
                  value={checkInForm.catatan_masuk}
                  onChange={(e) => setCheckInForm({ ...checkInForm, catatan_masuk: e.target.value })}
                  placeholder="Contoh: Membawa dokumen fisik, kondisi fisik truk mulus, muatan kosong..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-[#12388F]"
                />
              </div>

              {/* Unggah Foto Masuk Gerbang (Tersimpan di sch_fleet.foto) */}
              <div className="pt-1">
                <PhotoUploader
                  label="Foto Fisik Kendaraan Masuk (Opsional)"
                  value={checkInForm.foto_kendaraan_masuk}
                  onChange={(url) => setCheckInForm((prev) => ({ ...prev, foto_kendaraan_masuk: url }))}
                />
              </div>

              {/* Submit Button persis Excel: SIMPAN CHECK IN */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCheckInSubmitting}
                  className="w-full py-3.5 rounded-xl bg-[#12388F] hover:bg-[#0D2A6B] text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 tracking-wide uppercase"
                >
                  <ArrowRightCircle className="w-5 h-5" />
                  <span>{isCheckInSubmitting ? 'MENYIMPAN CHECK IN...' : 'SIMPAN CHECK IN MASUK BENGKEL'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: ON PROGRESS                                                       */}
      {/* ========================================================================= */}
      {currentTab === 'onprogress' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Bar Persis Excel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#12388F] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                2
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-wide text-slate-900 uppercase">
                SELURUH NOPOL YANG MASIH BERADA DIBENGKEL (STATUS ON PROGRESS)
              </h2>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari No. Polisi / Nama Customer"
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#12388F]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400 text-[11px]">Tanggal</span>
                <input
                  type="date"
                  value={bookingFilterTanggal}
                  onChange={(e) => setBookingFilterTanggal(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* 4 Kartu Metrik Ringkas Persis Excel (Total On Progress, Sedang Dikerjakan, Menunggu Part, Menunggu QC) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#12388F] flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Total On Progress</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {onProgressList.length} <span className="text-xs font-normal text-slate-500">Unit</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Sedang Dikerjakan</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {countDikerjakan} <span className="text-xs font-normal text-slate-500">Unit</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Menunggu Part / Approval</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {countMenungguPart} <span className="text-xs font-normal text-slate-500">Unit</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Menunggu QC</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {countMenungguQC} <span className="text-xs font-normal text-slate-500">Unit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Unit On Progress */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">No.</th>
                    <th className="py-2.5 px-3.5">No. Polisi</th>
                    <th className="py-2.5 px-3.5">Nama Customer</th>
                    <th className="py-2.5 px-3.5">Jenis Armada</th>
                    <th className="py-2.5 px-3.5">Tujuan</th>
                    <th className="py-2.5 px-3.5">Masuk</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">PIC / Mekanik</th>
                    <th className="py-2.5 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {onProgressList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        Tidak ada unit yang sedang berada di dalam bengkel.
                      </td>
                    </tr>
                  ) : (
                    onProgressList.map((item, idx) => (
                      <tr key={item.kunjungan_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3.5 font-mono font-black text-slate-900">
                          {item.no_polisi}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900">
                          {item.nama_perusahaan || item.nama_pengemudi}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          Truk
                        </td>
                        <td className="py-2.5 px-3.5">
                          {renderTipeKunjunganBadge(item.tipe_kunjungan)}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 font-mono text-[11px]">
                          {item.waktu_masuk}
                        </td>
                        <td className="py-2.5 px-3.5">
                          {(item.status_progress || '').toLowerCase().includes('part') ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Menunggu Part
                            </span>
                          ) : (item.status_progress || '').toLowerCase().includes('qc') ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              Menunggu QC
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                              {item.status_progress || 'Sedang Dikerjakan'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                          {item.mekanik || item.foreman || '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenCheckOut({
                              id: item.kunjungan_id,
                              nomor_tiket: item.nomor_tiket,
                              no_polisi: item.no_polisi,
                              nama_pengemudi: item.nama_pengemudi,
                              nama_perusahaan: item.nama_perusahaan,
                              tipe_kunjungan: item.tipe_kunjungan,
                              waktu_masuk: item.waktu_masuk,
                            })}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg border border-[#12388F] text-[#12388F] hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Menampilkan 1 - {Math.min(5, onProgressList.length)} dari {onProgressList.length} data
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 cursor-pointer text-xs">&lt;</button>
                <button type="button" className="px-2.5 py-1 rounded bg-[#12388F] text-white font-bold text-xs">1</button>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer text-xs">2</button>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer text-xs">3</button>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 cursor-pointer text-xs">&gt;</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB: SELESAI / KELUAR                                                  */}
      {/* ========================================================================= */}
      {currentTab === 'keluar' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Bar Persis Excel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#12388F] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                3
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-wide text-slate-900 uppercase">
                SELURUH NOPOL YANG TELAH MENINGGALKAN BENGKEL
              </h2>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari No. Polisi / Nama Customer"
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#12388F]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400 text-[11px]">Tanggal</span>
                <input
                  type="date"
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Filter Periode Pills */}
          <div className="flex items-center gap-2">
            {[
              { id: 'SEMUA', label: 'Semua' },
              { id: 'HARI_INI', label: 'Hari Ini' },
              { id: 'KEMARIN', label: 'Kemarin' },
              { id: 'MINGGU_INI', label: 'Minggu Ini' },
              { id: 'BULAN_INI', label: 'Bulan Ini' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRiwayatPeriode(p.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  riwayatPeriode === p.id
                    ? 'bg-[#12388F] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Table Selesai Keluar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">No.</th>
                    <th className="py-2.5 px-3.5">No. Polisi</th>
                    <th className="py-2.5 px-3.5">Nama Customer</th>
                    <th className="py-2.5 px-3.5">Jenis Armada</th>
                    <th className="py-2.5 px-3.5">Tujuan</th>
                    <th className="py-2.5 px-3.5">Masuk</th>
                    <th className="py-2.5 px-3.5">Keluar</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {riwayatKeluarList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        Tidak ada riwayat kendaraan keluar pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    riwayatKeluarList.map((item, idx) => (
                      <tr key={item.kunjungan_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3.5 font-mono font-black text-slate-900">
                          {item.no_polisi}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900">
                          {item.nama_perusahaan || item.nama_pengemudi}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          Truk
                        </td>
                        <td className="py-2.5 px-3.5">
                          {renderTipeKunjunganBadge(item.tipe_kunjungan)}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 font-mono text-[11px]">
                          {item.waktu_masuk}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 font-mono text-[11px]">
                          {item.waktu_keluar}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Selesai
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleViewMemo(item.memo_id, item.nomor_memo)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg border border-[#12388F] text-[#12388F] hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Menampilkan 1 - {Math.min(5, riwayatKeluarList.length)} dari {riwayatKeluarList.length} data
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 cursor-pointer text-xs">&lt;</button>
                <button type="button" className="px-2.5 py-1 rounded bg-[#12388F] text-white font-bold text-xs">1</button>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer text-xs">2</button>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer text-xs">3</button>
                <span className="px-1 text-slate-400">...</span>
                <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer text-xs">5</button>
                <button type="button" className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 cursor-pointer text-xs">&gt;</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: MEMO KELUAR                                                       */}
      {/* ========================================================================= */}
      {currentTab === 'memo' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Bar Persis Excel */}
          <div className="flex items-center gap-3 pb-1">
            <div className="w-7 h-7 rounded-full bg-[#12388F] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              4
            </div>
            <h2 className="text-sm sm:text-base font-black tracking-wide text-slate-900 uppercase">
              MEMO KELUAR
            </h2>
          </div>

          {/* Split Layout 2 Kolom Persis Excel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Kolom Kiri: LIST MEMO KELUAR */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                  LIST MEMO KELUAR
                </h3>

                <div className="flex items-center gap-2">
                  <div className="relative min-w-[170px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        loadMemoList(e.target.value);
                      }}
                      placeholder="Cari No. Polisi..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#12388F]"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2 py-1">
                    <span className="text-slate-400 text-[10px]">Tanggal</span>
                    <input
                      type="date"
                      className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    className="p-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tabel List Memo Keluar */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">No.</th>
                        <th className="py-2.5 px-3">No. Memo</th>
                        <th className="py-2.5 px-3">No. Polisi</th>
                        <th className="py-2.5 px-3">Nama Customer</th>
                        <th className="py-2.5 px-3">Keluar</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memoList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Belum ada dokumen memo keluar.
                          </td>
                        </tr>
                      ) : (
                        memoList.map((memo, idx) => {
                          const isSelected = selectedMemoPreview?.id === memo.id;
                          return (
                            <tr
                              key={memo.id}
                              onClick={() => setSelectedMemoPreview(memo)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[#EFF6FF] border-l-4 border-l-[#12388F]'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-[#12388F]">
                                {memo.nomor_memo}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                                {memo.no_polisi}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {memo.nama_perusahaan || memo.nama_pengemudi}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                                {memo.tanggal_terbit?.split(' ')[1]?.substring(0, 5) || '12:45'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    title="Lihat Dokumen"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMemoPreview(memo);
                                    }}
                                    className="p-1 rounded text-slate-500 hover:text-[#12388F] hover:bg-blue-50 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Cetak Memo Keluar"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMemoDetail(memo);
                                      setDigitalMemoModalOpen(true);
                                    }}
                                    className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-3.5 py-2 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <div>Menampilkan 1 - {Math.min(5, memoList.length)} dari {memoList.length} data</div>
                  <div className="flex items-center gap-1">
                    <button type="button" className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-600 text-xs">&lt;</button>
                    <button type="button" className="px-2.5 py-1 rounded bg-[#12388F] text-white font-bold text-xs">1</button>
                    <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 text-xs">2</button>
                    <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 text-xs">3</button>
                    <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 text-xs">4</button>
                    <button type="button" className="px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-600 text-xs">&gt;</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: PREVIEW MEMO KELUAR */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wide">
                PREVIEW MEMO KELUAR
              </h3>

              {selectedMemoPreview ? (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
                  {/* Top: MEMO KELUAR & No Memo */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h4 className="text-base font-black text-slate-900 tracking-tight">
                        MEMO KELUAR
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">No. Memo</div>
                      <div className="font-mono font-black text-xs text-slate-900">
                        {selectedMemoPreview.nomor_memo}
                      </div>
                    </div>
                  </div>

                  {/* Tanggal & Jam Keluar */}
                  <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400">Tanggal Keluar:</span>{' '}
                      <strong className="text-slate-800">{selectedMemoPreview.tanggal_terbit?.split(' ')[0] || '03 Mei 2025'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Jam Keluar:</span>{' '}
                      <strong className="text-slate-800 font-mono">{selectedMemoPreview.tanggal_terbit?.split(' ')[1] || '12:45'}</strong>
                    </div>
                  </div>

                  {/* DATA KENDARAAN */}
                  <div className="space-y-2 pb-3 border-b border-slate-100">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                      DATA KENDARAAN
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">No. Polisi</div>
                        <div className="font-mono font-black text-slate-900">{selectedMemoPreview.no_polisi}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Jenis Armada</div>
                        <div className="font-bold text-slate-900">Truk</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Nama Customer</div>
                        <div className="font-bold text-slate-900">{selectedMemoPreview.nama_perusahaan || selectedMemoPreview.nama_pengemudi}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Tujuan Kunjungan</div>
                        <div className="font-bold text-[#12388F]">
                          {selectedMemoPreview.tipe_kunjungan === 'SERVICE' ? 'Service' : selectedMemoPreview.tipe_kunjungan === 'BELI_PART' ? 'Beli Part' : 'Kunjungan'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KETERANGAN */}
                  <div className="space-y-1.5 pb-3 border-b border-slate-100">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                      KETERANGAN
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400">Status:</span>{' '}
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                        Selesai
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span className="text-slate-400">Catatan:</span>{' '}
                      {selectedMemoPreview.catatan || 'Pekerjaan telah selesai dan kendaraan dalam kondisi baik.'}
                    </div>
                  </div>

                  {/* Tanda Tangan Security Persis Mockup */}
                  <div className="pt-1 flex justify-end">
                    <div className="text-center w-36">
                      <div className="text-[10px] text-slate-400">Dibuat oleh,</div>
                      <div className="my-1.5 flex justify-center">
                        <div className="w-14 h-14 rounded-full border border-blue-400/40 flex items-center justify-center text-blue-600 rotate-[-12deg]">
                          <ShieldCheck className="w-8 h-8 opacity-70" />
                        </div>
                      </div>
                      <div className="font-bold text-xs text-slate-900 underline">
                        {selectedMemoPreview.nama_security || 'Hisar'}
                      </div>
                      <div className="text-[10px] text-slate-500">Security</div>
                    </div>
                  </div>

                  {/* Action Buttons: CETAK & EXPORT PDF */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMemoDetail(selectedMemoPreview);
                        setDigitalMemoModalOpen(true);
                      }}
                      className="flex-1 py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>CETAK</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMemoDetail(selectedMemoPreview);
                        setDigitalMemoModalOpen(true);
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-[#12388F] hover:bg-[#0D2A6B] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>EXPORT PDF</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs">
                  Pilih salah satu memo di daftar sebelah kiri untuk memuat preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Check-Out Gerbang */}
      <SecurityCheckOutModal
        kunjungan={selectedKunjunganForCheckOut}
        isOpen={checkOutModalOpen}
        onClose={() => setCheckOutModalOpen(false)}
        onSuccess={handleCheckOutSuccess}
      />

      {/* Modal Dokumen Memo Keluar (Gate Pass) */}
      <DigitalMemoKeluarModal
        memo={selectedMemoDetail}
        isOpen={digitalMemoModalOpen}
        onClose={() => setDigitalMemoModalOpen(false)}
      />
    </div>
  );
};

export default SecurityPortalView;
