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
  LayoutDashboard
} from 'lucide-react';
import { AntrianKunjungan, BookingService, MemoKeluar } from '../types';

interface SecurityViewProps {
  initialTab?: 'dashboard' | 'booking' | 'onprogress' | 'selesai' | 'memo';
}

// Fallback seed data matching the Excel sheet screenshots
const DEFAULT_BOOKING_MOCK: BookingService[] = [
  {
    id: 101,
    no_booking: 'BK250503-001',
    no_polisi: 'BK 1234 AB',
    nama_customer: 'PT. Andi Jaya',
    nama_perusahaan: 'PT. Andi Jaya',
    tujuan_kunjungan: 'Service',
    jenis_layanan: 'Service Berkala',
    jenis_armada: 'Truk',
    tanggal_booking: '03 Mei 2025',
    jam_booking: '08:00',
    no_telepon: '0812-3456-7890',
    pic_driver: 'Slamet Riyadi',
    keterangan: 'Keluhan: Rem bergetar & ganti oli rutin',
    status: 'Booked',
    prioritas: 'Prioritas Booking',
    created_at: '2025-05-02T10:00:00Z',
  },
  {
    id: 102,
    no_booking: 'BK250503-002',
    no_polisi: 'BK 5678 CD',
    nama_customer: 'CV. Sinar Abadi',
    nama_perusahaan: 'CV. Sinar Abadi',
    tujuan_kunjungan: 'Service',
    jenis_layanan: 'Perbaikan Kaki-kaki',
    jenis_armada: 'Truk',
    tanggal_booking: '03 Mei 2025',
    jam_booking: '09:00',
    no_telepon: '0813-9876-5432',
    pic_driver: 'Hendra Gunawan',
    keterangan: 'Pengecekan bearing roda depan',
    status: 'Booked',
    prioritas: 'Prioritas Booking',
    created_at: '2025-05-02T11:00:00Z',
  },
  {
    id: 103,
    no_booking: 'BK250503-003',
    no_polisi: 'BK 9101 EF',
    nama_customer: 'PT. Maju Bersama',
    nama_perusahaan: 'PT. Maju Bersama',
    tujuan_kunjungan: 'Kunjungan',
    jenis_layanan: 'Kunjungan Dinas',
    jenis_armada: 'Mobil',
    tanggal_booking: '03 Mei 2025',
    jam_booking: '10:30',
    no_telepon: '0821-1122-3344',
    pic_driver: 'Bambang Sudiro',
    keterangan: 'Bertemu PIC Warehouse untuk audit stok',
    status: 'Booked',
    prioritas: 'Normal',
    created_at: '2025-05-02T12:00:00Z',
  },
  {
    id: 104,
    no_booking: 'BK250503-004',
    no_polisi: 'BK 2468 GH',
    nama_customer: 'PT. Sejahtera',
    nama_perusahaan: 'PT. Sejahtera',
    tujuan_kunjungan: 'Service',
    jenis_layanan: 'Tune Up & Filter Udara',
    jenis_armada: 'Truk',
    tanggal_booking: '03 Mei 2025',
    jam_booking: '11:00',
    no_telepon: '0852-7788-9900',
    pic_driver: 'Rudi Hartono',
    keterangan: 'Tarikan mesin berat saat muatan penuh',
    status: 'Booked',
    prioritas: 'Prioritas Booking',
    created_at: '2025-05-02T14:00:00Z',
  },
  {
    id: 105,
    no_booking: 'BK250503-005',
    no_polisi: 'BK 1357 IJ',
    nama_customer: 'CV. Lintas Karya',
    nama_perusahaan: 'CV. Lintas Karya',
    tujuan_kunjungan: 'Lainnya',
    jenis_layanan: 'Antar Dokumen PO',
    jenis_armada: 'Pickup',
    tanggal_booking: '03 Mei 2025',
    jam_booking: '13:30',
    no_telepon: '0819-3344-5566',
    pic_driver: 'Dedi Kurniawan',
    keterangan: 'Pengantaran surat faktur penagihan',
    status: 'Booked',
    prioritas: 'Normal',
    created_at: '2025-05-02T15:00:00Z',
  },
];

