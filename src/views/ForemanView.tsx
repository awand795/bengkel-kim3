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
import { ModalPortal } from '../components/common/ModalPortal';
import { toast } from '../components/common/Toast';
import { realtimeHub } from '../services/realtimeService';

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

  // Filter booking khusus service hari ini
  const todayBookings = bookingList.filter(
    (b) => !b.tujuan_kunjungan || b.tujuan_kunjungan === 'Service'
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
      <div className="bg-surface-raised rounded-md p-4 sm:p-5 border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-accent-subtle text-accent flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-ink">Dashboard Foreman</h1>
            <p className="text-xs text-ink-muted">Distribusi Pekerjaan, Pengecekan Mekanik, dan Quality Control (FIR)</p>
          </div>
        </div>
      </div>

      {/* Mini KPI Banners for Foreman */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('Semua')}
          className={`p-3.5 sm:p-4 rounded-md border transition-all cursor-pointer ${
            statusFilter === 'Semua' ? 'bg-accent-subtle border-accent/30 ring-2 ring-accent/20 shadow-xs' : 'bg-surface-raised border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted">Total SPK</span>
            <div className="w-7 h-7 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-accent mt-1">{totalSpkCount}</div>
          <span className="text-[10px] text-ink-subtle">Seluruh SPK aktif</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Perlu Ditugaskan')}
          className={`p-3.5 sm:p-4 rounded-md border transition-all cursor-pointer ${
            statusFilter === 'Perlu Ditugaskan' ? 'bg-status-amber-bg border-status-amber/30 ring-2 ring-status-amber/20 shadow-xs' : 'bg-surface-raised border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-status-amber">Perlu Ditugaskan</span>
            <div className="w-7 h-7 rounded-md bg-status-amber-bg text-status-amber flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-status-amber mt-1">{unassignedCount}</div>
          <span className="text-[10px] text-status-amber">Belum ada mekanik</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Dalam Pengerjaan')}
          className={`p-3.5 sm:p-4 rounded-md border transition-all cursor-pointer ${
            statusFilter === 'Dalam Pengerjaan' ? 'bg-status-blue-bg border-status-blue/30 ring-2 ring-status-blue/20 shadow-xs' : 'bg-surface-raised border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-status-blue">Dalam Pengerjaan</span>
            <div className="w-7 h-7 rounded-md bg-status-blue-bg text-status-blue flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-status-blue mt-1">{inProgressCount}</div>
          <span className="text-[10px] text-status-blue">Teknisi aktif di pit</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Waiting QC')}
          className={`p-3.5 sm:p-4 rounded-md border transition-all cursor-pointer ${
            statusFilter === 'Waiting QC' ? 'bg-status-green-bg border-status-green/30 ring-2 ring-status-green/20 shadow-xs' : 'bg-surface-raised border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-status-green">Siap QC (FIR)</span>
            <div className="w-7 h-7 rounded-md bg-status-green-bg text-status-green flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-status-green mt-1">{waitingQcCount}</div>
          <span className="text-[10px] text-status-green">Siap diinspeksi</span>
        </div>
      </div>

      {/* TAB 1: DASHBOARD SPK FOREMAN */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">

          {/* Card: Jadwal Booking Hari Ini (Estimasi Beban Kerja yang Akan Datang) */}
          <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-accent-subtle text-accent flex items-center justify-center font-bold shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-ink">Jadwal Booking Hari Ini</h2>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-accent-subtle text-accent border border-accent/30">
                      {todayBookings.length} Armada Terjadwal
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Beban kerja service yang akan datang (estimasi kedatangan armada di bengkel hari ini)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-ink-muted font-medium flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-md border border-border">
                  <Clock className="w-3.5 h-3.5 text-ink-subtle" />
                  <span>{todayFormatted}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsBookingExpanded(!isBookingExpanded)}
                  className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface rounded-md transition-colors"
                  title={isBookingExpanded ? 'Ciutkan Card' : 'Perluas Card'}
                >
                  {isBookingExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isBookingExpanded ? (
              <div className="space-y-3">
                {todayBookings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {todayBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-md border border-border bg-surface/60 hover:bg-surface-raised hover:border-accent/30 hover:shadow-xs transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-subtle text-accent font-bold text-xs border border-accent/30">
                              <Clock className="w-3.5 h-3.5 text-accent" />
                              {b.jam_booking || '08:00'} WIB
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface/80 text-ink-muted flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              {b.jenis_armada || 'Truk'}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              b.status === 'Check In'
                                ? 'bg-status-green-bg text-status-green'
                                : 'bg-status-amber-bg text-status-amber'
                            }`}
                          >
                            {b.status === 'Check In' ? '✓ Sudah Check-In' : '⏳ Menunggu Masuk'}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-base font-black text-ink tracking-tight">{b.no_polisi}</span>
                            <div className="text-xs font-semibold text-ink-muted">{b.nama_perusahaan || b.nama_customer}</div>
                          </div>
                          {b.prioritas === 'Prioritas Booking' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-status-red-bg text-status-red border border-status-red/30">
                              Prioritas
                            </span>
                          )}
                        </div>

                        <div className="text-xs bg-surface-raised p-2.5 rounded-md border border-border space-y-1">
                          <div className="flex items-center gap-1.5 text-ink font-semibold">
                            <Wrench className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span>{b.jenis_layanan || 'Service Berkala'}</span>
                          </div>
                          {(b.keluhan || b.keterangan) && (
                            <p className="text-[11px] text-ink-muted line-clamp-2 italic">
                              "{b.keluhan || b.keterangan}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-ink-muted pt-1 border-t border-border">
                          <span>Driver: <strong className="text-ink-muted">{b.pic_driver || '-'}</strong></span>
                          {b.no_telepon && (
                            <span className="font-mono text-ink-muted">{b.no_telepon}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-ink-subtle text-xs bg-surface rounded-md border border-dashed border-border">
                    <Calendar className="w-8 h-8 text-ink-subtle mx-auto mb-2" />
                    Belum ada armada booking yang dijadwalkan untuk hari ini.
                  </div>
                )}

                <div className="text-[11px] text-ink-muted bg-accent-subtle p-2.5 rounded-md border border-accent/30 flex items-center gap-2">
                  <Info className="w-4 h-4 text-accent shrink-0" />
                  <span>
                    Armada yang tiba di pos security gerbang dan telah dibuatkan SPK oleh SA akan otomatis muncul pada daftar <strong>SPK Menunggu &amp; On Progress</strong> di bawah untuk didistribusikan ke mekanik.
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-ink-muted bg-surface p-3 rounded-md border border-border flex items-center justify-between">
                <span>
                  <strong>{todayBookings.length} Armada Terjadwal:</strong>{' '}
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
          <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs space-y-4">
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
                  className="w-full pl-9 pr-8 py-2 rounded-md border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none transition-all"
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
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['Semua', 'Perlu Ditugaskan', 'Dalam Pengerjaan', 'Waiting QC'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setSpkPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
                      statusFilter === st
                        ? 'bg-ink text-surface shadow-xs'
                        : 'bg-surface text-ink-muted hover:bg-surface-raised'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* List SPK */}
            <div className="space-y-3">
              {filteredSpkList.length > 0 ? (
                paginatedSpkList.map((spk) => (
                  <div
                    key={spk.id}
                    onClick={() => setSelectedSpk(spk)}
                    className={`p-4 rounded-md border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                      selectedSpk?.id === spk.id
                        ? 'border-accent bg-accent-subtle shadow-xs'
                        : 'border-border hover:border-border hover:bg-surface/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-accent">{spk.no_spk}</span>
                      <StatusBadge status={spk.status_spk} size="sm" />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <div className="text-sm font-black text-ink">{spk.no_polisi}</div>
                        <div className="text-xs text-ink-muted">{spk.nama_customer}</div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-ink-subtle block text-[10px]">Lead Time:</span>
                        <span className="font-bold text-accent">{spk.estimasi_waktu_jam || spk.lead_time_jam ? `${spk.estimasi_waktu_jam || spk.lead_time_jam} Jam` : '-'}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-ink-muted bg-surface-raised/80 p-2 rounded-md border border-border line-clamp-1">
                      <span className="font-semibold text-ink-muted">Keluhan:</span> {spk.keluhan_customer}
                    </div>

                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs text-ink-muted">
                      <span>Mekanik: <strong className="text-ink">{spk.nama_mekanik || 'Belum ditugaskan'}</strong></span>
                      <span className="text-accent font-semibold">Pilih untuk Aksi →</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-ink-subtle text-xs bg-surface rounded-md border border-dashed border-border">
                  Tidak ditemukan SPK yang sesuai dengan pencarian atau filter "{statusFilter}".
                </div>
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

          {/* MODAL: Panel Distribusi & Aksi Foreman */}
          {selectedSpk && (
            <ModalPortal onClose={() => setSelectedSpk(null)}>
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-surface-raised rounded-md max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-border my-8">
            {selectedSpk ? (
              <div className="space-y-4">
                <div className="border-b border-border pb-3 flex items-start justify-between gap-3">
                  <div>
                  <span className="text-[10px] uppercase font-bold text-ink-subtle">Armada Terpilih</span>
                  <h3 className="text-lg font-black text-ink">{selectedSpk.no_polisi}</h3>
                  <p className="text-xs text-ink-muted">{selectedSpk.nama_customer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSpk(null)}
                    className="p-2 rounded-md text-ink-subtle hover:text-ink hover:bg-surface transition-colors shrink-0"
                    aria-label="Tutup panel foreman"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-ink-muted">Status Saat Ini:</span>
                    <StatusBadge status={selectedSpk.status_spk} size="sm" />
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-ink-muted">Service Advisor:</span>
                    <span className="font-bold text-ink">{selectedSpk.nama_sa}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block mb-1">Keluhan:</span>
                    <p className="p-2 bg-surface rounded-md text-ink font-medium">
                      {selectedSpk.keluhan_customer}
                    </p>
                  </div>
                </div>

                {/* Assign Mekanik Section — terkunci bila WO sudah selesai/QC/closed */}
                {['Waiting QC', 'QC Passed', 'FIR Closed', 'Selesai'].includes(selectedSpk.status_spk as string) ? (
                  <div className="pt-2 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-ink-muted">Mekanik Pelaksana:</span>
                      <span className="font-bold text-ink">{selectedSpk.nama_mekanik || '-'}</span>
                    </div>
                    <p className="p-2.5 rounded-md bg-surface border border-dashed border-border text-ink-muted font-semibold text-center">
                      Penugasan terkunci — WO sudah selesai dikerjakan ({selectedSpk.status_spk}).
                    </p>
                  </div>
                ) : (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Pilih Mekanik untuk Pengerjaan:
                  </label>
                  <select
                    value={selectedMekanik}
                    onChange={(e) => setSelectedMekanik(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border text-xs font-bold bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none"
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
                    className="w-full mt-3 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <UserCheck className="w-4 h-4" /> TUGASKAN KE MEKANIK
                  </button>
                </div>
                )}

                {/* Quick Link to Hasil Cek or QC */}
                <div className="pt-2 border-t border-border flex flex-col gap-2">
                  {(selectedSpk.status_spk === 'Menunggu Pengecekan Mekanik' || selectedSpk.status_spk === 'Estimasi Dibuat') ? (
                    <button
                      onClick={() => setActiveTab('hasil-pengecekan')}
                      className="w-full py-2 bg-accent-subtle text-accent hover:bg-accent-subtle rounded-md font-bold text-xs transition-colors"
                    >
                      Input Hasil Pengecekan Fisik →
                    </button>
                  ) : (
                    <p className="p-2 rounded-md bg-surface border border-dashed border-border text-ink-muted font-semibold text-[11px] text-center">
                      Hasil pengecekan sudah difinalisasi.
                    </p>
                  )}
                  {selectedSpk.status_spk === 'Waiting QC' && (
                    <button
                      onClick={() => setActiveTab('qc-fir')}
                      className="w-full py-2 bg-status-green text-white hover:bg-status-green/90 rounded-md font-bold text-xs transition-colors shadow-xs"
                    >
                      Buka Form Quality Control (QC) →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPrintSpk(selectedSpk)}
                    className="w-full py-2 bg-surface text-ink-muted hover:bg-surface-raised border border-border rounded-md font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak Lembar SPK (A4)
                  </button>
                </div>
              </div>
            ) : null}
              </div>
            </div>
          </ModalPortal>
        )}

      </div>
      )}

      {/* TAB 2: INPUT PERBAIKAN HASIL PENGECEKAN (image1.png Mockup 5) */}
      {activeTab === 'hasil-pengecekan' && (
        <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs max-w-2xl mx-auto">
          <div className="border-b border-border pb-3 mb-4">
            <h2 className="text-base font-bold text-ink">Input Perbaikan Hasil Pengecekan Mekanik & Foreman</h2>
            <p className="text-xs text-ink-muted">Pengecekan fisik komponen yang perlu diperbaiki / diganti untuk disubmit ke SA</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Pilih SPK Armada:</label>
              <select
                value={selectedSpk?.id || ''}
                onChange={(e) => {
                  const spk = spkList?.find(s => s.id === Number(e.target.value));
                  setSelectedSpk(spk || null);
                }}
                className="w-full px-3.5 py-2 rounded-md border border-border text-xs font-bold bg-surface-raised focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">-- Pilih SPK Armada --</option>
                {spkList?.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.no_spk} - {s.no_polisi} ({s.nama_customer})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">
                Hasil Pengecekan & Rekomendasi Perbaikan
              </label>
              <textarea
                rows={4}
                placeholder="Contoh:&#10;1. Ganti Kampas Rem Depan&#10;2. Bubut / Ganti Disc Brake Depan&#10;3. Ganti Minyak Rem"
                value={hasilPengecekan.rekomendasi}
                onChange={(e) => setHasilPengecekan({ ...hasilPengecekan, rekomendasi: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Removed Estimasi Biaya and Waktu Jam, this is SA's job */}
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Catatan Tambahan Foreman</label>
              <textarea
                rows={2}
                placeholder="Contoh: Piringan rem sudah beralur dalam, disarankan sekalian ganti kampas dan minyak rem."
                value={hasilPengecekan.catatan_tambahan}
                onChange={(e) => setHasilPengecekan({ ...hasilPengecekan, catatan_tambahan: e.target.value })}
                className="w-full px-3.5 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>

            {/* Kebutuhan Sparepart hasil pengecekan (wajib >= 1: gerbang START mekanik & estimasi SA) */}
            <div className="bg-surface p-4 rounded-md border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-accent" /> Sparepart yang Dibutuhkan
                  <span className="text-status-red">*</span>
                </span>
                <span className="text-[10px] font-bold text-ink-subtle">
                  {existingCekParts.length + cekParts.length} item
                </span>
              </div>

              {existingCekParts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-ink-subtle uppercase">Sudah tersimpan (inputan sebelumnya):</span>
                  {existingCekParts.map((p) => (
                    <div key={`saved-${p.id}`} className="flex items-center justify-between px-3 py-2 rounded-md bg-surface-raised border border-border text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-ink truncate">{p.nama_part}</div>
                        <div className="text-[11px] text-ink-muted font-mono">{p.kode_part || '-'} | Qty: {p.jumlah} {p.satuan}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${p.status_ketersediaan === 'Ready di Stock' ? 'bg-status-green-bg text-status-green' : 'bg-status-amber-bg text-status-amber'}`}>
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
                  className="px-3 py-2 rounded-md border border-border text-xs font-semibold bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none min-w-0 truncate"
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
                  className="px-2 py-2 rounded-md border border-border text-xs font-mono font-bold text-center focus:ring-2 focus:ring-accent focus:outline-none"
                  title="Jumlah"
                />
                <button
                  type="button"
                  disabled={!cekPartPickerId}
                  onClick={handleAddCekPart}
                  className="px-3 py-2 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Tambah
                </button>
              </div>

              {cekParts.length > 0 && (
                <div className="space-y-1.5">
                  {cekParts.map((p) => (
                    <div key={`new-${p.kode_part}`} className="flex items-center justify-between px-3 py-2 rounded-md bg-accent-subtle/50 border border-accent/30 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-ink truncate">{p.nama_part}</div>
                        <div className="text-[11px] text-ink-muted font-mono">{p.kode_part} | Qty: {p.jumlah} {p.satuan} | Stok gudang: {p.stok}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCekParts(cekParts.filter((x) => x.kode_part !== p.kode_part))}
                        className="p-1.5 rounded-md text-status-red hover:bg-status-red-bg transition-colors"
                        title="Hapus dari daftar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {existingCekParts.length + cekParts.length === 0 && (
                <p className="text-[11px] text-status-red font-semibold">
                  Wajib tambah minimal 1 sparepart — tanpa ini SA tidak bisa estimasi & mekanik tidak bisa START.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedSpk || submitHasilPengecekanMutation.isPending}
              onClick={() => selectedSpk && submitHasilPengecekanMutation.mutate(selectedSpk)}
              className="w-full py-3 rounded-md bg-accent hover:bg-accent-hover disabled:bg-surface text-white font-bold text-sm shadow-md shadow-accent/20 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> SUBMIT KE SA BY SISTEM
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: QUALITY CONTROL (QC) & FIR (image1.png Mockup QC) */}
      {activeTab === 'qc-fir' && (
        <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs max-w-2xl mx-auto">
          <div className="border-b border-border pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-green"></span>
              <h2 className="text-base font-bold text-ink">Final Inspection Report (FIR) - Quality Control</h2>
            </div>
            <p className="text-xs text-ink-muted">Foreman periksa hasil kerja mekanik sebelum diserahkan ke SA</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Pilih SPK Armada untuk QC:</label>
              <select
                value={selectedSpk?.id || ''}
                onChange={(e) => {
                  const spk = spkList?.find(s => s.id === Number(e.target.value));
                  setSelectedSpk(spk || null);
                }}
                className="w-full px-3.5 py-2 rounded-md border border-border text-xs font-bold bg-surface-raised focus:outline-none focus:ring-2 focus:ring-accent"
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
            <div className="p-4 rounded-md bg-surface border border-border space-y-3">
              <span className="block text-xs font-bold text-ink">5 Parameter Wajib Inspeksi Akhir:</span>
              
              {[
                { key: 'pekerjaan_sesuai_wo', label: '1. Pekerjaan Sesuai WO', desc: 'Item jasa & part terpasang sesuai SPK' },
                { key: 'fungsi_normal', label: '2. Fungsi Normal', desc: 'Sistem rem, kelistrikan, dan mesin bekerja optimal' },
                { key: 'bebas_kebocoran', label: '3. Bebas Kebocoran', desc: 'Tidak ada kebocoran oli, minyak rem, atau cairan pendingin' },
                { key: 'test_jalan', label: '4. Test Jalan', desc: 'Uji jalan singkat tidak ada getaran dan bunyi abnormal' },
                { key: 'kebersihan', label: '5. Kebersihan', desc: 'Kabin, ruang mesin, dan bodi armada bersih dari oli mekanik' },
              ].map((param) => (
                <label key={param.key} className="flex items-start gap-3 p-2 bg-surface-raised rounded-md border border-border cursor-pointer hover:bg-surface transition-colors">
                  <input
                    type="checkbox"
                    checked={(firForm as any)[param.key]}
                    onChange={(e) => setFirForm({ ...firForm, [param.key]: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-status-green focus:ring-status-green"
                  />
                  <div>
                    <div className="text-xs font-bold text-ink">{param.label}</div>
                    <div className="text-[11px] text-ink-muted">{param.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Catatan Hasil QC Foreman</label>
              <textarea
                rows={2}
                placeholder="Contoh: Pengereman responsif, tidak ada getaran dan kebocoran."
                value={firForm.catatan_foreman}
                onChange={(e) => setFirForm({ ...firForm, catatan_foreman: e.target.value })}
                className="w-full px-3.5 py-2 rounded-md border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={!selectedSpk || submitQcMutation.isPending}
                onClick={() => selectedSpk && submitQcMutation.mutate({ spk: selectedSpk, passed: false })}
                className="py-3 rounded-md bg-status-red-bg hover:bg-status-red/10 text-status-red border border-status-red/30 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> TIDAK SESUAI (KEMBALIKAN)
              </button>

              <button
                type="button"
                disabled={!selectedSpk || submitQcMutation.isPending}
                onClick={() => selectedSpk && submitQcMutation.mutate({ spk: selectedSpk, passed: true })}
                className="py-3 rounded-md bg-status-green hover:bg-status-green/90 text-white font-bold text-xs shadow-md shadow-status-green/20 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> QC PASSED (KE SA)
              </button>
            </div>
          </div>
        </div>
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
