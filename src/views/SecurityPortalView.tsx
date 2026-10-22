import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
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
  Download,
  Users,
  MoreHorizontal,
  RotateCcw,
  Loader2
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
import { realtimeHub } from '../services/realtimeService';
import { isTanggalSamaHariIni } from '../utils/tanggal';

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

// ── Komponen bantu form Check In (portal Security) ───────────────────────────
// Blok bernomor: nomornya menyampaikan urutan kerja nyata petugas gerbang
// (baca plat → tentukan jenis → catat orang → rincian & foto).
const CheckInSection: React.FC<{
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ step, title, hint, children }) => (
  <section className="space-y-3.5">
    <div className="flex items-center gap-2.5 border-b border-border pb-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-black tabular-nums text-white">
        {step}
      </span>
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink sm:text-sm">{title}</h3>
      {hint && <span className="ml-auto hidden text-[11px] text-ink-subtle sm:inline">{hint}</span>}
    </div>
    {children}
  </section>
);

const CHECKIN_FIELD_CLASS =
  'w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-subtle transition-colors focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:text-sm';

const CHECKIN_LABEL_CLASS = 'mb-1.5 block text-xs font-semibold text-ink';

interface SecurityTablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const SecurityTablePagination: React.FC<SecurityTablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startCount = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endCount = Math.min(safeCurrentPage * pageSize, totalItems);

  const renderPageButtons = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }).map((_, i) => {
        const pageNum = i + 1;
        const isActive = safeCurrentPage === pageNum;
        return (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
              isActive
                ? 'bg-[#12388F] text-white'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {pageNum}
          </button>
        );
      });
    }

    const pages: (number | string)[] = [];
    if (safeCurrentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
    }

    return pages.map((p, idx) => {
      if (typeof p === 'string') {
        return (
          <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-xs select-none">
            ...
          </span>
        );
      }
      const isActive = safeCurrentPage === p;
      return (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
            isActive
              ? 'bg-[#12388F] text-white'
              : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {p}
        </button>
      );
    });
  };

  return (
    <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
      <div>
        Menampilkan {startCount} - {endCount} dari {totalItems} data
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer text-xs"
          >
            &lt;
          </button>
          {renderPageButtons()}
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer text-xs"
          >
            &gt;
          </button>
        </div>
      ) : totalItems > 0 ? (
        <span className="text-[11px] text-slate-400 font-medium">Halaman 1 dari 1</span>
      ) : null}
    </div>
  );
};