const DEFAULT_ONPROGRESS_MOCK: AntrianKunjungan[] = [
  {
    id: 201,
    no_tiket: 'ANT-250503-001',
    no_polisi: 'BK 1234 AB',
    nama_customer: 'PT. Andi Jaya',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service',
    waktu_masuk: '2025-05-03T08:15:00Z',
    status_kunjungan: 'Sedang Dikerjakan',
    nama_mekanik: 'M02 - Andi Wijaya',
    pic_tujuan: 'Budi Santoso (SA)',
    keperluan: 'Ganti Brake Pad & Oli Mesin',
  },
  {
    id: 202,
    no_tiket: 'ANT-250503-002',
    no_polisi: 'BK 5678 CD',
    nama_customer: 'CV. Sinar Abadi',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service',
    waktu_masuk: '2025-05-03T09:05:00Z',
    status_kunjungan: 'Menunggu Part',
    nama_mekanik: 'M03 - Dedi Kurniawan',
    pic_tujuan: 'Budi Santoso (SA)',
    keperluan: 'Menunggu Bushing Arm dari Purchasing',
  },
  {
    id: 203,
    no_tiket: 'ANT-250503-003',
    no_polisi: 'BK 9101 EF',
    nama_customer: 'PT. Maju Bersama',
    jenis_armada: 'Mobil',
    tujuan_kedatangan: 'Kunjungan',
    waktu_masuk: '2025-05-03T10:40:00Z',
    status_kunjungan: 'Sedang Dikerjakan',
    nama_mekanik: 'M01 - Budi Santoso',
    pic_tujuan: 'Hisar (Warehouse)',
    keperluan: 'Koordinasi Penyerahan Dokumen',
  },
  {
    id: 204,
    no_tiket: 'ANT-250503-004',
    no_polisi: 'BK 2468 GH',
    nama_customer: 'PT. Sejahtera',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service',
    waktu_masuk: '2025-05-03T11:20:00Z',
    status_kunjungan: 'Menunggu QC',
    nama_mekanik: 'M02 - Andi Wijaya',
    pic_tujuan: 'Joko Susilo (Foreman)',
    keperluan: 'Selesai pengerjaan - Siap Final Inspection',
  },
  {
    id: 205,
    no_tiket: 'ANT-250503-005',
    no_polisi: 'BK 1357 IJ',
    nama_customer: 'CV. Lintas Karya',
    jenis_armada: 'Pickup',
    tujuan_kedatangan: 'Lainnya',
    waktu_masuk: '2025-05-03T13:45:00Z',
    status_kunjungan: 'Sedang Dikerjakan',
    nama_mekanik: 'M04 - Riki Prayoga',
    pic_tujuan: 'Security',
    keperluan: 'Bongkar muat material ringan',
  },
];

const DEFAULT_SELESAI_MOCK: AntrianKunjungan[] = [
  {
    id: 301,
    no_tiket: 'ANT-250502-001',
    no_polisi: 'BK 1111 AA',
    nama_customer: 'PT. Sukses Mandiri',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service',
    waktu_masuk: '2025-05-02T08:10:00Z',
    waktu_keluar: '2025-05-02T12:30:00Z',
    durasi: '4 Jam 20 Menit',
    status_kunjungan: 'Selesai',
    no_memo_keluar: 'MK-250502-001',
    detail_barang_keluar: 'Filter oli bekas & dus sparepart kosong',
  },
  {
    id: 302,
    no_tiket: 'ANT-250502-002',
    no_polisi: 'BK 2222 BB',
    nama_customer: 'CV. Karya Abadi',
    jenis_armada: 'Mobil',
    tujuan_kedatangan: 'Service',
    waktu_masuk: '2025-05-02T09:00:00Z',
    waktu_keluar: '2025-05-02T13:15:00Z',
    durasi: '4 Jam 15 Menit',
    status_kunjungan: 'Selesai',
    no_memo_keluar: 'MK-250502-002',
    detail_barang_keluar: '-',
  },
  {
    id: 303,
    no_tiket: 'ANT-250502-003',
    no_polisi: 'BK 3333 CC',
    nama_customer: 'PT. Berkah Jaya',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service',
    waktu_masuk: '2025-05-02T10:25:00Z',
    waktu_keluar: '2025-05-02T14:20:00Z',
    durasi: '3 Jam 55 Menit',
    status_kunjungan: 'Selesai',
    no_memo_keluar: 'MK-250502-003',
    detail_barang_keluar: 'Kampas rem bekas',
  },
  {
    id: 304,
    no_tiket: 'ANT-250502-004',
    no_polisi: 'BK 4444 DD',
    nama_customer: 'CV. Prima Sentosa',
    jenis_armada: 'Pickup',
    tujuan_kedatangan: 'Lainnya',
    waktu_masuk: '2025-05-02T11:30:00Z',
    waktu_keluar: '2025-05-02T11:50:00Z',
    durasi: '20 Menit',
    status_kunjungan: 'Selesai',
    no_memo_keluar: 'MK-250502-004',
    detail_barang_keluar: 'Dokumen faktur penagihan',
  },
  {
    id: 305,
    no_tiket: 'ANT-250502-005',
    no_polisi: 'BK 5555 EE',
    nama_customer: 'PT. Maju Bersama',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service',
    waktu_masuk: '2025-05-02T13:00:00Z',
    waktu_keluar: '2025-05-02T16:10:00Z',
    durasi: '3 Jam 10 Menit',
    status_kunjungan: 'Selesai',
    no_memo_keluar: 'MK-250502-005',
    detail_barang_keluar: '-',
  },
];

