import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../api/client';
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
import { realtimeHub, publishKeCustomer } from '../services/realtimeService';
import { usePemilikPlat } from '../hooks/usePemilikPlat';
import { PrintMemoKeluarModal } from '../components/print/PrintMemoKeluarModal';
import { PaginationBar } from '../components/common/PaginationBar';
import { isTanggalHariIni, isTanggalSamaHariIni, isDalamRentang, tanggalKey } from '../utils/tanggal';
import { ModalPortal } from '../components/common/ModalPortal';
import { toast } from '../components/common/Toast';
import { StepModal } from '../components/common/StepModal';
import { DetailModal } from '../components/common/DetailModal';
import { ListItemCard } from '../components/common/ListItemCard';
import { StatCard } from '../components/common/StatCard';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { FilterChips } from '../components/common/FilterChips';

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
  const [selesaiTimeRange, setSelesaiTimeRange] = useState<'Semua' | 'Hari Ini' | 'Kemarin' | 'Minggu Ini' | 'Bulan Ini'>('Semua');

  // Filter tanggal per tab ('' = semua tanggal)
  const [bookingTanggal, setBookingTanggal] = useState('');
  const [onProgressTanggal, setOnProgressTanggal] = useState('');
  const [selesaiTanggal, setSelesaiTanggal] = useState('');
  const [memoTanggal, setMemoTanggal] = useState('');
  // Panel filter expandable per tab
  const [showBookingFilter, setShowBookingFilter] = useState(false);
  const [showOnProgressFilter, setShowOnProgressFilter] = useState(false);
  const [showSelesaiFilter, setShowSelesaiFilter] = useState(false);
  const [showMemoFilter, setShowMemoFilter] = useState(false);
  // Filter status/tujuan per tab ('Semua' = tanpa filter)
  const [bookingStatus, setBookingStatus] = useState('Semua');
  const [onProgressStatus, setOnProgressStatus] = useState('Semua');
  const [selesaiStatus, setSelesaiStatus] = useState('Semua');
  const [memoTujuan, setMemoTujuan] = useState('Semua');

  // Pagination states
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingLimit, setBookingLimit] = useState(10);
  const [onProgressPage, setOnProgressPage] = useState(1);
  const [onProgressLimit, setOnProgressLimit] = useState(10);
  const [selesaiPage, setSelesaiPage] = useState(1);
  const [selesaiLimit, setSelesaiLimit] = useState(10);
  const [memoPage, setMemoPage] = useState(1);
  const [memoLimit, setMemoLimit] = useState(10);

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Modals and selection state
  const [selectedBooking, setSelectedBooking] = useState<BookingService | null>(null);
  const [bookingPreview, setBookingPreview] = useState<BookingService | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<MemoKeluar | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<AntrianKunjungan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<AntrianKunjungan | null>(null);
  const [showPrintMemo, setShowPrintMemo] = useState<MemoKeluar | null>(null);
  const [checkinStep, setCheckinStep] = useState(0);
  const [checkoutStep, setCheckoutStep] = useState(0);

  // Check In Form State
  const [formCheckin, setFormCheckin] = useState({
    no_polisi: '',
    nama_customer: '',
    no_hp_customer: '',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service' as 'Service' | 'Beli Part' | 'Kunjungan' | 'Lainnya',
    pic_tujuan: '',
    id_pic: undefined as number | null | undefined,
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
    refetchInterval: 4000,
  });

  const { data: rawMemoList } = useQuery({
    queryKey: ['memo-list'],
    queryFn: api.getMemoKeluarList,
  });

  // Daftar SPK (cache bersama) untuk overlay status bengkel pada antrian:
  // status antrian berhenti di 'Sedang Dikerjakan', sedangkan progres real
  // (QC / FIR / Selesai) hanya ada di SPK.
  const { data: spkListSecurity } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 8000,
  });

  // Invoice (cache bersama) untuk titik "Bayar Lunas" di progres checkout Detail.
  const { data: invoiceListSecurity } = useQuery({
    queryKey: ['invoice-list'],
    queryFn: api.getInvoiceList,
    refetchInterval: 15000,
  });

  // SPK terkait sebuah antrian (relasi id_antrian, fallback id_booking)
  const spkUntukAntrian = (a: AntrianKunjungan) =>
    (spkListSecurity || []).find((s) => s.id_antrian === a.id) ||
    (a.id_booking ? (spkListSecurity || []).find((s) => s.id_booking === a.id_booking) : undefined);

  // Label status gabungan untuk Security: bila SPK sudah selesai/FIR/QC,
  // tampilkan itu (siap check-out) alih-alih status antrian yang basi.
  const labelStatusAntrian = (a: AntrianKunjungan): string => {
    const spk = spkUntukAntrian(a);
    if (!spk) return a.status_kunjungan;
    if (spk.status_spk === 'Selesai') return 'Selesai — Siap Check-Out';
    if (spk.status_spk === 'FIR Closed' || spk.status_spk === 'QC Passed') return `${spk.status_spk} — Siap Check-Out`;
    if (spk.status_spk === 'Waiting QC') return 'Menunggu QC';
    return a.status_kunjungan;
  };

  const siapCheckout = (a: AntrianKunjungan): boolean => {
    const spk = spkUntukAntrian(a);
    return !!spk && (spk.status_spk === 'Selesai' || spk.status_spk === 'FIR Closed' || spk.status_spk === 'QC Passed');
  };

  // Query dynamic user/officer list for PIC Tujuan
  const { data: penggunaList } = useQuery({
    queryKey: ['pengguna-list'],
    queryFn: api.getPengguna,
  });

  const picPetugasList = (penggunaList || []).filter(
    (u) => u.peran !== 'Customer Fleet' && u.status_aktif !== false
  );

  // Tujuan kunjungan → role penerima yang BOLEH ditunjuk sebagai PIC.
  // Admin/Security/Customer tidak bisa menerima kunjungan (sesuai aturan alur):
  // - Service     → SA (penerima & pembuat SPK)
  // - Beli Part   → SA (penerima estimasi POS) atau Warehouse (langsung ke gudang)
  // - Kunjungan   → SA / PIC Terkait / Foreman / Mekanik / Purchasing / Kasir / Warehouse
  // - Lainnya     → semua role internal (bebas)
  const PIC_ROLE_ALLOWED: Record<string, string[]> = {
    'Service': ['SA'],
    'Beli Part': ['SA', 'Warehouse'],
    'Kunjungan': ['SA', 'PIC Terkait', 'Foreman', 'Mekanik', 'Admin Purchasing', 'Admin Invoice', 'Warehouse'],
    'Lainnya': ['SA', 'Foreman', 'Mekanik', 'Admin Purchasing', 'Admin Invoice', 'Warehouse', 'PIC Terkait'],
  };
  const allowedPicRoles = PIC_ROLE_ALLOWED[formCheckin.tujuan_kedatangan] || [];
  const picDiperbolehkan = picPetugasList.filter((u) => allowedPicRoles.includes(u.peran));

  // Murni data dari API server Darkosync — booking yang Dibatalkan customer
  // disembunyikan agar tidak bisa di-check-in-kan.
  const bookingList: BookingService[] = (rawBookingList || []).filter((b) => b.status !== 'Dibatalkan');
  const antrianData: AntrianKunjungan[] = rawAntrianList || [];
  const memoList: MemoKeluar[] = rawMemoList || [];

  // Initialize selected booking (detail strip di bawah tabel).
  // Catatan: selectedMemo TIDAK auto-select agar modal preview tidak pop-up sendiri.
  useEffect(() => {
    if (!selectedBooking && bookingList.length > 0) {
      setSelectedBooking(bookingList[0]);
    }
  }, [bookingList]);

  // Derived lists
  const onProgressList = antrianData.filter(a => a.status_kunjungan !== 'Keluar' && a.status_kunjungan !== 'Selesai');
  const selesaiList = antrianData.filter(a => a.status_kunjungan === 'Keluar' || a.status_kunjungan === 'Selesai');

  // Metrik "Hari Ini": saring by tanggal lokal (label jujur — bukan akumulasi semua waktu).
  const bookingHariIni = bookingList.filter((b) => isTanggalSamaHariIni(b.tanggal_booking));
  const selesaiHariIni = selesaiList.filter((a) => isTanggalHariIni(a.waktu_keluar));
  const checkinHariIni = antrianData.filter((a) => isTanggalHariIni(a.waktu_masuk));

  // Stats calculation for Screen 2 (Excel Sheet 4 Panel 2)
  const countTotalOnProgress = onProgressList.length;
  const countSedangDikerjakan = onProgressList.filter(a => a.status_kunjungan === 'Sedang Dikerjakan').length;
  const countMenungguPart = onProgressList.filter(a => a.status_kunjungan === 'Menunggu Part').length;
  const countMenungguQC = onProgressList.filter(a => a.status_kunjungan === 'Menunggu QC').length;

  // Filtered queries (search + tanggal + status/tujuan per tab)
  // Booking yang sudah di-check-in tidak ditampilkan lagi di daftar booking —
  // kendaraannya kini berada di tab "Nopol di Bengkel" / "Telah Keluar".
  const checkedInBookingIds = new Set(
    antrianData.map((a) => a.id_booking).filter((v): v is number => v != null)
  );
  const filteredBookingList = bookingList.filter(b =>
    !checkedInBookingIds.has(b.id) &&
    (b.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.nama_customer || b.nama_perusahaan || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!bookingTanggal || (b.tanggal_booking || '').slice(0, 10) === bookingTanggal) &&
    (bookingStatus === 'Semua' || b.status === bookingStatus)
  );

  const filteredOnProgressList = onProgressList.filter(item =>
    (item.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.nama_customer || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!onProgressTanggal || tanggalKey(item.waktu_masuk) === onProgressTanggal) &&
    (onProgressStatus === 'Semua' || item.status_kunjungan === onProgressStatus)
  );

  const filteredSelesaiList = selesaiList.filter(item =>
    (item.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.nama_customer || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    isDalamRentang(item.waktu_keluar || item.waktu_masuk, selesaiTimeRange) &&
    (!selesaiTanggal || tanggalKey(item.waktu_keluar || item.waktu_masuk) === selesaiTanggal) &&
    (selesaiStatus === 'Semua' || item.status_kunjungan === selesaiStatus)
  );

  const filteredMemoList = memoList.filter(m =>
    (m.no_memo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.no_polisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.nama_customer || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!memoTanggal || tanggalKey(m.waktu_keluar) === memoTanggal) &&
    (memoTujuan === 'Semua' || (m.tujuan_kedatangan || '') === memoTujuan)
  );

  // Opsi distinct untuk select filter (dari data)
  const bookingStatusOptions = ['Semua', ...Array.from(new Set(bookingList.map((b) => b.status).filter(Boolean)))];
  const onProgressStatusOptions = ['Semua', ...Array.from(new Set(onProgressList.map((a) => a.status_kunjungan).filter(Boolean)))];
  const selesaiStatusOptions = ['Semua', ...Array.from(new Set(selesaiList.map((a) => a.status_kunjungan).filter(Boolean)))];
  const memoTujuanOptions = ['Semua', ...Array.from(new Set(memoList.map((m) => m.tujuan_kedatangan).filter(Boolean)))];

  const totalBooking = filteredBookingList.length;
  const totalBookingPages = Math.ceil(totalBooking / bookingLimit) || 1;
  const paginatedBookingList = filteredBookingList.slice(
    (bookingPage - 1) * bookingLimit,
    bookingPage * bookingLimit
  );

  const totalOnProgress = filteredOnProgressList.length;
  const totalOnProgressPages = Math.ceil(totalOnProgress / onProgressLimit) || 1;
  const paginatedOnProgressList = filteredOnProgressList.slice(
    (onProgressPage - 1) * onProgressLimit,
    onProgressPage * onProgressLimit
  );

  const totalSelesai = filteredSelesaiList.length;
  const totalSelesaiPages = Math.ceil(totalSelesai / selesaiLimit) || 1;
  const paginatedSelesaiList = filteredSelesaiList.slice(
    (selesaiPage - 1) * selesaiLimit,
    selesaiPage * selesaiLimit
  );

  const totalMemo = filteredMemoList.length;
  const totalMemoPages = Math.ceil(totalMemo / memoLimit) || 1;
  const paginatedMemoList = filteredMemoList.slice(
    (memoPage - 1) * memoLimit,
    memoPage * memoLimit
  );

  // Check-In Mutation
  // Pemilik plat di-resolve fresh by plat (walk-in primary key) untuk SEMUA
  // tujuan (Service, Beli Part, Kunjungan, Lainnya): bila ketemu, notice tampil
  // dan notif customer dikirim personal (bukan broadcast ke semua customer).
  const { pemilik: pemilikPlat, loading: pemilikLoading } = usePemilikPlat(
    formCheckin.no_polisi,
    true
  );

  // Auto-isi Data Pengemudi/PIC dari profil pemilik plat terdaftar —
  // hanya mengisi kolom yang masih kosong (tidak menimpa ketikan Security).
  useEffect(() => {
    if (!pemilikPlat) return;
    const namaProfil = pemilikPlat.nama_perusahaan || pemilikPlat.nama_lengkap || '';
    const telpProfil = pemilikPlat.no_telepon || '';
    if (!namaProfil && !telpProfil) return;
    setFormCheckin((prev) => {
      const next = { ...prev };
      let berubah = false;
      if ((!next.nama_customer || !next.nama_customer.trim()) && namaProfil) {
        next.nama_customer = namaProfil;
        berubah = true;
      }
      if ((!next.no_hp_customer || !next.no_hp_customer.trim()) && telpProfil) {
        next.no_hp_customer = telpProfil;
        berubah = true;
      }
      return berubah ? next : prev;
    });
  }, [pemilikPlat]);

  const checkinMutation = useMutation({
    mutationFn: async (data: typeof formCheckin) => {
      const ticketNo = `ANT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const pemilikRows = await api.cariPemilikPlat(data.no_polisi).catch(() => []);
      const res = await api.checkInSecurity({
        no_tiket: ticketNo,
        ...data,
      });
      return { res, pemilik: pemilikRows[0] || null };
    },
    onSuccess: ({ pemilik }) => {
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // Publish Realtime Event
      if (formCheckin.tujuan_kedatangan === 'Kunjungan') {
        const targetPicUser = picPetugasList.find((p) => p.id === formCheckin.id_pic);
        realtimeHub.publish({
          type: 'KUNJUNGAN_ARRIVED',
          targetRoles: ['PIC Terkait'],
          targetUserId: targetPicUser?.id,
          targetUserEmail: targetPicUser?.email,
          title: 'Tamu Tiba di Pos Security',
          message: `Tamu ${formCheckin.nama_customer || 'Pengunjung'} (${formCheckin.no_polisi}) telah tiba di Pos Security menuju ${formCheckin.pic_tujuan}.`,
          linkTab: 'pic-terkait',
          urgency: 'urgent',
        });
        // Notif personal ke pemilik kendaraan bila plat terdaftar.
        if (pemilik?.user_id) {
          realtimeHub.publish({
            type: 'KUNJUNGAN_ARRIVED',
            targetRoles: ['Customer Fleet'],
            targetUserId: pemilik.user_id,
            targetPelangganId: pemilik.id_pelanggan,
            title: 'Kunjungan Tercatat di Pos Gerbang',
            message: `Unit ${formCheckin.no_polisi} tercatat berkunjung ke Pos Security KIM 3 menuju ${formCheckin.pic_tujuan || 'tujuan internal'}. Riwayat tersimpan by plat.`,
            linkTab: 'fleet-history',
            urgency: 'info',
          });
        }
      } else if (formCheckin.tujuan_kedatangan === 'Beli Part') {
        // Alur Beli Part tanpa service: SA yang menerima & membuat estimasi,
        // Warehouse yang menyiapkan barang. Kasir & Purchasing ikut dipantau.
        realtimeHub.publish({
          type: 'VEHICLE_CHECKED_IN',
          targetRoles: ['SA', 'Warehouse', 'Admin Invoice', 'Admin Purchasing'],
          title: 'Customer Beli Part Datang',
          message: `${formCheckin.nama_customer || 'Pelanggan'} (${formCheckin.no_polisi}) tiba di pos untuk pembelian part. SA silakan buka menu Penjualan Part Langsung untuk membuat estimasi.`,
          linkTab: 'beli-part',
          urgency: 'urgent',
        });
        // Notif personal ke pemilik kendaraan bila plat terdaftar.
        if (pemilik?.user_id) {
          realtimeHub.publish({
            type: 'VEHICLE_CHECKED_IN',
            targetRoles: ['Customer Fleet'],
            targetUserId: pemilik.user_id,
            targetPelangganId: pemilik.id_pelanggan,
            title: 'Kunjungan Beli Part Tercatat',
            message: `Unit ${formCheckin.no_polisi} tercatat di Pos Security KIM 3 untuk pembelian part. Riwayat tersimpan by plat.`,
            linkTab: 'fleet-history',
            urgency: 'info',
          });
        }
      } else {
        // 1. Notifikasi untuk Service Advisor (Internal Staff)
        realtimeHub.publish({
          type: 'VEHICLE_CHECKED_IN',
          targetRoles: ['SA'],
          title: 'Kendaraan Masuk (Perlu SPK)',
          message: `Unit ${formCheckin.no_polisi} (${formCheckin.nama_customer || 'Pelanggan'}) telah di-check in di pos security. Siap untuk inspeksi awal & pembuatan SPK.`,
          linkTab: 'sa',
          urgency: 'urgent',
        });

        // 2. Notifikasi untuk Customer Fleet (Pemilik Kendaraan).
        // HANYA bila pemilik plat terdaftar (personal by user + tenant).
        // Tanpa pemilik: tidak broadcast (hentikan bocor ke semua customer).
        if (pemilik?.user_id) {
          realtimeHub.publish({
            type: 'VEHICLE_CHECKED_IN',
            targetRoles: ['Customer Fleet'],
            targetUserId: pemilik.user_id,
            targetPelangganId: pemilik.id_pelanggan,
            title: 'Kendaraan Tiba di Pos Gerbang',
            message: `Unit ${formCheckin.no_polisi} telah berhasil di-check in di Pos Security KIM 3 dan sedang menunggu antrian inspeksi awal.`,
            linkTab: 'fleet-status',
            urgency: 'info',
          });
        }
      }

      toast.success('Kendaraan berhasil di-Check In oleh Pos Security KIM 3!');
      setShowCheckinModal(false);
      setFormCheckin({
        no_polisi: '',
        nama_customer: '',
        no_hp_customer: '',
        jenis_armada: 'Truk',
        tujuan_kedatangan: 'Service',
        pic_tujuan: '',
        id_pic: undefined,
        keperluan: '',
        foto_kendaraan_masuk: '',
        catatan_security: '',
        id_booking: undefined,
      });
      changeTab('onprogress');
    },
    onError: (err: any) => toast.error('Gagal check in: ' + getApiErrorMessage(err)),
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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['memo-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // 1. Notifikasi untuk Customer PEMILIK plat saja (anti-bocor antar akun)
      await publishKeCustomer({
        type: 'VEHICLE_CHECKED_OUT',
        title: 'Kendaraan Telah Keluar Bengkel',
        message: `Unit ${showCheckoutModal?.no_polisi || 'kendaraan'} telah resmi check-out & keluar melalui pos Security.`,
        linkTab: 'fleet-status',
        urgency: 'success',
        noPolisi: showCheckoutModal?.no_polisi,
      });

      // 2. Notifikasi untuk Service Advisor
      realtimeHub.publish({
        type: 'VEHICLE_CHECKED_OUT',
        targetRoles: ['SA'],
        title: 'Kendaraan Selesai & Keluar Gerbang',
        message: `Unit ${showCheckoutModal?.no_polisi || 'kendaraan'} telah selesai dan keluar melalui pos Security.`,
        linkTab: 'sa',
        urgency: 'info',
      });

      toast.success('Kendaraan berhasil Check Out dan Memo Keluar resmi diterbitkan!');
      setShowCheckoutModal(null);
      changeTab('memo');
    },
    onError: (err: any) => toast.error('Gagal check out: ' + getApiErrorMessage(err)),
  });

  const changeTab = (tab: 'dashboard' | 'checkin' | 'booking' | 'onprogress' | 'selesai' | 'memo') => {
    setCurrentTab(tab);
    setActiveTab(`security-${tab}`);
  };

  const handleFillFromBooking = (b: BookingService) => {
    const saUser = picPetugasList.find((p) => p.peran === 'SA');
    setFormCheckin({
      no_polisi: b.no_polisi,
      nama_customer: b.nama_perusahaan || b.nama_customer || '',
      no_hp_customer: b.no_telepon || '',
      jenis_armada: (b.jenis_armada as any) || 'Truk',
      tujuan_kedatangan: 'Service',
      pic_tujuan: saUser ? `${saUser.nama_lengkap} (SA)` : 'Service Advisor',
      id_pic: saUser?.id || null,
      keperluan: b.keluhan ? b.keluhan.trim() : (b.keterangan || b.jenis_layanan || 'Service Kendaraan'),
      foto_kendaraan_masuk: '',
      catatan_security: `Booking #${b.no_booking || b.id} - ${b.jenis_layanan || 'Service'}${b.keluhan ? ` (${b.keluhan.trim()})` : ''}`,
      id_booking: b.id,
    });
    setSelectedBooking(b);
    changeTab('checkin');
    toast.success(`Data booking kendaraan ${b.no_polisi} (${b.nama_perusahaan || b.nama_customer || 'Pelanggan'}) berhasil diisi otomatis ke formulir check-in!`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Pos Security Header */}
      <div className="bg-surface-raised rounded-xl p-4 sm:p-5 border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent text-white flex items-center justify-center font-black shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-ink tracking-tight">SECURITY – BENGKEL KIM3</h1>
              <span className="px-2 py-0.5 rounded bg-accent-subtle text-accent text-xs font-bold tracking-wide border border-accent/30">
                POS UTAMA
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Gate Control &amp; Validasi Nopol Booking, Monitoring Kendaraan Realtime, dan Penerbitan Memo Keluar
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
                id_pic: null,
                keperluan: '',
                foto_kendaraan_masuk: '',
                catatan_security: '',
                id_booking: undefined,
              });
              changeTab('checkin');
            }}
            className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2"
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
            <StatCard
              title="Booking Hari Ini"
              value={`${bookingHariIni.length} Unit`}
              subtitle="Tercatat di sistem"
              icon={Calendar}
              tone="accent"
              onClick={() => changeTab('booking')}
            />
            <StatCard
              title="Kendaraan di Dalam Bengkel"
              value={`${onProgressList.length} Unit`}
              subtitle="Aktif di KIM 3"
              icon={Truck}
              tone="amber"
              onClick={() => changeTab('onprogress')}
            />
            <StatCard
              title="Keluar / Selesai Hari Ini"
              value={`${selesaiHariIni.length} Unit`}
              subtitle="Gate pass diverifikasi"
              icon={CheckCircle}
              tone="green"
              onClick={() => changeTab('selesai')}
            />
            <StatCard
              title="Memo Keluar Diterbitkan"
              value={`${memoList.length} Surat`}
              subtitle="Total surat jalan"
              icon={FileText}
              tone="blue"
              onClick={() => changeTab('memo')}
            />
          </div>

          {/* Gate Control Live Stream */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h2 className="text-sm font-bold text-ink">Live Aktivitas Gerbang Masuk &amp; Keluar Pos Security</h2>
                <p className="text-xs text-ink-muted">Pencatatan realtime seluruh kendaraan yang melintas di pos gerbang</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckinModal(true)}
                className="px-3 py-1.5 rounded-xl bg-accent-subtle text-accent hover:bg-accent hover:text-white font-bold text-xs transition-colors"
              >
                + Check In Langsung
              </button>
            </div>

            {checkinHariIni.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="Belum ada aktivitas gerbang hari ini"
                description="Check-in & check-out kendaraan yang tercatat hari ini akan muncul di sini secara realtime."
              />
            ) : (
            <div className="divide-y divide-border">
              {checkinHariIni.slice(0, 6).map((item) => (
                <div key={`feed-${item.id}`} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      item.status_kunjungan === 'Selesai' || item.status_kunjungan === 'Keluar'
                        ? 'bg-status-green-bg text-status-green'
                        : 'bg-accent-subtle text-accent'
                    }`}>
                      {item.status_kunjungan === 'Selesai' || item.status_kunjungan === 'Keluar' ? (
                        <LogOut className="w-4 h-4" />
                      ) : (
                        <Truck className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-ink">{item.no_polisi}</span>
                        <span className="text-xs font-semibold text-ink-muted">({item.nama_customer})</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-surface font-bold text-ink-muted border border-border">
                          {item.tujuan_kedatangan}
                        </span>
                      </div>
                      <div className="text-xs text-ink-subtle mt-0.5 font-mono">
                        Masuk: {new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB 
                        {item.waktu_keluar && ` • Keluar: ${new Date(item.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={labelStatusAntrian(item)} size="sm" />
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(item)}
                      className="px-2.5 py-1 text-xs font-bold text-accent hover:bg-accent-subtle rounded-xl transition-colors"
                    >
                      Detail →
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CHECK-IN KENDARAAN MASUK (Dedicated Split-View Form & Histori) */}
      {/* ========================================================= */}
      {currentTab === 'checkin' && (
        <div className="space-y-6">
          {/* Gate Control Live Stream — feed realtime aktivitas gerbang */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h2 className="text-sm font-bold text-ink">Live Aktivitas Gerbang Masuk &amp; Keluar Pos Security</h2>
                <p className="text-xs text-ink-muted">Pencatatan realtime seluruh kendaraan yang melintas di pos gerbang</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckinModal(true)}
                className="px-3 py-1.5 rounded-xl bg-accent-subtle text-accent hover:bg-accent hover:text-white font-bold text-xs transition-colors"
              >
                + Check In Langsung
              </button>
            </div>

            {checkinHariIni.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="Belum ada aktivitas gerbang hari ini"
                description="Check-in & check-out kendaraan yang tercatat hari ini akan muncul di sini secara realtime."
              />
            ) : (
              <div className="divide-y divide-border">
                {checkinHariIni.slice(0, 6).map((item) => (
                  <div key={`feed-checkin-${item.id}`} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        item.status_kunjungan === 'Selesai' || item.status_kunjungan === 'Keluar'
                          ? 'bg-status-green-bg text-status-green'
                          : 'bg-accent-subtle text-accent'
                      }`}>
                        {item.status_kunjungan === 'Selesai' || item.status_kunjungan === 'Keluar' ? (
                          <LogOut className="w-4 h-4" />
                        ) : (
                          <Truck className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-ink">{item.no_polisi}</span>
                          <span className="text-xs font-semibold text-ink-muted">({item.nama_customer})</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-surface font-bold text-ink-muted border border-border">
                            {item.tujuan_kedatangan}
                          </span>
                        </div>
                        <div className="text-xs text-ink-subtle mt-0.5 font-mono">
                          Masuk: {new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                          {item.waktu_keluar && ` • Keluar: ${new Date(item.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={labelStatusAntrian(item)} size="sm" />
                      <button
                        type="button"
                        onClick={() => setShowDetailModal(item)}
                        className="px-2.5 py-1 text-xs font-bold text-accent hover:bg-accent-subtle rounded-xl transition-colors"
                      >
                        Detail →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stack Layout: Form Check-In di atas, Riwayat Check-In Hari Ini di bawah */}
          <div className="space-y-6">
            {/* Form Check-In (full width) */}
            <div className="bg-surface-raised rounded-xl p-5 sm:p-6 border border-border shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-accent-subtle text-accent flex items-center justify-center font-bold">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">Formulir Validasi Gerbang</h3>
                    <p className="text-xs text-ink-muted">Lengkapi data kendaraan sebelum diarahkan ke area bengkel</p>
                  </div>
                </div>
                {formCheckin.id_booking && (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-accent-subtle text-accent border border-accent/30 text-xs font-bold">
                      Terkait Booking #{formCheckin.id_booking}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormCheckin({
                        no_polisi: '',
                        nama_customer: '',
                        no_hp_customer: '',
                        jenis_armada: 'Truk',
                        tujuan_kedatangan: 'Service',
                        pic_tujuan: '',
                        id_pic: undefined,
                        keperluan: '',
                        foto_kendaraan_masuk: '',
                        catatan_security: '',
                        id_booking: undefined,
                      })}
                      className="text-xs text-status-red hover:underline font-bold"
                    >
                      Reset Form
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Booking Selector: Tarik Langsung dari Booking Terdaftar */}
              {bookingList.length > 0 && (
                <div className="p-3 bg-accent-subtle/30 rounded-xl border border-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-ink">Ada {bookingList.length} Booking Terdaftar</div>
                      <div className="text-xs text-ink-muted">Tarik data booking kendaraan agar tidak perlu mengetik manual</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        const b = bookingList.find((item) => String(item.id) === e.target.value);
                        if (b) handleFillFromBooking(b);
                      }}
                      value={formCheckin.id_booking || ''}
                      className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-bold text-ink focus:ring-1 focus:ring-accent focus:outline-none"
                    >
                      <option value="">-- Pilih Booking untuk Isi Otomatis --</option>
                      {bookingList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.no_polisi} - {b.nama_customer || b.nama_perusahaan} ({b.jam_booking || 'Hari Ini'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Wajib pilih penerima kunjungan (PIC) — kunjungan tanpa
                  // penerima tidak bisa dikonfirmasi di modul role tujuan.
                  if (!formCheckin.id_pic) {
                    toast.warning('Pilih Penerima Kunjungan (PIC) terlebih dahulu — kunjungan tanpa penerima tidak bisa diproses.');
                    return;
                  }
                  checkinMutation.mutate(formCheckin);
                }}
                className="space-y-6 text-xs"
              >
                {/* Bagian 1: Identitas Kendaraan */}
                <div className="bg-surface p-4 sm:p-5 rounded-xl border border-border">
                  <h4 className="font-bold text-ink mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-ink-subtle" /> Identitas Kendaraan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-ink-muted mb-1.5">
                        Nomor Polisi (Plat Nomor) <span className="text-status-red">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: BK 1234 AB"
                          value={formCheckin.no_polisi}
                          onChange={(e) => setFormCheckin({ ...formCheckin, no_polisi: e.target.value.toUpperCase() })}
                          className="w-full px-4 py-3 rounded-xl border border-border text-sm sm:text-base font-black uppercase tracking-wider focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none bg-surface-raised shadow-2xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-ink-muted mb-1.5">Jenis Kendaraan</label>
                      <select
                        value={formCheckin.jenis_armada}
                        onChange={(e) => setFormCheckin({ ...formCheckin, jenis_armada: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-border font-bold focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none bg-surface-raised shadow-2xs"
                      >
                        <option value="Truk">Truk (Canter / Dutro / Tronton / Fuso)</option>
                        <option value="Mobil">Mobil Pribadi / Operasional</option>
                        <option value="Pickup">Pickup / Box Kecil</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pemilik terdaftar by plat (walk-in primary key, semua tujuan) */}
                {formCheckin.no_polisi.trim().length >= 3 && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    pemilikLoading
                      ? 'bg-surface border-border text-ink-muted'
                      : pemilikPlat
                      ? 'bg-status-green-bg border-status-green/30 text-status-green'
                      : 'bg-surface border-dashed border-border text-ink-muted'
                  }`}>
                    {pemilikLoading ? (
                      <span className="font-semibold">Mencari pemilik plat...</span>
                    ) : pemilikPlat ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">
                            Pemilik terdaftar: {pemilikPlat.nama_perusahaan || pemilikPlat.nama_lengkap || '-'}
                            {pemilikPlat.user_id ? ' (akun terhubung — notif otomatis terkirim)' : ' (belum ada akun user)'}
                          </div>
                          <div className="text-xs opacity-80 mt-0.5">
                            Plat sebagai kunci: riwayat check-in, SPK & invoice tercatat untuk plat ini.
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">Plat belum terdaftar di akun mana pun.</div>
                          <div className="text-xs opacity-80 mt-0.5">
                            Tetap diproses & tercatat by plat. Saat pemilik mendaftar + klaim plat ini, riwayat ikut masuk.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Bagian 2: Detail Kedatangan */}
                <div className="bg-surface p-4 sm:p-5 rounded-xl border border-border">
                  <h4 className="font-bold text-ink mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-accent" /> Detail Kedatangan
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold text-ink-muted mb-2">Tujuan Kedatangan <span className="text-status-red">*</span></label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { id: 'Service', label: '1. Service', desc: 'Diterima: SA' },
                          { id: 'Beli Part', label: '2. Beli Part', desc: 'Diterima: SA / Gudang' },
                          { id: 'Kunjungan', label: '3. Kunjungan', desc: 'Diterima: PIC / Staf' },
                          { id: 'Lainnya', label: '4. Lainnya', desc: 'Diterima: Staf' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              // Restrict penerima sesuai tujuan: auto-pilih kandidat
                              // pertama yang berhak, dropdown hanya menampilkan
                              // role yang diizinkan (Admin/Security/Customer tidak ada).
                              const kandidat = picPetugasList.filter((p) =>
                                (PIC_ROLE_ALLOWED[t.id] || []).includes(p.peran)
                              );
                              const pic = kandidat[0];
                              setFormCheckin({
                                ...formCheckin,
                                tujuan_kedatangan: t.id as any,
                                id_pic: pic?.id,
                                pic_tujuan: pic ? `${pic.nama_lengkap} (${pic.peran})` : '',
                              });
                            }}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              formCheckin.tujuan_kedatangan === t.id
                                ? 'border-accent bg-surface-raised text-accent font-bold ring-1 ring-accent/30 shadow-xs'
                                : 'border-border bg-surface-raised hover:border-accent/40 text-ink-muted shadow-2xs'
                            }`}
                          >
                            <div className="text-xs font-bold">{t.label}</div>
                            <div className="text-xs text-ink-subtle mt-1">{t.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block font-bold text-ink-muted mb-1.5">
                          Penerima Kunjungan (PIC)
                          {allowedPicRoles.length > 0 && (
                            <span className="font-normal text-ink-subtle"> — hanya {allowedPicRoles.join(' / ')}</span>
                          )}
                        </label>
                        <select
                          value={formCheckin.id_pic ? String(formCheckin.id_pic) : formCheckin.pic_tujuan}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = picDiperbolehkan.find((p) => String(p.id) === val);
                            if (found) {
                              setFormCheckin({
                                ...formCheckin,
                                id_pic: found.id,
                                pic_tujuan: `${found.nama_lengkap} (${found.peran})`,
                              });
                            } else {
                              setFormCheckin({
                                ...formCheckin,
                                id_pic: undefined,
                                pic_tujuan: val,
                              });
                            }
                          }}
                          className="w-full px-4 py-2.5 rounded-xl border border-border font-semibold focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none bg-surface-raised shadow-2xs"
                        >
                          <option value="">
                            {picDiperbolehkan.length > 0
                              ? '-- Pilih Penerima Kunjungan --'
                              : `Tidak ada staf ${allowedPicRoles.join('/')} aktif`}
                          </option>
                          {picDiperbolehkan.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.nama_lengkap} ({p.peran})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-ink-subtle mt-1">
                          Penerima akan menerima notifikasi &amp; konfirmasi kunjungan di modulnya masing-masing.
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-ink-muted mb-1.5">Keperluan Singkat / Keluhan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Ganti oli rutin, servis rem, meeting"
                          value={formCheckin.keperluan}
                          onChange={(e) => setFormCheckin({ ...formCheckin, keperluan: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none bg-surface-raised shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bagian 3: Data Customer & Dokumentasi */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-surface p-4 sm:p-5 rounded-xl border border-border space-y-4">
                    <h4 className="font-bold text-ink flex items-center gap-2">
                      <User className="w-4 h-4 text-ink-subtle" /> Data Pengemudi / PIC
                    </h4>
                    <div>
                      <label className="block font-bold text-ink-muted mb-1.5">Nama Customer / Perusahaan</label>
                      <input
                        type="text"
                        placeholder="Contoh: PT. Andi Jaya"
                        value={formCheckin.nama_customer}
                        onChange={(e) => setFormCheckin({ ...formCheckin, nama_customer: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none bg-surface-raised shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-ink-muted mb-1.5">No. HP Driver / PIC</label>
                      <input
                        type="text"
                        placeholder="0812-xxxx-xxxx"
                        value={formCheckin.no_hp_customer}
                        onChange={(e) => setFormCheckin({ ...formCheckin, no_hp_customer: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none bg-surface-raised shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-surface p-4 sm:p-5 rounded-xl border border-border space-y-4">
                    <h4 className="font-bold text-ink flex items-center gap-2">
                      <Camera className="w-4 h-4 text-ink-subtle" /> Dokumentasi &amp; Catatan
                    </h4>
                    <PhotoUploader
                      label="Foto Kendaraan Saat Masuk Gerbang"
                      value={formCheckin.foto_kendaraan_masuk}
                      onChange={(url) => setFormCheckin({ ...formCheckin, foto_kendaraan_masuk: url })}
                    />
                    <div>
                      <label className="block font-bold text-ink-muted mb-1.5">Catatan Security</label>
                      <textarea
                        rows={2}
                        placeholder="Catatan kondisi awal fisik atau kelengkapan kendaraan..."
                        value={formCheckin.catatan_security}
                        onChange={(e) => setFormCheckin({ ...formCheckin, catatan_security: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none bg-surface-raised shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
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
                        id_pic: null,
                        keperluan: '',
                        foto_kendaraan_masuk: '',
                        catatan_security: '',
                        id_booking: undefined,
                      });
                    }}
                    className="px-6 py-3.5 rounded-xl bg-surface hover:bg-border text-ink-muted font-bold transition-all border border-border"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={checkinMutation.isPending}
                    className="flex-1 py-3.5 bg-accent hover:bg-accent-hover text-white font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <PlusCircle className="w-5 h-5" />
                    {checkinMutation.isPending ? 'Menyimpan ke Sistem...' : 'SUBMIT CHECK-IN KENDARAAN'}
                  </button>
                </div>
              </form>
            </div>

            {/* Riwayat Check-In Hari Ini (full width, di bawah form) */}
            <div className="bg-surface-raised rounded-xl p-5 sm:p-6 border border-border shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Riwayat Check-In Hari Ini</h3>
                    <p className="text-xs text-ink-muted">Daftar unit yang baru masuk gerbang</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-status-green-bg text-status-green border border-status-green/20 text-xs font-black tabular-nums">
                    {checkinHariIni.length} Unit
                  </span>
                </div>

                {/* Quick List */}
                <div className="divide-y divide-border max-h-[580px] overflow-y-auto space-y-2 pt-2">
                  {checkinHariIni.length === 0 ? (
                    <div className="py-12 text-center text-ink-subtle">
                      <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-xs">Belum ada kendaraan yang di-check in hari ini</p>
                    </div>
                  ) : (
                    checkinHariIni.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 px-3 hover:bg-surface rounded-xl transition-all border border-transparent hover:border-border flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded bg-surface-dark text-white font-mono font-black text-xs tracking-wider">
                              {item.no_polisi}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-accent-subtle text-accent border border-accent/30 text-xs font-bold">
                              {item.tujuan_kedatangan}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-ink">
                            {item.nama_customer || '-'}
                          </div>
                          <div className="text-xs text-ink-subtle flex items-center gap-2 font-mono">
                            <Clock className="w-3 h-3 text-ink-subtle" />
                            <span>
                              {item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-ink-muted">{item.pic_tujuan || '-'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <StatusBadge status={item.status_kunjungan} />
                          <button
                            type="button"
                            onClick={() => setShowDetailModal(item)}
                            className="text-xs font-bold text-accent hover:text-accent-hover"
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
              <div className="p-3.5 rounded-xl bg-surface border border-border text-ink-muted text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
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
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs space-y-4">
            
            {/* Header & Filter Controls matching screenshot */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-accent text-white font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-bold text-ink tracking-tight uppercase">
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
                    className="pl-3.5 pr-8 py-1.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none w-64 bg-surface-raised text-ink"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-ink-subtle" />
                </div>

                <label className="flex items-center gap-1.5 bg-surface-raised border border-border rounded-xl px-2.5 py-1.5 text-xs text-ink-muted cursor-pointer hover:border-accent/40 transition-colors" title="Filter tanggal booking">
                  <span className="text-ink-subtle font-medium">Tanggal</span>
                  <input
                    type="date"
                    value={bookingTanggal}
                    onChange={(e) => {
                      setBookingTanggal(e.target.value);
                      setBookingPage(1);
                    }}
                    className="bg-transparent text-xs font-bold text-ink focus:outline-none cursor-pointer"
                    aria-label="Filter tanggal booking"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowBookingFilter((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${showBookingFilter ? 'border-accent bg-accent-subtle text-accent' : 'border-border bg-surface-raised hover:bg-surface text-ink-muted'}`}
                  aria-expanded={showBookingFilter}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter
                </button>
              </div>

              {/* Panel filter expandable */}
              {showBookingFilter && (
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface border border-border">
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <span className="font-semibold">Status:</span>
                    <select
                      value={bookingStatus}
                      onChange={(e) => {
                        setBookingStatus(e.target.value);
                        setBookingPage(1);
                      }}
                      className="px-2 py-1.5 rounded-xl border border-border bg-surface-raised text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                    >
                      {bookingStatusOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  {(bookingTanggal || bookingStatus !== 'Semua' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBookingTanggal('');
                        setBookingStatus('Semua');
                        setSearchQuery('');
                        setBookingPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-status-red hover:bg-status-red-bg transition-colors"
                    >
                      Reset filter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Daftar Booking memakai ListItemCard */}
            <div className="space-y-2.5">
              {filteredBookingList.length === 0 ? (
                <EmptyState
                  title="Tidak ada data booking kendaraan"
                  description="Booking yang sudah di-check-in tidak muncul lagi di sini — cek tab Nopol di Bengkel atau Telah Keluar."
                  icon={Calendar}
                />
              ) : (
                paginatedBookingList.map((b) => {
                  const isSelected = selectedBooking?.id === b.id;
                  return (
                    <ListItemCard
                      key={b.id}
                      selected={isSelected}
                      title={`${b.no_polisi} — ${b.nama_customer || b.nama_perusahaan}`}
                      subtitle={`${b.tujuan_kunjungan || b.jenis_layanan || 'Service'} • Tgl: ${b.tanggal_booking} Jam: ${b.jam_booking}`}
                      badge={<StatusBadge status={b.status} size="sm" />}
                      chips={[b.jenis_armada || 'Truk']}
                      onClick={() => {
                        setSelectedBooking(b);
                        setBookingPreview(b);
                      }}
                      actions={
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFillFromBooking(b);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 shrink-0"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Isi Check-In
                        </button>
                      }
                    />
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            <PaginationBar
              page={bookingPage}
              totalPages={totalBookingPages}
              totalRecords={totalBooking}
              limit={bookingLimit}
              onPageChange={setBookingPage}
              onLimitChange={(l) => {
                setBookingLimit(l);
                setBookingPage(1);
              }}
              label="booking kendaraan"
            />

            {/* MODAL: Detail Booking + PILIH & ISI OTOMATIS */}
            <DetailModal
              open={!!bookingPreview}
              onClose={() => setBookingPreview(null)}
              title={bookingPreview ? `Detail Booking: ${bookingPreview.no_polisi}` : 'Detail Booking'}
              subtitle={bookingPreview ? `${bookingPreview.nama_customer || bookingPreview.nama_perusahaan || '-'} • ${bookingPreview.tujuan_kunjungan || 'Service'}` : undefined}
              badge={bookingPreview ? <StatusBadge status={bookingPreview.status} /> : undefined}
              footer={
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setBookingPreview(null)}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-surface text-ink font-bold text-xs transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (bookingPreview) handleFillFromBooking(bookingPreview);
                      setBookingPreview(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    PILIH &amp; ISI OTOMATIS
                  </button>
                </div>
              }
              size="md"
            >
              {bookingPreview && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-ink-subtle text-xs">No. Polisi</div>
                    <div className="text-base font-bold text-ink mt-0.5 font-mono">{bookingPreview.no_polisi}</div>
                    <div className="text-ink-subtle text-xs mt-2">Jenis Kendaraan</div>
                    <div className="font-semibold text-ink">{bookingPreview.jenis_armada || 'Truk'}</div>
                    <div className="text-ink-subtle text-xs mt-2">Tujuan Kunjungan</div>
                    <div className="font-semibold text-ink">{bookingPreview.tujuan_kunjungan || 'Service'}</div>
                  </div>

                  <div>
                    <div className="text-ink-subtle text-xs">Nama Customer</div>
                    <div className="font-bold text-ink mt-0.5">{bookingPreview.nama_customer || bookingPreview.nama_perusahaan || '-'}</div>
                    <div className="text-ink-subtle text-xs mt-2">No. Telepon</div>
                    <div className="font-mono text-ink-muted font-semibold">{bookingPreview.no_telepon || '-'}</div>
                    <div className="text-ink-subtle text-xs mt-2">PIC / Driver</div>
                    <div className="font-semibold text-ink">{bookingPreview.pic_driver || '-'}</div>
                  </div>

                  <div>
                    <div className="text-ink-subtle text-xs">Tanggal Booking</div>
                    <div className="font-bold text-ink mt-0.5">{bookingPreview.tanggal_booking}</div>
                    <div className="text-ink-subtle text-xs mt-2">Jam Booking</div>
                    <div className="font-mono font-bold text-accent">{bookingPreview.jam_booking}</div>
                    <div className="text-ink-subtle text-xs mt-2">Keterangan</div>
                    <div className="text-ink-muted italic text-xs">{bookingPreview.keterangan || '-'}</div>
                  </div>
                </div>
              )}
            </DetailModal>

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
            <div className="bg-surface-raised p-3.5 rounded-xl border border-border shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-ink-muted font-semibold leading-tight">Total On Progress</div>
                <div className="text-xl font-black text-ink mt-0.5">{countTotalOnProgress} <span className="text-xs font-medium text-ink-subtle">Unit</span></div>
              </div>
            </div>

            {/* Sedang Dikerjakan */}
            <div className="bg-surface-raised p-3.5 rounded-xl border border-border shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-status-amber-bg text-status-amber flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-ink-muted font-semibold leading-tight">Sedang Dikerjakan</div>
                <div className="text-xl font-black text-status-amber mt-0.5">{countSedangDikerjakan} <span className="text-xs font-medium text-ink-subtle">Unit</span></div>
              </div>
            </div>

            {/* Menunggu Part / Approval */}
            <div className="bg-surface-raised p-3.5 rounded-xl border border-border shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-status-amber-bg text-status-amber flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-ink-muted font-semibold leading-tight">Menunggu Part / Approval</div>
                <div className="text-xl font-black text-status-amber mt-0.5">{countMenungguPart} <span className="text-xs font-medium text-ink-subtle">Unit</span></div>
              </div>
            </div>

            {/* Menunggu QC */}
            <div className="bg-surface-raised p-3.5 rounded-xl border border-border shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-ink-muted font-semibold leading-tight">Menunggu QC</div>
                <div className="text-xl font-black text-accent mt-0.5">{countMenungguQC} <span className="text-xs font-medium text-ink-subtle">Unit</span></div>
              </div>
            </div>
          </div>

          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs space-y-4">
            
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-xl bg-accent text-white font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-black text-ink tracking-tight uppercase">
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
                    className="pl-3.5 pr-8 py-1.5 rounded-xl border border-border text-xs focus:ring-1 focus:ring-accent focus:outline-none w-64 bg-surface-raised text-ink"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-ink-subtle" />
                </div>

                <label className="flex items-center gap-1.5 bg-surface-raised border border-border rounded-xl px-2.5 py-1.5 text-xs text-ink-muted cursor-pointer hover:border-accent/40 transition-colors" title="Filter tanggal masuk">
                  <span className="text-ink-subtle font-medium">Tanggal</span>
                  <input
                    type="date"
                    value={onProgressTanggal}
                    onChange={(e) => {
                      setOnProgressTanggal(e.target.value);
                      setOnProgressPage(1);
                    }}
                    className="bg-transparent text-xs font-bold text-ink focus:outline-none cursor-pointer"
                    aria-label="Filter tanggal masuk"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowOnProgressFilter((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${showOnProgressFilter ? 'border-accent bg-accent-subtle text-accent' : 'border-border bg-surface hover:bg-surface-raised text-ink'}`}
                  aria-expanded={showOnProgressFilter}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter
                </button>
              </div>

              {/* Panel filter expandable */}
              {showOnProgressFilter && (
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface border border-border">
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <span className="font-semibold">Status:</span>
                    <select
                      value={onProgressStatus}
                      onChange={(e) => {
                        setOnProgressStatus(e.target.value);
                        setOnProgressPage(1);
                      }}
                      className="px-2 py-1.5 rounded-xl border border-border bg-surface-raised text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                    >
                      {onProgressStatusOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  {(onProgressTanggal || onProgressStatus !== 'Semua' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setOnProgressTanggal('');
                        setOnProgressStatus('Semua');
                        setSearchQuery('');
                        setOnProgressPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-status-red hover:bg-status-red-bg transition-colors"
                    >
                      Reset filter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Daftar On Progress memakai ListItemCard */}
            <div className="space-y-2.5">
              {filteredOnProgressList.length === 0 ? (
                <EmptyState
                  title="Tidak ada kendaraan on progress"
                  description="Tidak ada kendaraan yang sedang diproses di bengkel saat ini."
                  icon={Truck}
                />
              ) : (
                paginatedOnProgressList.map((item) => (
                  <ListItemCard
                    key={item.id}
                    title={`${item.no_polisi} — ${item.nama_customer}`}
                    subtitle={`${item.tujuan_kedatangan} • Masuk: ${item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} • PIC: ${item.nama_mekanik || item.pic_tujuan || '-'}`}
                    badge={<StatusBadge status={labelStatusAntrian(item)} size="sm" />}
                    chips={[item.jenis_armada || 'Truk']}
                    onClick={() => setShowDetailModal(item)}
                    actions={
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDetailModal(item);
                          }}
                          className="px-2.5 py-1.5 rounded-xl border border-border text-ink hover:bg-surface font-bold text-xs transition-colors shrink-0"
                        >
                          Detail
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCheckoutModal(item);
                            setFormCheckout({
                              barang_dibawa_keluar: false,
                              detail_barang_keluar: '',
                              foto_kendaraan_keluar: '',
                              foto_barang: '',
                              no_memo_keluar: '',
                            });
                          }}
                          title={siapCheckout(item) ? 'SPK selesai — unit siap dikeluarkan' : 'Check-out kendaraan'}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0 ${
                            siapCheckout(item)
                              ? 'bg-status-green hover:bg-status-green/90 text-white'
                              : 'bg-accent hover:bg-accent-hover text-white'
                          }`}
                        >
                          <LogOut className="w-3.5 h-3.5" /> Check Out
                        </button>
                      </div>
                    }
                  />
                ))
              )}
            </div>

            {/* Pagination Controls */}
            <PaginationBar
              page={onProgressPage}
              totalPages={totalOnProgressPages}
              totalRecords={totalOnProgress}
              limit={onProgressLimit}
              onPageChange={setOnProgressPage}
              onLimitChange={(l) => {
                setOnProgressLimit(l);
                setOnProgressPage(1);
              }}
              label="kendaraan di bengkel"
            />

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SELURUH NOPOL TELAH MENINGGALKAN BENGKEL (Excel 3)     */}
      {/* ========================================================= */}
      {currentTab === 'selesai' && (
        <div className="space-y-5">
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs space-y-4">
            
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-xl bg-accent text-white font-black text-xs flex items-center justify-center">
                  3
                </span>
                <h2 className="text-sm font-black text-ink tracking-tight uppercase">
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
                    className="pl-3.5 pr-8 py-1.5 rounded-xl border border-border text-xs focus:ring-1 focus:ring-accent focus:outline-none w-64 bg-surface-raised text-ink"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-ink-subtle" />
                </div>

                <label className="flex items-center gap-1.5 bg-surface-raised border border-border rounded-xl px-2.5 py-1.5 text-xs text-ink-muted cursor-pointer hover:border-accent/40 transition-colors" title="Filter tanggal keluar (mengalahkan pill rentang)">
                  <span className="text-ink-subtle font-medium">Tanggal</span>
                  <input
                    type="date"
                    value={selesaiTanggal}
                    onChange={(e) => {
                      setSelesaiTanggal(e.target.value);
                      if (e.target.value) setSelesaiTimeRange('Semua');
                      setSelesaiPage(1);
                    }}
                    className="bg-transparent text-xs font-bold text-ink focus:outline-none cursor-pointer"
                    aria-label="Filter tanggal keluar"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowSelesaiFilter((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${showSelesaiFilter ? 'border-accent bg-accent-subtle text-accent' : 'border-border bg-surface hover:bg-surface-raised text-ink'}`}
                  aria-expanded={showSelesaiFilter}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter
                </button>
              </div>
            </div>

            {/* Panel filter expandable */}
            {showSelesaiFilter && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface border border-border mb-4">
                <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <span className="font-semibold">Status:</span>
                  <select
                    value={selesaiStatus}
                    onChange={(e) => {
                      setSelesaiStatus(e.target.value);
                      setSelesaiPage(1);
                    }}
                    className="px-2 py-1.5 rounded-xl border border-border bg-surface-raised text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                  >
                    {selesaiStatusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                {(selesaiTanggal || selesaiStatus !== 'Semua' || searchQuery || selesaiTimeRange !== 'Semua') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelesaiTanggal('');
                      setSelesaiStatus('Semua');
                      setSelesaiTimeRange('Semua');
                      setSearchQuery('');
                      setSelesaiPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-status-red hover:bg-status-red-bg transition-colors"
                  >
                    Reset filter
                  </button>
                )}
              </div>
            )}

            {/* Filter Pills matching Excel screenshot: Semua, Hari Ini, Kemarin, Minggu Ini, Bulan Ini */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['Semua', 'Hari Ini', 'Kemarin', 'Minggu Ini', 'Bulan Ini'] as const).map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => {
                    setSelesaiTimeRange(pill);
                    setSelesaiTanggal('');
                    setSelesaiPage(1);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    selesaiTimeRange === pill
                      ? 'bg-accent text-white shadow-xs'
                      : 'bg-surface text-ink-muted hover:bg-border/60'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Mobile View: ListItemCard */}
            <div className="block md:hidden space-y-2.5">
              {filteredSelesaiList.length === 0 ? (
                <EmptyState
                  title="Tidak ada riwayat kendaraan selesai"
                  description="Belum ada riwayat kendaraan yang selesai pada periode ini."
                  icon={CheckCircle2}
                />
              ) : (
                paginatedSelesaiList.map((item) => (
                  <ListItemCard
                    key={item.id}
                    title={`${item.no_polisi} — ${item.nama_customer}`}
                    subtitle={`${item.tujuan_kedatangan} • Masuk: ${item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} • Keluar: ${item.waktu_keluar ? new Date(item.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}`}
                    badge={<StatusBadge status="Selesai" size="sm" />}
                    chips={[item.jenis_armada || 'Truk']}
                    onClick={() => setShowDetailModal(item)}
                    actions={
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetailModal(item);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-border text-ink hover:bg-surface font-bold text-xs transition-colors shrink-0"
                      >
                        Detail
                      </button>
                    }
                  />
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-ink-muted border-y border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-bold w-12">No.</th>
                    <th className="py-2.5 px-3 font-bold">No. Polisi</th>
                    <th className="py-2.5 px-3 font-bold">Nama Customer</th>
                    <th className="py-2.5 px-3 font-bold">Jenis Kendaraan</th>
                    <th className="py-2.5 px-3 font-bold">Tujuan</th>
                    <th className="py-2.5 px-3 font-bold">Masuk</th>
                    <th className="py-2.5 px-3 font-bold">Keluar</th>
                    <th className="py-2.5 px-3 font-bold text-center">Status</th>
                    <th className="py-2.5 px-3 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSelesaiList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-ink-subtle font-medium">
                        Tidak ada riwayat kendaraan selesai.
                      </td>
                    </tr>
                  ) : (
                    paginatedSelesaiList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-surface/80 transition-colors">
                        <td className="py-3 px-3 text-ink-muted font-semibold">{(selesaiPage - 1) * selesaiLimit + idx + 1}</td>
                        <td className="py-3 px-3 font-black text-ink tracking-wide">{item.no_polisi}</td>
                        <td className="py-3 px-3 text-ink font-medium">{item.nama_customer}</td>
                        <td className="py-3 px-3 text-ink-muted">{item.jenis_armada}</td>
                        <td className="py-3 px-3 text-ink font-medium">{item.tujuan_kedatangan}</td>
                        <td className="py-3 px-3 text-ink font-mono text-xs">
                          <div>{item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                          <div className="text-ink-subtle font-medium">{item.waktu_masuk ? new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                        </td>
                        <td className="py-3 px-3 text-ink font-mono text-xs">
                          <div>{item.waktu_keluar ? new Date(item.waktu_keluar).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                          <div className="text-ink-subtle font-medium">{item.waktu_keluar ? new Date(item.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-xl bg-status-green-bg text-status-green font-bold text-xs">
                            Selesai
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setShowDetailModal(item)}
                            className="px-3 py-1 rounded-xl border border-border text-ink hover:bg-surface font-bold text-xs transition-colors"
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
            <PaginationBar
              page={selesaiPage}
              totalPages={totalSelesaiPages}
              totalRecords={totalSelesai}
              limit={selesaiLimit}
              onPageChange={setSelesaiPage}
              onLimitChange={(l) => {
                setSelesaiLimit(l);
                setSelesaiPage(1);
              }}
              label="riwayat keluar"
            />

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MEMO KELUAR & PREVIEW RESMI (Excel Screen 4)           */}
      {/* ========================================================= */}
      {currentTab === 'memo' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-xl bg-accent text-white font-black text-xs flex items-center justify-center">
              4
            </span>
            <h2 className="text-sm font-black text-ink tracking-tight uppercase">
              MEMO KELUAR
            </h2>
          </div>

          {/* LIST MEMO KELUAR (full width — preview pindah ke modal) */}
          <div className="bg-surface-raised rounded-xl border border-border p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-ink tracking-wider">
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
                    className="w-full pl-3 pr-7 py-1.5 rounded-xl border border-border text-xs focus:ring-1 focus:ring-accent focus:outline-none bg-surface-raised text-ink"
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-ink-subtle" />
                </div>

                <label className="flex items-center gap-1.5 bg-surface-raised border border-border rounded-xl px-2 py-1.5 text-xs text-ink-muted cursor-pointer hover:border-accent/40 transition-colors" title="Filter tanggal memo keluar">
                  <span className="text-ink-subtle font-medium">Tanggal</span>
                  <input
                    type="date"
                    value={memoTanggal}
                    onChange={(e) => {
                      setMemoTanggal(e.target.value);
                      setMemoPage(1);
                    }}
                    className="bg-transparent text-xs font-bold text-ink focus:outline-none cursor-pointer"
                    aria-label="Filter tanggal memo keluar"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowMemoFilter((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors ${showMemoFilter ? 'border-accent bg-accent-subtle text-accent' : 'border-border bg-surface hover:bg-surface-raised text-ink'}`}
                  aria-expanded={showMemoFilter}
                >
                  <Filter className="w-3 h-3" />
                  Filter
                </button>
              </div>

              {/* Panel filter expandable */}
              {showMemoFilter && (
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface border border-border">
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <span className="font-semibold">Tujuan:</span>
                    <select
                      value={memoTujuan}
                      onChange={(e) => {
                        setMemoTujuan(e.target.value);
                        setMemoPage(1);
                      }}
                      className="px-2 py-1.5 rounded-xl border border-border bg-surface-raised text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                    >
                      {memoTujuanOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  {(memoTanggal || memoTujuan !== 'Semua' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMemoTanggal('');
                        setMemoTujuan('Semua');
                        setSearchQuery('');
                        setMemoPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-status-red hover:bg-status-red-bg transition-colors"
                    >
                      Reset filter
                    </button>
                  )}
                </div>
              )}

              {/* Mobile View: ListItemCard */}
              <div className="block md:hidden space-y-2.5">
                {filteredMemoList.length === 0 ? (
                  <EmptyState
                    title="Tidak ada data memo keluar"
                    description="Belum ada memo keluar kendaraan yang tercatat."
                    icon={FileText}
                  />
                ) : (
                  paginatedMemoList.map((m) => {
                    const isSelected = selectedMemo?.id === m.id;
                    return (
                      <ListItemCard
                        key={m.id}
                        selected={isSelected}
                        title={`${m.no_memo} — ${m.no_polisi}`}
                        subtitle={`${m.nama_customer} • Keluar: ${new Date(m.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        badge={<StatusBadge status="Selesai" size="sm" />}
                        chips={[m.jenis_armada || 'Truk']}
                        onClick={() => setSelectedMemo(m)}
                        actions={
                          <div className="flex items-center gap-1.5 text-ink-muted">
                            <button
                              type="button"
                              title="Lihat Preview"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMemo(m);
                              }}
                              className="p-1.5 hover:text-accent rounded-lg transition-colors border border-border"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Cetak Memo A4"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMemo(m);
                                setShowPrintMemo(m);
                              }}
                              className="p-1.5 hover:text-ink rounded-lg transition-colors border border-border"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        }
                      />
                    );
                  })
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-ink-muted border-y border-border">
                    <tr>
                      <th className="py-2.5 px-2.5 font-bold w-8">No.</th>
                      <th className="py-2.5 px-2.5 font-bold">No. Memo</th>
                      <th className="py-2.5 px-2.5 font-bold">No. Polisi</th>
                      <th className="py-2.5 px-2.5 font-bold">Nama Customer</th>
                      <th className="py-2.5 px-2.5 font-bold">Keluar</th>
                      <th className="py-2.5 px-2.5 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMemoList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-ink-subtle font-medium">
                          Tidak ada data memo keluar.
                        </td>
                      </tr>
                    ) : (
                      paginatedMemoList.map((m, idx) => {
                        const isSelected = selectedMemo?.id === m.id;
                        return (
                          <tr 
                            key={m.id}
                            onClick={() => setSelectedMemo(m)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-accent-subtle/80 font-medium' : 'hover:bg-surface/70'
                            }`}
                          >
                            <td className="py-2.5 px-2.5 text-ink-muted font-semibold">{(memoPage - 1) * memoLimit + idx + 1}</td>
                            <td className="py-2.5 px-2.5 font-mono font-bold text-accent">{m.no_memo}</td>
                            <td className="py-2.5 px-2.5 font-bold text-ink">{m.no_polisi}</td>
                            <td className="py-2.5 px-2.5 text-ink">{m.nama_customer}</td>
                            <td className="py-2.5 px-2.5 text-ink-muted font-mono text-xs">
                              <div>{new Date(m.waktu_keluar || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div className="text-ink-subtle font-medium">{new Date(m.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="py-2.5 px-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5 text-ink-muted">
                              <button
                                type="button"
                                title="Lihat Preview"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMemo(m);
                                }}
                                className="p-1 hover:text-accent rounded transition-colors"
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
                                className="p-1 hover:text-ink rounded transition-colors"
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
              <PaginationBar
                page={memoPage}
                totalPages={totalMemoPages}
                totalRecords={totalMemo}
                limit={memoLimit}
                onPageChange={setMemoPage}
                onLimitChange={(l) => {
                  setMemoLimit(l);
                  setMemoPage(1);
                }}
                label="memo keluar"
              />
            </div>

      {/* MODAL: PREVIEW MEMO KELUAR (Formal Letter Format) */}
      {selectedMemo && (
        <DetailModal
          open={Boolean(selectedMemo)}
          onClose={() => setSelectedMemo(null)}
          title="PREVIEW MEMO KELUAR"
          subtitle="Format Resmi Pos Security"
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setSelectedMemo(null)}
                className="px-4 py-2.5 rounded-xl border border-border hover:bg-surface text-ink font-bold text-xs transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => setShowPrintMemo(selectedMemo)}
                className="px-4 py-2.5 rounded-xl border border-border hover:bg-surface text-ink font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                CETAK MEMO (A4)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                EXPORT PDF
              </button>
            </div>
          }
        >
          {/* Formal Letter Paper Area */}
          <div id="formal-memo-printable" className="p-6 bg-surface-raised rounded-xl border border-border shadow-xs space-y-4 text-xs font-sans">

            {/* Official Letterhead / Kop Surat */}
            <div className="border-b-2 border-ink pb-3 flex items-start justify-between">
              <div>
                <div className="text-base font-black text-ink tracking-wider">BENGKEL KIM 3 MEDAN</div>
                <div className="text-xs text-ink-muted">Kawasan Industri Medan III, Jl. Pelita Raya No. 88</div>
                <div className="text-xs text-ink-subtle">Security Division &amp; Gate Control Portal</div>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-ink tracking-tight">MEMO KELUAR</div>
                <div className="font-mono text-xs font-black text-accent">{selectedMemo.no_memo}</div>
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-4 text-xs pb-1 border-b border-border">
              <div>
                <span className="text-ink-subtle text-xs block">Tanggal Keluar:</span>
                <span className="font-bold text-ink">
                  {new Date(selectedMemo.waktu_keluar || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="text-right sm:text-left">
                <span className="text-ink-subtle text-xs block">Jam Keluar:</span>
                <span className="font-mono font-bold text-ink">
                  {new Date(selectedMemo.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                </span>
              </div>
            </div>

            {/* DATA KENDARAAN */}
            <div>
              <div className="text-xs font-black uppercase text-ink tracking-wide mb-2">
                DATA KENDARAAN
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
                <div className="flex">
                  <span className="w-28 text-ink-muted">No. Polisi</span>
                  <span className="font-black text-ink">: {selectedMemo.no_polisi}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-ink-muted">Jenis Kendaraan</span>
                  <span className="font-semibold text-ink">: {selectedMemo.jenis_armada || 'Truk'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-ink-muted">Nama Customer</span>
                  <span className="font-semibold text-ink">: {selectedMemo.nama_customer}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-ink-muted">Tujuan Kunjungan</span>
                  <span className="font-semibold text-ink">: {selectedMemo.tujuan_kedatangan}</span>
                </div>
              </div>
            </div>

            {/* KETERANGAN */}
            <div className="pt-2 border-t border-border">
              <div className="text-xs font-black uppercase text-ink tracking-wide mb-1.5">
                KETERANGAN
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-20 text-ink-muted">Status</span>
                  <span className="font-bold text-status-green">: Selesai</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-20 text-ink-muted shrink-0">Catatan</span>
                  <span className="text-ink">: {selectedMemo.catatan || 'Pekerjaan telah selesai dan kendaraan dalam kondisi baik.'}</span>
                </div>
              </div>
            </div>

            {/* Official Signature Box matching Excel */}
            <div className="pt-5 flex items-end justify-between text-center">
              <div>
                <div className="text-xs text-ink-subtle mb-8">Penerima / Driver,</div>
                <div className="font-bold text-ink border-t border-border pt-1 px-3">
                  ( {selectedMemo.nama_customer || 'Driver'} )
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-xs text-ink-subtle mb-2">Dibuat oleh,</div>

                {/* Signature graphic/stamp simulation */}
                <div className="w-20 h-10 border border-accent/40 rounded-xl bg-accent-subtle/50 flex items-center justify-center text-xs text-accent font-serif italic mb-1 transform -rotate-3">
                  Security
                </div>

                <div className="font-black text-ink text-xs">
                  {selectedMemo.petugas_security || '( Petugas Security )'}
                </div>
                <div className="text-xs text-ink-subtle">Security Bengkel KIM 3</div>
              </div>
            </div>

          </div>
        </DetailModal>
      )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CHECK-IN KENDARAAN MASUK (3-Step Wizard)           */}
      {/* ========================================================= */}
      {showCheckinModal && (
        <StepModal
          open={showCheckinModal}
          onClose={() => {
            setShowCheckinModal(false);
            setCheckinStep(0);
          }}
          title="Check-In Kendaraan Masuk"
          subtitle="Pencatatan gerbang pos security Bengkel KIM 3"
          currentStep={checkinStep}
          onNext={() => {
            if (checkinStep === 0 && !formCheckin.no_polisi.trim()) {
              toast.error('Plat Nomor Wajib', 'Silakan masukkan nomor polisi kendaraan.');
              return;
            }
            setCheckinStep((s) => Math.min(s + 1, 2));
          }}
          onBack={() => setCheckinStep((s) => Math.max(s - 1, 0))}
          onSubmit={() => {
            if (!formCheckin.no_polisi.trim()) {
              toast.error('Plat Nomor Wajib', 'Silakan masukkan nomor polisi kendaraan.');
              return;
            }
            checkinMutation.mutate(formCheckin);
          }}
          submitLabel="Submit Check-In Kendaraan"
          isPending={checkinMutation.isPending}
          size="lg"
          steps={[
            {
              id: 'kendaraan',
              label: 'Data Kendaraan',
              isValid: !!formCheckin.no_polisi.trim(),
              content: (
                <div className="space-y-4 text-xs">
                  {bookingList.length > 0 && (
                    <div className="p-3 bg-accent-subtle/50 rounded-xl border border-accent/30 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-ink">Ada {bookingList.length} Booking Terdaftar</div>
                          <div className="text-xs text-ink-muted">Pilih kendaraan untuk mengisi formulir otomatis</div>
                        </div>
                      </div>
                      <select
                        onChange={(e) => {
                          const b = bookingList.find((item) => String(item.id) === e.target.value);
                          if (b) handleFillFromBooking(b);
                        }}
                        value={formCheckin.id_booking || ''}
                        className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-bold text-ink focus:ring-1 focus:ring-accent focus:outline-none"
                      >
                        <option value="">-- Pilih Booking untuk Isi Otomatis --</option>
                        {bookingList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.no_polisi} - {b.nama_customer || b.nama_perusahaan} ({b.jam_booking || 'Hari Ini'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-ink mb-1">
                        Nomor Polisi (Plat Nomor) <span className="text-status-red">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: BK 1234 AB"
                        value={formCheckin.no_polisi}
                        onChange={(e) => setFormCheckin({ ...formCheckin, no_polisi: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm font-black uppercase tracking-wider focus:ring-1 focus:ring-accent focus:outline-none bg-surface-raised text-ink font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink mb-1">Jenis Kendaraan</label>
                      <select
                        value={formCheckin.jenis_armada}
                        onChange={(e) => setFormCheckin({ ...formCheckin, jenis_armada: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border font-semibold focus:ring-1 focus:ring-accent focus:outline-none bg-surface-raised text-ink"
                      >
                        <option value="Truk">Truk (Canter / Dutro / Tronton)</option>
                        <option value="Mobil">Mobil Pribadi / Operasional</option>
                        <option value="Pickup">Pickup / Box Kecil</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-ink mb-1">
                      Tujuan Kedatangan <span className="text-status-red">*</span>
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
                          className={`p-3 rounded-xl border text-left transition-all ${
                            formCheckin.tujuan_kedatangan === t.id
                              ? 'border-accent bg-accent-subtle text-accent font-bold shadow-xs'
                              : 'border-border hover:border-accent/40 text-ink bg-surface'
                          }`}
                        >
                          <div className="text-xs font-bold">{t.label}</div>
                          <div className="text-xs text-ink-muted mt-0.5">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: 'pic',
              label: 'Kontak & PIC',
              content: (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-ink mb-1">Nama Customer / Perusahaan</label>
                      <input
                        type="text"
                        placeholder="Contoh: PT. Andi Jaya"
                        value={formCheckin.nama_customer}
                        onChange={(e) => setFormCheckin({ ...formCheckin, nama_customer: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:ring-1 focus:ring-accent focus:outline-none bg-surface-raised text-ink text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink mb-1">No. HP Driver / PIC</label>
                      <input
                        type="text"
                        placeholder="0812-xxxx-xxxx"
                        value={formCheckin.no_hp_customer}
                        onChange={(e) => setFormCheckin({ ...formCheckin, no_hp_customer: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:ring-1 focus:ring-accent focus:outline-none bg-surface-raised text-ink text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-ink mb-1">PIC / Petugas Tujuan</label>
                      <select
                        value={formCheckin.id_pic ? String(formCheckin.id_pic) : formCheckin.pic_tujuan}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = picPetugasList.find((p) => String(p.id) === val);
                          if (found) {
                            setFormCheckin({
                              ...formCheckin,
                              id_pic: found.id,
                              pic_tujuan: `${found.nama_lengkap} (${found.peran})`,
                            });
                          } else {
                            setFormCheckin({
                              ...formCheckin,
                              id_pic: undefined,
                              pic_tujuan: val,
                            });
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border font-semibold focus:ring-1 focus:ring-accent focus:outline-none bg-surface-raised text-ink text-xs"
                      >
                        <option value="">-- Pilih PIC / Petugas Tujuan --</option>
                        {picPetugasList.map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.nama_lengkap} ({p.peran})
                          </option>
                        ))}
                        <option value="Admin Office">Admin Office</option>
                        <option value="Management">Management</option>
                        <option value="PIC Terkait">Lainnya / PIC Terkait</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-ink mb-1">Keperluan Singkat / Keluhan</label>
                      <input
                        type="text"
                        placeholder="Contoh: Service berkala, ganti kampas rem"
                        value={formCheckin.keperluan}
                        onChange={(e) => setFormCheckin({ ...formCheckin, keperluan: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:ring-1 focus:ring-accent focus:outline-none bg-surface-raised text-ink text-xs"
                      />
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: 'dokumentasi',
              label: 'Dokumentasi',
              content: (
                <div className="space-y-4 text-xs">
                  <PhotoUploader
                    label="Foto Kendaraan Saat Masuk Gerbang (Opsional)"
                    value={formCheckin.foto_kendaraan_masuk}
                    onChange={(url) => setFormCheckin({ ...formCheckin, foto_kendaraan_masuk: url })}
                  />

                  <div>
                    <label className="block font-bold text-ink mb-1">Catatan Security</label>
                    <textarea
                      rows={2}
                      placeholder="Catatan kondisi awal fisik atau kelengkapan kendaraan..."
                      value={formCheckin.catatan_security}
                      onChange={(e) => setFormCheckin({ ...formCheckin, catatan_security: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:ring-1 focus:ring-accent focus:outline-none bg-surface-raised text-ink text-xs"
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: CHECK-OUT KENDARAAN (2-Step Wizard)                */}
      {/* ========================================================= */}
      {showCheckoutModal && (
        <StepModal
          open={!!showCheckoutModal}
          onClose={() => {
            setShowCheckoutModal(null);
            setCheckoutStep(0);
          }}
          title="Proses Check Out Kendaraan"
          subtitle={`${showCheckoutModal.no_polisi} - ${showCheckoutModal.nama_customer}`}
          currentStep={checkoutStep}
          onNext={() => {
            if (checkoutStep === 0 && formCheckout.barang_dibawa_keluar && !formCheckout.detail_barang_keluar.trim()) {
              toast.error('Rincian Wajib', 'Silakan isi rincian barang yang dibawa keluar.');
              return;
            }
            setCheckoutStep((s) => Math.min(s + 1, 1));
          }}
          onBack={() => setCheckoutStep((s) => Math.max(s - 1, 0))}
          onSubmit={() => {
            if (formCheckout.barang_dibawa_keluar && !formCheckout.detail_barang_keluar.trim()) {
              toast.error('Rincian Wajib', 'Silakan isi rincian barang yang dibawa keluar.');
              return;
            }
            checkoutMutation.mutate(showCheckoutModal);
          }}
          submitLabel="Konfirmasi Keluar & Terbitkan Memo"
          isPending={checkoutMutation.isPending}
          size="md"
          steps={[
            {
              id: 'barang',
              label: 'Pemeriksaan Barang',
              content: (
                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-accent-subtle/70 border border-accent/30 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">Tujuan Kedatangan:</span>
                      <span className="font-semibold text-accent">{showCheckoutModal.tujuan_kedatangan}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-ink-muted">
                      <span>Waktu Masuk:</span>
                      <span className="font-mono">{new Date(showCheckoutModal.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB</span>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 font-bold text-ink cursor-pointer p-3 bg-surface rounded-xl border border-border">
                      <input
                        type="checkbox"
                        checked={formCheckout.barang_dibawa_keluar}
                        onChange={(e) => setFormCheckout({ ...formCheckout, barang_dibawa_keluar: e.target.checked })}
                        className="w-4 h-4 rounded text-accent focus:ring-accent"
                      />
                      <span>Ada Barang yang Dibawa Keluar? (Sparepart bekas / box / dokumen)</span>
                    </label>
                  </div>

                  {formCheckout.barang_dibawa_keluar && (
                    <div>
                      <label className="block font-bold text-ink mb-1">Rincian Barang yang Dibawa Keluar <span className="text-status-red">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 1 Dus Sparepart Bekas, Dokumen Faktur"
                        value={formCheckout.detail_barang_keluar}
                        onChange={(e) => setFormCheckout({ ...formCheckout, detail_barang_keluar: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border font-medium focus:ring-1 focus:ring-accent bg-surface-raised text-ink text-xs focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'dokumentasi',
              label: 'Foto & Penerbitan Memo',
              content: (
                <div className="space-y-3.5 text-xs">
                  <PhotoUploader
                    label="Foto Kendaraan Saat Keluar Gerbang (Kamera/File)"
                    value={formCheckout.foto_kendaraan_keluar}
                    onChange={(url) => setFormCheckout({ ...formCheckout, foto_kendaraan_keluar: url })}
                  />

                  {formCheckout.barang_dibawa_keluar && (
                    <PhotoUploader
                      label="Foto Barang Bawaan (Opsional)"
                      value={formCheckout.foto_barang}
                      onChange={(url) => setFormCheckout({ ...formCheckout, foto_barang: url })}
                    />
                  )}

                  <div className="p-3 bg-status-amber-bg rounded-xl border border-status-amber/30 text-status-amber text-xs flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 text-status-amber mt-0.5" />
                    <span>Setelah konfirmasi, sistem akan secara otomatis menerbitkan <strong>Memo Keluar (Surat Jalan)</strong> resmi untuk kendaraan ini.</span>
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAIL HISTORI KENDARAAN                            */}
      {/* ========================================================= */}
      {showDetailModal && (
        <DetailModal
          open={!!showDetailModal}
          onClose={() => setShowDetailModal(null)}
          title={`Histori Kunjungan: ${showDetailModal.no_polisi}`}
          subtitle={`${showDetailModal.nama_customer} • Tiket #${showDetailModal.no_tiket}`}
          badge={<StatusBadge status={labelStatusAntrian(showDetailModal)} />}
          footer={
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={() => setShowDetailModal(null)}
                className="px-4 py-2.5 rounded-lg border border-border hover:bg-surface text-ink font-bold text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          }
          size="md"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5 bg-surface p-3.5 rounded-xl border border-border">
              <div>
                <span className="text-ink-subtle text-xs block">No. Tiket Antrian</span>
                <span className="font-mono font-bold text-accent">{showDetailModal.no_tiket}</span>
              </div>
              <div>
                <span className="text-ink-subtle text-xs block">Jenis Kendaraan</span>
                <span className="font-bold text-ink">{showDetailModal.jenis_armada || 'Truk'}</span>
              </div>
              <div>
                <span className="text-ink-subtle text-xs block">Waktu Masuk</span>
                <span className="font-medium text-ink-muted">
                  {new Date(showDetailModal.waktu_masuk).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <div>
                <span className="text-ink-subtle text-xs block">Waktu Keluar</span>
                <span className="font-medium text-ink-muted">
                  {showDetailModal.waktu_keluar ? new Date(showDetailModal.waktu_keluar).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '- (Masih di dalam)'}
                </span>
              </div>
            </div>

            {(() => {
              const spk = spkUntukAntrian(showDetailModal);
              if (!spk) return null;
              const inv = (invoiceListSecurity || []).find((i) => i.id_spk === spk.id);
              const lunas = !!inv && (inv.status_pembayaran === 'Paid' || inv.status_pembayaran === 'Lunas');
              const keluar = !!showDetailModal.waktu_keluar;
              const steps = [
                { label: 'Check-In', done: true },
                { label: 'SPK Selesai', done: ['Selesai', 'FIR Closed', 'QC Passed'].includes(spk.status_spk as string) },
                { label: 'Bayar Lunas', done: lunas },
                { label: 'Keluar', done: keluar },
              ];
              return (
                <>
                  <div className="bg-surface p-3.5 rounded-xl border border-border">
                    <span className="text-ink-subtle text-xs font-bold block mb-2">Progress Checkout</span>
                    <div className="flex items-center gap-1">
                      {steps.map((s, idx) => (
                        <div key={s.label} className="flex-1 flex items-center gap-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1 flex-1">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${s.done ? 'bg-status-green text-white' : 'bg-surface text-ink-subtle border border-border'}`}>
                              {s.done ? '✓' : idx + 1}
                            </span>
                            <span className={`text-xs font-bold text-center leading-tight ${s.done ? 'text-status-green' : 'text-ink-subtle'}`}>{s.label}</span>
                          </div>
                          {idx < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 rounded-full mb-5 ${s.done ? 'bg-status-green' : 'bg-border'}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {lunas && spk.status_spk === 'Selesai' && !keluar && (
                    <div className="p-3 rounded-xl bg-status-green-bg border border-status-green/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs text-status-green font-bold">
                        Pekerjaan lunas & selesai — unit siap dikeluarkan.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDetailModal(null);
                          setShowCheckoutModal(showDetailModal);
                          setFormCheckout({
                            barang_dibawa_keluar: false,
                            detail_barang_keluar: '',
                            foto_kendaraan_keluar: '',
                            foto_barang: '',
                            no_memo_keluar: '',
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-status-green hover:bg-status-green/90 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                      >
                        Check Out Sekarang →
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

            <div>
              <span className="text-ink-subtle text-xs block mb-1">Keperluan / Penugasan PIC</span>
              <div className="p-3 bg-surface rounded-xl border border-border text-ink font-medium">
                {showDetailModal.keperluan || 'Service berkala dan pemeliharaan kendaraan.'}
              </div>
            </div>

            {showDetailModal.detail_barang_keluar && (
              <div>
                <span className="text-ink-subtle text-xs block mb-1">Barang Bawaan Saat Keluar</span>
                <div className="p-3 bg-status-amber-bg border border-status-amber/30 rounded-xl text-status-amber font-medium">
                  {showDetailModal.detail_barang_keluar}
                </div>
              </div>
            )}

            {showDetailModal.no_memo_keluar && (
              <div className="p-3 bg-accent-subtle rounded-xl border border-accent/30 flex items-center justify-between">
                <div>
                  <span className="text-xs text-accent font-bold block">No. Memo Keluar:</span>
                  <span className="font-mono font-black text-accent">{showDetailModal.no_memo_keluar}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const memo = memoList.find(m => m.no_memo === showDetailModal.no_memo_keluar);
                    if (memo) setSelectedMemo(memo);
                    setShowDetailModal(null);
                    changeTab('memo');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Buka Memo →
                </button>
              </div>
            )}
          </div>
        </DetailModal>
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