export const SecurityPortalView: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeTab, setActiveTab, authUser } = useAppStore();

  // Internal tab state: 'dashboard' | 'booking' | 'checkin' | 'onprogress' | 'keluar' | 'memo'
  const currentTab = activeTab.replace('security-', '');

  const [searchQuery, setSearchQuery] = useState('');
  const [riwayatPeriode, setRiwayatPeriode] = useState<'HARI_INI' | 'KEMARIN' | 'MINGGU_INI' | 'BULAN_INI' | 'SEMUA'>('HARI_INI');

  // Shared PAGE_SIZE untuk semua tabel pos security
  const SECURITY_TABLE_PAGE_SIZE = 10;

  // Filter tanggal per tab
  const [bookingFilterTanggal, setBookingFilterTanggal] = useState<string>('');
  const [onProgressFilterTanggal, setOnProgressFilterTanggal] = useState<string>('');
  const [checkoutFilterTanggal, setCheckoutFilterTanggal] = useState<string>('');
  const [checkoutSearch, setCheckoutSearch] = useState<string>('');
  const [riwayatFilterTanggal, setRiwayatFilterTanggal] = useState<string>('');
  const [memoFilterTanggal, setMemoFilterTanggal] = useState<string>('');

  // Current page per tab
  const [bookingCurrentPage, setBookingCurrentPage] = useState<number>(1);
  const [onProgressCurrentPage, setOnProgressCurrentPage] = useState<number>(1);
  const [checkoutCurrentPage, setCheckoutCurrentPage] = useState<number>(1);
  const [riwayatCurrentPage, setRiwayatCurrentPage] = useState<number>(1);
  const [memoCurrentPage, setMemoCurrentPage] = useState<number>(1);
  const [selectedBooking, setSelectedBooking] = useState<SecurityBookingItem | null>(null);
  const [viewingBookingDetail, setViewingBookingDetail] = useState<SecurityBookingItem | null>(null);
  const [bookingDetailModalOpen, setBookingDetailModalOpen] = useState<boolean>(false);
  const [viewingProgressDetail, setViewingProgressDetail] = useState<SecurityOnProgressItem | null>(null);
  const [progressDetailModalOpen, setProgressDetailModalOpen] = useState<boolean>(false);
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

  // Karena komponen tidak lagi di-remount saat pindah tab internal, posisi
  // scroll container perlu dikembalikan ke atas secara manual.
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentTab]);

  // Modal Checkout & Memo states
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [selectedKunjunganForCheckOut, setSelectedKunjunganForCheckOut] = useState<any>(null);

  const [digitalMemoModalOpen, setDigitalMemoModalOpen] = useState(false);
  const [selectedMemoDetail, setSelectedMemoDetail] = useState<MemoKeluarItem | null>(null);

  // Master Employee PIC dari API (sch_pos.tbl_employee via sch_fleet.v_pos_employee)
  const { data: employeeList = [], isLoading: isEmployeeLoading } = useQuery({
    queryKey: ['master-employees'],
    queryFn: () => api.getMasterEmployee(),
    staleTime: 300000,
  });

  // Queries TanStack React Query (instan saat pindah-pindah tab, background revalidation)
  const { data: rawStats } = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: () => api.getSecurityDashboardStats(),
    staleTime: 5000,
    refetchInterval: 8000,
  });

  const { data: bookingList = [] } = useQuery({
    queryKey: ['security-booking-list'],
    queryFn: () => api.getSecurityBookingList(),
    staleTime: 5000,
    refetchInterval: 5000,
  });

  const { data: onProgressList = [] } = useQuery({
    queryKey: ['security-onprogress'],
    queryFn: () => api.getSecurityOnProgress(),
    staleTime: 5000,
    refetchInterval: 8000,
  });

  const { data: siapCheckOutList = [] } = useQuery({
    queryKey: ['security-siap-checkout'],
    queryFn: () => api.getSecuritySiapCheckOut(),
    staleTime: 5000,
    refetchInterval: 8000,
  });

  const { data: riwayatKeluarList = [] } = useQuery({
    queryKey: ['security-riwayat-keluar', riwayatPeriode],
    queryFn: () => api.getSecurityRiwayatKeluar(riwayatPeriode),
    staleTime: 15000,
    refetchInterval: 15000,
  });

  const { data: memoList = [] } = useQuery({
    queryKey: ['security-memo'],
    queryFn: () => api.getSecurityMemoKeluar(),
    staleTime: 15000,
    refetchInterval: 15000,
  });

  // Perhitungan statistik dashboard yang reaktif dan akurat
  // Catatan: perbandingan tanggal memakai hari lokal (WIB) via isTanggalSamaHariIni,
  // bukan toISOString() yang berbasis UTC (bisa meleset antara 00:00-07:00 WIB).
  const activeBookingsCount = useMemo(() => {
    return bookingList.filter(
      (b) =>
        isTanggalSamaHariIni(b.tanggal_booking) &&
        !b.sudah_checkin &&
        b.status !== 'Check In' &&
        b.status !== 'Dibatalkan'
    ).length;
  }, [bookingList]);

  const stats: SecurityDashboardStats = useMemo(() => ({
    total_masuk_hari_ini: rawStats?.total_masuk_hari_ini ?? 0,
    total_di_dalam: rawStats?.total_di_dalam ?? 0,
    total_siap_keluar: Math.max(rawStats?.total_siap_keluar ?? 0, siapCheckOutList.length),
    total_booking_hari_ini:
      rawStats?.total_booking_hari_ini && rawStats.total_booking_hari_ini > 0
        ? rawStats.total_booking_hari_ini
        : activeBookingsCount,
    total_keluar_hari_ini: rawStats?.total_keluar_hari_ini ?? 0,
  }), [rawStats, activeBookingsCount, siapCheckOutList.length]);

  // Helper: Format label PIC dengan jabatan/jobposition dari database
  const getEmployeeDisplayLabel = (emp?: MasterEmployee | null) => {
    if (!emp) return '';
    if (emp.display_label) return emp.display_label;
    const name = emp.employeename || emp.nama_karyawan || emp.employeeid || '';
    const pos = emp.jobposition || emp.jabatan || emp.department || '';
    return pos ? `${name} (${pos})` : name;
  };

  // Lookup Kendaraan & Terhubung Pengguna Fleet (sch_pos.tbl_member_unit via sch_fleet.v_kendaraan_lookup)
  const [matchedKendaraan, setMatchedKendaraan] = useState<KendaraanLookup | null>(null);
  const [isSearchingKendaraan, setIsSearchingKendaraan] = useState(false);

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

  // Sinkronisasi otomatis nilai form check in dari data Booking
  const populateCheckInFromBooking = (booking: SecurityBookingItem) => {
    setSelectedBooking(booking);
    const sa = employeeList.find((e) => (e.jobposition || e.department || '').toLowerCase().includes('advisor'));
    const keperluanStr = booking.jenis_layanan
      ? `Service Booking: ${booking.jenis_layanan}${booking.keluhan ? ` - ${booking.keluhan}` : ''}`
      : 'Service Berkala / Perbaikan Truk';

    setCheckInForm({
      tipe_kunjungan: 'SERVICE',
      booking_id: booking.booking_id,
      no_polisi: booking.no_polisi || '',
      nama_pengemudi: booking.nama_pic || booking.nama_pelanggan || '',
      no_telepon_pengemudi: booking.no_telepon || '',
      nama_perusahaan: booking.nama_pelanggan || '',
      tujuan_kunjungan: keperluanStr,
      bertemu_dengan: sa ? getEmployeeDisplayLabel(sa) : '',
      catatan_masuk: booking.catatan || '',
      foto_kendaraan_masuk: '',
    });

    if (booking.no_polisi) {
      handlePlateSearch(booking.no_polisi);
    }
  };

  // Pilih jenis kunjungan: isi keperluan default & PIC relevan (hanya dari data real database)
  const applyTipeKunjungan = (tipeId: TipeKunjunganGerbang, defaultKeperluan: string) => {
    let autoPic = '';
    if (!checkInForm.booking_id && employeeList.length > 0) {
      if (tipeId === 'SERVICE') {
        const emp = employeeList.find(
          (e) =>
            (e.jobposition || e.department || '').toLowerCase().includes('advisor') ||
            (e.jobposition || '').toLowerCase().includes('sa')
        );
        if (emp) autoPic = getEmployeeDisplayLabel(emp);
      } else if (tipeId === 'BELI_PART') {
        const emp = employeeList.find(
          (e) =>
            (e.jobposition || e.department || '').toLowerCase().includes('warehouse') ||
            (e.jobposition || '').toLowerCase().includes('part')
        );
        if (emp) autoPic = getEmployeeDisplayLabel(emp);
      } else if (tipeId === 'KUNJUNGAN') {
        const emp = employeeList.find(
          (e) =>
            (e.department || '').toLowerCase().includes('admin') ||
            (e.jobposition || '').toLowerCase().includes('admin') ||
            (e.department || '').toLowerCase().includes('management')
        );
        if (emp) autoPic = getEmployeeDisplayLabel(emp);
      }
    }

    setCheckInForm((prev) => ({
      ...prev,
      tipe_kunjungan: tipeId,
      tujuan_kunjungan: prev.booking_id
        ? prev.tujuan_kunjungan
        : tipeId === 'LAINNYA'
          ? (prev.tipe_kunjungan === 'LAINNYA' ? prev.tujuan_kunjungan : '')
          : defaultKeperluan,
      bertemu_dengan: autoPic,
    }));
  };

  // Reset Form Check In ke kondisi awal (bersih/walk-in manual)
  const resetCheckInForm = () => {
    setSelectedBooking(null);
    setMatchedKendaraan(null);
    const sa = employeeList.find((e) => (e.jobposition || e.department || '').toLowerCase().includes('advisor'));
    setCheckInForm({
      tipe_kunjungan: 'SERVICE',
      booking_id: null,
      no_polisi: '',
      nama_pengemudi: '',
      no_telepon_pengemudi: '',
      nama_perusahaan: '',
      tujuan_kunjungan: 'Service Berkala / Perbaikan Truk',
      bertemu_dengan: sa ? getEmployeeDisplayLabel(sa) : '',
      catatan_masuk: '',
      foto_kendaraan_masuk: '',
    });
  };

  // Auto-set Service Advisor jika form belum memiliki PIC
  useEffect(() => {
    if (!checkInForm.bertemu_dengan && checkInForm.tipe_kunjungan === 'SERVICE' && employeeList.length > 0) {
      const sa = employeeList.find((e) => (e.jobposition || e.department || '').toLowerCase().includes('advisor'));
      if (sa) {
        setCheckInForm((prev) => ({ ...prev, bertemu_dengan: getEmployeeDisplayLabel(sa) }));
      }
    }
  }, [employeeList, checkInForm.bertemu_dengan, checkInForm.tipe_kunjungan]);

  // Subscribe ke event realtime SSE (Booking baru dari customer, status check in, spk, memo dll.)
  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((evt) => {
      if (
        evt.type === 'BOOKING_CREATED' ||
        evt.type === 'VEHICLE_CHECKED_IN' ||
        evt.type === 'VEHICLE_CHECKED_OUT' ||
        evt.type === 'MEMO_TERBIT' ||
        evt.type === 'SPK_STATUS_CHANGED'
      ) {
        queryClient.invalidateQueries({ queryKey: ['security-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['security-booking-list'] });
        queryClient.invalidateQueries({ queryKey: ['security-onprogress'] });
        queryClient.invalidateQueries({ queryKey: ['security-siap-checkout'] });
        queryClient.invalidateQueries({ queryKey: ['security-riwayat-keluar'] });
        queryClient.invalidateQueries({ queryKey: ['security-memo'] });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  // Handle Pilih & Isi Otomatis dari Booking
  const handlePilihBooking = (booking: SecurityBookingItem) => {
    populateCheckInFromBooking(booking);
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

      // Reset form ke kondisi awal
      resetCheckInForm();

      // Invalidate cache and switch to On Progress tab
      queryClient.invalidateQueries({ queryKey: ['security-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['security-booking-list'] });
      queryClient.invalidateQueries({ queryKey: ['security-onprogress'] });
      queryClient.invalidateQueries({ queryKey: ['security-siap-checkout'] });
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
    queryClient.invalidateQueries({ queryKey: ['security-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['security-onprogress'] });
    queryClient.invalidateQueries({ queryKey: ['security-siap-checkout'] });
    queryClient.invalidateQueries({ queryKey: ['security-riwayat-keluar'] });
    queryClient.invalidateQueries({ queryKey: ['security-memo'] });
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

  // Buka detail memo dalam bentuk modal preview siap cetak
  const handleViewMemo = async (memoId: number, memoNo?: string) => {
    // Cari data langsung dari memoList jika sudah ada agar instan
    const localMemo = memoList.find((m) => m.id === memoId || (memoNo && m.nomor_memo === memoNo));
    if (localMemo) {
      setSelectedMemoDetail(localMemo);
      setDigitalMemoModalOpen(true);
    }
    try {
      const detail = await api.getSecurityMemoDetail({ id: memoId, nomor_memo: memoNo });
      if (detail) {
        setSelectedMemoDetail(detail);
        setDigitalMemoModalOpen(true);
      }
    } catch (err: any) {
      if (!localMemo) {
        toast.error('Gagal memuat detail memo keluar.');
      }
    }
  };

  // Metrics for Screen 2 (On Progress) - Data real tanpa dummy fallback
  const countDikerjakan = onProgressList.filter(
    (x) =>
      (x.status_progress || '').toLowerCase().includes('dikerjakan') ||
      (x.status_progress || '').toLowerCase().includes('kerja')
  ).length;

  const countMenungguPart = onProgressList.filter(
    (x) =>
      (x.status_progress || '').toLowerCase().includes('part') ||
      (x.status_progress || '').toLowerCase().includes('approval') ||
      (x.status_progress || '').toLowerCase().includes('tunggu')
  ).length;

  const countMenungguQC = onProgressList.filter(
    (x) => (x.status_progress || '').toLowerCase().includes('qc')
  ).length;

  // ── Bantu form Check In ────────────────────────────────────────────────────
  // Booking aktif (belum check-in) untuk tautan cepat di formulir gerbang.
  const activeBookingOptions = bookingList.filter((b) => !b.sudah_checkin);
  // Plat tanpa spasi untuk indikator status lookup (selaras ambang handlePlateSearch).
  const cleanPlateInput = checkInForm.no_polisi.replace(/\s+/g, '').toUpperCase();

  return (
    <div className="space-y-6 font-sans">
      {/* Banner Identitas Petugas & Header Pos (Warna Biru Customer Fleet #1D4ED8) */}
      {/* Pola copy disamakan dengan banner dashboard portal Customer Fleet:
          badge label, sapaan pengguna, lalu satu kalimat penjelas fungsi. */}
      <div className="rounded-xl p-5 sm:p-6 shadow-sm border-0 bg-[#1D4ED8] text-white dark:bg-[#1B42B8]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold mb-2 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
          <span>Portal Operasional Pos Security KIM 3</span>
        </div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
          Selamat Datang, {authUser?.nama_lengkap || 'Petugas Security'}
        </h1>
        <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed font-normal">
          Kelola kendaraan masuk, pantau pengerjaan di bengkel, dan verifikasi gate pass kendaraan keluar secara realtime.
        </p>
        <p className="text-[11px] text-white/70 mt-1 max-w-xl leading-relaxed font-normal">
          {authUser?.nama_perusahaan || 'Master Truck'} &bull; Pos Gerbang Utama &bull; Kawasan Industri Medan III (KIM 3) &bull; {authUser?.email || 'security@mastertruck.co.id'}
        </p>
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
              onClick={() => setActiveTab('security-checkout')}
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

            {/* Filter Controls (Cari, Tanggal, Filter) */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setBookingCurrentPage(1);
                  }}
                  placeholder="Cari No. Polisi / Nama Customer"
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#12388F]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400 text-[11px]">Tanggal</span>
                <input
                  type="date"
                  value={bookingFilterTanggal}
                  onChange={(e) => {
                    setBookingFilterTanggal(e.target.value);
                    setBookingCurrentPage(1);
                  }}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setBookingFilterTanggal('');
                  setBookingCurrentPage(1);
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
                    <th className="py-2.5 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filtered = bookingList.filter((b) => {
                      // Jangan tampilkan armada yang sudah check-in di list booking gerbang
                      if (b.sudah_checkin) return false;
                      const matchSearch =
                        !searchQuery ||
                        b.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.nama_pelanggan.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.no_booking.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchDate =
                        !bookingFilterTanggal || b.tanggal_booking === bookingFilterTanggal;
                      return matchSearch && matchDate;
                    });
                    const totalPages = Math.max(1, Math.ceil(filtered.length / SECURITY_TABLE_PAGE_SIZE));
                    const currentPage = Math.min(Math.max(1, bookingCurrentPage), totalPages);
                    const startIndex = (currentPage - 1) * SECURITY_TABLE_PAGE_SIZE;
                    const pageItems = filtered.slice(startIndex, startIndex + SECURITY_TABLE_PAGE_SIZE);

                    if (pageItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400 text-xs font-medium">
                            Tidak ada data reservasi booking aktif yang sesuai.
                          </td>
                        </tr>
                      );
                    }

                    return pageItems.map((b, idx) => {
                      const isSelected = selectedBooking?.booking_id === b.booking_id;
                      return (
                        <tr
                          key={b.booking_id}
                          onClick={() => {
                            setViewingBookingDetail(b);
                            setBookingDetailModalOpen(true);
                          }}
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3.5 font-semibold text-slate-500">{startIndex + idx + 1}</td>
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
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Check In
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Confirmed
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingBookingDetail(b);
                                  setBookingDetailModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#12388F] text-[#12388F] hover:bg-[#12388F] hover:text-white transition-colors cursor-pointer shadow-2xs"
                                title="Lihat detail reservasi booking"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>
                              {!b.sudah_checkin ? (
                                <button
                                  type="button"
                                  onClick={() => handlePilihBooking(b)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#12388F] hover:bg-[#0D2A6B] text-white text-[11px] font-bold rounded-lg shadow-xs hover:shadow transition-all cursor-pointer"
                                  title="Proses Check In langsung untuk kendaraan ini"
                                >
                                  <ArrowRightCircle className="w-3.5 h-3.5" />
                                  <span>Check In</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Selesai Check In</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Dynamic Pagination Footer */}
            {(() => {
              const filtered = bookingList.filter((b) => {
                if (b.sudah_checkin) return false;
                const matchSearch =
                  !searchQuery ||
                  b.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  b.nama_pelanggan.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  b.no_booking.toLowerCase().includes(searchQuery.toLowerCase());
                const matchDate =
                  !bookingFilterTanggal || b.tanggal_booking === bookingFilterTanggal;
                return matchSearch && matchDate;
              });

              return (
                <SecurityTablePagination
                  currentPage={bookingCurrentPage}
                  totalItems={filtered.length}
                  pageSize={SECURITY_TABLE_PAGE_SIZE}
                  onPageChange={setBookingCurrentPage}
                />
              );
            })()}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: CHECK IN (FORMULIR UTAMA)                                         */}
      {/* ========================================================================= */}
      {currentTab === 'checkin' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <form
            onSubmit={handleCheckInSubmit}
            className="mx-auto max-w-4xl space-y-4 text-xs text-ink-muted"
          >
          <div className="space-y-6 rounded-2xl border border-border bg-surface-raised p-6 shadow-xs sm:p-8">
            {/* Kepala kartu */}
            <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                  <ArrowRightCircle className="h-4 w-4 text-accent" />
                  Check In
                </h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Pencatatan kedatangan armada booking, service walk-in, pembelian sparepart, atau kunjungan tamu
                </p>
              </div>
              {selectedBooking && (
                <span className="self-start rounded-full border border-accent/30 bg-accent-subtle px-3 py-1 text-xs font-bold text-accent sm:self-auto">
                  Tautan booking: {selectedBooking.no_booking}
                </span>
              )}
            </div>

            {/* 01 — ARMADA MASUK */}
            <CheckInSection step="01" title="Armada masuk" hint="Wajib — dibaca dari plat di gerbang">
              <div>
                <label htmlFor="checkin-nopol" className={CHECKIN_LABEL_CLASS}>
                  Nomor polisi kendaraan <span className="text-status-red">*</span>
                </label>
                <div className="relative">
                  <Truck className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
                  <input
                    id="checkin-nopol"
                    type="text"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    value={checkInForm.no_polisi}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const clean = val.replace(/\s+/g, '');
                      let currentBookingId = checkInForm.booking_id;
                      if (selectedBooking && selectedBooking.no_polisi.replace(/\s+/g, '').toUpperCase() !== clean) {
                        setSelectedBooking(null);
                        currentBookingId = null;
                      }

                      setCheckInForm((prev) => ({
                        ...prev,
                        no_polisi: val,
                        booking_id: currentBookingId,
                      }));
                      handlePlateSearch(val);

                      // Otomatis tautkan jika nopol cocok dengan data booking aktif
                      if (clean.length >= 4) {
                        const matchedB = bookingList.find(
                          (b) => !b.sudah_checkin && b.no_polisi.replace(/\s+/g, '').toUpperCase() === clean
                        );
                        if (matchedB && (!selectedBooking || selectedBooking.booking_id !== matchedB.booking_id)) {
                          populateCheckInFromBooking(matchedB);
                        }
                      }
                    }}
                    placeholder="BK 3747 RR"
                    className="w-full rounded-xl border-2 border-ink/20 bg-surface-raised py-3 pl-12 pr-4 font-mono text-base font-black uppercase tracking-[0.08em] text-ink transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-subtle focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:text-lg"
                  />
                </div>

                {/* Indikator status pencarian plat */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isSearchingKendaraan && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-status-blue/30 bg-status-blue-bg px-2 py-0.5 text-[11px] font-semibold text-status-blue">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Mencari di database fleet…
                    </span>
                  )}
                  {!isSearchingKendaraan && matchedKendaraan && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-status-green/30 bg-status-green-bg px-2 py-0.5 text-[11px] font-semibold text-status-green">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Terdaftar di database fleet
                    </span>
                  )}
                  {!isSearchingKendaraan && !matchedKendaraan && !selectedBooking && cleanPlateInput.length >= 3 && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-status-amber/30 bg-status-amber-bg px-2 py-0.5 text-[11px] font-semibold text-status-amber">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Belum terdaftar — lanjutkan sebagai walk-in atau periksa penulisan plat
                    </span>
                  )}
                </div>

                {/* Unit terdaftar beserta pemiliknya */}
                {matchedKendaraan && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-status-blue/25 bg-status-blue-bg p-3 animate-in fade-in duration-200 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-ink">
                          <span>{matchedKendaraan.nama_pengguna_fleet || matchedKendaraan.nama_perusahaan || 'Unit terdaftar'}</span>
                          {matchedKendaraan.user_id && (
                            <span className="rounded-full border border-status-green/30 bg-status-green-bg px-2 py-0.5 text-[10px] font-bold text-status-green">
                              Terhubung akun fleet
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink-muted">
                          {matchedKendaraan.merk ? `${matchedKendaraan.merk} ${matchedKendaraan.model || ''} • ` : ''}
                          PIC terdaftar: <span className="font-semibold text-ink">{matchedKendaraan.nama_pic || matchedKendaraan.nama_pengguna_fleet || '-'}</span>
                          {matchedKendaraan.no_telepon ? ` • ${matchedKendaraan.no_telepon}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 self-start rounded-md border border-border bg-surface-raised px-2.5 py-1 font-mono text-[10px] font-bold text-accent sm:self-auto">
                      {matchedKendaraan.no_polisi}
                    </span>
                  </div>
                )}

                {/* Tautkan reservasi booking */}
                {activeBookingOptions.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink">
                          Tautkan reservasi booking ({activeBookingOptions.length} aktif)
                        </div>
                        <div className="text-[10px] text-ink-subtle">
                          Pilih unit booking untuk isi otomatis, atau biarkan untuk walk-in
                        </div>
                      </div>
                    </div>
                    <div className="w-full min-w-0 sm:max-w-sm">
                      <select
                        value={selectedBooking?.booking_id || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            resetCheckInForm();
                          } else {
                            const found = bookingList.find((b) => b.booking_id === Number(val));
                            if (found) {
                              populateCheckInFromBooking(found);
                            }
                          }
                        }}
                        className="w-full cursor-pointer rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
                      >
                        <option value="">Check in walk-in manual (tanpa booking)</option>
                        {activeBookingOptions.map((b) => (
                          <option key={b.booking_id} value={b.booking_id}>
                            {b.no_polisi} • {b.nama_pelanggan} ({b.jenis_layanan})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Penanda form terisi otomatis dari booking */}
                {selectedBooking && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-accent/25 bg-accent-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <div className="text-xs font-semibold text-accent">
                        Form terisi otomatis dari booking {selectedBooking.no_booking}
                        <div className="mt-0.5 text-[11px] font-normal text-ink-muted">
                          Plat <span className="font-mono font-black text-ink">{selectedBooking.no_polisi}</span> • {selectedBooking.nama_pelanggan} • {selectedBooking.jam_booking} WIB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetCheckInForm}
                      className="shrink-0 cursor-pointer self-start rounded-lg border border-accent/30 bg-surface-raised px-2.5 py-1 text-[11px] font-bold text-accent transition-colors hover:bg-surface sm:self-auto"
                    >
                      Lepas tautan booking
                    </button>
                  </div>
                )}
              </div>
            </CheckInSection>

            {/* 02 — JENIS KUNJUNGAN */}
            <CheckInSection step="02" title="Jenis kunjungan" hint="Wajib — pilih satu">
              <div role="radiogroup" aria-label="Jenis kunjungan" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { id: 'SERVICE', label: 'Service', Icon: Wrench, defaultKeperluan: 'Service Berkala / Perbaikan Truk' },
                  { id: 'KUNJUNGAN', label: 'Kunjungan', Icon: Users, defaultKeperluan: 'Kunjungan Tamu / Keperluan Kantor' },
                  { id: 'BELI_PART', label: 'Pembelian barang', Icon: Package, defaultKeperluan: 'Pembelian Sparepart / Barang' },
                  { id: 'LAINNYA', label: 'Lainnya', Icon: MoreHorizontal, defaultKeperluan: '' },
                ].map(({ id: tipeId, label, Icon, defaultKeperluan }) => {
                  const isChecked = checkInForm.tipe_kunjungan === tipeId;
                  return (
                    <label
                      key={tipeId}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-3 transition-colors focus-within:ring-2 focus-within:ring-accent/30 ${
                        isChecked
                          ? 'border-accent bg-accent-subtle text-accent shadow-xs'
                          : 'border-border bg-surface-raised text-ink-muted hover:border-accent/30 hover:bg-surface'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipe_kunjungan"
                        value={tipeId}
                        checked={isChecked}
                        onChange={() => applyTipeKunjungan(tipeId as TipeKunjunganGerbang, defaultKeperluan)}
                        className="sr-only"
                      />
                      <Icon className={`h-4 w-4 shrink-0 ${isChecked ? 'text-accent' : 'text-ink-subtle'}`} />
                      <span className="text-xs font-semibold leading-tight">{label}</span>
                    </label>
                  );
                })}
              </div>

              {/* Tujuan kedatangan bebas bila memilih Lainnya */}
              {checkInForm.tipe_kunjungan === 'LAINNYA' && (
                <div className="animate-in space-y-1.5 border-t border-border pt-3 fade-in duration-200">
                  <label htmlFor="checkin-lainnya" className={CHECKIN_LABEL_CLASS}>
                    Tujuan kedatangan <span className="text-status-red">*</span>
                  </label>
                  <input
                    id="checkin-lainnya"
                    type="text"
                    required
                    autoFocus
                    value={checkInForm.tujuan_kunjungan}
                    onChange={(e) => setCheckInForm((prev) => ({ ...prev, tujuan_kunjungan: e.target.value }))}
                    placeholder="Contoh: pengantaran material, survei fasilitas, audit eksternal"
                    className={CHECKIN_FIELD_CLASS}
                  />
                </div>
              )}
            </CheckInSection>

            {/* 03 — PENGEMUDI & KONTAK */}
            <CheckInSection step="03" title="Pengemudi & kontak" hint="Hanya nama yang wajib">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="checkin-nama" className={CHECKIN_LABEL_CLASS}>
                    Nama customer / pengemudi <span className="text-status-red">*</span>
                  </label>
                  <input
                    id="checkin-nama"
                    type="text"
                    required
                    autoComplete="name"
                    value={checkInForm.nama_pengemudi}
                    onChange={(e) => setCheckInForm((prev) => ({ ...prev, nama_pengemudi: e.target.value }))}
                    placeholder="Contoh: Hisar / Slamet Riyadi"
                    className={CHECKIN_FIELD_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="checkin-hp" className={CHECKIN_LABEL_CLASS}>
                    No. HP / WhatsApp
                  </label>
                  <input
                    id="checkin-hp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={checkInForm.no_telepon_pengemudi}
                    onChange={(e) => setCheckInForm((prev) => ({ ...prev, no_telepon_pengemudi: e.target.value }))}
                    placeholder="0812-3456-7890"
                    className={CHECKIN_FIELD_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="checkin-perusahaan" className={CHECKIN_LABEL_CLASS}>
                    Nama perusahaan
                  </label>
                  <input
                    id="checkin-perusahaan"
                    type="text"
                    autoComplete="organization"
                    value={checkInForm.nama_perusahaan}
                    onChange={(e) => setCheckInForm((prev) => ({ ...prev, nama_perusahaan: e.target.value }))}
                    placeholder="Contoh: PT Andi Jaya / CV / Umum"
                    className={CHECKIN_FIELD_CLASS}
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor="checkin-pic" className="block text-xs font-semibold text-ink">
                      PIC / petugas bengkel
                    </label>
                    {isEmployeeLoading && (
                      <span className="animate-pulse text-[10px] text-status-blue">Memuat PIC…</span>
                    )}
                  </div>

                  {employeeList.length > 0 ? (
                    <select
                      id="checkin-pic"
                      value={checkInForm.bertemu_dengan}
                      onChange={(e) => setCheckInForm((prev) => ({ ...prev, bertemu_dengan: e.target.value }))}
                      className={`${CHECKIN_FIELD_CLASS} cursor-pointer`}
                    >
                      <option value="">Pilih PIC / petugas bengkel</option>
                      {employeeList.map((emp) => {
                        const label = getEmployeeDisplayLabel(emp);
                        return (
                          <option key={emp.employeeid || emp.id} value={label}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs text-ink-subtle">
                      {isEmployeeLoading ? 'Memuat daftar PIC dari database…' : 'Daftar PIC database belum tersedia'}
                    </div>
                  )}
                </div>
              </div>
            </CheckInSection>

            {/* 04 — RINCIAN & FOTO */}
            <CheckInSection step="04" title="Rincian & foto" hint="Membantu pemeriksaan di bengkel">
              <div className="space-y-4">
                {checkInForm.tipe_kunjungan !== 'LAINNYA' && (
                  <div>
                    <label htmlFor="checkin-keperluan" className={CHECKIN_LABEL_CLASS}>
                      Keperluan / rincian <span className="text-status-red">*</span>
                    </label>
                    <input
                      id="checkin-keperluan"
                      type="text"
                      required
                      value={checkInForm.tujuan_kunjungan}
                      onChange={(e) => setCheckInForm((prev) => ({ ...prev, tujuan_kunjungan: e.target.value }))}
                      placeholder="Contoh: pembelian sparepart, service berkala, pengambilan dokumen stok opname"
                      className={CHECKIN_FIELD_CLASS}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="checkin-catatan" className={CHECKIN_LABEL_CLASS}>
                    Catatan masuk gerbang
                  </label>
                  <input
                    id="checkin-catatan"
                    type="text"
                    value={checkInForm.catatan_masuk}
                    onChange={(e) => setCheckInForm((prev) => ({ ...prev, catatan_masuk: e.target.value }))}
                    placeholder="Contoh: membawa dokumen fisik, kondisi truk mulus, muatan kosong"
                    className={CHECKIN_FIELD_CLASS}
                  />
                </div>

                <PhotoUploader
                  label="Foto fisik kendaraan masuk (Kamera Gerbang)"
                  value={checkInForm.foto_kendaraan_masuk}
                  onChange={(url) => setCheckInForm((prev) => ({ ...prev, foto_kendaraan_masuk: url }))}
                  preferDirectCamera={true}
                />
              </div>
            </CheckInSection>
          </div>

          {/* Aksi utama: menempel di bawah layar agar selalu terjangkau petugas */}
          <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-border bg-surface-raised/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetCheckInForm}
              disabled={isCheckInSubmitting}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-xs font-bold text-ink-muted transition-colors hover:bg-surface disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="submit"
              disabled={isCheckInSubmitting}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-black text-white shadow-md transition-all hover:bg-accent-hover disabled:opacity-50 sm:min-w-[220px] sm:flex-none"
            >
              <ArrowRightCircle className="h-5 w-5" />
              <span>{isCheckInSubmitting ? 'Menyimpan…' : 'Simpan check in'}</span>
            </button>
          </div>
        </form>
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
                SELURUH NOPOL YANG MASIH BERADA DIBENGKEL (DALAM BENGKEL)
              </h2>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setOnProgressCurrentPage(1);
                  }}
                  placeholder="Cari No. Polisi / Nama Customer"
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#12388F]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400 text-[11px]">Tanggal</span>
                <input
                  type="date"
                  value={onProgressFilterTanggal}
                  onChange={(e) => {
                    setOnProgressFilterTanggal(e.target.value);
                    setOnProgressCurrentPage(1);
                  }}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setOnProgressFilterTanggal('');
                  setOnProgressCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* 4 Kartu Metrik Ringkas Persis Excel (Total Diservis, Sedang Dikerjakan, Menunggu Part, Menunggu QC) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#12388F] flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Total Diservis</div>
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
                  {(() => {
                    const filtered = onProgressList.filter((item) => {
                      const matchSearch =
                        !searchQuery ||
                        item.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.nama_perusahaan && item.nama_perusahaan.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (item.nama_pengemudi && item.nama_pengemudi.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (item.nomor_tiket && item.nomor_tiket.toLowerCase().includes(searchQuery.toLowerCase()));
                      const matchDate =
                        !onProgressFilterTanggal || (item.waktu_masuk && item.waktu_masuk.includes(onProgressFilterTanggal));
                      return matchSearch && matchDate;
                    });
                    const totalPages = Math.max(1, Math.ceil(filtered.length / SECURITY_TABLE_PAGE_SIZE));
                    const currentPage = Math.min(Math.max(1, onProgressCurrentPage), totalPages);
                    const startIndex = (currentPage - 1) * SECURITY_TABLE_PAGE_SIZE;
                    const pageItems = filtered.slice(startIndex, startIndex + SECURITY_TABLE_PAGE_SIZE);

                    if (pageItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400 text-xs font-medium">
                            Tidak ada unit yang sedang berada di dalam bengkel.
                          </td>
                        </tr>
                      );
                    }

                    return pageItems.map((item, idx) => (
                      <tr 
                        key={item.kunjungan_id} 
                        onClick={() => {
                          setViewingProgressDetail(item);
                          setProgressDetailModalOpen(true);
                        }}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3.5 font-semibold text-slate-500">{startIndex + idx + 1}</td>
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
                        <td className="py-2.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setViewingProgressDetail(item);
                              setProgressDetailModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg border border-[#12388F] text-[#12388F] hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Dynamic Pagination Footer */}
            {(() => {
              const filtered = onProgressList.filter((item) => {
                const matchSearch =
                  !searchQuery ||
                  item.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (item.nama_perusahaan && item.nama_perusahaan.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (item.nama_pengemudi && item.nama_pengemudi.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (item.nomor_tiket && item.nomor_tiket.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchDate =
                  !onProgressFilterTanggal || (item.waktu_masuk && item.waktu_masuk.includes(onProgressFilterTanggal));
                return matchSearch && matchDate;
              });

              return (
                <SecurityTablePagination
                  currentPage={onProgressCurrentPage}
                  totalItems={filtered.length}
                  pageSize={SECURITY_TABLE_PAGE_SIZE}
                  onPageChange={setOnProgressCurrentPage}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4B. TAB: CHECK OUT (KENDARAAN SELESAI SERVIS / SIAP KELUAR)             */}
      {/* ========================================================================= */}
      {currentTab === 'checkout' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#12388F] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                3
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black tracking-wide text-slate-900 uppercase">
                  DAFTAR KENDARAAN SIAP CHECK OUT
                </h2>
                <p className="text-xs text-slate-500">
                  Armada yang telah selesai perbaikan di bengkel dan siap diverifikasi di pos gerbang untuk penerbitan gate pass.
                </p>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={checkoutSearch}
                  onChange={(e) => {
                    setCheckoutSearch(e.target.value);
                    setCheckoutCurrentPage(1);
                  }}
                  placeholder="Cari No. Polisi / Driver / Tiket..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#12388F]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400 text-[11px]">Tanggal Masuk</span>
                <input
                  type="date"
                  value={checkoutFilterTanggal}
                  onChange={(e) => {
                    setCheckoutFilterTanggal(e.target.value);
                    setCheckoutCurrentPage(1);
                  }}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setCheckoutSearch('');
                  setCheckoutFilterTanggal('');
                  setCheckoutCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Table Siap Check Out */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">No.</th>
                    <th className="py-2.5 px-3.5">No. Tiket</th>
                    <th className="py-2.5 px-3.5">No. Polisi</th>
                    <th className="py-2.5 px-3.5">Nama Customer / Pengemudi</th>
                    <th className="py-2.5 px-3.5">No. SPK & Faktur</th>
                    <th className="py-2.5 px-3.5">Masuk Gerbang</th>
                    <th className="py-2.5 px-3.5">Status Pengerjaan</th>
                    <th className="py-2.5 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filtered = siapCheckOutList.filter((item) => {
                      const matchSearch =
                        !checkoutSearch ||
                        item.no_polisi.toLowerCase().includes(checkoutSearch.toLowerCase()) ||
                        (item.nama_perusahaan && item.nama_perusahaan.toLowerCase().includes(checkoutSearch.toLowerCase())) ||
                        (item.nama_pengemudi && item.nama_pengemudi.toLowerCase().includes(checkoutSearch.toLowerCase())) ||
                        (item.nomor_tiket && item.nomor_tiket.toLowerCase().includes(checkoutSearch.toLowerCase())) ||
                        (item.no_spk && item.no_spk.toLowerCase().includes(checkoutSearch.toLowerCase()));
                      const matchDate =
                        !checkoutFilterTanggal ||
                        (item.waktu_masuk && item.waktu_masuk.includes(checkoutFilterTanggal));
                      return matchSearch && matchDate;
                    });

                    const totalPages = Math.max(1, Math.ceil(filtered.length / SECURITY_TABLE_PAGE_SIZE));
                    const currentPage = Math.min(Math.max(1, checkoutCurrentPage), totalPages);
                    const startIndex = (currentPage - 1) * SECURITY_TABLE_PAGE_SIZE;
                    const pageItems = filtered.slice(startIndex, startIndex + SECURITY_TABLE_PAGE_SIZE);

                    if (pageItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                              <CheckCircle2 className="w-8 h-8 text-emerald-400/80" />
                              <p className="text-xs font-semibold text-slate-600">Tidak ada kendaraan yang menunggu check out saat ini.</p>
                              <p className="text-[11px] text-slate-400">Kendaraan yang berstatus 'Selesai' di bengkel akan otomatis muncul di sini untuk verifikasi gate pass.</p>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return pageItems.map((item, idx) => (
                      <tr key={item.kunjungan_id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2.5 px-3.5 font-semibold text-slate-500">{startIndex + idx + 1}</td>
                        <td className="py-2.5 px-3.5">
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {item.nomor_tiket}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="font-mono font-black text-slate-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-xs">
                            {item.no_polisi}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-bold text-slate-800">{item.nama_pengemudi}</div>
                          <div className="text-[11px] text-slate-400">{item.nama_perusahaan || '-'}</div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-mono text-slate-700 font-semibold text-xs">{item.no_spk || '-'}</div>
                          {item.no_invoice && item.no_invoice !== '-' && (
                            <div className="text-[10px] text-emerald-600 font-medium">Inv: {item.no_invoice}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          <div>{item.waktu_masuk}</div>
                          <div className="text-[10px] text-slate-400 font-medium">({item.durasi_jam ?? 0} Jam di Bengkel)</div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Servis Selesai</span>
                          </span>
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
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Check Out</span>
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Dynamic Pagination Footer */}
            {(() => {
              const filtered = siapCheckOutList.filter((item) => {
                const matchSearch =
                  !checkoutSearch ||
                  item.no_polisi.toLowerCase().includes(checkoutSearch.toLowerCase()) ||
                  (item.nama_perusahaan && item.nama_perusahaan.toLowerCase().includes(checkoutSearch.toLowerCase())) ||
                  (item.nama_pengemudi && item.nama_pengemudi.toLowerCase().includes(checkoutSearch.toLowerCase())) ||
                  (item.nomor_tiket && item.nomor_tiket.toLowerCase().includes(checkoutSearch.toLowerCase())) ||
                  (item.no_spk && item.no_spk.toLowerCase().includes(checkoutSearch.toLowerCase()));
                const matchDate =
                  !checkoutFilterTanggal ||
                  (item.waktu_masuk && item.waktu_masuk.includes(checkoutFilterTanggal));
                return matchSearch && matchDate;
              });

              return (
                <SecurityTablePagination
                  currentPage={checkoutCurrentPage}
                  totalItems={filtered.length}
                  pageSize={SECURITY_TABLE_PAGE_SIZE}
                  onPageChange={setCheckoutCurrentPage}
                />
              );
            })()}
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
                4
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
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setRiwayatCurrentPage(1);
                  }}
                  placeholder="Cari No. Polisi / Nama Customer"
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#12388F]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400 text-[11px]">Tanggal</span>
                <input
                  type="date"
                  value={riwayatFilterTanggal}
                  onChange={(e) => {
                    setRiwayatFilterTanggal(e.target.value);
                    setRiwayatCurrentPage(1);
                  }}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRiwayatFilterTanggal('');
                  setRiwayatCurrentPage(1);
                }}
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
                onClick={() => {
                  setRiwayatPeriode(p.id as any);
                  setRiwayatCurrentPage(1);
                }}
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
                  {(() => {
                    const filtered = riwayatKeluarList.filter((item) => {
                      const matchSearch =
                        !searchQuery ||
                        item.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.nama_perusahaan && item.nama_perusahaan.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (item.nama_pengemudi && item.nama_pengemudi.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (item.nomor_tiket && item.nomor_tiket.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (item.nomor_memo && item.nomor_memo.toLowerCase().includes(searchQuery.toLowerCase()));
                      const matchDate =
                        !riwayatFilterTanggal ||
                        (item.waktu_keluar && item.waktu_keluar.includes(riwayatFilterTanggal)) ||
                        (item.waktu_masuk && item.waktu_masuk.includes(riwayatFilterTanggal));
                      return matchSearch && matchDate;
                    });
                    const totalPages = Math.max(1, Math.ceil(filtered.length / SECURITY_TABLE_PAGE_SIZE));
                    const currentPage = Math.min(Math.max(1, riwayatCurrentPage), totalPages);
                    const startIndex = (currentPage - 1) * SECURITY_TABLE_PAGE_SIZE;
                    const pageItems = filtered.slice(startIndex, startIndex + SECURITY_TABLE_PAGE_SIZE);

                    if (pageItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400 text-xs font-medium">
                            Tidak ada riwayat kendaraan keluar pada periode ini.
                          </td>
                        </tr>
                      );
                    }

                    return pageItems.map((item, idx) => (
                      <tr key={item.kunjungan_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 font-semibold text-slate-500">{startIndex + idx + 1}</td>
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
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Dynamic Pagination Footer */}
            {(() => {
              const filtered = riwayatKeluarList.filter((item) => {
                const matchSearch =
                  !searchQuery ||
                  item.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (item.nama_perusahaan && item.nama_perusahaan.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (item.nama_pengemudi && item.nama_pengemudi.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (item.nomor_tiket && item.nomor_tiket.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (item.nomor_memo && item.nomor_memo.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchDate =
                  !riwayatFilterTanggal ||
                  (item.waktu_keluar && item.waktu_keluar.includes(riwayatFilterTanggal)) ||
                  (item.waktu_masuk && item.waktu_masuk.includes(riwayatFilterTanggal));
                return matchSearch && matchDate;
              });

              return (
                <SecurityTablePagination
                  currentPage={riwayatCurrentPage}
                  totalItems={filtered.length}
                  pageSize={SECURITY_TABLE_PAGE_SIZE}
                  onPageChange={setRiwayatCurrentPage}
                />
              );
            })()}
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
              5
            </div>
            <h2 className="text-sm sm:text-base font-black tracking-wide text-slate-900 uppercase">
              MEMO KELUAR
            </h2>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Daftar memo keluar & preview gate pass siap cetak</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setMemoCurrentPage(1);
                  }}
                  placeholder="Cari No. Polisi / No. Memo..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#12388F]"
                />
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-400 text-[10px]">Tanggal</span>
                <input
                  type="date"
                  value={memoFilterTanggal}
                  onChange={(e) => {
                    setMemoFilterTanggal(e.target.value);
                    setMemoCurrentPage(1);
                  }}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setMemoFilterTanggal('');
                  setMemoCurrentPage(1);
                }}
                className="p-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Reset Filter"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabel List Memo Keluar Full Width */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">No.</th>
                    <th className="py-2.5 px-3.5">No. Memo</th>
                    <th className="py-2.5 px-3.5">No. Polisi</th>
                    <th className="py-2.5 px-3.5">Nama Customer / Pengemudi</th>
                    <th className="py-2.5 px-3.5">Tujuan</th>
                    <th className="py-2.5 px-3.5">Keluar</th>
                    <th className="py-2.5 px-3.5">Security</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filtered = memoList.filter((memo) => {
                      const matchSearch =
                        !searchQuery ||
                        memo.nomor_memo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        memo.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        memo.nama_pengemudi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (memo.nama_perusahaan && memo.nama_perusahaan.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (memo.nomor_tiket && memo.nomor_tiket.toLowerCase().includes(searchQuery.toLowerCase()));
                      const matchDate =
                        !memoFilterTanggal || (memo.tanggal_terbit && memo.tanggal_terbit.includes(memoFilterTanggal));
                      return matchSearch && matchDate;
                    });
                    const totalPages = Math.max(1, Math.ceil(filtered.length / SECURITY_TABLE_PAGE_SIZE));
                    const currentPage = Math.min(Math.max(1, memoCurrentPage), totalPages);
                    const startIndex = (currentPage - 1) * SECURITY_TABLE_PAGE_SIZE;
                    const pageItems = filtered.slice(startIndex, startIndex + SECURITY_TABLE_PAGE_SIZE);

                    if (pageItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400 text-xs font-medium">
                            Belum ada dokumen memo keluar.
                          </td>
                        </tr>
                      );
                    }

                    return pageItems.map((memo, idx) => (
                      <tr
                        key={memo.id}
                        onClick={() => handleViewMemo(memo.id, memo.nomor_memo)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3.5 text-slate-500 font-semibold">{startIndex + idx + 1}</td>
                        <td className="py-2.5 px-3.5 font-mono font-bold text-[#12388F]">
                          {memo.nomor_memo}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono font-black text-slate-900">
                          {memo.no_polisi}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900">
                          {memo.nama_perusahaan || memo.nama_pengemudi}
                        </td>
                        <td className="py-2.5 px-3.5">
                          {renderTipeKunjunganBadge(memo.tipe_kunjungan)}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-slate-600 text-[11px]">
                          {memo.tanggal_terbit?.split(' ')[1]?.substring(0, 5) || memo.tanggal_terbit || '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                          {memo.nama_security || 'Security Gerbang'}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified Out
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewMemo(memo.id, memo.nomor_memo);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg border border-[#12388F] text-[#12388F] hover:bg-[#12388F] hover:text-white transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Dynamic Pagination Footer */}
            {(() => {
              const filtered = memoList.filter((memo) => {
                const matchSearch =
                  !searchQuery ||
                  memo.nomor_memo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  memo.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  memo.nama_pengemudi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (memo.nama_perusahaan && memo.nama_perusahaan.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (memo.nomor_tiket && memo.nomor_tiket.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchDate =
                  !memoFilterTanggal || (memo.tanggal_terbit && memo.tanggal_terbit.includes(memoFilterTanggal));
                return matchSearch && matchDate;
              });

              return (
                <SecurityTablePagination
                  currentPage={memoCurrentPage}
                  totalItems={filtered.length}
                  pageSize={SECURITY_TABLE_PAGE_SIZE}
                  onPageChange={setMemoCurrentPage}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Detail Booking Reservasi */}
      {bookingDetailModalOpen && viewingBookingDetail && createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal - Konsisten dengan tema Pos Gerbang (#1D4ED8) */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-[#1D4ED8] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base tracking-wide leading-tight">Detail Reservasi Booking</h3>
                  <p className="text-[11px] text-blue-100 font-mono mt-0.5">ID: {viewingBookingDetail.no_booking}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBookingDetailModalOpen(false);
                  setViewingBookingDetail(null);
                }}
                className="p-1.5 text-blue-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="overflow-y-auto p-6 space-y-4 text-xs text-slate-700">
              {/* Card Plat & Status */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#12388F] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">No. Polisi Armada</span>
                    <div className="font-mono font-black text-xl sm:text-2xl text-slate-900 leading-tight">
                      {viewingBookingDetail.no_polisi}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Status Reservasi</span>
                  {viewingBookingDetail.sudah_checkin ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Check In
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Confirmed
                    </span>
                  )}
                </div>
              </div>

              {/* Grid Rincian Informasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Truck className="w-3.5 h-3.5" />
                    <span>Jenis Armada</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{viewingBookingDetail.tipe_kendaraan || 'Truk'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Tujuan Kunjungan</span>
                  </div>
                  <p className="font-bold text-[#12388F] text-xs sm:text-sm">{viewingBookingDetail.jenis_layanan || 'Service'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Nama Customer / Perusahaan</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{viewingBookingDetail.nama_pelanggan}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Phone className="w-3.5 h-3.5" />
                    <span>No. Telepon / Kontak</span>
                  </div>
                  <p className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{viewingBookingDetail.no_telepon || '-'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <User className="w-3.5 h-3.5" />
                    <span>PIC / Driver Pengemudi</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{viewingBookingDetail.nama_pic || viewingBookingDetail.nama_pelanggan || '-'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Jadwal Kedatangan</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    {viewingBookingDetail.tanggal_booking} &bull; <span className="font-mono text-[#12388F]">{viewingBookingDetail.jam_booking} WIB</span>
                  </p>
                </div>
              </div>

              {/* Catatan / Keluhan */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Keterangan / Keluhan Driver</span>
                <p className="text-slate-800 text-xs leading-relaxed italic">
                  {viewingBookingDetail.keluhan || viewingBookingDetail.catatan || 'Tidak ada catatan tambahan untuk reservasi ini.'}
                </p>
              </div>
            </div>

            {/* Footer Modal Action */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setBookingDetailModalOpen(false);
                  setViewingBookingDetail(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
              {!viewingBookingDetail.sudah_checkin && (
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingBookingDetail;
                    setBookingDetailModalOpen(false);
                    setViewingBookingDetail(null);
                    handlePilihBooking(target);
                  }}
                  className="px-5 py-2.5 bg-[#12388F] hover:bg-[#0D2A6B] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  <span>Pilih &amp; Isi Check In</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Detail Armada di Bengkel (Progress - Read-Only, Tidak Ada Tombol Check Out) */}
      {progressDetailModalOpen && viewingProgressDetail && createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal - Konsisten dengan tema Pos Gerbang (#1D4ED8) */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-[#1D4ED8] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base tracking-wide leading-tight">Detail Armada di Bengkel</h3>
                  <p className="text-[11px] text-blue-100 font-mono mt-0.5">Tiket: {viewingProgressDetail.nomor_tiket}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProgressDetailModalOpen(false);
                  setViewingProgressDetail(null);
                }}
                className="p-1.5 text-blue-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="overflow-y-auto p-6 space-y-4 text-xs text-slate-700">
              {/* Card Plat & Status Pengerjaan */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#12388F] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">No. Polisi Armada</span>
                    <div className="font-mono font-black text-xl sm:text-2xl text-slate-900 leading-tight">
                      {viewingProgressDetail.no_polisi}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Status Pengerjaan</span>
                  {(viewingProgressDetail.status_progress || '').toLowerCase().includes('part') ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      Menunggu Part
                    </span>
                  ) : (viewingProgressDetail.status_progress || '').toLowerCase().includes('qc') ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      Menunggu QC
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                      {viewingProgressDetail.status_progress || 'Sedang Dikerjakan'}
                    </span>
                  )}
                </div>
              </div>

              {/* Grid Rincian Informasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Customer / Perusahaan</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{viewingProgressDetail.nama_perusahaan || '-'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <User className="w-3.5 h-3.5" />
                    <span>Driver / Pengemudi</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{viewingProgressDetail.nama_pengemudi || '-'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Waktu Masuk Gerbang</span>
                  </div>
                  <p className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{viewingProgressDetail.waktu_masuk || '-'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Durasi di Dalam</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{viewingProgressDetail.durasi_jam || 0} Jam</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    <span>No. SPK / WO</span>
                  </div>
                  <p className="font-mono font-bold text-[#12388F] text-xs sm:text-sm">{viewingProgressDetail.no_spk || '-'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <User className="w-3.5 h-3.5" />
                    <span>Service Advisor (SA)</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{viewingProgressDetail.nama_sa || '-'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <User className="w-3.5 h-3.5" />
                    <span>Foreman (Kepala Regu)</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{viewingProgressDetail.foreman || '-'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Teknisi Mekanik</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{viewingProgressDetail.mekanik || '-'}</p>
                </div>
              </div>

              {/* Notice Box: Alur Gerbang yang Benar */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-amber-900">Armada Masih Dalam Pengerjaan</div>
                  <p className="text-amber-800 leading-relaxed">
                    Kendaraan ini belum dapat di-check out karena masih dalam proses penanganan oleh teknisi bengkel. 
                    Setelah seluruh pengerjaan servis dinyatakan <strong>Selesai</strong>, armada akan otomatis berpindah ke menu <strong>Check Out</strong> untuk diproses keluar oleh Security.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Modal Action - HANYA Tombol Tutup */}
            <div className="flex items-center justify-end px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setProgressDetailModalOpen(false);
                  setViewingProgressDetail(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
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