const DEFAULT_MEMO_MOCK: MemoKeluar[] = [
  {
    id: 401,
    no_memo: 'MK-250503-001',
    no_polisi: 'BK 1234 AB',
    nama_customer: 'PT. Andi Jaya',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service',
    waktu_keluar: '2025-05-03T12:45:00Z',
    status: 'Selesai',
    catatan: 'Pekerjaan telah selesai dan kendaraan dalam kondisi baik.',
    petugas_security: 'Hisar Security',
  },
  {
    id: 402,
    no_memo: 'MK-250503-002',
    no_polisi: 'BK 5678 CD',
    nama_customer: 'CV. Sinar Abadi',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service',
    waktu_keluar: '2025-05-03T13:20:00Z',
    status: 'Selesai',
    catatan: 'Perbaikan selesai, sparepart lama disimpan customer.',
    petugas_security: 'Hisar Security',
  },
  {
    id: 403,
    no_memo: 'MK-250503-003',
    no_polisi: 'BK 9101 EF',
    nama_customer: 'PT. Maju Bersama',
    jenis_armada: 'Mobil',
    tujuan_kedatangan: 'Kunjungan',
    waktu_keluar: '2025-05-03T14:00:00Z',
    status: 'Selesai',
    catatan: 'Kunjungan telah selesai, berkas dokumen dibawa lengkap.',
    petugas_security: 'Hisar Security',
  },
  {
    id: 404,
    no_memo: 'MK-250503-004',
    no_polisi: 'BK 2468 GH',
    nama_customer: 'PT. Sejahtera',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service',
    waktu_keluar: '2025-05-03T15:10:00Z',
    status: 'Selesai',
    catatan: 'Pekerjaan telah selesai, kendaraan lulus uji QC jalan.',
    petugas_security: 'Hisar Security',
  },
  {
    id: 405,
    no_memo: 'MK-250503-005',
    no_polisi: 'BK 1357 IJ',
    nama_customer: 'CV. Lintas Karya',
    jenis_armada: 'Pickup',
    tujuan_kedatangan: 'Lainnya',
    waktu_keluar: '2025-05-03T16:25:00Z',
    status: 'Selesai',
    catatan: 'Pengantaran barang selesai, keluar pos security dalam kondisi baik.',
    petugas_security: 'Hisar Security',
  },
];

