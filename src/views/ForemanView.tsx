import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { SpkService, BookingService } from '../types';
import { 
  Wrench, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  AlertTriangle, 
  Send,
  Check,
  X,
  Printer,
  Search,
  Filter,
  Calendar,
  CalendarDays,
  Truck,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { PrintSpkModal } from '../components/print/PrintSpkModal';
import { PaginationBar } from '../components/common/PaginationBar';
import { isTanggalSamaHariIni } from '../utils/tanggal';
import { ModalPortal } from '../components/common/ModalPortal';
import { toast } from '../components/common/Toast';
import { realtimeHub } from '../services/realtimeService';
import { StatCard } from '../components/common/StatCard';
import { DetailModal } from '../components/common/DetailModal';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { StepModal } from '../components/common/StepModal';
import { ListItemCard } from '../components/common/ListItemCard';
import { FilterChips } from '../components/common/FilterChips';

export const ForemanView: React.FC<{ initialTab?: 'dashboard' | 'hasil-pengecekan' | 'qc-fir' }> = ({ initialTab = 'dashboard' }) => {
  const queryClient = useQueryClient();
  const { currentUser, navTick, activeTab: storeActiveTab } = useAppStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hasil-pengecekan' | 'qc-fir'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!navTick && !storeActiveTab) return;
    if (storeActiveTab === 'foreman-tugas' || storeActiveTab === 'foreman') setActiveTab('dashboard');
    else if (storeActiveTab === 'foreman-cek') setActiveTab('hasil-pengecekan');
    else if (storeActiveTab === 'foreman-qc') setActiveTab('qc-fir');
  }, [navTick, storeActiveTab]);
  const [selectedSpk, setSelectedSpk] = useState<SpkService | null>(null);
  const [showPrintSpk, setShowPrintSpk] = useState<SpkService | null>(null);

  // StepModal States
  const [assignSpk, setAssignSpk] = useState<SpkService | null>(null);
  const [assignStep, setAssignStep] = useState<number>(0);

  const [showCekModal, setShowCekModal] = useState<boolean>(false);
  const [cekStep, setCekStep] = useState<number>(0);

  const [showQcModal, setShowQcModal] = useState<boolean>(false);
  const [qcStep, setQcStep] = useState<number>(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Perlu Ditugaskan' | 'Dalam Pengerjaan' | 'Waiting QC'>('Semua');
  const [spkPage, setSpkPage] = useState(1);
  const [spkLimit, setSpkLimit] = useState(10);

  // Assign Mekanik State
  const [selectedMekanik, setSelectedMekanik] = useState('');

  // Master stok part (gudang) untuk picker kebutuhan sparepart hasil pengecekan.
  // Dideklarasikan di atas agar bisa dipakai state/derivasi di bawah.
  const { data: masterStokPart } = useQuery({
    queryKey: ['stok-part-list'],
    queryFn: api.getStokPart,
  });

  // Part yang sudah diinput untuk semua SPK (dibaca, tidak diedit di sini)
  const { data: spkPartList } = useQuery({
    queryKey: ['part-spk-list'],
    queryFn: api.getPartSpk,
    refetchInterval: 8000,
  });

  // Input Perbaikan Hasil Pengecekan State (image1.png Mockup 5)
  // Box sengaja kosong: Foreman wajib mengisi dari hasil cek nyata (tanpa contoh terisi).
  const [hasilPengecekan, setHasilPengecekan] = useState({
    rekomendasi: '',
    catatan_tambahan: '',
  });

  // Picker kebutuhan sparepart hasil pengecekan (disimpan ke spk-item-part,
  // dibaca SA saat estimasi & Mekanik sebagai daftar ambil barang — tanpa dummy)
  const [cekParts, setCekParts] = useState<Array<{
    kode_part: string;
    nama_part: string;
    jumlah: number;
    satuan: string;
    harga_satuan: number;
    stok: number;
  }>>([]);
  const [cekPartPickerId, setCekPartPickerId] = useState<string>('');
  const [cekPartPickerQty, setCekPartPickerQty] = useState<number>(1);

  // Part yang sudah tersimpan untuk SPK terpilih (inputan foreman sebelumnya)
  const existingCekParts = (spkPartList || []).filter((p) => p.id_spk === selectedSpk?.id);

  // Ganti SPK -> ulangi pilihan part (yang tersimpan tampil dari server)
  useEffect(() => {
    setCekParts([]);
    setCekPartPickerId('');
    setCekPartPickerQty(1);
  }, [selectedSpk?.id]);

  const handleAddCekPart = () => {
    if (!cekPartPickerId) return;
    const item = masterStokPart?.find((p) => p.kode_part === cekPartPickerId);
    if (!item) return;
    if (existingCekParts.some((p) => p.kode_part === item.kode_part) || cekParts.some((p) => p.kode_part === item.kode_part)) {
      toast.warning(`${item.nama_part} sudah ada di daftar kebutuhan SPK ini.`);
      return;
    }
    setCekParts([...cekParts, {
      kode_part: item.kode_part,
      nama_part: item.nama_part,
      jumlah: cekPartPickerQty,
      satuan: item.satuan,
      harga_satuan: Number(item.harga_jual),
      stok: item.stok,
    }]);
    setCekPartPickerId('');
    setCekPartPickerQty(1);
  };

  // Quality Control FIR State (image1.png Mockup QC)
  const [firForm, setFirForm] = useState({
    pekerjaan_sesuai_wo: true,
    fungsi_normal: true,
    bebas_kebocoran: true,
    test_jalan: true,
    kebersihan: true,
    catatan_foreman: '',
  });

  // Card Jadwal Booking State
  const [isBookingExpanded, setIsBookingExpanded] = useState(true);

  // Queries
  const { data: spkList } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 8000,
  });

  const { data: rawBookingList } = useQuery({
    queryKey: ['booking-list'],
    queryFn: api.getBooking,
    refetchInterval: 10000,
  });

  // Query pengguna dinamis untuk list mekanik
  const { data: penggunaList } = useQuery({
    queryKey: ['pengguna-list'],
    queryFn: api.getPengguna,
  });

  const mekanikList = (penggunaList || []).filter(
    (u) => u.peran === 'Mekanik' && u.status_aktif !== false
  );

  useEffect(() => {
    if (!selectedMekanik && mekanikList.length > 0) {
      setSelectedMekanik(mekanikList[0].nama_lengkap);
    }
  }, [mekanikList, selectedMekanik]);

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Murni hasil fetch API booking tanpa mock data
  const bookingList: BookingService[] = rawBookingList || [];

  // Filter booking khusus service yang dijadwalkan hari ini
  const todayBookings = bookingList.filter(
    (b) => (!b.tujuan_kunjungan || b.tujuan_kunjungan === 'Service') && isTanggalSamaHariIni(b.tanggal_booking)
  );

  // Mutations
  const assignMekanikMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      const mekanikId = mekanikList.find((m) => m.nama_lengkap === selectedMekanik)?.id;
      // Distribusi pekerjaan (Excel tahap 4): tugaskan mekanik untuk PENGECEKAN.
      // Status SENGAJA tidak diubah ke 'Dalam Pengerjaan' — WO terbit & timer
      // start hanya setelah estimasi SA + approval customer (tahap 6-7).
      // Status eksisting dipertahankan (re-assign aman, tidak memundurkan job).
      return api.updateSpkStatus({
        id: spk.id,
        nama_foreman: currentUser,
        nama_mekanik: selectedMekanik,
        // ID mekanik agar MekanikView bisa mencocokkan SPK secara akurat (fallback: pencocokan nama)
        ...(mekanikId ? { id_mekanik: mekanikId } : {}),
        catatan_foreman: `Ditugaskan oleh Foreman ke ${selectedMekanik} untuk pengecekan awal`,
      });
    },
    onSuccess: (_, spk) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      toast.success(`Mekanik ${selectedMekanik} ditugaskan untuk pengecekan! Lanjut input hasil pengecekan fisik.`);

      // Notifikasi personal: penugasan pengecekan masuk HANYA ke mekanik terpilih.
      // Mekanik lain tidak menerima apa pun (isolasi WO). Timer/start job
      // BELUM aktif — dimulai setelah estimasi SA + approval customer.
      const assignedId = mekanikList.find((m) => m.nama_lengkap === selectedMekanik)?.id;
      if (assignedId) {
        realtimeHub.publish({
          type: 'SPK_STATUS_CHANGED',
          targetRoles: ['Mekanik'],
          targetUserId: assignedId,
          title: 'Penugasan Pengecekan Awal',
          message: `SPK ${spk.no_spk} unit ${spk.no_polisi} ditugaskan Foreman ke Anda untuk pengecekan awal. Hasil cek diinput Foreman ke sistem.`,
          linkTab: 'mekanik',
          urgency: 'urgent',
        });
      }

      setSelectedSpk({ ...spk, nama_mekanik: selectedMekanik });
    },
    onError: (err: any) => toast.error('Gagal menugaskan mekanik: ' + getApiErrorMessage(err)),
  });

  const submitHasilPengecekanMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      // Gerbang Excel tahap 5: hasil pengecekan hanya sah sebelum estimasi SA
      // (atau revisi saat masih Estimasi Dibuat). Cegah overwrite catatan
      // foreman setelah WO berjalan / QC / closed.
      if (spk.status_spk !== 'Menunggu Pengecekan Mekanik' && spk.status_spk !== 'Estimasi Dibuat') {
        throw new Error(`Hasil pengecekan hanya bisa disubmit saat status "Menunggu Pengecekan Mekanik" (saat ini: ${spk.status_spk}).`);
      }
      // Wajib minimal 1 sparepart kebutuhan: tanpa ini mekanik tidak bisa START
      // (gerbang Excel tahap 5 -> 7) dan SA tidak bisa menyusun estimasi.
      const totalParts = existingCekParts.length + cekParts.length;
      if (totalParts === 0) {
        throw new Error('Belum ada sparepart kebutuhan. Tambahkan minimal 1 sparepart dari gudang sebelum submit ke SA.');
      }
      // Simpan part pilihan baru (anti-duplikat vs yang sudah tersimpan)
      const savedCodes = new Set(existingCekParts.map((p) => p.kode_part));
      for (const p of cekParts) {
        if (p.kode_part && savedCodes.has(p.kode_part)) continue;
        await api.tambahPartSpk({
          id_spk: spk.id,
          kode_part: p.kode_part,
          nama_part: p.nama_part,
          jumlah: p.jumlah,
          satuan: p.satuan,
          harga_satuan: p.harga_satuan,
          status_ketersediaan: p.stok > 0 ? 'Ready di Stock' : 'Tidak Ready di Stock',
        });
      }
      return api.updateSpkStatus({
        id: spk.id,
        status_spk: 'Estimasi Dibuat',
        catatan_foreman: hasilPengecekan.rekomendasi + '\n' + hasilPengecekan.catatan_tambahan,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['part-spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['part-list'] });
      toast.success('Hasil pengecekan + kebutuhan sparepart berhasil disubmit ke SA!');
      setCekParts([]);
      setActiveTab('dashboard');
    },
    onError: (err: any) => toast.error('Gagal submit hasil pengecekan: ' + getApiErrorMessage(err)),
  });

  const submitQcMutation = useMutation({
    mutationFn: async ({ spk, passed }: { spk: SpkService; passed: boolean }) => {
      const firNo = `FIR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      if (passed) {
        await api.inputQcFir({
          no_fir: firNo,
          id_spk: spk.id,
          nama_foreman: currentUser,
          pekerjaan_sesuai_wo: firForm.pekerjaan_sesuai_wo,
          fungsi_normal: firForm.fungsi_normal,
          bebas_kebocoran: firForm.bebas_kebocoran,
          test_jalan: firForm.test_jalan,
          kebersihan: firForm.kebersihan,
          catatan_foreman: firForm.catatan_foreman,
          status_qc: 'QC Passed',
        });

        return api.updateSpkStatus({
          id: spk.id,
          status_spk: 'QC Passed',
          catatan_foreman: `QC PASSED (${firNo}): ${firForm.catatan_foreman}`,
        });
      } else {
        return api.updateSpkStatus({
          id: spk.id,
          status_spk: 'Dalam Pengerjaan',
          catatan_foreman: `QC Ditolak: ${firForm.catatan_foreman} (Kembalikan ke Mekanik)`,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      if (variables.passed) {
        toast.success('QC Passed! Diserahkan ke SA untuk Final Check & FIR Closed.');
      } else {
        toast.warning('QC Tidak Sesuai. SPK dikembalikan ke Mekanik.');
      }
      setSelectedSpk(null);
      setActiveTab('dashboard');
    },
    onError: (err: any) => toast.error('Gagal memproses QC: ' + getApiErrorMessage(err)),
  });

  // Derived statistics and filtering
  const totalSpkCount = spkList?.length || 0;
  const unassignedCount = spkList?.filter(s => !s.nama_mekanik || s.nama_mekanik === 'Belum ditugaskan').length || 0;
  const inProgressCount = spkList?.filter(s => s.status_spk === 'Dalam Pengerjaan').length || 0;
  const waitingQcCount = spkList?.filter(s => s.status_spk === 'Waiting QC' || s.status_spk === 'QC Passed').length || 0;

  const filteredSpkList = (spkList || []).filter((spk) => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch = !query ||
      spk.no_spk?.toLowerCase().includes(query) ||
      spk.no_polisi?.toLowerCase().includes(query) ||
      spk.nama_customer?.toLowerCase().includes(query) ||
      spk.keluhan_customer?.toLowerCase().includes(query) ||
      spk.nama_mekanik?.toLowerCase().includes(query);

    if (!matchSearch) return false;
    if (statusFilter === 'Perlu Ditugaskan') {
      return !spk.nama_mekanik || spk.nama_mekanik === 'Belum ditugaskan';
    }
    if (statusFilter === 'Dalam Pengerjaan') {
      return spk.status_spk === 'Dalam Pengerjaan';
    }
    if (statusFilter === 'Waiting QC') {
      return spk.status_spk === 'Waiting QC' || spk.status_spk === 'QC Passed';
    }
    return true;
  });

  const totalSpkRecords = filteredSpkList.length;
  const totalSpkPages = Math.ceil(totalSpkRecords / spkLimit) || 1;
  const paginatedSpkList = filteredSpkList.slice((spkPage - 1) * spkLimit, spkPage * spkLimit);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <SectionHeader
        title="Dashboard Foreman"
        description="Distribusi Pekerjaan, Pengecekan Mekanik, dan Quality Control (FIR)"
      />

      {/* Mini KPI Banners for Foreman */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total SPK"
          value={totalSpkCount}
          subtitle="Seluruh SPK aktif"
          icon={Wrench}
          tone="accent"
          active={statusFilter === 'Semua'}
          onClick={() => { setStatusFilter('Semua'); setSpkPage(1); }}
        />
        <StatCard
          title="Perlu Ditugaskan"
          value={unassignedCount}
          subtitle="Belum ada mekanik"
          icon={UserCheck}
          tone="amber"
          active={statusFilter === 'Perlu Ditugaskan'}
          onClick={() => { setStatusFilter('Perlu Ditugaskan'); setSpkPage(1); }}
        />
        <StatCard
          title="Dalam Pengerjaan"
          value={inProgressCount}
          subtitle="Teknisi aktif di pit"
          icon={Clock}
          tone="blue"
          active={statusFilter === 'Dalam Pengerjaan'}
          onClick={() => { setStatusFilter('Dalam Pengerjaan'); setSpkPage(1); }}
        />
        <StatCard
          title="Siap QC (FIR)"
          value={waitingQcCount}
          subtitle="Siap diinspeksi"
          icon={CheckCircle2}
          tone="green"
          active={statusFilter === 'Waiting QC'}
          onClick={() => { setStatusFilter('Waiting QC'); setSpkPage(1); }}
        />
      </div>

      {/* TAB 1: DASHBOARD SPK FOREMAN */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">

          {/* Card: Jadwal Booking Hari Ini (Estimasi Beban Kerja yang Akan Datang) */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center font-bold shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-ink">Jadwal Booking Hari Ini</h2>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-accent-subtle text-accent border border-accent/30">
                      {todayBookings.length} Kendaraan Terjadwal
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Beban kerja service yang akan datang (estimasi kedatangan kendaraan di bengkel hari ini)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-ink-muted font-medium flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-xl border border-border">
                  <Clock className="w-3.5 h-3.5 text-ink-subtle" />
                  <span>{todayFormatted}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsBookingExpanded(!isBookingExpanded)}
                  className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface rounded-xl transition-colors"
                  title={isBookingExpanded ? 'Ciutkan Card' : 'Perluas Card'}
                >
                  {isBookingExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isBookingExpanded ? (
              <div className="space-y-3">
                {todayBookings.length > 0 ? (
                  <div className="space-y-2.5">
                    {todayBookings.map((b) => (
                      <ListItemCard
                        key={b.id}
                        title={`${b.no_polisi} — ${b.nama_perusahaan || b.nama_customer}`}
                        subtitle={`${b.jenis_layanan || 'Service Berkala'} • Driver: ${b.pic_driver || '-'} • Telp: ${b.no_telepon || '-'}${b.keluhan ? ` • "${b.keluhan}"` : ''}`}
                        badge={
                          <StatusBadge 
                            status={b.status === 'Check In' ? 'Check In' : 'Menunggu Masuk'} 
                            size="sm" 
                          />
                        }
                        chips={[
                          b.jam_booking ? `Jam: ${b.jam_booking} WIB` : null,
                          b.jenis_armada || 'Truk',
                          b.prioritas === 'Prioritas Booking' ? 'Prioritas' : null,
                        ].filter(Boolean)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Belum Ada Jadwal Booking Hari Ini"
                    description="Belum ada kendaraan booking yang dijadwalkan untuk hari ini."
                    icon={Calendar}
                  />
                )}

                <div className="text-xs text-ink-muted bg-accent-subtle p-2.5 rounded-xl border border-accent/30 flex items-center gap-2">
                  <Info className="w-4 h-4 text-accent shrink-0" />
                  <span>
                    Kendaraan yang tiba di pos security gerbang dan telah dibuatkan SPK oleh SA akan otomatis muncul pada daftar <strong>SPK Menunggu &amp; On Progress</strong> di bawah untuk didistribusikan ke mekanik.
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-ink-muted bg-surface p-3 rounded-xl border border-border flex items-center justify-between">
                <span>
                  <strong>{todayBookings.length} Kendaraan Terjadwal:</strong>{' '}
                  {todayBookings.map((b) => `${b.no_polisi} (${b.jam_booking || '08:00'})`).join(', ')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsBookingExpanded(true)}
                  className="text-accent font-bold hover:underline ml-2 shrink-0"
                >
                  Tampilkan Rincian →
                </button>
              </div>
            )}
          </div>

          {/* Daftar SPK (full width — panel aksi pindah ke modal) */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Daftar SPK Menunggu &amp; On Progress</h2>
                <p className="text-xs text-ink-muted">Foreman review pekerjaan dan tugaskan mekanik</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface text-ink-muted self-start sm:self-auto">
                {filteredSpkList.length} SPK Ditemukan
              </span>
            </div>

            {/* Live Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari No. Polisi, No. SPK, Customer, atau Mekanik..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSpkPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSpkPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted text-xs font-bold p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Chips */}
              <FilterChips
                options={[
                  { id: 'Semua', label: 'Semua' },
                  { id: 'Perlu Ditugaskan', label: 'Perlu Ditugaskan' },
                  { id: 'Dalam Pengerjaan', label: 'Dalam Pengerjaan' },
                  { id: 'Waiting QC', label: 'Waiting QC' },
                ]}
                selectedId={statusFilter}
                onChange={(st) => {
                  setStatusFilter(st as any);
                  setSpkPage(1);
                }}
              />
            </div>

            {/* List SPK */}
            <div className="space-y-2.5">
              {filteredSpkList.length > 0 ? (
                paginatedSpkList.map((spk) => {
                  const needsAssignment = !spk.nama_mekanik && spk.status_spk !== 'Selesai';
                  const needsInspection = spk.status_spk === 'Menunggu Pengecekan Mekanik' || spk.status_spk === 'Estimasi Dibuat';
                  const needsQc = spk.status_spk === 'Waiting QC';

                  return (
                    <ListItemCard
                      key={spk.id}
                      onClick={() => setSelectedSpk(spk)}
                      title={`${spk.no_spk} — ${spk.no_polisi}`}
                      subtitle={`${spk.nama_customer || 'Pelanggan Bengkel'} • SA: ${spk.nama_sa} • Mekanik: ${spk.nama_mekanik || 'Belum Ditugaskan'}`}
                      badge={<StatusBadge status={spk.status_spk} size="sm" />}
                      chips={[
                        spk.estimasi_waktu_jam || spk.lead_time_jam ? `Lead Time: ${spk.estimasi_waktu_jam || spk.lead_time_jam} Jam` : null,
                        spk.keluhan_customer ? `"${spk.keluhan_customer}"` : null,
                      ].filter(Boolean)}
                      actions={
                        <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedSpk(spk); }}
                            className="px-2.5 py-1.5 rounded-xl border border-border text-ink-muted hover:text-ink hover:bg-surface text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Info className="w-3.5 h-3.5 text-ink-subtle" />
                            <span>Detail</span>
                          </button>

                          {needsAssignment && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssignSpk(spk);
                                setAssignStep(0);
                                setSelectedMekanik(spk.nama_mekanik || (mekanikList[0]?.nama_lengkap || ''));
                              }}
                              className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Tugaskan</span>
                            </button>
                          )}

                          {needsInspection && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSpk(spk);
                                setCekStep(0);
                                setShowCekModal(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-accent-subtle hover:bg-accent/20 text-accent text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>Hasil Cek</span>
                            </button>
                          )}

                          {needsQc && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSpk(spk);
                                setQcStep(0);
                                setShowQcModal(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-status-green hover:bg-status-green/90 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>QC (FIR)</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowPrintSpk(spk); }}
                            className="px-2.5 py-1.5 rounded-xl border border-border text-ink-muted hover:bg-surface text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                            title="Cetak SPK A4"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      }
                    />
                  );
                })
              ) : (
                <EmptyState
                  title="Tidak Ditemukan SPK"
                  description={`Tidak ditemukan SPK yang sesuai dengan filter "${statusFilter}" atau kata kunci pencarian.`}
                />
              )}
            </div>

            {/* Pagination Bar */}
            <PaginationBar
              page={spkPage}
              totalPages={totalSpkPages}
              totalRecords={totalSpkRecords}
              limit={spkLimit}
              onPageChange={setSpkPage}
              onLimitChange={(newL) => {
                setSpkLimit(newL);
                setSpkPage(1);
              }}
              label="SPK"
            />
          </div>

          {/* DetailModal: Panel Distribusi & Aksi Foreman */}
          {selectedSpk && (
            <DetailModal
              open={Boolean(selectedSpk)}
              onClose={() => setSelectedSpk(null)}
              title={`SPK ${selectedSpk.no_spk}`}
              subtitle={`${selectedSpk.no_polisi} • ${selectedSpk.nama_customer || 'Pelanggan Bengkel'}`}
              badge={<StatusBadge status={selectedSpk.status_spk} size="sm" />}
              size="lg"
              tabs={[
                {
                  id: 'distribusi',
                  label: 'Distribusi & Mekanik',
                  content: (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-surface rounded-xl border border-border">
                          <span className="text-ink-muted text-xs block">Service Advisor</span>
                          <span className="font-bold text-ink text-sm">{selectedSpk.nama_sa}</span>
                        </div>
                        <div className="p-3 bg-surface rounded-xl border border-border">
                          <span className="text-ink-muted text-xs block">Mekanik Terpilih</span>
                          <span className="font-bold text-ink text-sm">{selectedSpk.nama_mekanik || 'Belum ditugaskan'}</span>
                        </div>
                        <div className="p-3 bg-surface rounded-xl border border-border">
                          <span className="text-ink-muted text-xs block">Lead Time</span>
                          <span className="font-bold text-accent text-sm font-mono">
                            {selectedSpk.estimasi_waktu_jam || selectedSpk.lead_time_jam ? `${selectedSpk.estimasi_waktu_jam || selectedSpk.lead_time_jam} Jam` : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-surface rounded-xl border border-border space-y-1">
                        <span className="font-bold text-ink uppercase tracking-wider text-xs block">Keluhan Customer:</span>
                        <p className="text-ink leading-relaxed">
                          {selectedSpk.keluhan_customer || 'Tidak ada catatan keluhan.'}
                        </p>
                      </div>

                      {/* Assign Mekanik Section */}
                      {['Waiting QC', 'QC Passed', 'FIR Closed', 'Selesai'].includes(selectedSpk.status_spk as string) ? (
                        <div className="p-3.5 bg-surface rounded-xl border border-dashed border-border text-ink-muted text-center font-medium">
                          Penugasan terkunci — SPK sudah mencapai tahap {selectedSpk.status_spk}.
                        </div>
                      ) : (
                        <div className="p-4 bg-surface rounded-xl border border-border space-y-3">
                          <label className="block text-xs font-bold text-ink">
                            Pilih Mekanik untuk Pengerjaan:
                          </label>
                          <select
                            value={selectedMekanik}
                            onChange={(e) => setSelectedMekanik(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-bold bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none"
                          >
                            {mekanikList.length === 0 ? (
                              <option value="">Memuat daftar mekanik...</option>
                            ) : (
                              mekanikList.map((m) => (
                                <option key={m.id} value={m.nama_lengkap}>
                                  {m.nama_lengkap} (Teknisi Mekanik)
                                </option>
                              ))
                            )}
                          </select>

                          <button
                            type="button"
                            disabled={assignMekanikMutation.isPending}
                            onClick={() => assignMekanikMutation.mutate(selectedSpk)}
                            className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <UserCheck className="w-4 h-4" /> {assignMekanikMutation.isPending ? 'Menugaskan...' : 'Tugaskan ke Mekanik'}
                          </button>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'part',
                  label: 'Kebutuhan Part',
                  content: (() => {
                    const parts = (spkPartList || []).filter((p) => p.id_spk === selectedSpk.id);
                    if (parts.length === 0) {
                      return (
                        <EmptyState
                          title="Belum Ada Sparepart Terdaftar"
                          description="Daftar sparepart dapat ditambahkan melalui menu Input Hasil Cek."
                        />
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {parts.map((p) => (
                          <div key={p.id} className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <div className="font-bold text-ink truncate">{p.nama_part}</div>
                              <div className="text-xs text-ink-muted font-mono">{p.kode_part || '-'} • {p.jumlah} {p.satuan}</div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              p.status_ketersediaan === 'Ready di Stock' ? 'bg-status-green-bg text-status-green' : 'bg-status-amber-bg text-status-amber'
                            }`}>
                              {p.status_ketersediaan || '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })(),
                }
              ]}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      const spk = selectedSpk;
                      setSelectedSpk(null);
                      setShowPrintSpk(spk);
                    }}
                    className="px-3.5 py-2 bg-surface hover:bg-surface-raised text-ink font-semibold text-xs rounded-xl border border-border flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Cetak SPK A4
                  </button>
                  <div className="flex items-center gap-2">
                    {(selectedSpk.status_spk === 'Menunggu Pengecekan Mekanik' || selectedSpk.status_spk === 'Estimasi Dibuat') && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('hasil-pengecekan');
                        }}
                        className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Wrench className="w-4 h-4" /> Input Hasil Cek →
                      </button>
                    )}
                    {selectedSpk.status_spk === 'Waiting QC' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('qc-fir');
                        }}
                        className="px-4 py-2 bg-status-green hover:bg-status-green/90 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Buka Form QC (FIR) →
                      </button>
                    )}
                  </div>
                </div>
              }
            />
          )}

      </div>
      )}

      {/* TAB 2: INPUT PERBAIKAN HASIL PENGECEKAN */}
      {activeTab === 'hasil-pengecekan' && (
        <div className="bg-surface-raised rounded-2xl border border-border p-5 sm:p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-ink">Input Perbaikan Hasil Pengecekan Mekanik &amp; Foreman</h2>
            <p className="text-xs text-ink-muted">Pengecekan fisik komponen yang perlu diperbaiki / diganti untuk disubmit ke SA</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1.5">Pilih SPK Kendaraan:</label>
              <select
                value={selectedSpk?.id || ''}
                onChange={(e) => {
                  const spk = spkList?.find(s => s.id === Number(e.target.value));
                  setSelectedSpk(spk || null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-bold bg-surface-raised focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">-- Pilih SPK Kendaraan --</option>
                {spkList?.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.no_spk} - {s.no_polisi} ({s.nama_customer})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1.5">
                Hasil Pengecekan &amp; Rekomendasi Perbaikan
              </label>
              <textarea
                rows={4}
                placeholder="Contoh:&#10;1. Ganti Kampas Rem Depan&#10;2. Bubut / Ganti Disc Brake Depan&#10;3. Ganti Minyak Rem"
                value={hasilPengecekan.rekomendasi}
                onChange={(e) => setHasilPengecekan({ ...hasilPengecekan, rekomendasi: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1.5">Catatan Tambahan Foreman</label>
              <textarea
                rows={2}
                placeholder="Contoh: Piringan rem sudah beralur dalam, disarankan sekalian ganti kampas dan minyak rem."
                value={hasilPengecekan.catatan_tambahan}
                onChange={(e) => setHasilPengecekan({ ...hasilPengecekan, catatan_tambahan: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>

            {/* Kebutuhan Sparepart hasil pengecekan */}
            <div className="bg-surface p-4 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-accent" /> Sparepart yang Dibutuhkan
                  <span className="text-status-red">*</span>
                </span>
                <span className="text-xs font-bold text-ink-subtle">
                  {existingCekParts.length + cekParts.length} item
                </span>
              </div>

              {existingCekParts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-ink-subtle uppercase">Sudah tersimpan (inputan sebelumnya):</span>
                  {existingCekParts.map((p) => (
                    <div key={`saved-${p.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-raised border border-border text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-ink truncate">{p.nama_part}</div>
                        <div className="text-xs text-ink-muted font-mono">{p.kode_part || '-'} | Qty: {p.jumlah} {p.satuan}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${p.status_ketersediaan === 'Ready di Stock' ? 'bg-status-green-bg text-status-green' : 'bg-status-amber-bg text-status-amber'}`}>
                        {p.status_ketersediaan || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-[1fr_72px_auto] gap-2">
                <select
                  value={cekPartPickerId}
                  onChange={(e) => setCekPartPickerId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-border text-xs font-semibold bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none min-w-0 truncate"
                >
                  <option value="">-- Pilih sparepart gudang --</option>
                  {masterStokPart?.map((p) => (
                    <option key={p.kode_part} value={p.kode_part}>
                      {p.kode_part} - {p.nama_part} | stok: {p.stok}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={cekPartPickerQty}
                  onChange={(e) => setCekPartPickerQty(Math.max(1, Number(e.target.value) || 1))}
                  className="px-2 py-2 rounded-xl border border-border text-xs font-mono font-bold text-center focus:ring-2 focus:ring-accent focus:outline-none"
                  title="Jumlah"
                />
                <button
                  type="button"
                  disabled={!cekPartPickerId}
                  onClick={handleAddCekPart}
                  className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah
                </button>
              </div>

              {cekParts.length > 0 && (
                <div className="space-y-1.5">
                  {cekParts.map((p) => (
                    <div key={`new-${p.kode_part}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent-subtle/50 border border-accent/30 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-ink truncate">{p.nama_part}</div>
                        <div className="text-xs text-ink-muted font-mono">{p.kode_part} | Qty: {p.jumlah} {p.satuan} | Stok gudang: {p.stok}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCekParts(cekParts.filter((x) => x.kode_part !== p.kode_part))}
                        className="p-1.5 rounded-lg text-status-red hover:bg-status-red-bg transition-colors"
                        title="Hapus dari daftar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {existingCekParts.length + cekParts.length === 0 && (
                <p className="text-xs text-status-red font-semibold">
                  Wajib tambah minimal 1 sparepart — tanpa ini SA tidak bisa estimasi &amp; mekanik tidak bisa START.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedSpk || submitHasilPengecekanMutation.isPending}
              onClick={() => selectedSpk && submitHasilPengecekanMutation.mutate(selectedSpk)}
              className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-accent/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" /> SUBMIT KE SA BY SISTEM
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: QUALITY CONTROL (QC) & FIR */}
      {activeTab === 'qc-fir' && (
        <div className="bg-surface-raised rounded-2xl border border-border p-5 sm:p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-green"></span>
              <h2 className="text-base font-bold text-ink">Final Inspection Report (FIR) - Quality Control</h2>
            </div>
            <p className="text-xs text-ink-muted">Foreman periksa hasil kerja mekanik sebelum diserahkan ke SA</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1.5">Pilih SPK Kendaraan untuk QC:</label>
              <select
                value={selectedSpk?.id || ''}
                onChange={(e) => {
                  const spk = spkList?.find(s => s.id === Number(e.target.value));
                  setSelectedSpk(spk || null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-bold bg-surface-raised focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">-- Pilih SPK Selesai Dikerjakan --</option>
                {spkList?.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.no_spk} - {s.no_polisi} ({s.status_spk})
                  </option>
                ))}
              </select>
            </div>

            {/* Checklist FIR */}
            <div className="p-4 rounded-xl bg-surface border border-border space-y-2.5">
              <span className="block text-xs font-bold text-ink">5 Parameter Wajib Inspeksi Akhir:</span>
              
              {[
                { key: 'pekerjaan_sesuai_wo', label: '1. Pekerjaan Sesuai WO', desc: 'Item jasa & part terpasang sesuai SPK' },
                { key: 'fungsi_normal', label: '2. Fungsi Normal', desc: 'Sistem rem, kelistrikan, dan mesin bekerja optimal' },
                { key: 'bebas_kebocoran', label: '3. Bebas Kebocoran', desc: 'Tidak ada kebocoran oli, minyak rem, atau cairan pendingin' },
                { key: 'test_jalan', label: '4. Test Jalan', desc: 'Uji jalan singkat tidak ada getaran dan bunyi abnormal' },
                { key: 'kebersihan', label: '5. Kebersihan', desc: 'Kabin, ruang mesin, dan bodi kendaraan bersih dari oli mekanik' },
              ].map((param) => {
                const isChecked = Boolean((firForm as any)[param.key]);
                return (
                  <label
                    key={param.key}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'border-status-green/40 bg-status-green-bg text-ink'
                        : 'border-border bg-surface-raised hover:bg-surface'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => setFirForm({ ...firForm, [param.key]: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-status-green focus:ring-status-green cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-ink">{param.label}</div>
                      <div className="text-xs text-ink-muted">{param.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1.5">Catatan Hasil QC Foreman</label>
              <textarea
                rows={2}
                placeholder="Contoh: Pengereman responsif, tidak ada getaran dan kebocoran."
                value={firForm.catatan_foreman}
                onChange={(e) => setFirForm({ ...firForm, catatan_foreman: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={!selectedSpk || submitQcMutation.isPending}
                onClick={() => selectedSpk && submitQcMutation.mutate({ spk: selectedSpk, passed: false })}
                className="py-3 rounded-xl bg-status-red-bg hover:bg-status-red/10 text-status-red border border-status-red/30 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" /> TIDAK SESUAI (KEMBALIKAN)
              </button>

              <button
                type="button"
                disabled={!selectedSpk || submitQcMutation.isPending}
                onClick={() => selectedSpk && submitQcMutation.mutate({ spk: selectedSpk, passed: true })}
                className="py-3 rounded-xl bg-status-green hover:bg-status-green/90 text-white font-bold text-xs shadow-md shadow-status-green/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> QC PASSED (KE SA)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP MODAL 1: PENUGASAN MEKANIK */}
      {assignSpk && (
        <StepModal
          open={Boolean(assignSpk)}
          onClose={() => setAssignSpk(null)}
          title={`Penugasan Mekanik: ${assignSpk.no_spk}`}
          subtitle={`${assignSpk.no_polisi} • ${assignSpk.nama_customer || 'Pelanggan Bengkel'}`}
          currentStep={assignStep}
          onNext={() => setAssignStep((s) => Math.min(s + 1, 2))}
          onBack={() => setAssignStep((s) => Math.max(s - 1, 0))}
          onSubmit={() => {
            assignMekanikMutation.mutate(assignSpk, {
              onSuccess: () => setAssignSpk(null),
            });
          }}
          submitLabel="Konfirmasi Penugasan"
          isPending={assignMekanikMutation.isPending}
          size="md"
          steps={[
            {
              id: 'pekerjaan',
              label: 'Pilih Pekerjaan',
              isValid: true,
              content: (
                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 bg-surface rounded-xl border border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">No. SPK:</span>
                      <span className="font-mono font-bold text-accent">{assignSpk.no_spk}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">No. Polisi:</span>
                      <span className="font-bold text-ink">{assignSpk.no_polisi}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">Customer:</span>
                      <span className="font-semibold text-ink">{assignSpk.nama_customer || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">Service Advisor:</span>
                      <span className="font-semibold text-ink">{assignSpk.nama_sa}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">Lead Time:</span>
                      <span className="font-mono font-bold text-accent">
                        {assignSpk.estimasi_waktu_jam || assignSpk.lead_time_jam ? `${assignSpk.estimasi_waktu_jam || assignSpk.lead_time_jam} Jam` : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-surface rounded-xl border border-border">
                    <span className="text-ink-subtle text-xs block mb-1 font-bold">Keluhan Customer:</span>
                    <p className="text-ink italic">"{assignSpk.keluhan_customer || 'Tidak ada catatan keluhan.'}"</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'tugaskan',
              label: 'Tugaskan Mekanik',
              isValid: Boolean(selectedMekanik),
              content: (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">
                      Pilih Teknisi / Mekanik Bertugas:
                    </label>
                    <select
                      value={selectedMekanik}
                      onChange={(e) => setSelectedMekanik(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-bold bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none"
                    >
                      <option value="">-- Pilih Mekanik --</option>
                      {mekanikList.map((m) => (
                        <option key={m.id} value={m.nama_lengkap}>
                          {m.nama_lengkap} (Teknisi Mekanik)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-3 bg-accent-subtle rounded-xl border border-accent/20 text-accent text-xs">
                    Mekanik yang dipilih akan menerima notifikasi otomatis dan SPK ini akan masuk ke antrian pengerjaan mekanik tersebut.
                  </div>
                </div>
              ),
            },
            {
              id: 'konfirmasi',
              label: 'Konfirmasi',
              isValid: true,
              content: (
                <div className="space-y-3.5 text-xs">
                  <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
                    <div className="text-xs font-bold text-ink uppercase tracking-wider mb-2 border-b border-border pb-1">
                      Ringkasan Penugasan
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Unit Kendaraan:</span>
                      <span className="font-bold text-ink">{assignSpk.no_polisi} ({assignSpk.no_spk})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Mekanik Ditugaskan:</span>
                      <span className="font-bold text-accent text-sm">{selectedMekanik}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Instruksi:</span>
                      <span className="text-ink text-right">Pengecekan awal dan estimasi kebutuhan sparepart</span>
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* STEP MODAL 2: HASIL PENGECEKAN */}
      {showCekModal && selectedSpk && (
        <StepModal
          open={showCekModal}
          onClose={() => setShowCekModal(false)}
          title="Input Perbaikan Hasil Pengecekan"
          subtitle={`SPK ${selectedSpk.no_spk} • ${selectedSpk.no_polisi}`}
          currentStep={cekStep}
          onNext={() => setCekStep((s) => Math.min(s + 1, 2))}
          onBack={() => setCekStep((s) => Math.max(s - 1, 0))}
          onSubmit={() => {
            submitHasilPengecekanMutation.mutate(selectedSpk, {
              onSuccess: () => setShowCekModal(false),
            });
          }}
          submitLabel="Submit ke SA by Sistem"
          isPending={submitHasilPengecekanMutation.isPending}
          size="lg"
          steps={[
            {
              id: 'pekerjaan',
              label: 'Pilih Pekerjaan',
              isValid: true,
              content: (
                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 bg-surface rounded-xl border border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">SPK Kendaraan:</span>
                      <span className="font-bold text-ink">{selectedSpk.no_spk} — {selectedSpk.no_polisi}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">Customer:</span>
                      <span className="font-semibold text-ink">{selectedSpk.nama_customer}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">Mekanik:</span>
                      <span className="font-semibold text-ink">{selectedSpk.nama_mekanik || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">Status SPK:</span>
                      <StatusBadge status={selectedSpk.status_spk} size="sm" />
                    </div>
                  </div>
                  <div className="p-3.5 bg-surface rounded-xl border border-border">
                    <span className="text-ink-subtle text-xs block mb-1 font-bold">Keluhan Customer:</span>
                    <p className="text-ink italic">"{selectedSpk.keluhan_customer || 'Tidak ada keluhan.'}"</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'periksa',
              label: 'Periksa & Kebutuhan Part',
              isValid: Boolean(hasilPengecekan.rekomendasi.trim() && (existingCekParts.length + cekParts.length > 0)),
              content: (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-ink-muted mb-1.5">
                      Hasil Pengecekan &amp; Rekomendasi Perbaikan <span className="text-status-red">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Contoh:&#10;1. Ganti Kampas Rem Depan&#10;2. Bubut / Ganti Disc Brake Depan"
                      value={hasilPengecekan.rekomendasi}
                      onChange={(e) => setHasilPengecekan({ ...hasilPengecekan, rekomendasi: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-muted mb-1.5">Catatan Tambahan Foreman</label>
                    <textarea
                      rows={2}
                      placeholder="Catatan tambahan (opsional)"
                      value={hasilPengecekan.catatan_tambahan}
                      onChange={(e) => setHasilPengecekan({ ...hasilPengecekan, catatan_tambahan: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                  </div>

                  {/* Picker Kebutuhan Part */}
                  <div className="p-3.5 bg-surface rounded-xl border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-accent" /> Kebutuhan Part <span className="text-status-red">*</span>
                      </span>
                      <span className="font-bold text-ink-subtle">
                        {existingCekParts.length + cekParts.length} item
                      </span>
                    </div>

                    {/* Existing parts */}
                    {existingCekParts.map((p) => (
                      <div key={`saved-${p.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-raised border border-border text-xs">
                        <div>
                          <div className="font-bold text-ink">{p.nama_part}</div>
                          <div className="text-ink-muted font-mono">{p.kode_part} | Qty: {p.jumlah} {p.satuan}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-status-green-bg text-status-green">Tersimpan</span>
                      </div>
                    ))}

                    {/* New parts */}
                    {cekParts.map((p, idx) => (
                      <div key={`new-${p.kode_part}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-raised border border-accent/30 text-xs">
                        <div>
                          <div className="font-bold text-ink">{p.nama_part}</div>
                          <div className="text-ink-muted font-mono">{p.kode_part} | Qty: {p.jumlah} {p.satuan}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCekParts(cekParts.filter((_, i) => i !== idx))}
                          className="text-status-red hover:underline font-bold text-xs"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}

                    {/* Part picker */}
                    <div className="flex gap-2">
                      <select
                        value={cekPartPickerId}
                        onChange={(e) => setCekPartPickerId(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-border text-xs bg-surface-raised"
                      >
                        <option value="">-- Tambah Sparepart dari Gudang --</option>
                        {masterStokPart?.map((p) => (
                          <option key={p.kode_part} value={p.kode_part}>
                            {p.nama_part} ({p.kode_part}) - Stok: {p.stok}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={cekPartPickerQty}
                        onChange={(e) => setCekPartPickerQty(Math.max(1, Number(e.target.value)))}
                        className="w-16 px-2 py-2 rounded-xl border border-border text-xs text-center"
                      />
                      <button
                        type="button"
                        onClick={handleAddCekPart}
                        className="px-3 py-2 rounded-xl bg-accent text-white font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: 'konfirmasi',
              label: 'Konfirmasi',
              isValid: true,
              content: (
                <div className="space-y-3.5 text-xs">
                  <div className="p-4 bg-surface rounded-xl border border-border space-y-2.5">
                    <div className="font-bold text-ink uppercase tracking-wider border-b border-border pb-1">
                      Konfirmasi Hasil Pengecekan
                    </div>
                    <div>
                      <span className="text-ink-muted block">Rekomendasi Perbaikan:</span>
                      <div className="p-2.5 bg-surface-raised rounded-lg border border-border whitespace-pre-line mt-1">
                        {hasilPengecekan.rekomendasi}
                      </div>
                    </div>
                    {hasilPengecekan.catatan_tambahan && (
                      <div>
                        <span className="text-ink-muted block">Catatan Tambahan:</span>
                        <div className="p-2 bg-surface-raised rounded-lg border border-border mt-1">
                          {hasilPengecekan.catatan_tambahan}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-ink-muted block">Total Sparepart:</span>
                      <span className="font-bold text-accent">{existingCekParts.length + cekParts.length} jenis sparepart akan dikirim ke SA</span>
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* STEP MODAL 3: QC / FIR */}
      {showQcModal && selectedSpk && (
        <StepModal
          open={showQcModal}
          onClose={() => setShowQcModal(false)}
          title="Quality Control &amp; Final Inspection Report"
          subtitle={`SPK ${selectedSpk.no_spk} • ${selectedSpk.no_polisi}`}
          currentStep={qcStep}
          onNext={() => setQcStep((s) => Math.min(s + 1, 2))}
          onBack={() => setQcStep((s) => Math.max(s - 1, 0))}
          onSubmit={() => {
            submitQcMutation.mutate({ spk: selectedSpk, passed: true }, {
              onSuccess: () => setShowQcModal(false),
            });
          }}
          submitLabel="QC Passed (Ke SA)"
          isPending={submitQcMutation.isPending}
          size="lg"
          steps={[
            {
              id: 'pekerjaan',
              label: 'Pilih Pekerjaan',
              isValid: true,
              content: (
                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 bg-surface rounded-xl border border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">No. SPK:</span>
                      <span className="font-mono font-bold text-accent">{selectedSpk.no_spk}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">No. Polisi:</span>
                      <span className="font-bold text-ink">{selectedSpk.no_polisi}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">Customer:</span>
                      <span className="font-semibold text-ink">{selectedSpk.nama_customer || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">Mekanik Pengerjaan:</span>
                      <span className="font-semibold text-ink">{selectedSpk.nama_mekanik || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-muted">Status SPK:</span>
                      <StatusBadge status={selectedSpk.status_spk} size="sm" />
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: 'periksa',
              label: 'Pemeriksaan 5 Parameter',
              isValid: true,
              content: (
                <div className="space-y-4 text-xs">
                  <span className="block text-xs font-bold text-ink">5 Parameter Wajib Inspeksi Akhir:</span>
                  
                  {[
                    { key: 'pekerjaan_sesuai_wo', label: '1. Pekerjaan Sesuai WO', desc: 'Item jasa & part terpasang sesuai SPK' },
                    { key: 'fungsi_normal', label: '2. Fungsi Normal', desc: 'Sistem rem, kelistrikan, dan mesin bekerja optimal' },
                    { key: 'bebas_kebocoran', label: '3. Bebas Kebocoran', desc: 'Tidak ada kebocoran oli, minyak rem, atau cairan pendingin' },
                    { key: 'test_jalan', label: '4. Test Jalan', desc: 'Uji jalan singkat tidak ada getaran dan bunyi abnormal' },
                    { key: 'kebersihan', label: '5. Kebersihan', desc: 'Kabin, ruang mesin, dan bodi kendaraan bersih dari oli mekanik' },
                  ].map((param) => {
                    const isChecked = Boolean((firForm as any)[param.key]);
                    return (
                      <label
                        key={param.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-status-green/40 bg-status-green-bg text-ink'
                            : 'border-border bg-surface-raised hover:bg-surface'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setFirForm({ ...firForm, [param.key]: e.target.checked })}
                          className="w-4 h-4 mt-0.5 rounded text-status-green focus:ring-status-green cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold text-ink">{param.label}</div>
                          <div className="text-xs text-ink-muted">{param.desc}</div>
                        </div>
                      </label>
                    );
                  })}

                  <div>
                    <label className="block text-xs font-bold text-ink-muted mb-1.5">Catatan Hasil QC Foreman</label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Pengereman responsif, tidak ada getaran dan kebocoran."
                      value={firForm.catatan_foreman}
                      onChange={(e) => setFirForm({ ...firForm, catatan_foreman: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                  </div>
                </div>
              ),
            },
            {
              id: 'konfirmasi',
              label: 'Konfirmasi Keputusan',
              isValid: true,
              content: (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-surface rounded-xl border border-border space-y-2.5">
                    <div className="font-bold text-ink uppercase tracking-wider border-b border-border pb-1">
                      Konfirmasi Keputusan QC (FIR)
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Pekerjaan Sesuai WO:</span>
                      <span className={firForm.pekerjaan_sesuai_wo ? 'text-status-green font-bold' : 'text-status-red font-bold'}>{firForm.pekerjaan_sesuai_wo ? '✓ Ya' : '✕ Tidak'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Fungsi Normal:</span>
                      <span className={firForm.fungsi_normal ? 'text-status-green font-bold' : 'text-status-red font-bold'}>{firForm.fungsi_normal ? '✓ Ya' : '✕ Tidak'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Bebas Kebocoran:</span>
                      <span className={firForm.bebas_kebocoran ? 'text-status-green font-bold' : 'text-status-red font-bold'}>{firForm.bebas_kebocoran ? '✓ Ya' : '✕ Tidak'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Test Jalan:</span>
                      <span className={firForm.test_jalan ? 'text-status-green font-bold' : 'text-status-red font-bold'}>{firForm.test_jalan ? '✓ Ya' : '✕ Tidak'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Kebersihan:</span>
                      <span className={firForm.kebersihan ? 'text-status-green font-bold' : 'text-status-red font-bold'}>{firForm.kebersihan ? '✓ Ya' : '✕ Tidak'}</span>
                    </div>
                    {firForm.catatan_foreman && (
                      <div className="pt-1 border-t border-border">
                        <span className="text-ink-muted block">Catatan:</span>
                        <p className="font-medium text-ink mt-0.5">{firForm.catatan_foreman}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={submitQcMutation.isPending}
                      onClick={() => {
                        submitQcMutation.mutate({ spk: selectedSpk, passed: false }, {
                          onSuccess: () => setShowQcModal(false),
                        });
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-status-red-bg hover:bg-status-red/10 text-status-red border border-status-red/30 font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Kembalikan (Tidak Sesuai)
                    </button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Printable SPK A4 Modal */}
      {showPrintSpk && (
        <PrintSpkModal
          spk={showPrintSpk}
          onClose={() => setShowPrintSpk(null)}
        />
      )}

    </div>
  );
};