export const SecurityView: React.FC<SecurityViewProps> = ({ initialTab = 'onprogress' }) => {
  const queryClient = useQueryClient();
  const { activeTab, setActiveTab } = useAppStore();

  // Tab State: dashboard | booking | onprogress | selesai | memo
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'booking' | 'onprogress' | 'selesai' | 'memo'>(initialTab);

  // Sync tab with external activeTab if coming from Sidebar
  useEffect(() => {
    if (activeTab.startsWith('security-')) {
      const sub = activeTab.replace('security-', '') as any;
      if (['dashboard', 'booking', 'onprogress', 'selesai', 'memo'].includes(sub)) {
        setCurrentTab(sub);
      }
    }
  }, [activeTab]);

  // Global filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('2025-05-03');
  const [selesaiTimeRange, setSelesaiTimeRange] = useState<'Semua' | 'Hari Ini' | 'Kemarin' | 'Minggu Ini' | 'Bulan Ini'>('Semua');

  // Modals and selection state
  const [selectedBooking, setSelectedBooking] = useState<BookingService | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<MemoKeluar | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<AntrianKunjungan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<AntrianKunjungan | null>(null);

  // Check In Form State
  const [formCheckin, setFormCheckin] = useState({
    no_polisi: '',
    nama_customer: '',
    no_hp_customer: '',
    jenis_armada: 'Truk',
    tujuan_kedatangan: 'Service' as 'Service' | 'Beli Part' | 'Kunjungan' | 'Lainnya',
    pic_tujuan: 'Budi Santoso (SA)',
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

  // Merge live API data with rich mock data so the exact UI from Excel is always fully populated
  const bookingList: BookingService[] = rawBookingList && rawBookingList.length > 0 
    ? rawBookingList 
    : DEFAULT_BOOKING_MOCK;

  const antrianData: AntrianKunjungan[] = rawAntrianList && rawAntrianList.length > 0
    ? rawAntrianList
    : [...DEFAULT_ONPROGRESS_MOCK, ...DEFAULT_SELESAI_MOCK];

  const memoList: MemoKeluar[] = rawMemoList && rawMemoList.length > 0
    ? rawMemoList
    : DEFAULT_MEMO_MOCK;

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
      alert('Kendaraan berhasil di-Check In oleh Pos Security KIM 3!');
      setShowCheckinModal(false);
      setFormCheckin({
        no_polisi: '',
        nama_customer: '',
        no_hp_customer: '',
        jenis_armada: 'Truk',
        tujuan_kedatangan: 'Service',
        pic_tujuan: 'Budi Santoso (SA)',
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
      const memoNo = `MK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      
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
        petugas_security: 'Hisar Security',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['memo-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert('Kendaraan berhasil Check Out dan Memo Keluar resmi diterbitkan!');
      setShowCheckoutModal(null);
      changeTab('memo');
    },
    onError: (err: any) => alert('Gagal check out: ' + err?.message),
  });

  const changeTab = (tab: 'dashboard' | 'booking' | 'onprogress' | 'selesai' | 'memo') => {
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
                pic_tujuan: 'Budi Santoso (SA)',
                keperluan: '',
                foto_kendaraan_masuk: '',
                catatan_security: '',
                id_booking: undefined,
              });
              setShowCheckinModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            + CHECK IN KENDARAAN MASUK
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs (Identical with Excel flows: Dashboard, Booking, On Progress, Selesai / Keluar, Memo Keluar) */}
      <div className="flex border-b border-slate-200 bg-white px-2 pt-2 rounded-t-2xl overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => changeTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
            currentTab === 'dashboard'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard Pos
        </button>

        <button
          type="button"
          onClick={() => changeTab('booking')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
            currentTab === 'booking'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-black">
            1
          </span>
          List Nopol Telah Booking
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
            {bookingList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => changeTab('onprogress')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
            currentTab === 'onprogress'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] flex items-center justify-center font-black">
            2
          </span>
          Nopol Berada di Bengkel (On Progress)
          <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
            {onProgressList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => changeTab('selesai')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
            currentTab === 'selesai'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-black">
            3
          </span>
          Telah Meninggalkan Bengkel (Selesai)
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
            {selesaiList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => changeTab('memo')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
            currentTab === 'memo'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-black">
            4
          </span>
          Memo Keluar Resmi
          <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
            {memoList.length}
          </span>
        </button>
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
                  <span className="font-bold text-slate-800">03 Mei 2025</span>
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
                  {filteredBookingList.map((b, idx) => {
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
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <div>Menampilkan 1 - {filteredBookingList.length} dari {bookingList.length} data</div>
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
                      <div className="font-bold text-slate-900 mt-0.5">{selectedBooking.nama_customer || selectedBooking.nama_perusahaan}</div>
                      <div className="text-slate-400 text-[10px] mt-1.5">No. Telepon</div>
                      <div className="font-mono text-slate-700 font-semibold">{selectedBooking.no_telepon || '0812-3456-7890'}</div>
                      <div className="text-slate-400 text-[10px] mt-1.5">PIC / Driver</div>
                      <div className="font-semibold text-slate-800">{selectedBooking.pic_driver || 'Slamet Riyadi'}</div>
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
                      setFormCheckin({
                        no_polisi: selectedBooking.no_polisi,
                        nama_customer: selectedBooking.nama_customer || selectedBooking.nama_perusahaan || '',
                        no_hp_customer: selectedBooking.no_telepon || '',
                        jenis_armada: selectedBooking.jenis_armada || 'Truk',
                        tujuan_kedatangan: (selectedBooking.tujuan_kunjungan as any) || 'Service',
                        pic_tujuan: 'Budi Santoso (SA)',
                        keperluan: selectedBooking.keterangan || selectedBooking.jenis_layanan || '',
                        foto_kendaraan_masuk: '',
                        catatan_security: `Booking ID: ${selectedBooking.no_booking}`,
                        id_booking: selectedBooking.id,
                      });
                      setShowCheckinModal(true);
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
                  <span className="font-bold text-slate-800">03 Mei 2025</span>
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
                  {filteredOnProgressList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-slate-500 font-semibold">{idx + 1}</td>
                      <td className="py-3 px-3 font-black text-slate-900 tracking-wide">{item.no_polisi}</td>
                      <td className="py-3 px-3 text-slate-800 font-medium">{item.nama_customer}</td>
                      <td className="py-3 px-3 text-slate-600">{item.jenis_armada}</td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{item.tujuan_kedatangan}</td>
                      <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                        <div>03 Mei 2025</div>
                        <div className="text-slate-400 font-medium">{new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                  ))}
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
                  <span className="font-bold text-slate-800">03 Mei 2025</span>
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
                  {filteredSelesaiList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-slate-500 font-semibold">{idx + 1}</td>
                      <td className="py-3 px-3 font-black text-slate-900 tracking-wide">{item.no_polisi}</td>
                      <td className="py-3 px-3 text-slate-800 font-medium">{item.nama_customer}</td>
                      <td className="py-3 px-3 text-slate-600">{item.jenis_armada}</td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{item.tujuan_kedatangan}</td>
                      <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                        <div>02 Mei 2025</div>
                        <div className="text-slate-400 font-medium">{new Date(item.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">
                        <div>02 Mei 2025</div>
                        <div className="text-slate-400 font-medium">{item.waktu_keluar ? new Date(item.waktu_keluar).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:30'}</div>
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
                  ))}
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
                  <span className="font-bold text-slate-800">03 Mei 2025</span>
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
                    {filteredMemoList.map((m, idx) => {
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
                            <div>03 Mei 2025</div>
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
                                title="Cetak Memo"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMemo(m);
                                  setTimeout(() => window.print(), 100);
                                }}
                                className="p-1 hover:text-slate-900 rounded transition-colors"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                        <span className="font-bold text-slate-800">03 Mei 2025</span>
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
                          Hisar
                        </div>

                        <div className="font-black text-slate-900 text-xs">
                          {selectedMemo.petugas_security || 'Hisar Security'}
                        </div>
                        <div className="text-[10px] text-slate-400">Security Bengkel KIM 3</div>
                      </div>
                    </div>

                  </div>

                  {/* Print & Export Buttons matching Excel */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      CETAK
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Form Check-In Kendaraan Masuk</h3>
                <p className="text-xs text-slate-500">Validasi fisik plat nomor dan tujuan kedatangan di Pos Security</p>
              </div>
              <button
                onClick={() => setShowCheckinModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                checkinMutation.mutate(formCheckin);
              }}
              className="space-y-3.5 text-xs"
            >
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
                    { id: 'Service', label: '1. Service', desc: 'Perbaikan / Service' },
                    { id: 'Beli Part', label: '2. Beli Part', desc: 'Hanya beli sparepart' },
                    { id: 'Kunjungan', label: '3. Kunjungan', desc: 'Tamu / Dinas' },
                    { id: 'Lainnya', label: '4. Lainnya', desc: 'Keperluan lain' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setFormCheckin({
                          ...formCheckin,
                          tujuan_kedatangan: t.id as any,
                          pic_tujuan: t.id === 'Service' ? 'Budi Santoso (SA)' : 'Hisar (Warehouse)',
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
                  <input
                    type="text"
                    value={formCheckin.pic_tujuan}
                    onChange={(e) => setFormCheckin({ ...formCheckin, pic_tujuan: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
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

    </div>
  );
};
