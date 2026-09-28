import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage, formatPlat } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { SpkService } from '../types';
import { realtimeHub, publishKeCustomer } from '../services/realtimeService';
import { useAppStore } from '../store/useAppStore';
import { usePpnRate } from '../hooks/usePpnRate';
import { etaSpk, labelSumberEta } from '../utils/eta';import {
  ClipboardList, 
  Wrench, 
  PlusCircle, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Check, 
  X, 
  ShoppingBag,
  Eye,
  FileCheck,
  Printer,
  Package,
  AlertCircle,
  Trash2,
  Plus,
  Minus,
  Search,
  Filter,
  ShieldCheck,
  Car,
  Zap,
  Receipt,
  CheckCircle2,
  CheckCheck,
  Truck,
  PackagePlus,
  PackageCheck,
  Building2,
  Phone,
  User,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Pencil,
  Calendar,
  Loader2
} from 'lucide-react';
import { PrintSpkModal } from '../components/print/PrintSpkModal';
import { PrintThermalInvoiceModal } from '../components/print/PrintThermalInvoiceModal';
import { PaginationBar } from '../components/common/PaginationBar';
import { ModalPortal } from '../components/common/ModalPortal';
import { toast } from '../components/common/Toast';
import { StepModal } from '../components/common/StepModal';
import { DetailModal } from '../components/common/DetailModal';
import { ListItemCard } from '../components/common/ListItemCard';
import { StatCard } from '../components/common/StatCard';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';
import { FilterChips } from '../components/common/FilterChips';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { TransaksiBeliPart, StokSparepart, InvoicePembayaran, MemoKeluar, PurchaseRequestPart } from '../types';

export const ServiceAdvisorView: React.FC<{ initialTab?: 'penerimaan' | 'spk-list' | 'estimasi-pr' | 'fir-closed' | 'penjualan-part' | 'penjualan-part-pos' | 'permintaan-part' }> = ({ initialTab = 'spk-list' }) => {
  const queryClient = useQueryClient();
  const { currentUser, saPendingAntrianId, setSaPendingAntrianId, navTick, activeTab: storeActiveTab } = useAppStore();
  const [activeTab, setActiveTab] = useState<'penerimaan' | 'spk-list' | 'estimasi-pr' | 'fir-closed' | 'penjualan-part' | 'permintaan-part'>(
    initialTab === 'penjualan-part-pos' ? 'penjualan-part' : initialTab
  );

  // Sinkron tab internal saat navigasi deep-link (mis. Dashboard "Buat SPK" -> penerimaan).
  // 'penjualan-part-pos' hanya sinyal pembuka modal POS, bukan tab aktual.
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === 'penjualan-part-pos' ? 'penjualan-part' : initialTab);
    }
  }, [initialTab]);

  // Reset ke tab utama saat menu sidebar diklik (termasuk klik ulang menu yang sama)
  useEffect(() => {
    if (!navTick && !storeActiveTab) return;
    if (storeActiveTab === 'sa-penerimaan' || storeActiveTab === 'sa-baru') setActiveTab('penerimaan');
    else if (storeActiveTab === 'purchasing' || storeActiveTab === 'sa-kotak-merah') setActiveTab('estimasi-pr');
    else if (storeActiveTab === 'sa' || storeActiveTab === 'sa-list') setActiveTab('spk-list');
    else if (storeActiveTab === 'sa-permintaan-part') setActiveTab('permintaan-part');
    else if (storeActiveTab === 'beli-part' || storeActiveTab === 'beli-part-transaksi' || storeActiveTab === 'sa-penjualan-part') setActiveTab('penjualan-part');
    else if (storeActiveTab === 'beli-part-estimasi') {
      // Menu sidebar "Estimasi Baru (POS)": buka langsung modal POS.
      setActiveTab('penjualan-part');
      resetPosForm();
      setShowPosModal(true);
    }
  }, [navTick, storeActiveTab]);

  // Deep-link awal: dibuka dengan initialTab 'penjualan-part-pos' (sidebar
  // "Estimasi Baru (POS)") → langsung tampilkan modal POS sekali di mount.
  const posAutoOpenedRef = React.useRef(false);
  useEffect(() => {
    if (!posAutoOpenedRef.current && initialTab === 'penjualan-part-pos') {
      posAutoOpenedRef.current = true;
      setActiveTab('penjualan-part');
      setShowPosModal(true);
    }
  }, [initialTab]);
  const [selectedSpk, setSelectedSpk] = useState<SpkService | null>(null);
  const [showPrModal, setShowPrModal] = useState<SpkService | null>(null);
  const [showPrintSpk, setShowPrintSpk] = useState<SpkService | null>(null);
  const [showFinalCheckModal, setShowFinalCheckModal] = useState<SpkService | null>(null);

  // Form Pemeriksaan Akhir (Final Check SA) Checklist State
  const [finalCheckForm, setFinalCheckForm] = useState({
    kebersihan: false,
    tes_jalan: false,
    kelengkapan_surat: false,
    catatan_final: '',
  });

  const handleOpenFinalCheck = (spk: SpkService) => {
    setShowFinalCheckModal(spk);
    setFinalCheckForm({
      kebersihan: false,
      tes_jalan: false,
      kelengkapan_surat: false,
      catatan_final: '',
    });
  };

  const isFinalCheckValid = 
    finalCheckForm.kebersihan && 
    finalCheckForm.tes_jalan && 
    finalCheckForm.kelengkapan_surat;

  // Search & Filter State for SPK List
  const [saSearchQuery, setSaSearchQuery] = useState('');
  const [saStatusFilter, setSaStatusFilter] = useState<'Semua' | 'Dalam Pengerjaan' | 'Waiting Part' | 'QC Passed' | 'FIR Closed' | 'Selesai'>('Semua');
  const [spkPage, setSpkPage] = useState(1);
  const [spkLimit, setSpkLimit] = useState(10);

  // Form Penerimaan State (Create SPK awal)
  const [formPenerimaan, setFormPenerimaan] = useState({
    id_antrian: undefined as number | undefined,
    no_polisi: '',
    nama_customer: '',
    no_hp_customer: '',
    jenis_layanan: 'Service Truk / Berkala',
    odometer_km: 0,
    foto_kendaraan_masuk: '',
    foto_odometer: '',
    foto_stnk: '',
    foto_kir: '',
    keluhan_customer: '',
    cek_body: 'OK',
    cek_mesin: 'OK',
    cek_kelistrikan: 'OK',
    cek_kaki_kaki: 'OK',
    catatan_kondisi_awal: '',
    estimasi_waktu_jam: 6,
    lead_time_jam: 6,
    catatan_sa: '',
  });

  // State Modal PR & Konfirmasi Tolak
  const [selectedPrId, setSelectedPrId] = useState<number | null>(null);
  const [prRejectConfirmOpen, setPrRejectConfirmOpen] = useState<boolean>(false);

  // Part Selection State for Estimasi Modal
  const [showEstimasiModal, setShowEstimasiModal] = useState<SpkService | null>(null);
  const [selectedParts, setSelectedParts] = useState<Array<{
    kode_part: string;
    nama_part: string;
    jumlah: number;
    satuan: string;
    harga_satuan: number;
    stok: number;
  }>>([]);
  const [partPickerId, setPartPickerId] = useState<string>('');
  const [partPickerQty, setPartPickerQty] = useState<number>(1);
  const [estimasiWaktu, setEstimasiWaktu] = useState<number>(6);
  // Picker tambahan SA tersembunyi di balik tombol (sumber utama = inputan Foreman)
  const [showPartPicker, setShowPartPicker] = useState<boolean>(false);

  // Jasa Servis Dasar: pilihan sistem — sertakan atau tidak + nominal bisa diisi.
  // Default ikut & Rp 250.000 (mempertahankan perilaku lama).
  const [jasaTermasuk, setJasaTermasuk] = useState<boolean>(true);
  const [jasaNominal, setJasaNominal] = useState<number>(250000);

  const resetEstimasiForm = () => {
    setSelectedParts([]);
    setPartPickerId('');
    setPartPickerQty(1);
    setShowPartPicker(false);
    setEstimasiWaktu(6);
    setJasaTermasuk(true);
    setJasaNominal(250000);
  };

  // Form PR (Purchase Request)
  const [prNote, setPrNote] = useState('');

  // Picker part PR manual: select + jumlah, bisa beberapa item (sesuai kondisi)
  const [prParts, setPrParts] = useState<Array<{
    kode_part: string;
    nama_part: string;
    jumlah: number;
    satuan: string;
    stok: number;
  }>>([]);
  const [prPickerId, setPrPickerId] = useState<string>('');
  const [prPickerQty, setPrPickerQty] = useState<number>(1);

  const resetPrForm = () => {
    setPrParts([]);
    setPrPickerId('');
    setPrPickerQty(1);
    setPrNote('');
  };

  // ════════════════════════════════════════════════════════════════════════
  // PENJUALAN PART LANGSUNG (SA) — Modal-Driven, konsisten dgn modul lain
  // Alur (8 langkah): Masuk gerbang (Security) → SA estimasi POS → approval
  // → Warehouse picking → Barang siap → SA serahkan (Memo Keluar) → Kasir
  // faktur → keluar gerbang.
  // ════════════════════════════════════════════════════════════════════════
  const [showPosModal, setShowPosModal] = useState<boolean>(false);
  const [posStep, setPosStep] = useState<1 | 2>(1);
  const [showPartDetailModal, setShowPartDetailModal] = useState<TransaksiBeliPart | null>(null);
  const [printThermalInvoice, setPrintThermalInvoice] = useState<InvoicePembayaran | null>(null);

  // Form POS: customer bisa dipilih dari antrian gerbang (tujuan "Beli Part")
  // atau diinput manual (walk-in tanpa kendaraan).
  const [posCustomer, setPosCustomer] = useState({
    id_antrian: undefined as number | undefined,
    nama_customer: '',
    no_polisi: '',
    no_telepon: '',
    catatan: '',
  });

  const [posCart, setPosCart] = useState<Array<{
    kode_part: string;
    nama_part: string;
    harga: number;
    qty: number;
    stok: number;
    satuan: string;
    lokasi_rak?: string;
  }>>([]);
  const [posSearch, setPosSearch] = useState('');

  const resetPosForm = () => {
    setPosCustomer({
      id_antrian: undefined,
      nama_customer: '',
      no_polisi: '',
      no_telepon: '',
      catatan: '',
    });
    setPosCart([]);
    setPosSearch('');
    setPosStep(1);
  };

  // Transaksi terpilih di panel detail
  const [posSearchTransaksi, setPosSearchTransaksi] = useState('');
  const [posPage, setPosPage] = useState(1);
  const [posLimit, setPosLimit] = useState(10);
  const [posMetodeBayar, setPosMetodeBayar] = useState<'Cash' | 'Transfer Bank' | 'QRIS' | 'EDC'>('Cash');

  // Prefill PR dari part SPK yang tidak ready (SA tinggal tambah/kurangi)
  useEffect(() => {
    if (!showPrModal) return;
    resetPrForm();
    const indent = (spkPartList || [])
      .filter((p) => p.id_spk === showPrModal.id && (p.status_ketersediaan || '') !== 'Ready di Stock')
      .map((ep) => {
        const master = masterStokPart?.find((m) => m.kode_part === ep.kode_part);
        return {
          kode_part: ep.kode_part || '',
          nama_part: ep.nama_part,
          jumlah: ep.jumlah,
          satuan: ep.satuan || '',
          stok: master ? master.stok : 0,
        };
      });
    if (indent.length > 0) setPrParts(indent);
  }, [showPrModal]);

  // Queries
  const { data: spkList, isLoading: loadingSpk } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 8000,
  });

  const { data: masterStokPart } = useQuery({
    queryKey: ['stok-part'],
    queryFn: api.getStokPart,
  });

  // Part inputan Foreman (sumber utama kebutuhan SPK — SA tinggal verifikasi
  // harga/jumlah, bukan input ulang dari nol)
  const { data: spkPartList } = useQuery({
    queryKey: ['part-spk-list'],
    queryFn: api.getPartSpk,
    refetchInterval: 8000,
  });

  // Baris pekerjaan SPK (untuk prefill & sinkron Jasa Servis Dasar)
  const { data: spkPekerjaanList } = useQuery({
    queryKey: ['pekerjaan-spk-list'],
    queryFn: api.getPekerjaanSpk,
    refetchInterval: 8000,
  });

  // Nama baku baris jasa (sama persis di submit & prefill agar tidak ganda)
  const JASA_NAMA = 'Jasa Servis Dasar';

  // Prefill modal estimasi saat dibuka: part foreman tampil read-only (derivasi),
  // buffer tambahan SA dikosongkan, picker tertutup.
  useEffect(() => {
    if (!showEstimasiModal) return;
    setSelectedParts([]);
    setPartPickerId('');
    setPartPickerQty(1);
    setShowPartPicker(false);
    if (showEstimasiModal.estimasi_waktu_jam) setEstimasiWaktu(showEstimasiModal.estimasi_waktu_jam);
    // Prefill jasa dari baris tersimpan (bila ada); default ikut Rp 250.000
    const existingJasa = (spkPekerjaanList || []).find(
      (p) => p.id_spk === showEstimasiModal.id && (p.nama_pekerjaan || '').trim().toLowerCase() === JASA_NAMA.toLowerCase()
    );
    if (existingJasa) {
      const nominal = Number(existingJasa.biaya_jasa) || 0;
      setJasaTermasuk(nominal > 0);
      setJasaNominal(nominal > 0 ? nominal : 250000);
    } else {
      setJasaTermasuk(true);
      setJasaNominal(250000);
    }
  }, [showEstimasiModal, spkPekerjaanList]);

  // Part inputan Foreman (sumber utama, read-only): stok live dari master gudang,
  // fallback status ketersediaan tersimpan bila master belum termuat.
  const foremanParts = (spkPartList || [])
    .filter((p) => p.id_spk === showEstimasiModal?.id)
    .map((ep) => {
      const master = masterStokPart?.find((m) => m.kode_part === ep.kode_part);
      const stok = master ? master.stok : (ep.status_ketersediaan === 'Ready di Stock' ? ep.jumlah : 0);
      return {
        kode_part: ep.kode_part || '',
        nama_part: ep.nama_part,
        jumlah: ep.jumlah,
        satuan: ep.satuan || '',
        harga_satuan: Number(ep.harga_satuan) || 0,
        stok,
      };
    });

  const { data: antrianList, isError: antrianError, error: antrianErrorDetail, refetch: refetchAntrian, isFetching: antrianFetching } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
  });

  const antrianMenungguSA = (antrianList || []).filter(
    a => a.status_kunjungan === 'Check In' && a.tujuan_kedatangan === 'Service'
  );

  // Helper: populate formPenerimaan from an antrian record
  const fillAntrianToForm = useCallback((antrian: typeof antrianMenungguSA[0]) => {
    setFormPenerimaan(prev => ({
      ...prev,
      id_antrian: antrian.id,
      no_polisi: antrian.no_polisi,
      nama_customer: antrian.nama_customer || '',
      no_hp_customer: antrian.no_hp_customer || '',
      keluhan_customer: antrian.keperluan || antrian.catatan_security || '',
      foto_kendaraan_masuk: antrian.foto_kendaraan_masuk || '',
    }));
  }, []);

  // Auto-select antrian when opening "penerimaan" tab and no vehicle is selected yet
  useEffect(() => {
    if (activeTab === 'penerimaan' && !formPenerimaan.id_antrian && antrianMenungguSA.length > 0) {
      fillAntrianToForm(antrianMenungguSA[0]);
    }
  }, [activeTab, antrianMenungguSA.length, formPenerimaan.id_antrian, fillAntrianToForm]);

  // Deep-link dari Dashboard: pilihan "Buat SPK" pada baris antrian tertentu
  // langsung mengisi form penerimaan dengan antrian tersebut (konsumsi sekali).
  useEffect(() => {
    if (saPendingAntrianId && antrianMenungguSA.length > 0) {
      const target = antrianMenungguSA.find(a => a.id === saPendingAntrianId);
      if (target) {
        fillAntrianToForm(target);
      }
      setSaPendingAntrianId(null);
    }
  }, [saPendingAntrianId, antrianMenungguSA, fillAntrianToForm, setSaPendingAntrianId]);

  // Part Indent (PR): data real-time dari purchasing dengan auto-refresh 8 detik
  const { data: purchasingList, isFetching: purchasingFetching } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
    refetchInterval: 8000,
  });
  const prRows: PurchaseRequestPart[] = purchasingList ?? [];
  const allPrCount = prRows.length;

  // Daftar transaksi penjualan part langsung (modul modal-driven SA)
  const { data: beliPartList, isLoading: loadingBeliPart } = useQuery({
    queryKey: ['beli-part-list'],
    queryFn: api.getBeliPartList,
    refetchInterval: 8000,
  });

  // PR aktif untuk sebuah SPK (belum selesai barangnya): kunci ajuan PR ganda
  // dan jadi penanda bahwa estimasi sudah terkirim (bagian "ketutup").
  const prAktifUntukSpk = (idSpk: number) =>
    prRows.find(
      (p) => p.id_spk === idSpk && p.status_pr !== 'Barang Ready' && (p.status_pr || '') !== 'Ditolak'
    );

  // Tab Part Indent SA: search, filter status chips, dan pagination
  const [prSearch, setPrSearch] = useState<string>('');
  const [prFilterStatus, setPrFilterStatus] = useState<'semua' | 'aktif' | 'perlu-keputusan' | 'menunggu-vendor' | 'selesai'>('aktif');
  const [prViewPage, setPrViewPage] = useState(1);
  const [prViewLimit, setPrViewLimit] = useState(10);

  // PR selesai = status PR-nya sendiri yang final. SPK yang selesai TIDAK
  // menenggelamkan PR yang belum diproses (mis. masih Diajukan tanpa PO).
  const isPrSelesai = (p: PurchaseRequestPart) => {
    return p.status_pr === 'Barang Ready' || (p.status_pr || '') === 'Ditolak';
  };

  const countAktif = prRows.filter((p) => !isPrSelesai(p)).length;
  const countPerluKeputusan = prRows.filter((p) => Boolean(p.no_po && p.status_konfirmasi_sa !== 'Disetujui SA' && !isPrSelesai(p))).length;
  const countMenungguVendor = prRows.filter((p) => !p.no_po && !isPrSelesai(p)).length;
  const countSelesai = prRows.filter((p) => isPrSelesai(p)).length;

  const prFilteredList = prRows.filter((p) => {
    // 1. Filter Status
    if (prFilterStatus === 'aktif' && isPrSelesai(p)) return false;
    if (prFilterStatus === 'selesai' && !isPrSelesai(p)) return false;
    if (prFilterStatus === 'perlu-keputusan') {
      const perlu = Boolean(p.no_po && p.status_konfirmasi_sa !== 'Disetujui SA' && !isPrSelesai(p));
      if (!perlu) return false;
    }
    if (prFilterStatus === 'menunggu-vendor') {
      const menunggu = !p.no_po && !isPrSelesai(p);
      if (!menunggu) return false;
    }

    // 2. Filter Pencarian
    if (prSearch.trim()) {
      const q = prSearch.toLowerCase().trim();
      const matchNopol = (p.no_polisi || '').toLowerCase().includes(q);
      const matchCustomer = (p.nama_customer || '').toLowerCase().includes(q);
      const matchPr = (p.no_pr || '').toLowerCase().includes(q);
      const matchPo = (p.no_po || '').toLowerCase().includes(q);
      const matchCatatan = (p.catatan_pr || '').toLowerCase().includes(q);
      const matchVendor = (p.vendor_terpilih || p.vendor_1_nama || p.vendor_2_nama || '').toLowerCase().includes(q);
      return matchNopol || matchCustomer || matchPr || matchPo || matchCatatan || matchVendor;
    }

    return true;
  });

  const prViewTotalPages = Math.max(1, Math.ceil(prFilteredList.length / prViewLimit));
  const prViewSafePage = Math.min(prViewPage, prViewTotalPages);
  const prViewRows = prFilteredList.slice((prViewSafePage - 1) * prViewLimit, prViewSafePage * prViewLimit);

  React.useEffect(() => {
    setPrViewPage(1);
  }, [prFilterStatus, prSearch, prViewLimit]);

  const selectedPr = prRows.find((p) => p.pr_id === selectedPrId) || null;

  // ═══ Derived data modul Penjualan Part Langsung (butuh antrianList & masterStokPart) ═══
  // Antrian gerbang dengan tujuan "Beli Part" yang masih aktif di bengkel
  const antrianBeliPart = (antrianList || []).filter(
    (a) => a.tujuan_kedatangan === 'Beli Part' && a.status_kunjungan !== 'Selesai' && a.status_kunjungan !== 'Keluar'
  );

  // Tarif PPN strictly dari database (tanpa fallback — konsisten modul lain)
  const { rate: posPpnRate } = usePpnRate();
  const posSubtotal = posCart.reduce((acc, c) => acc + c.qty * c.harga, 0);
  const posPpn = posPpnRate === null ? null : Math.round(posSubtotal * (posPpnRate / 100));
  const posGrandTotal = posPpn === null ? null : posSubtotal + posPpn;

  const posFilteredStock = (masterStokPart || []).filter((s) => {
    if (!posSearch.trim()) return true;
    const q = posSearch.toLowerCase();
    return s.nama_part.toLowerCase().includes(q) || s.kode_part.toLowerCase().includes(q);
  });

  const posAddToCart = (part: StokSparepart) => {
    setPosCart((prev) => {
      const existing = prev.find((c) => c.kode_part === part.kode_part);
      if (existing) {
        return prev.map((c) => (c.kode_part === part.kode_part ? { ...c, qty: c.qty + 1 } : c));
      }
      return [
        ...prev,
        {
          kode_part: part.kode_part,
          nama_part: part.nama_part,
          harga: Number(part.harga_jual || 0),
          qty: 1,
          stok: part.stok,
          satuan: part.satuan || '',
          lokasi_rak: part.lokasi_rak || 'Gudang',
        },
      ];
    });
  };

  const posUpdateQty = (kode: string, delta: number) => {
    setPosCart((prev) =>
      prev.map((c) => (c.kode_part === kode ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0)
    );
  };

  const posRemoveItem = (kode: string) => {
    setPosCart((prev) => prev.filter((c) => c.kode_part !== kode));
  };

  const posCanSubmit =
    posCart.length > 0 &&
    posCustomer.nama_customer.trim().length > 0 &&
    posCustomer.no_polisi.trim().length > 0 &&
    posPpnRate !== null &&
    posCart.every((c) => c.qty <= c.stok);

  const posFilteredTransaksi = (beliPartList || []).filter((t) => {
    const q = posSearchTransaksi.toLowerCase().trim();
    return (
      !q ||
      t.no_transaksi.toLowerCase().includes(q) ||
      t.no_polisi.toLowerCase().includes(q) ||
      t.nama_customer.toLowerCase().includes(q)
    );
  });
  const posTotalPages = Math.ceil(posFilteredTransaksi.length / posLimit) || 1;
  const posPaginated = posFilteredTransaksi.slice((posPage - 1) * posLimit, posPage * posLimit);
  const posAktifCount = (beliPartList || []).filter((t) => t.status_transaksi !== 'Selesai').length;

  // ═══ Modul Permintaan Part: antrian gerbang tujuan "Beli Part" yang belum
  // ═══ punya transaksi → daftar kartu, klik "Proses" → modal POS terisi. ═══
  const antrianSudahDiproses = new Set(
    (beliPartList || []).map((t) => t.id_antrian).filter((n): n is number => n != null)
  );
  const permintaanPartPending = antrianBeliPart.filter((a) => !antrianSudahDiproses.has(a.id));

  const prosesPermintaanPart = (a: (typeof permintaanPartPending)[number]) => {
    resetPosForm();
    setPosCustomer({
      id_antrian: a.id,
      nama_customer: a.nama_customer || '',
      no_polisi: a.no_polisi || '',
      no_telepon: a.no_hp_customer || '',
      catatan: '',
    });
    setShowPosModal(true);
  };

  // Data fresh untuk modal detail (refleksi status terbaru dari server)
  const posActive = showPartDetailModal
    ? (beliPartList || []).find((t) => t.id === showPartDetailModal.id) || showPartDetailModal
    : null;

  const handleAddPartToEstimasi = () => {
    if (!partPickerId) return;
    const item = masterStokPart?.find(p => p.kode_part === partPickerId);
    if (!item) return;

    const exists = selectedParts.find(p => p.kode_part === item.kode_part);
    if (exists) {
      setSelectedParts(selectedParts.map(p => 
        p.kode_part === item.kode_part ? { ...p, jumlah: p.jumlah + partPickerQty } : p
      ));
    } else {
      setSelectedParts([...selectedParts, {
        kode_part: item.kode_part,
        nama_part: item.nama_part,
        jumlah: partPickerQty,
        satuan: item.satuan,
        harga_satuan: Number(item.harga_jual),
        stok: item.stok,
      }]);
    }
    setPartPickerId('');
    setPartPickerQty(1);
  };

  const handleRemovePartFromEstimasi = (kode: string) => {
    setSelectedParts(selectedParts.filter(p => p.kode_part !== kode));
  };

  // Total & cek stok gabungan: part foreman (utama) + tambahan SA.
  const allEstimasiParts = [...foremanParts, ...selectedParts];
  const hasEmptyStock = allEstimasiParts.some(p => p.stok === 0 || p.jumlah > p.stok);
  const emptyPartsList = allEstimasiParts.filter(p => p.stok === 0 || p.jumlah > p.stok);
  const partsSubtotal = allEstimasiParts.reduce((acc, p) => acc + (p.harga_satuan * p.jumlah), 0);
  const jasaAktif = jasaTermasuk ? Math.max(0, jasaNominal || 0) : 0;
  const totalEstimasiBiaya = jasaAktif + partsSubtotal; // Jasa servis dasar (opsional) + sparepart

  // Submit Penerimaan Kendaraan ke Foreman.
  // Status awal 'Menunggu Pengecekan Mekanik' ditulis langsung oleh API
  // /kim3/spk-buat (satu panggilan), sesuai alur: SA -> Foreman.
  const createSpkMutation = useMutation({
    mutationFn: async (data: typeof formPenerimaan) => {
      const spkNo = `SPK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      await api.buatSpk({
        no_spk: spkNo,
        id_antrian: data.id_antrian,
        no_polisi: data.no_polisi,
        nama_customer: data.nama_customer,
        odometer_km: Number(data.odometer_km),
        foto_odometer: data.foto_odometer,
        foto_stnk: data.foto_stnk,
        foto_kir: data.foto_kir,
        keluhan_customer: data.keluhan_customer,
        cek_body: data.cek_body,
        cek_mesin: data.cek_mesin,
        cek_kelistrikan: data.cek_kelistrikan,
        cek_kaki_kaki: data.cek_kaki_kaki,
        catatan_kondisi_awal: data.catatan_kondisi_awal,
        nama_sa: currentUser,
        estimasi_waktu_jam: data.estimasi_waktu_jam,
        lead_time_jam: data.lead_time_jam,
        catatan_sa: data.catatan_sa,
      });

      return { spkNo };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // 1. Notifikasi untuk Foreman (distribusi pekerjaan).
      // Mekanik BELUM diberi tahu di tahap ini: WO baru masuk antrian Foreman,
      // notif personal ke mekanik dikirim saat Foreman menugaskan (assign).
      realtimeHub.publish({
        type: 'SPK_CREATED',
        targetRoles: ['Foreman'],
        title: 'SPK Penerimaan Dibuat',
        message: `SPK untuk unit ${formatPlat(formPenerimaan.no_polisi)} (${formPenerimaan.nama_customer || 'Kendaraan'}) siap untuk dicek dan didistribusikan ke Mekanik.`,
        linkTab: 'foreman',
        urgency: 'info',
      });

      // 2. Notifikasi untuk Customer PEMILIK plat saja (anti-bocor antar akun)
      await publishKeCustomer({
        type: 'SPK_CREATED',
        title: 'SPK Penerimaan Kendaraan Diterbitkan',
        message: `Unit ${formatPlat(formPenerimaan.no_polisi)} telah diinspeksi awal oleh Service Advisor dan SPK resmi telah diterbitkan.`,
        linkTab: 'fleet-status',
        urgency: 'info',
        noPolisi: formPenerimaan.no_polisi,
      });
      toast.success('SPK Penerimaan Kendaraan berhasil dibuat! Kendaraan diserahkan ke Foreman untuk Pengecekan.');

      setFormPenerimaan({
        id_antrian: undefined,
        no_polisi: '',
        nama_customer: '',
        no_hp_customer: '',
        jenis_layanan: 'Service Truk / Berkala',
        odometer_km: 0,
        foto_kendaraan_masuk: '',
        foto_odometer: '',
        foto_stnk: '',
        foto_kir: '',
        keluhan_customer: '',
        cek_body: 'OK',
        cek_mesin: 'OK',
        cek_kelistrikan: 'OK',
        cek_kaki_kaki: 'OK',
        catatan_kondisi_awal: '',
        estimasi_waktu_jam: 6,
        lead_time_jam: 6,
        catatan_sa: '',
      });
      setActiveTab('spk-list');
    },
    onError: (err: any) => toast.error('Gagal membuat SPK: ' + getApiErrorMessage(err)),
  });

  // Submit Estimasi Biaya (Setelah Pengecekan Mekanik)
  const submitEstimasiMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      // Kunci kirim ganda: verifikasi status fresh dari server. Modal basi
      // (dibuka saat Estimasi Dibuat, disubmit setelah status berubah) ditolak.
      const freshList = await api.getSpkList();
      const fresh = freshList.find((s) => s.id === spk.id);
      if (!fresh) throw new Error('SPK tidak ditemukan di server. Muat ulang halaman.');
      if (fresh.status_spk !== 'Estimasi Dibuat') {
        throw new Error(`Estimasi sudah diproses (status kini: ${fresh.status_spk}). Muat ulang untuk status terbaru.`);
      }
      // 1. Simpan item part yang dipilih ke SPK.
      // Anti-duplikat: lewati kode_part yang sudah ada (revisi/re-submit aman).
      const existingParts = await api.getPartSpk();
      const existingCodes = new Set(
        (existingParts || []).filter((ep) => ep.id_spk === spk.id && ep.kode_part).map((ep) => ep.kode_part as string)
      );
      for (const p of selectedParts) {
        if (p.kode_part && existingCodes.has(p.kode_part)) continue;
        await api.tambahPartSpk({
          id_spk: spk.id,
          kode_part: p.kode_part,
          nama_part: p.nama_part,
          jumlah: p.jumlah,
          satuan: p.satuan,
          harga_satuan: p.harga_satuan,
          subtotal: p.harga_satuan * p.jumlah,
          status_ketersediaan: p.stok > 0 ? 'Ready di Stock' : 'Tidak Ready di Stock',
        });
      }

      // 1b. Sinkron baris Jasa Servis Dasar (rinci terpisah, tampil di approval customer).
      // Upsert: update bila baris sudah ada, insert bila belum. Dicentang -> nominal,
      // tidak dicentang -> Rp 0 bila baris sudah ada (jujur tampil), lewati bila belum ada.
      if (jasaAktif > 0) {
        const simpanRes = await api.simpanPekerjaanSpk({
          id_spk: spk.id,
          nama_pekerjaan: JASA_NAMA,
          biaya_jasa: jasaAktif,
          estimasi_durasi_jam: estimasiWaktu,
        });
        if (!(simpanRes?.rows_affected > 0)) {
          await api.tambahPekerjaanSpk({
            id_spk: spk.id,
            nama_pekerjaan: JASA_NAMA,
            kategori: 'Jasa',
            biaya_jasa: jasaAktif,
            estimasi_durasi_jam: estimasiWaktu,
          });
        }
      } else {
        await api.simpanPekerjaanSpk({
          id_spk: spk.id,
          nama_pekerjaan: JASA_NAMA,
          biaya_jasa: 0,
        });
      }

      // Update SPK dgn biaya dan waktu
      await api.updateSpkStatus({
        id: spk.id,
        estimasi_biaya: totalEstimasiBiaya,
        estimasi_waktu_jam: estimasiWaktu,
      });

      // 2. Jika ada part yang kosong (stok = 0): Otomatis terbitkan PR Kotak Merah & Set status Waiting Part
      if (hasEmptyStock) {
        const prNo = `PR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
        const emptyNames = emptyPartsList.map(p => `${p.nama_part} (${p.kode_part})`).join(', ');

        await api.updateSpkStatus({ id: spk.id, status_spk: 'Waiting Part' });
        await api.ajukanPR({
          no_pr: prNo,
          id_spk: spk.id,
          nama_sa_pemohon: currentUser,
          catatan_pr: `Otomatis dari Estimasi SA: Sparepart [${emptyNames}] stok gudang KOSONG / INDENT. Pengadaan segera melalui alur Kotak Merah.`,
        });

        return { hasEmptyStock: true, emptyNames };
      }

      // Jika ready, langsung lempar ke Approval Customer
      await api.updateSpkStatus({ id: spk.id, status_spk: 'Menunggu Approval Customer' });
      return { hasEmptyStock: false, emptyNames: '' };
    },
    onSuccess: (result, spk) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['pekerjaan-spk-list'] });
      
      if (result.hasEmptyStock) {
        realtimeHub.publish({
          type: 'PURCHASE_REQUEST_CREATED',
          targetRoles: ['Admin Purchasing', 'SA'],
          title: 'PR Part Masuk (Part Indent)',
          message: `Estimasi SPK ${spk.no_spk} memerlukan [${result.emptyNames}] yang kosong di gudang. Status kendaraan: Waiting Part.`,
          linkTab: 'purchasing',
          urgency: 'warning',
        });
        toast.warning(`Estimasi Berhasil! Sparepart [${result.emptyNames}] stoknya KOSONG di gudang, PR diajukan dan status kendaraan diset ke "Waiting Part".`);
      } else {
        toast.success('Estimasi Biaya berhasil disubmit ke Customer untuk Approval.');
      }
      setShowEstimasiModal(null);
      resetEstimasiForm();
    },
    onError: (err: any) => toast.error('Gagal submit estimasi: ' + getApiErrorMessage(err)),
  });

  // Buat PR (Purchase Request) jika Sparepart tidak Ready.
  // Rincian disusun otomatis dari part terpilih (multi-item) + catatan SA.
  const prMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      if (prParts.length === 0) {
        throw new Error('Pilih minimal 1 sparepart yang dibutuhkan sebelum mengirim PR.');
      }
      // Kunci PR ganda: verifikasi fresh — tolak bila SPK sudah lewat tahap
      // estimasi atau sudah ada PR aktif.
      const [freshSpkList, freshPrList] = await Promise.all([api.getSpkList(), api.getPurchasingList()]);
      const fresh = freshSpkList.find((s) => s.id === spk.id);
      if (!fresh) throw new Error('SPK tidak ditemukan di server. Muat ulang halaman.');
      if (fresh.status_spk !== 'Estimasi Dibuat') {
        throw new Error(`PR hanya bisa diajukan saat "Estimasi Dibuat" (status kini: ${fresh.status_spk}).`);
      }
      const prAktif = (freshPrList || []).find(
        (p) => p.id_spk === spk.id && p.status_pr !== 'Barang Ready' && (p.status_pr || '') !== 'Ditolak'
      );
      if (prAktif) {
        throw new Error(`SPK ini sudah memiliki PR aktif ${prAktif.no_pr} (${prAktif.status_pr}).`);
      }
      const prNo = `PR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const lines = prParts.map((p, i) =>
        `${i + 1}. ${p.nama_part}${p.kode_part ? ` (${p.kode_part})` : ''} — butuh ${p.jumlah} ${p.satuan} (stok gudang: ${p.stok})`
      );
      const catatan = `Kebutuhan sparepart (${prParts.length} item):\n${lines.join('\n')}${prNote.trim() ? `\nCatatan SA: ${prNote.trim()}` : ''}`;
      return api.ajukanPR({
        no_pr: prNo,
        id_spk: spk.id,
        nama_sa_pemohon: currentUser,
        catatan_pr: catatan,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      toast.success('Purchase Request berhasil diajukan ke Admin Purchasing!');
      setShowPrModal(null);
      resetPrForm();
    },
    onError: (err: any) => toast.error('Gagal mengajukan PR: ' + getApiErrorMessage(err)),
  });

  // Konfirmasi SA terhadap Penawaran PO & ETA dari Purchasing
  const konfirmasiPoMutation = useMutation({
    mutationFn: async ({ poId, setuju }: { poId: number; setuju: boolean }) => {
      return api.konfirmasiSA({
        id: poId,
        status_konfirmasi_sa: setuju ? 'Disetujui SA' : 'Ditolak SA',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      toast.success('Respon konfirmasi ketersediaan barang berhasil diperbarui!');
    },
  });

  // Tarif PPN dari database (tanpa fallback): wajib ada untuk terbitkan invoice
  const { rate: ppnRate } = usePpnRate();

  // SA FIR Closed & Terbitkan Invoice Otomatis
  const firClosedMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      if (ppnRate === null) {
        throw new Error('Tarif PPN belum diatur — hubungi Super Admin untuk mengisi Pengaturan Sistem.');
      }
      // 1. Update SPK to FIR Closed with SA final check notes
      await api.updateSpkStatus({
        id: spk.id,
        status_spk: 'FIR Closed',
        catatan_sa: `[Final Check SA Disetujui]: Kebersihan (OK), Uji Fisik/Tes Jalan (OK), Dokumen & Surat (OK). Catatan: ${finalCheckForm.catatan_final}`,
      });

      // 2. Buat Invoice otomatis (PPN dari database)
      const invNo = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const subtotal = Number(spk.estimasi_biaya || 0);
      const ppn = Math.round(subtotal * (ppnRate / 100));
      const grandTotal = subtotal + ppn;

      await api.buatInvoice({
        no_invoice: invNo,
        id_spk: spk.id,
        // Tenant linkage agar faktur terlihat customer (filter id_pelanggan di API).
        // Bila SPK tak punya id_pelanggan, server fallback dari SPK itu sendiri.
        id_pelanggan: spk.id_pelanggan ?? undefined,
        no_polisi: spk.no_polisi,
        nama_customer: spk.nama_customer,
        subtotal: subtotal,
        ppn_nominal: ppn,
        diskon: 0,
        grand_total: grandTotal,
        metode_pembayaran: 'Transfer Bank',
        kasir_pic: 'Kasir',
      });

      return { invNo, grandTotal };
    },
    onSuccess: async (result, spk) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // 3. Notifikasi invoice terbit ke customer pemilik SAJA
      // (sebelumnya hilang total; broadcast mentah juga bocor antar akun)
      await publishKeCustomer({
        type: 'SPK_STATUS_CHANGED',
        title: 'Invoice Service Terbit',
        message: `Invoice ${result.invNo} untuk unit ${formatPlat(spk.no_polisi)} (SPK: ${spk.no_spk}) sebesar Rp ${Number(result.grandTotal || 0).toLocaleString('id-ID')} telah terbit. Silakan lakukan pembayaran di Kasir.`,
        linkTab: 'fleet-history',
        urgency: 'urgent',
        noPolisi: spk.no_polisi,
        pelangganId: spk.id_pelanggan ?? null,
      });
      realtimeHub.publish({
        type: 'SPK_STATUS_CHANGED',
        targetRoles: ['Admin Invoice'],
        title: 'Invoice Baru Masuk Kasir',
        message: `Invoice ${result.invNo} (${formatPlat(spk.no_polisi)}) Rp ${Number(result.grandTotal || 0).toLocaleString('id-ID')} menunggu pembayaran.`,
        linkTab: 'kasir',
        urgency: 'info',
      });

      toast.success('Pemeriksaan Akhir Selesai! FIR Closed berhasil & Invoice otomatis diterbitkan ke Kasir.');
      setShowFinalCheckModal(null);
    },
    onError: (err: any) => toast.error('Gagal menutup FIR: ' + getApiErrorMessage(err)),
  });

  // ════════════════════════════════════════════════════════════════════════
  // MUTATIONS PENJUALAN PART LANGSUNG (SA)
  // ════════════════════════════════════════════════════════════════════════

  // 1. Buat transaksi estimasi POS baru → 'Menunggu Approval' (server).
  // Alur Excel: estimasi menunggu persetujuan pelanggan (dicatat SA) dulu,
  // baru diteruskan ke Warehouse Picking saat disetujui.
  const posBuatMutation = useMutation({
    mutationFn: async () => {
      if (posPpnRate === null || posPpn === null || posGrandTotal === null) {
        throw new Error('Tarif PPN belum diatur — hubungi Super Admin untuk mengisi Pengaturan Sistem.');
      }
      const now = new Date();
      const estNo = `EST-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(100 + Math.random() * 900))}`;
      const prPick = `PR-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(100 + Math.random() * 900))}`;

      const rincian = posCart
        .map((c, i) => `${i + 1}. ${c.nama_part} (${c.kode_part}) x${c.qty} ${c.satuan} @Rp ${c.harga.toLocaleString('id-ID')}`);
      const catatanLengkap = [
        `Rincian pesanan (${posCart.length} item):`,
        ...rincian,
        posCustomer.catatan ? `Pesan SA untuk gudang: ${posCustomer.catatan}` : '',
      ].filter(Boolean).join('\n');

      return api.buatBeliPart({
        no_transaksi: estNo,
        id_antrian: posCustomer.id_antrian,
        nama_customer: posCustomer.nama_customer || 'Pelanggan Walk-In',
        no_polisi: posCustomer.no_polisi.toUpperCase().trim(),
        no_telepon: posCustomer.no_telepon,
        no_picking_request: prPick,
        status_transaksi: 'Menunggu Approval',
        subtotal: posSubtotal,
        ppn_11: posPpn,
        total_biaya: posGrandTotal,
        lokasi_rak: undefined,
        catatan: catatanLengkap,
      });
    },
    onSuccess: async (resData: any) => {
      queryClient.invalidateQueries({ queryKey: ['beli-part-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // ID baris terbuat → deep-link klik notif (modul + modal langsung).
      const rowBaru = resData?.data?.[0] ?? resData?.data ?? resData;
      const idBaru = rowBaru?.id != null ? Number(rowBaru.id) : null;

      // Notifikasi ke pelanggan pemilik plat SAJA (klik → fleet-history → Setujui/Tolak).
      // Walk-in tanpa akun terdaftar → false, tetap jalur persetujuan verbal via SA.
      const nopolBaru = posCustomer.no_polisi.toUpperCase().trim();
      const namaBaru = posCustomer.nama_customer || 'Pelanggan Walk-In';
      await publishKeCustomer({
        type: 'PART_REQUESTED',
        title: 'Estimasi Pembelian Part Menunggu Persetujuan',
        message: `Estimasi pembelian part untuk ${formatPlat(nopolBaru)} (${namaBaru}) menunggu persetujuan Anda di portal.`,
        linkTab: idBaru != null ? `fleet-history:part:${idBaru}` : 'fleet-history',
        urgency: 'warning',
        noPolisi: nopolBaru,
      });

      // Belum ke Warehouse: menunggu persetujuan pelanggan (portal / dicatat SA di Daftar Transaksi).
      toast.success('Estimasi tersimpan — menunggu persetujuan pelanggan sebelum diteruskan ke gudang.');
      setShowPosModal(false);
      resetPosForm();
    },
    onError: (err: any) => toast.error('Gagal membuat transaksi: ' + getApiErrorMessage(err)),
  });

  // 1b. SA mencatat persetujuan pelanggan → 'Estimasi Disetujui' + teruskan ke Warehouse.
  const posSetujuiMutation = useMutation({
    mutationFn: async (item: TransaksiBeliPart) => {
      if (!item) throw new Error('Pilih transaksi yang akan disetujui terlebih dahulu.');
      return api.updateBeliPartStatus({
        id: item.id,
        status_transaksi: 'Estimasi Disetujui',
      });
    },
    onSuccess: (_res, item) => {
      queryClient.invalidateQueries({ queryKey: ['beli-part-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // Baru sekarang Warehouse diberi tahu (khusus Warehouse, tanpa SA).
      realtimeHub.publish({
        type: 'PART_REQUESTED',
        targetRoles: ['Warehouse'],
        title: 'Picking Request Part Baru',
        message: `Estimasi ${item.no_transaksi} (${formatPlat(item.no_polisi)} - ${item.nama_customer}) telah disetujui, menunggu picking gudang.`,
        linkTab: 'beli-part-picking',
        urgency: 'info',
      });

      toast.success('Estimasi disetujui & diteruskan ke Warehouse Picking!');
    },
    onError: (err: any) => toast.error('Gagal menyetujui estimasi: ' + getApiErrorMessage(err)),
  });

  // 2. (Dihapus — pembayaran/invoice khusus Kasir di Daftar Transaksi.)

  // 3. (Dihapus — penyerahan barang khusus Warehouse di tab Picking.)

  // Derived statistics and filtering for SA — WAJIB data asli API (spk-list).
  // Alur status: pengerjaan → QC Passed → FIR Closed (SA, auto-invoice, belum bayar)
  // → Selesai (Kasir, invoice lunas). SPK Aktif = semua kecuali 'Selesai',
  // sehingga FIR Closed yang belum bayar tetap dihitung aktif.
  const allSpks = spkList || [];
  const isSpkSelesai = (s: { status_spk: string }) => s.status_spk === 'Selesai';
  const activeSpks = allSpks.filter((s) => !isSpkSelesai(s));
  const totalSpkCount = activeSpks.length;
  const selesaiCount = allSpks.filter(isSpkSelesai).length;
  const inProgressCount = activeSpks.filter(s => s.status_spk === 'Dalam Pengerjaan').length;
  const waitingPartCount = activeSpks.filter(s => s.status_spk === 'Waiting Part').length;
  const qcPassedCount = activeSpks.filter(s => s.status_spk === 'QC Passed').length;

  const filteredSpkList = allSpks.filter((spk) => {
    const query = saSearchQuery.toLowerCase().trim();
    const matchSearch = !query ||
      spk.no_spk?.toLowerCase().includes(query) ||
      spk.no_polisi?.toLowerCase().includes(query) ||
      spk.nama_customer?.toLowerCase().includes(query) ||
      spk.keluhan_customer?.toLowerCase().includes(query) ||
      spk.nama_mekanik?.toLowerCase().includes(query);

    if (!matchSearch) return false;
    if (saStatusFilter === 'Semua') return !isSpkSelesai(spk);
    if (saStatusFilter === 'Dalam Pengerjaan') return spk.status_spk === 'Dalam Pengerjaan';
    if (saStatusFilter === 'Waiting Part') return spk.status_spk === 'Waiting Part';
    if (saStatusFilter === 'QC Passed') return spk.status_spk === 'QC Passed';
    if (saStatusFilter === 'FIR Closed') return spk.status_spk === 'FIR Closed';
    if (saStatusFilter === 'Selesai') return spk.status_spk === 'Selesai';
    return true;
  });

  const totalSpkRecords = filteredSpkList.length;
  const totalSpkPages = Math.ceil(totalSpkRecords / spkLimit) || 1;
  const paginatedSpkList = filteredSpkList.slice((spkPage - 1) * spkLimit, spkPage * spkLimit);

  return (
    <div className="space-y-6">
      
      {/* Top Section Header */}
      <SectionHeader
        title={
          activeTab === 'spk-list'
            ? 'Daftar SPK Aktif'
            : activeTab === 'penerimaan'
            ? 'Buat SPK Baru'
            : activeTab === 'estimasi-pr'
            ? 'Part Indent (PR)'
            : activeTab === 'penjualan-part'
            ? 'Penjualan Part Langsung'
            : activeTab === 'permintaan-part'
            ? 'Permintaan Part'
            : 'Riwayat FIR Closed'
        }
        description={
          activeTab === 'spk-list'
            ? 'Pantau progres pekerjaan, status approval customer, dan FIR closed'
            : activeTab === 'penerimaan'
            ? 'Inspeksi awal kendaraan masuk, pencatatan odometer, dan penyerahan ke workshop'
            : activeTab === 'estimasi-pr'
            ? 'Daftar pengadaan part inden dan persetujuan PO purchasing'
            : activeTab === 'penjualan-part'
            ? 'Transaksi langsung sparepart loket kasir / customer tanpa SPK'
            : activeTab === 'permintaan-part'
            ? 'Permintaan pengambilan part dari teknisi / mekanik workshop'
            : 'Arsip SPK yang telah melalui final check SA dan siap invoice'
        }
      />

      {/* Mini KPI Banners for SA (Hanya di tab SPK List) */}
      {activeTab === 'spk-list' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard
            title="Total SPK Aktif"
            value={totalSpkCount}
            subtitle="Belum bayar / lunas"
            icon={ClipboardList}
            tone="accent"
            active={saStatusFilter === 'Semua'}
            onClick={() => { setSaStatusFilter('Semua'); setSpkPage(1); }}
          />
          <StatCard
            title="Dalam Pengerjaan"
            value={inProgressCount}
            subtitle="Sedang diservis teknisi"
            icon={Wrench}
            tone="blue"
            active={saStatusFilter === 'Dalam Pengerjaan'}
            onClick={() => { setSaStatusFilter('Dalam Pengerjaan'); setSpkPage(1); }}
          />
          <StatCard
            title="Menunggu Part (PR)"
            value={waitingPartCount}
            subtitle="Proses purchasing"
            icon={ShoppingBag}
            tone="amber"
            active={saStatusFilter === 'Waiting Part'}
            onClick={() => { setSaStatusFilter('Waiting Part'); setSpkPage(1); }}
          />
          <StatCard
            title="Siap FIR Closed"
            value={qcPassedCount}
            subtitle="QC Passed siap invoice"
            icon={FileCheck}
            tone="green"
            active={saStatusFilter === 'QC Passed'}
            onClick={() => { setSaStatusFilter('QC Passed'); setSpkPage(1); }}
          />
          <StatCard
            title="SPK Selesai"
            value={selesaiCount}
            subtitle="Sudah bayar / lunas"
            icon={CheckCircle}
            tone="green"
            active={saStatusFilter === 'Selesai'}
            onClick={() => { setSaStatusFilter('Selesai'); setSpkPage(1); }}
          />
        </div>
      )}


      {/* TAB 1: DAFTAR SPK AKTIF */}
      {activeTab === 'spk-list' && (
        <div className="bg-surface-raised rounded-2xl border border-border p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">Semua Work Order SPK Bengkel</h2>
              <p className="text-xs text-ink-muted">Pantau progres pekerjaan, status approval customer, dan FIR closed</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface text-ink-muted self-start sm:self-auto border border-border">
              {filteredSpkList.length} SPK Ditemukan
            </span>
          </div>

          {/* Live Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari No. SPK, No. Polisi, Customer, Mekanik, atau Keluhan..."
                value={saSearchQuery}
                onChange={(e) => {
                  setSaSearchQuery(e.target.value);
                  setSpkPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none transition-all"
              />
              {saSearchQuery && (
                <button
                  onClick={() => {
                    setSaSearchQuery('');
                    setSpkPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink text-xs font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Chips */}
            <FilterChips
              options={([
                { id: 'Semua', label: 'Semua' },
                { id: 'Dalam Pengerjaan', label: 'Dalam Pengerjaan' },
                { id: 'Waiting Part', label: 'Waiting Part' },
                { id: 'QC Passed', label: 'QC Passed' },
                { id: 'FIR Closed', label: 'FIR Closed' },
                { id: 'Selesai', label: 'Selesai' },
              ] as const)}
              selectedId={saStatusFilter}
              onChange={(st) => {
                setSaStatusFilter(st as any);
                setSpkPage(1);
              }}
            />
          </div>

          {/* Daftar SPK memakai ListItemCard */}
          <div className="space-y-2.5">
            {filteredSpkList.length > 0 ? (
              paginatedSpkList.map((spk) => {
                const prAktif = prAktifUntukSpk(spk.id);
                return (
                  <ListItemCard
                    key={spk.id}
                    icon={ClipboardList}
                    title={`${formatPlat(spk.no_polisi)} — ${spk.nama_customer || 'Pelanggan'}`}
                    subtitle={`${spk.no_spk} • ${spk.nama_mekanik ? `${spk.nama_mekanik}${spk.nama_foreman ? ` (${spk.nama_foreman})` : ''}` : 'Belum Ditugaskan'} • Rp ${Number(spk.estimasi_biaya || 0).toLocaleString('id-ID')}`}
                    badge={<StatusBadge status={spk.status_spk} size="sm" />}
                    chips={prAktif ? [`PR ${prAktif.status_pr}`] : undefined}
                    onClick={() => setSelectedSpk(spk)}
                    actions={
                      <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {spk.status_spk === 'Estimasi Dibuat' && (
                          <button
                            type="button"
                            onClick={() => setShowEstimasiModal(spk)}
                            className="px-2.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Buat Estimasi
                          </button>
                        )}

                        {spk.status_spk === 'QC Passed' && (
                          <button
                            type="button"
                            onClick={() => handleOpenFinalCheck(spk)}
                            className="px-2.5 py-1.5 bg-status-green hover:bg-status-green/90 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="Pemeriksaan Akhir (Final Check SA) sebelum menutup FIR"
                          >
                            <FileCheck className="w-3.5 h-3.5" /> Final Check (FIR Closed)
                          </button>
                        )}

                        {prAktif ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab('estimasi-pr')}
                            className="px-2.5 py-1.5 bg-surface text-ink-muted hover:text-ink rounded-xl font-bold text-xs border border-border flex items-center gap-1 cursor-pointer transition-colors"
                            title={`PR ${prAktif.no_pr} berstatus ${prAktif.status_pr} — lihat di Part Indent`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5" /> PR {prAktif.status_pr}
                          </button>
                        ) : spk.status_spk === 'Estimasi Dibuat' ? (
                          <button
                            type="button"
                            onClick={() => setShowPrModal(spk)}
                            className="px-2.5 py-1.5 bg-status-red-bg hover:bg-status-red/10 text-status-red rounded-xl font-bold text-xs border border-status-red/30 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Ajukan PR ke Purchasing jika part tidak ready"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" /> PR Part
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setShowPrintSpk(spk)}
                          className="px-2.5 py-1.5 bg-surface hover:bg-surface-raised text-ink-muted hover:text-ink rounded-xl font-bold text-xs border border-border flex items-center gap-1 transition-colors cursor-pointer"
                          title="Cetak Surat Perintah Kerja (SPK) A4"
                        >
                          <Printer className="w-3.5 h-3.5" /> Cetak SPK
                        </button>
                      </div>
                    }
                  />
                );
              })
            ) : (
              <EmptyState
                title="Tidak ditemukan SPK"
                description="Tidak ditemukan SPK yang sesuai dengan filter atau pencarian Anda."
                icon={ClipboardList}
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
            onLimitChange={(newLimit) => {
              setSpkLimit(newLimit);
              setSpkPage(1);
            }}
            label="SPK"
            isLoading={loadingSpk}
          />
        </div>
      )}



      {/* TAB 2: FORM PENERIMAAN KENDARAAN (SATU FORM TUNGGAL) */}
      {activeTab === 'penerimaan' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createSpkMutation.mutate(formPenerimaan);
          }}
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Header Form */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                Formulir Penerimaan &amp; Penerbitan SPK
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspeksi awal kendaraan masuk dan serahkan perintah kerja langsung ke Foreman
              </p>
            </div>
            {formPenerimaan.id_antrian && (
              <button
                type="button"
                onClick={() => {
                  setFormPenerimaan((prev) => ({
                    ...prev,
                    id_antrian: undefined,
                    no_polisi: '',
                    nama_customer: '',
                    no_hp_customer: '',
                    keluhan_customer: '',
                    foto_kendaraan_masuk: '',
                  }));
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Ganti Kendaraan
              </button>
            )}
          </div>

          {/* BAGIAN 1: KENDARAAN & CUSTOMER */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" /> 1. Data Kendaraan &amp; Pelanggan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Pilih kendaraan antrian yang telah check-in di Pos Security</p>
            </div>

            {/* Kondisi Error Antrian */}
            {antrianError ? (
              <div className="bg-red-50 rounded-xl border border-red-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-red-600">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm">
                    <span className="font-semibold">Gagal memuat antrian dari server.</span>{' '}
                    {getApiErrorMessage(antrianErrorDetail, 'Periksa koneksi atau hubungi admin.')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => refetchAntrian()}
                  disabled={antrianFetching}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-sm"
                >
                  {antrianFetching ? 'Memuat...' : 'Coba Lagi'}
                </button>
              </div>
            ) : antrianMenungguSA.length === 0 ? (
              <EmptyState
                title="Tidak ada antrian kendaraan"
                description="Tidak ada antrian kendaraan yang menunggu penerimaan SA saat ini. Tunggu Pos Security melakukan Check-In kendaraan terlebih dahulu."
                icon={Car}
              />
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Pilih Antrian Kendaraan Masuk <span className="text-red-500">*</span>
                </label>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {antrianMenungguSA.map((a) => (
                    <ListItemCard
                      key={a.id}
                      icon={Car}
                      title={`${formatPlat(a.no_polisi)} — ${a.nama_customer || 'Tanpa Nama'}`}
                      subtitle={`${a.keperluan || a.catatan_security || 'Service Umum'} • Masuk: ${a.waktu_masuk ? new Date(a.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB`}
                      chips={a.jenis_armada ? [a.jenis_armada] : undefined}
                      selected={formPenerimaan.id_antrian === a.id}
                      onClick={() => fillAntrianToForm(a)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ringkasan Baca-Saja setelah memilih antrian */}
            {formPenerimaan.id_antrian && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-medium block mb-0.5">No. Polisi Unit</span>
                  <span className="text-base font-bold font-mono text-slate-900">{formatPlat(formPenerimaan.no_polisi)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block mb-0.5">Nama Pelanggan / Armada</span>
                  <span className="text-sm font-semibold text-slate-800">{formPenerimaan.nama_customer || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block mb-0.5">No. HP Pelanggan</span>
                  <span className="text-sm font-mono font-medium text-slate-600">{formPenerimaan.no_hp_customer || '-'}</span>
                </div>
              </div>
            )}
          </div>

          {/* BAGIAN 2: KONDISI KENDARAAN */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" /> 2. Kondisi &amp; Kelengkapan Awal Unit
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Pencatatan odometer awal, estimasi lead time, checklist fisik, dan dokumen</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Odometer KM (Jarak Tempuh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 145000"
                  value={formPenerimaan.odometer_km || ''}
                  onChange={(e) => setFormPenerimaan({ ...formPenerimaan, odometer_km: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-sm font-bold bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Estimasi Waktu Pengerjaan (Jam)
                </label>
                <input
                  type="number"
                  value={formPenerimaan.lead_time_jam}
                  onChange={(e) => setFormPenerimaan({ ...formPenerimaan, lead_time_jam: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-sm font-bold bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Checklist Kondisi Fisik Kendaraan */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="block text-xs font-bold text-slate-800">Checklist Kondisi Fisik Awal:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { key: 'cek_body', label: 'Bodi Kendaraan' },
                  { key: 'cek_mesin', label: 'Ruang Mesin' },
                  { key: 'cek_kelistrikan', label: 'Kelistrikan' },
                  { key: 'cek_kaki_kaki', label: 'Kaki-kaki / Rem' },
                ].map((item) => (
                  <div key={item.key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <span className="text-xs font-medium text-slate-600 block">{item.label}</span>
                    <div className="grid grid-cols-3 gap-1">
                      {(['OK', 'Perlu Dicek', 'Rusak'] as const).map((val) => {
                        const isSelected = (formPenerimaan as any)[item.key] === val;
                        const activeStyle =
                          val === 'OK'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                            : val === 'Perlu Dicek'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 font-bold'
                            : 'bg-red-50 text-red-700 border-red-300 font-bold';
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setFormPenerimaan({ ...formPenerimaan, [item.key]: val })}
                            className={`px-1.5 py-1 text-xs rounded border transition-all cursor-pointer text-center truncate ${
                              isSelected ? `${activeStyle} shadow-2xs` : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {val === 'Perlu Dicek' ? 'Cek' : val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Foto Dokumen (Odometer, STNK, KIR) */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">Unggah Foto Dokumen &amp; Fisik Kendaraan:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PhotoUploader
                  label="Foto Odometer (KM)"
                  value={formPenerimaan.foto_odometer}
                  onChange={(url) => setFormPenerimaan({ ...formPenerimaan, foto_odometer: url })}
                />
                <PhotoUploader
                  label="Foto STNK"
                  value={formPenerimaan.foto_stnk}
                  onChange={(url) => setFormPenerimaan({ ...formPenerimaan, foto_stnk: url })}
                />
                <PhotoUploader
                  label="Foto BUKU KIR"
                  value={formPenerimaan.foto_kir}
                  onChange={(url) => setFormPenerimaan({ ...formPenerimaan, foto_kir: url })}
                />
              </div>
            </div>
          </div>

          {/* BAGIAN 3: KELUHAN CUSTOMER */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" /> 3. Keluhan Customer &amp; Instruksi Khusus
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Uraian masalah teknis dan instruksi pengerjaan dari pengemudi / pemilik</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Keluhan &amp; Masalah Kendaraan <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Contoh: Rem bunyi saat pengereman dan tarikan mesin agak berat. Minta diperiksa kampas dan minyak rem..."
                value={formPenerimaan.keluhan_customer}
                onChange={(e) => setFormPenerimaan({ ...formPenerimaan, keluhan_customer: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* ACTION BAR (BERSiH, TANPA NEGATIVE MARGINS) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-slate-600 font-medium truncate w-full sm:w-auto">
              {formPenerimaan.no_polisi ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{formatPlat(formPenerimaan.no_polisi)}</span>
                  <span>•</span>
                  <span>{formPenerimaan.odometer_km ? `${formPenerimaan.odometer_km.toLocaleString()} KM` : 'KM belum diisi'}</span>
                  <span>•</span>
                  <span className="text-blue-600 font-semibold">{formPenerimaan.lead_time_jam} Jam Estimasi</span>
                </div>
              ) : (
                <span className="text-slate-400">Pilih kendaraan antrian terlebih dahulu</span>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('spk-list')}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={createSpkMutation.isPending || !formPenerimaan.id_antrian || !formPenerimaan.keluhan_customer.trim()}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {createSpkMutation.isPending ? 'Menerbitkan SPK...' : 'Terbitkan SPK & Serahkan ke Foreman'}
                {!createSpkMutation.isPending && <CheckCircle className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: KOTAK MERAH PURCHASING INTEGRASI (PART INDENT) */}
      {activeTab === 'estimasi-pr' && (
        <div className="space-y-4">
          {/* Filter Bar: Pencarian & Filter Status Chips */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nopol, customer, no. PR, no. PO, nama part..."
                  value={prSearch}
                  onChange={(e) => setPrSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none bg-white text-slate-900 shadow-2xs"
                />
                {prSearch && (
                  <button
                    type="button"
                    onClick={() => setPrSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Info Total */}
              <div className="text-xs text-slate-500 font-medium">
                Menampilkan <strong className="text-slate-800">{prFilteredList.length}</strong> dari {prRows.length} part indent
              </div>
            </div>

            {/* Filter Status Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPrFilterStatus('aktif')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  prFilterStatus === 'aktif'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Aktif</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  prFilterStatus === 'aktif' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {countAktif}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPrFilterStatus('perlu-keputusan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  prFilterStatus === 'perlu-keputusan'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : countPerluKeputusan > 0
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Perlu Keputusan SA</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  prFilterStatus === 'perlu-keputusan'
                    ? 'bg-white/20 text-white'
                    : countPerluKeputusan > 0
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {countPerluKeputusan}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPrFilterStatus('menunggu-vendor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  prFilterStatus === 'menunggu-vendor'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Menunggu Penawaran</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  prFilterStatus === 'menunggu-vendor' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {countMenungguVendor}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPrFilterStatus('selesai')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  prFilterStatus === 'selesai'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Barang Ready / Selesai</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  prFilterStatus === 'selesai' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {countSelesai}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPrFilterStatus('semua')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  prFilterStatus === 'semua'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Semua</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  prFilterStatus === 'semua' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {prRows.length}
                </span>
              </button>
            </div>
          </div>

          {/* Daftar PR (Cards Baru yang Bersih & Enterprise) */}
          {prFilteredList.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">
                {prSearch ? 'Tidak ada part indent yang cocok' : 'Tidak ada data part indent'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {prSearch
                  ? `Tidak ditemukan hasil dengan kata kunci "${prSearch}". Coba kata kunci lain atau bersihkan pencarian.`
                  : 'Semua kebutuhan part sudah terpenuhi. Part indent otomatis dibuat saat estimasi membutuhkan part yang kosong di gudang.'}
              </p>
              {prSearch && (
                <button
                  type="button"
                  onClick={() => setPrSearch('')}
                  className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Bersihkan Pencarian
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {prViewRows.map((pr) => {
                  const spk = (spkList || []).find((s) => s.id === pr.id_spk);
                  const isSpkDone = spk ? (spk.status_spk === 'Selesai' || spk.status_spk === 'FIR Closed') : false;
                  const isSpkWaitingPart = spk ? (spk.status_spk === 'Waiting Part' || spk.status_spk === 'Estimasi Dibuat') : false;
                  const isDone = isSpkDone || pr.status_pr === 'Barang Ready';
                  const perluRespon = Boolean(pr.no_po && pr.status_konfirmasi_sa !== 'Disetujui SA' && !isDone);
                  const isReady = pr.status_pr === 'Barang Ready';
                  const isWaitingVendor = !pr.no_po && !isReady && !isSpkDone;
                  const isDisetujui = pr.status_konfirmasi_sa === 'Disetujui SA' && !isReady && !isSpkDone;

                  return (
                    <div
                      key={pr.pr_id}
                      className={`bg-white rounded-xl border transition-all p-4 sm:p-5 space-y-3.5 shadow-2xs hover:shadow-md ${
                        perluRespon
                          ? 'border-red-300 ring-2 ring-red-500/10'
                          : isSpkDone
                          ? 'border-slate-200 bg-slate-50/30'
                          : isReady
                          ? 'border-emerald-200 hover:border-emerald-300'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {/* Top Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-md shadow-2xs">
                            {formatPlat(pr.no_polisi)}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {pr.nama_customer || 'Pelanggan'}
                          </span>
                          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                            {pr.no_pr}
                          </span>
                          {pr.tanggal_pr && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(pr.tanggal_pr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Badge jujur = status PR asli; status SPK tampil terpisah */}
                          <StatusBadge status={pr.status_pr} size="sm" />
                          {isSpkDone ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              SPK Selesai
                            </span>
                          ) : perluRespon ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 flex items-center gap-1.5 shadow-2xs animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5" /> Perlu Respon SA
                            </span>
                          ) : isWaitingVendor ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> Menunggu Penawaran
                            </span>
                          ) : isReady ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Barang Ready di Gudang
                            </span>
                          ) : isDisetujui ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" /> Disetujui SA (Proses PO)
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Catatan Part & Kebutuhan */}
                      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-1">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-blue-600" /> Kebutuhan Sparepart
                        </div>
                        <div className="text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                          {pr.catatan_pr || 'Tidak ada catatan spesifik.'}
                        </div>
                      </div>

                      {/* Informasi Penawaran Purchasing / PO (Jika Ada) */}
                      {pr.no_po ? (
                        <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 text-xs space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600 border-b border-blue-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700">Nomor PO:</span>
                              <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                {pr.no_po}
                              </span>
                            </div>
                            <div>
                              <span>Admin Purchasing: </span>
                              <strong className="text-slate-800">{pr.nama_admin_purchasing || '-'}</strong>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                              <span className="text-[11px] text-slate-500 block">Vendor 1</span>
                              <div className="font-bold text-slate-800 truncate">{pr.vendor_1_nama || '-'}</div>
                              <div className="text-slate-600 text-[11px] font-mono mt-0.5">
                                Rp {Number(pr.vendor_1_harga || 0).toLocaleString('id-ID')}
                              </div>
                            </div>

                            <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                              <span className="text-[11px] text-slate-500 block">Vendor 2</span>
                              <div className="font-bold text-slate-800 truncate">{pr.vendor_2_nama || '-'}</div>
                              <div className="text-slate-600 text-[11px] font-mono mt-0.5">
                                Rp {Number(pr.vendor_2_harga || 0).toLocaleString('id-ID')}
                              </div>
                            </div>

                            <div className="p-2.5 bg-blue-50/80 rounded-lg border border-blue-200">
                              <span className="text-[11px] text-blue-700 font-semibold block">Vendor Terpilih &amp; ETA</span>
                              <div className="font-bold text-blue-900 truncate">
                                {pr.vendor_terpilih || '-'}
                              </div>
                              <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                                Rp {Number(pr.harga_kesepakatan || 0).toLocaleString('id-ID')}
                              </div>
                            </div>
                          </div>

                          {pr.estimasi_tanggal_ready_eta && (
                            <div className="flex items-center gap-2 text-xs text-slate-700 pt-1">
                              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>
                                Estimasi Kedatangan (ETA):{' '}
                                <strong className="font-mono text-slate-900">
                                  {pr.estimasi_tanggal_ready_eta}
                                  {pr.estimasi_jam_ready_eta ? ` pukul ${pr.estimasi_jam_ready_eta}` : ''}
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Menunggu tim Purchasing memproses dan membandingkan minimal 2 penawaran vendor rekanan.
                          </span>
                        </div>
                      )}

                      {/* Footer Row: Info SA & Tombol Aksi */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="text-[11px] text-slate-400">
                          Diajukan oleh: <strong className="text-slate-600">{pr.nama_sa_pemohon || 'Service Advisor'}</strong>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          {perluRespon && (
                            <button
                              type="button"
                              onClick={() => setSelectedPrId(pr.pr_id)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Review &amp; Setujui PO
                            </button>
                          )}

                          {isReady && !isSpkDone && isSpkWaitingPart && (
                            <button
                              type="button"
                              onClick={() => {
                                const spk = (spkList || []).find((s) => s.id === pr.id_spk);
                                if (spk) {
                                  setShowEstimasiModal(spk);
                                } else {
                                  setSelectedPrId(pr.pr_id);
                                }
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              Lanjut ke Estimasi SPK
                            </button>
                          )}

                          {isSpkDone && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> SPK Selesai
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedPrId(pr.pr_id)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <span>Lihat Detail PR</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <PaginationBar
                page={prViewSafePage}
                totalPages={prViewTotalPages}
                totalRecords={prFilteredList.length}
                limit={prViewLimit}
                label="part indent"
                isLoading={purchasingFetching}
                onPageChange={setPrViewPage}
                onLimitChange={(l) => setPrViewLimit(l)}
              />
            </>
          )}
        </div>
      )}


      {/* ================================================================== */}
      {/* PENJUALAN PART LANGSUNG - SATU PANEL SEDERHANA                    */}
      {/* (navigasi tahapan lewat sidebar: Daftar Transaksi / Estimasi Baru) */}
      {/* ================================================================== */}
      {activeTab === 'penjualan-part' && (
        <div className="space-y-4">

          {/* Header ringkas: judul + KPI inline + tombol estimasi */}
          <div className="bg-surface-raised rounded-xl p-4 sm:p-5 border border-border shadow-xs flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-ink">Penjualan Part Langsung</h2>
                <p className="text-xs text-ink-muted">
                  {posAktifCount} transaksi berjalan • klik transaksi untuk aksi bayar, penyerahan &amp; cetak
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { resetPosForm(); setShowPosModal(true); }}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-xs shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Estimasi / POS Baru
            </button>
          </div>

          {/* SATU PANEL: daftar transaksi (detail & semua aksi lewat modal) */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-ink">Daftar Transaksi</h3>
                <p className="text-xs text-ink-muted">Alur: Estimasi → Picking Gudang → Bayar Kasir → Penyerahan (Memo Keluar)</p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-ink-subtle" />
                <input
                  type="text"
                  placeholder="Cari no. transaksi / nopol / customer..."
                  value={posSearchTransaksi}
                  onChange={(e) => { setPosSearchTransaksi(e.target.value); setPosPage(1); }}
                  className="pl-9 pr-3.5 py-1.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none w-60"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-ink-muted border-y border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">No. Transaksi</th>
                    <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                    <th className="py-2.5 px-3 font-semibold">Customer</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingBeliPart ? (
                    <tr><td colSpan={6} className="py-6 text-center text-ink-subtle">Memuat data...</td></tr>
                  ) : posPaginated.length > 0 ? (
                    posPaginated.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setShowPartDetailModal(item)}
                        className="cursor-pointer hover:bg-surface transition-colors"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-accent">{item.no_transaksi}</td>
                        <td className="py-3 px-3 font-mono font-black text-ink">{formatPlat(item.no_polisi)}</td>
                        <td className="py-3 px-3 text-ink-muted">{item.nama_customer}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold">Rp {Number(item.total_biaya || 0).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-3"><StatusBadge status={item.status_transaksi} size="sm" /></td>
                        <td className="py-3 px-3 text-right">
                          <button type="button" className="px-2.5 py-1 bg-surface hover:bg-surface-raised text-accent rounded-xl border border-border font-bold text-xs cursor-pointer">Detail →</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="py-6 text-center text-ink-subtle">Belum ada transaksi penjualan part.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={posPage}
              totalPages={posTotalPages}
              totalRecords={posFilteredTransaksi.length}
              limit={posLimit}
              onPageChange={setPosPage}
              onLimitChange={(l) => { setPosLimit(l); setPosPage(1); }}
              label="transaksi part"
              isLoading={loadingBeliPart}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODUL: PERMINTAAN PART — daftar pelanggan gerbang → proses ke POS   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'permintaan-part' && (
        <div className="space-y-4">
          {/* Header ringkas: judul + jumlah menunggu + tombol POS manual */}
          <div className="bg-surface-raised rounded-xl p-4 sm:p-5 border border-border shadow-xs flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-ink">Permintaan Part Baru</h2>
                <p className="text-xs text-ink-muted">
                  Daftar pelanggan check-in gerbang bertujuan &quot;Beli Part&quot; — pilih satu, isi barang langsung dari POS
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { resetPosForm(); setShowPosModal(true); }}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-xs shadow-md shadow-accent/20 flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              POS Tanpa Antrian
            </button>
          </div>

          {/* Daftar menunggu diproses */}
          <div className="bg-surface-raised rounded-xl border border-border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-ink">Menunggu Diproses</h3>
                <p className="text-xs text-ink-muted">
                  {permintaanPartPending.length} pelanggan • transaksi otomatis hilang dari daftar setelah diproses
                </p>
              </div>
              {antrianFetching && (
                <span className="text-xs text-ink-subtle flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> sinkron...
                </span>
              )}
            </div>

            {permintaanPartPending.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {permintaanPartPending.map((a) => (
                  <div
                    key={a.id}
                    className="border border-status-amber/40 bg-status-amber-bg/30 rounded-xl p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-sm text-ink">{formatPlat(a.no_polisi)}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-status-amber text-white">
                        {a.status_kunjungan}
                      </span>
                    </div>
                    <div className="text-xs text-ink-muted">
                      {a.nama_customer || 'Pelanggan'}{a.no_hp_customer ? ` • ${a.no_hp_customer}` : ''}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Masuk: {a.waktu_masuk ? new Date(a.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                    </div>
                    {a.keperluan && (
                      <p className="text-xs text-ink-subtle">&quot;{a.keperluan}&quot;</p>
                    )}
                    <button
                      type="button"
                      onClick={() => prosesPermintaanPart(a)}
                      className="w-full px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-accent/20 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Proses — Input Barang
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-ink-subtle text-xs space-y-1.5">
                <PackageCheck className="w-8 h-8 mx-auto opacity-40" />
                <p>Tidak ada permintaan menunggu.</p>
                <p className="text-xs">Pelanggan check-in di gerbang bertujuan &quot;Beli Part&quot; muncul otomatis di sini (refresh tiap 8 detik).</p>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL POS BARU: ESTIMASI PENJUALAN PART LANGSUNG                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showPosModal && (
        <DetailModal
          open={showPosModal}
          onClose={() => { setShowPosModal(false); resetPosForm(); }}
          size="lg"
          title="Estimasi Penjualan Part Langsung"
          subtitle="Tanpa service workshop — transaksi langsung masuk alur Warehouse Picking"
          footer={
            posStep === 1 ? (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-medium">
                  Langkah 1 dari 2: Data Pelanggan &amp; Unit
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowPosModal(false); resetPosForm(); }}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!posCustomer.no_polisi.trim() || !posCustomer.nama_customer.trim()}
                    onClick={() => setPosStep(2)}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:cursor-not-allowed"
                  >
                    Lanjut ke Pilih Part
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="text-slate-500 font-medium">Total ({posCart.length} item):</span>
                  <span className="font-mono font-bold text-emerald-600 text-base sm:text-lg">
                    Rp {posGrandTotal !== null ? posGrandTotal.toLocaleString('id-ID') : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setPosStep(1)}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                  </button>
                  <button
                    type="button"
                    disabled={!posCanSubmit || posBuatMutation.isPending}
                    onClick={() => posBuatMutation.mutate()}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:cursor-not-allowed"
                  >
                    {posBuatMutation.isPending ? 'Menyimpan...' : 'KIRIM ESTIMASI'}
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          }
        >
          <div className="space-y-4">
            {/* STEPPER HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPosStep(1)}
                  className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    posStep === 1
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    posStep === 1 ? 'bg-white text-blue-600' : 'bg-slate-300 text-slate-700'
                  }`}>
                    {posStep === 2 && posCustomer.no_polisi ? <Check className="w-3 h-3 stroke-[3]" /> : '1'}
                  </span>
                  <span>1. Data Pelanggan</span>
                </button>

                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

                <button
                  type="button"
                  onClick={() => {
                    if (posCustomer.no_polisi.trim() && posCustomer.nama_customer.trim()) {
                      setPosStep(2);
                    }
                  }}
                  disabled={!posCustomer.no_polisi.trim() || !posCustomer.nama_customer.trim()}
                  className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    posStep === 2
                      ? 'bg-blue-600 text-white shadow-2xs cursor-pointer'
                      : posCustomer.no_polisi.trim() && posCustomer.nama_customer.trim()
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    posStep === 2 ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-500'
                  }`}>
                    2
                  </span>
                  <span>2. Pilih Part &amp; Keranjang ({posCart.length})</span>
                </button>
              </div>

              <span className="text-[11px] font-medium text-slate-400 hidden sm:inline-block">
                Langkah {posStep} dari 2
              </span>
            </div>

            {/* STEP 1: DATA PELANGGAN & UNIT */}
            {posStep === 1 && (
              <div className="space-y-4">
                {/* Pilihan Antrian Gerbang */}
                <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" /> Ambil dari Antrian Gerbang ({antrianBeliPart.length} menunggu)
                  </label>
                  <p className="text-[11px] text-blue-700">
                    Pilih kendaraan yang sudah tercatat oleh security di gerbang, atau pilih &quot;Input Manual&quot; untuk pelanggan walk-in.
                  </p>
                  <select
                    value={posCustomer.id_antrian || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setPosCustomer((prev) => ({ ...prev, id_antrian: undefined }));
                        return;
                      }
                      const a = antrianBeliPart.find((x) => x.id === Number(val));
                      if (a) setPosCustomer((prev) => ({
                        ...prev,
                        id_antrian: a.id,
                        no_polisi: a.no_polisi,
                        nama_customer: a.nama_customer || prev.nama_customer,
                        no_telepon: a.no_hp_customer || prev.no_telepon,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-xs bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none shadow-2xs mt-1"
                  >
                    <option value="">-- Input Manual / Walk-In --</option>
                    {antrianBeliPart.map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatPlat(a.no_polisi)} - {a.nama_customer || 'Pelanggan'} ({new Date(a.waktu_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Form Input Pelanggan */}
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-blue-600" /> Identitas Customer &amp; Kendaraan
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        No. Polisi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: BK 5678 CD"
                        value={posCustomer.no_polisi}
                        onChange={(e) => setPosCustomer({ ...posCustomer, no_polisi: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold uppercase text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none bg-white text-slate-900 font-mono shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Customer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nama pelanggan / PT..."
                        value={posCustomer.nama_customer}
                        onChange={(e) => setPosCustomer({ ...posCustomer, nama_customer: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none bg-white text-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">No. Telepon</label>
                      <input
                        type="text"
                        placeholder="0812-xxxx-xxxx"
                        value={posCustomer.no_telepon}
                        onChange={(e) => setPosCustomer({ ...posCustomer, no_telepon: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none bg-white text-slate-900 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan untuk Gudang (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Instruksi tambahan untuk petugas warehouse picking…"
                      value={posCustomer.catatan}
                      onChange={(e) => setPosCustomer({ ...posCustomer, catatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none bg-white text-slate-900 shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PILIH PART & KERANJANG */}
            {posStep === 2 && (
              <div className="space-y-4">
                {/* Banner Customer Singkat */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-md shrink-0 shadow-2xs">
                      {formatPlat(posCustomer.no_polisi)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {posCustomer.nama_customer}
                      </div>
                      {posCustomer.no_telepon && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          {posCustomer.no_telepon}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPosStep(1)}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Ubah Data
                  </button>
                </div>

                {/* KATALOG & PENCARIAN SPAREPART */}
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" /> Katalog Sparepart (Gudang KIM 3)
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {posFilteredStock.length} sparepart tersedia
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ketik kode atau nama sparepart..."
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none bg-white text-slate-900 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {posFilteredStock.length > 0 ? (
                      posFilteredStock.map((part) => (
                        <div
                          key={part.id}
                          className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex items-center justify-between text-xs gap-3 bg-white"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 truncate">{part.nama_part}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{part.kode_part}</span>
                              <span>•</span>
                              <span>Rak: {part.lokasi_rak || 'Gudang'}</span>
                              <span>•</span>
                              <span>
                                Stok:{' '}
                                <strong className={part.stok > 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                                  {part.stok} {part.satuan}
                                </strong>
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-slate-900 mb-1">
                              Rp {Number(part.harga_jual || 0).toLocaleString('id-ID')}
                            </div>
                            <button
                              type="button"
                              onClick={() => posAddToCart(part)}
                              disabled={part.stok <= 0}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" /> Tambah
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        Tidak ada sparepart yang cocok dengan pencarian.
                      </div>
                    )}
                  </div>
                </div>

                {/* KERANJANG & RINCIAN BIAYA */}
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" /> Keranjang Sparepart
                    </h4>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {posCart.length} item dipilih
                    </span>
                  </div>

                  {posCart.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {posCart.map((item) => (
                        <div key={item.kode_part} className="p-3 flex items-center justify-between gap-3 text-xs bg-white hover:bg-slate-50/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 truncate">{item.nama_part}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{item.kode_part}</span>
                              <span>•</span>
                              <span>Rp {item.harga.toLocaleString('id-ID')}/{item.satuan}</span>
                              {item.qty > item.stok && (
                                <span className="text-red-500 font-bold">(melebihi stok!)</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Qty +/- */}
                            <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => posUpdateQty(item.kode_part, -1)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2.5 font-bold font-mono text-xs text-slate-900">{item.qty}</span>
                              <button
                                type="button"
                                onClick={() => posUpdateQty(item.kode_part, 1)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {/* Subtotal Item */}
                            <div className="w-24 text-right font-mono font-bold text-slate-900 text-xs">
                              Rp {(item.qty * item.harga).toLocaleString('id-ID')}
                            </div>
                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => posRemoveItem(item.kode_part)}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      Keranjang masih kosong. Cari &amp; klik &quot;+ Tambah&quot; pada sparepart di atas.
                    </div>
                  )}

                  {/* Ringkasan Biaya */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    {posPpnRate === null && (
                      <p className="text-xs text-red-600 font-bold text-center">
                        Tarif PPN belum diatur — hubungi Super Admin.
                      </p>
                    )}
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Subtotal Sparepart:</span>
                      <span className="font-mono font-bold text-slate-900">Rp {posSubtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>PPN{posPpnRate !== null ? ` ${posPpnRate}%` : ''}:</span>
                      <span className="font-mono font-bold text-slate-900">
                        Rp {posPpn !== null ? posPpn.toLocaleString('id-ID') : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total Estimasi Biaya:</span>
                      <span className="font-mono font-bold text-emerald-600 text-base">
                        Rp {posGrandTotal !== null ? posGrandTotal.toLocaleString('id-ID') : '-'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center">
                    Estimasi diteruskan ke Warehouse untuk picking. Pembayaran dilakukan setelah barang siap.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DetailModal>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL DETAIL TRANSAKSI PART                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showPartDetailModal && posActive && (
        <DetailModal
          open={Boolean(showPartDetailModal && posActive)}
          onClose={() => setShowPartDetailModal(null)}
          size="md"
          title={posActive.no_transaksi}
          subtitle={`${formatPlat(posActive.no_polisi)} • ${posActive.nama_customer}`}
          badge={<StatusBadge status={posActive.status_transaksi} size="sm" />}
          footer={
            <div className="flex flex-col gap-2 w-full">
              {posActive.status_transaksi === 'Menunggu Approval' && (
                <button
                  type="button"
                  disabled={posSetujuiMutation.isPending}
                  onClick={() => posSetujuiMutation.mutate(posActive)}
                  className="w-full py-2.5 bg-status-green hover:bg-status-green/90 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-status-green/20"
                >
                  <Check className="w-4 h-4" />
                  {posSetujuiMutation.isPending ? 'Menyetujui...' : 'SETUJUI ESTIMASI'}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sub = Number(posActive.subtotal ?? 0);
                    const ppn = posActive.ppn_11 != null ? Number(posActive.ppn_11) : (posPpnRate !== null ? Math.round(sub * (posPpnRate / 100)) : 0);
                    const invObj: InvoicePembayaran = {
                      id: posActive.id,
                      no_invoice: `INV-PART-${posActive.no_transaksi}`,
                      no_polisi: posActive.no_polisi,
                      nama_customer: posActive.nama_customer,
                      tanggal_invoice: posActive.created_at || new Date().toISOString(),
                      subtotal: sub,
                      ppn_nominal: ppn,
                      diskon: 0,
                      grand_total: Number(posActive.total_biaya ?? (sub + ppn)),
                      metode_pembayaran: posMetodeBayar,
                      status_pembayaran: posActive.status_transaksi === 'Selesai' ? 'Paid' : 'Unpaid',
                      kasir_pic: currentUser || 'Kasir',
                    };
                    setPrintThermalInvoice(invObj);
                  }}
                  className="flex-1 py-2.5 bg-surface hover:bg-surface-raised border border-border text-ink-muted hover:text-ink rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Receipt className="w-4 h-4" /> Struk Thermal
                </button>
                <button
                  type="button"
                  onClick={() => setShowPartDetailModal(null)}
                  className="flex-1 py-2.5 bg-surface hover:bg-surface-raised border border-border text-ink-muted hover:text-ink rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-subtle">Waktu Transaksi</span>
              <span className="font-mono text-ink-muted">
                {posActive.created_at ? new Date(posActive.created_at).toLocaleString('id-ID') : '-'}
              </span>
            </div>

            <div className="p-3.5 bg-surface rounded-xl border border-border space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-ink-subtle">No. Picking Gudang:</span><span className="font-mono font-bold text-ink">{posActive.no_picking_request || '-'}</span></div>
              <div className="flex justify-between"><span className="text-ink-subtle">Lokasi Rak:</span><span className="font-bold text-ink">{posActive.lokasi_rak || 'Rak Utama'}</span></div>
              <div className="flex justify-between"><span className="text-ink-subtle">Kontak:</span><span className="font-medium flex items-center gap-1 text-ink"><Phone className="w-3 h-3 text-ink-subtle" /> {posActive.no_telepon || '-'}</span></div>
            </div>

            {posActive.catatan && (
              <div className="p-3.5 bg-surface rounded-xl border border-border text-xs">
                <span className="text-xs font-bold text-ink-subtle uppercase block mb-1">Rincian Pesanan</span>
                <div className="text-ink-muted whitespace-pre-line">{posActive.catatan}</div>
              </div>
            )}

            <div className="p-3.5 bg-surface rounded-xl border border-border space-y-1.5 text-xs font-semibold">
              <div className="flex justify-between text-ink-muted"><span>Subtotal:</span><span className="font-mono text-ink">Rp {posActive.subtotal != null ? Number(posActive.subtotal).toLocaleString('id-ID') : '-'}</span></div>
              <div className="flex justify-between text-ink-muted"><span>PPN:</span><span className="font-mono text-ink">Rp {posActive.ppn_11 != null ? Number(posActive.ppn_11).toLocaleString('id-ID') : '-'}</span></div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-border"><span>Total:</span><span className="font-mono text-status-green">Rp {Number(posActive.total_biaya || 0).toLocaleString('id-ID')}</span></div>
            </div>

            {posActive.status_transaksi !== 'Menunggu Approval' && posActive.status_transaksi !== 'Barang Diserahkan' && (
              <div className="p-3 bg-surface rounded-xl border border-border text-ink-subtle text-xs flex items-center gap-2">
                <CheckCheck className="w-4 h-4 shrink-0 text-accent" /> Tahap berikut (picking gudang → bayar kasir → serah barang) diproses peran terkait.
              </div>
            )}

            {posActive.status_transaksi === 'Barang Diserahkan' && (
              <div className="p-3 bg-status-green-bg rounded-xl border border-status-green/30 text-status-green text-xs flex items-center gap-2">
                <CheckCheck className="w-4 h-4 shrink-0" /> Barang telah diserahkan. Memo Keluar terbit di Pos Security.
              </div>
            )}
          </div>
        </DetailModal>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL DETAIL PR (KOTAK MERAH)                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedPr && (
        <DetailModal
          open={Boolean(selectedPr)}
          onClose={() => setSelectedPrId(null)}
          size="lg"
          title={`${formatPlat(selectedPr.no_polisi)} — ${selectedPr.nama_customer}`}
          subtitle={`No. PR: ${selectedPr.no_pr}`}
          badge={
            (() => {
              const spk = (spkList || []).find((s) => s.id === selectedPr.id_spk);
              const isSpkDone = spk ? (spk.status_spk === 'Selesai' || spk.status_spk === 'FIR Closed') : false;
              return <StatusBadge status={isSpkDone ? 'Selesai' : selectedPr.status_pr} size="sm" />;
            })()
          }
          tabs={[
            {
              id: 'kebutuhan',
              label: 'Kebutuhan Part',
              content: (
                <div className="space-y-4">
                  <div className="p-4 bg-surface rounded-xl border border-border space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-ink-subtle font-semibold block">No. PR</span>
                        <span className="font-mono font-bold text-accent text-sm">{selectedPr.no_pr}</span>
                      </div>
                      <div>
                        <span className="text-ink-subtle font-semibold block">Unit &amp; Pelanggan</span>
                        <span className="font-bold text-ink text-sm"><span className="font-mono">{formatPlat(selectedPr.no_polisi)}</span> — {selectedPr.nama_customer}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <span className="text-xs font-bold text-ink block mb-1">Catatan Kebutuhan Part:</span>
                      <div className="text-xs text-ink-muted bg-surface-raised p-3 rounded-lg border border-border whitespace-pre-line">
                        {selectedPr.catatan_pr || 'Tidak ada catatan spesifik.'}
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: 'penawaran',
              label: 'Penawaran & PO',
              content: (
                <div className="space-y-4">
                  {selectedPr.no_po ? (
                    <div className="p-4 bg-surface rounded-xl border border-border space-y-4 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                        <div>
                          <span className="text-ink-subtle font-semibold block">Nomor PO</span>
                          <span className="font-mono font-bold text-accent text-sm">{selectedPr.no_po}</span>
                        </div>
                        <div className="sm:text-right">
                          <span className="text-ink-subtle font-semibold block">Admin Purchasing</span>
                          <span className="font-semibold text-ink">{selectedPr.nama_admin_purchasing || '-'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-surface-raised rounded-xl border border-border space-y-1">
                          <span className="text-ink-subtle font-semibold block">Vendor 1</span>
                          <div className="font-bold text-ink">{selectedPr.vendor_1_nama || '-'}</div>
                          <div className="text-ink-muted">Rp {Number(selectedPr.vendor_1_harga || 0).toLocaleString('id-ID')}</div>
                        </div>
                        <div className="p-3 bg-surface-raised rounded-xl border border-border space-y-1">
                          <span className="text-ink-subtle font-semibold block">Vendor 2</span>
                          <div className="font-bold text-ink">{selectedPr.vendor_2_nama || '-'}</div>
                          <div className="text-ink-muted">Rp {Number(selectedPr.vendor_2_harga || 0).toLocaleString('id-ID')}</div>
                        </div>
                      </div>

                      <div className="p-3.5 bg-accent-subtle rounded-xl border border-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-ink-subtle font-semibold block">Vendor Terpilih &amp; Harga Kesepakatan</span>
                          <span className="font-bold text-accent text-sm">
                            {selectedPr.vendor_terpilih || '-'} (Rp {Number(selectedPr.harga_kesepakatan || 0).toLocaleString('id-ID')})
                          </span>
                        </div>
                        <div className="sm:text-right">
                          <span className="text-ink-subtle font-semibold block">Estimasi ETA Ready</span>
                          <span className="font-mono font-bold text-ink">
                            {selectedPr.estimasi_tanggal_ready_eta || '-'} {selectedPr.estimasi_jam_ready_eta ? `(${selectedPr.estimasi_jam_ready_eta})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-surface-raised rounded-xl border border-border text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-status-amber-bg text-status-amber mx-auto flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-ink">
                        Menunggu Admin Purchasing menginput penawaran vendor dan estimasi ETA.
                      </p>
                      <p className="text-xs text-ink-subtle">
                        Informasi penawaran harga dari minimal 2 vendor akan muncul di sini setelah diproses Purchasing.
                      </p>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              {selectedPr.no_po && selectedPr.status_konfirmasi_sa !== 'Disetujui SA' ? (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setPrRejectConfirmOpen(true)}
                    disabled={konfirmasiPoMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-status-red-bg hover:bg-status-red/10 text-status-red border border-status-red/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      konfirmasiPoMutation.mutate(
                        { poId: selectedPr.po_id!, setuju: true },
                        { onSuccess: () => setSelectedPrId(null) }
                      )
                    }
                    disabled={konfirmasiPoMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-status-green hover:bg-status-green/90 text-white text-xs font-bold shadow-md shadow-status-green/20 transition-all cursor-pointer"
                  >
                    {konfirmasiPoMutation.isPending ? 'Menyimpan...' : 'Setujui PO'}
                  </button>
                </div>
              ) : selectedPr.status_konfirmasi_sa === 'Disetujui SA' ? (
                <div className="flex items-center justify-between w-full">
                  <span className="px-2.5 py-1 bg-status-green-bg text-status-green font-bold rounded-lg text-xs flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Disetujui SA
                  </span>
                  {selectedPr.status_pr === 'Barang Ready' ? (
                    (() => {
                      const spk = (spkList || []).find((s) => s.id === selectedPr.id_spk);
                      const isSpkDone = spk ? (spk.status_spk === 'Selesai' || spk.status_spk === 'FIR Closed') : false;
                      const isSpkWaitingPart = spk ? (spk.status_spk === 'Waiting Part' || spk.status_spk === 'Estimasi Dibuat') : false;
                      if (isSpkDone) {
                        return (
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> SPK Selesai
                          </span>
                        );
                      }
                      if (!isSpkWaitingPart) {
                        return (
                          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-blue-200">
                            <Check className="w-3.5 h-3.5" /> SPK Sedang Berjalan ({spk?.status_spk || 'Diproses'})
                          </span>
                        );
                      }
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (spk) {
                              setShowEstimasiModal(spk);
                              setSelectedPrId(null);
                            } else {
                              toast.warning('Data SPK tidak ditemukan di daftar. Muat ulang halaman.');
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ClipboardList className="w-4 h-4" /> Buka Estimasi
                        </button>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-ink-muted italic">
                      Menunggu konfirmasi barang tiba oleh Admin Purchasing.
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-ink-subtle italic">
                  Belum ada PO yang memerlukan keputusan SA.
                </span>
              )}
            </div>
          }
        />
      )}

      {/* CONFIRM MODAL TOLAK PO */}
      {prRejectConfirmOpen && selectedPr && (
        <ConfirmModal
          title="Tolak Penawaran PO"
          message={`Apakah Anda yakin ingin menolak penawaran PO ${selectedPr.no_po || ''} untuk unit ${formatPlat(selectedPr.no_polisi)}?`}
          confirmLabel="Ya, Tolak PO"
          cancelLabel="Batal"
          tone="red"
          isPending={konfirmasiPoMutation.isPending}
          onConfirm={() => {
            konfirmasiPoMutation.mutate(
              { poId: selectedPr.po_id!, setuju: false },
              {
                onSuccess: () => {
                  setPrRejectConfirmOpen(false);
                  setSelectedPrId(null);
                },
              }
            );
          }}
          onClose={() => setPrRejectConfirmOpen(false)}
        />
      )}

      {/* MODAL BUAT ESTIMASI BIAYA */}
      {showEstimasiModal && (
        <DetailModal
          open={Boolean(showEstimasiModal)}
          onClose={() => { setShowEstimasiModal(null); resetEstimasiForm(); }}
          title="Buat Estimasi Biaya & Waktu"
          subtitle={`Berdasarkan hasil pengecekan ${showEstimasiModal.nama_foreman ? `Foreman (${showEstimasiModal.nama_foreman})` : 'Foreman'} untuk ${formatPlat(showEstimasiModal.no_polisi)}`}
          size="xl"
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              <button
                type="button"
                onClick={() => { setShowEstimasiModal(null); resetEstimasiForm(); }}
                className="px-4 py-2.5 bg-surface hover:bg-surface-raised border border-border text-ink-muted hover:text-ink font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => submitEstimasiMutation.mutate(showEstimasiModal)}
                disabled={submitEstimasiMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-status-green hover:bg-status-green/90 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-status-green/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitEstimasiMutation.isPending ? 'Memproses...' : 'Submit Estimasi ke Customer'}
                {!submitEstimasiMutation.isPending && <CheckCircle className="w-4 h-4" />}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kolom Kiri: Info Pengecekan Mekanik & Input Part */}
            <div className="space-y-4">
              <div className="bg-surface rounded-xl p-4 border border-border">
                <h4 className="text-xs font-bold text-ink mb-2 flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-ink-subtle"/> Hasil Pengecekan Foreman/Mekanik</h4>
                <div className="text-xs text-ink-muted whitespace-pre-line leading-relaxed">
                  {showEstimasiModal.catatan_foreman || 'Belum ada catatan dari Foreman.'}
                </div>
              </div>

              {/* Sparepart inputan Foreman/Mekanik (sumber utama, read-only) */}
              <div className="bg-surface rounded-xl p-4 border border-border">
                <h4 className="text-xs font-bold text-ink mb-3 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-status-green" /> Sparepart Inputan Foreman/Mekanik
                  <span className="ml-auto text-xs font-bold text-ink-subtle">{foremanParts.length} item</span>
                </h4>
                {foremanParts.length > 0 ? (
                  <div className="space-y-2">
                    {foremanParts.map((p, idx) => (
                      <div key={`f-${idx}`} className="p-2.5 bg-surface-raised border border-border rounded-xl flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-ink truncate">{p.nama_part}</div>
                          <div className="text-xs text-ink-muted flex gap-2 mt-0.5">
                            <span>{p.jumlah} {p.satuan} x Rp {p.harga_satuan.toLocaleString()}</span>
                            {p.stok === 0 || p.jumlah > p.stok ? (
                              <span className="text-status-red font-bold flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> INDENT</span>
                            ) : (
                              <span className="text-status-green font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> Ready</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-subtle italic text-center p-2 bg-surface-raised/50 rounded-xl">
                    Foreman belum menginput sparepart untuk SPK ini.
                  </p>
                )}
              </div>

              {/* Tambahan SA (opsional, tersembunyi di balik tombol agar tidak salah paham) */}
              <div className="bg-accent-subtle rounded-xl p-4 border border-accent/20">
                <button
                  type="button"
                  onClick={() => setShowPartPicker((v) => !v)}
                  className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {showPartPicker ? 'Tutup Tambah Sparepart' : `Tambah Sparepart Tambahan${selectedParts.length > 0 ? ` (${selectedParts.length})` : ''}`}
                </button>
                {showPartPicker && (
                <>
                <div className="space-y-2 mt-3">
                  <select
                    value={partPickerId}
                    onChange={(e) => setPartPickerId(e.target.value)}
                    className="w-full min-w-0 px-3 py-2 rounded-xl border border-border text-xs bg-surface focus:ring-2 focus:ring-accent focus:outline-none truncate"
                  >
                    <option value="">-- Pilih Sparepart --</option>
                    {masterStokPart?.map(p => (
                      <option key={p.kode_part} value={p.kode_part}>
                        {p.kode_part} - {p.nama_part} | stok: {p.stok}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={partPickerQty}
                      onChange={(e) => setPartPickerQty(Number(e.target.value))}
                      className="w-20 shrink-0 px-2 py-2 rounded-xl border border-border text-xs text-center bg-surface focus:ring-2 focus:ring-accent focus:outline-none font-bold"
                      title="Jumlah"
                    />
                    <button
                      type="button"
                      onClick={handleAddPartToEstimasi}
                      disabled={!partPickerId}
                      className="flex-1 px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Tambah ke Estimasi
                    </button>
                  </div>
                </div>

                {/* List Part Tambahan SA */}
                <div className="mt-3 space-y-2">
                  {selectedParts.map((p, idx) => (
                    <div key={idx} className="p-2.5 bg-surface-raised border border-border rounded-xl flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-ink truncate">{p.nama_part}</div>
                        <div className="text-xs text-ink-muted flex gap-2 mt-0.5">
                          <span>{p.jumlah} {p.satuan} x Rp {p.harga_satuan.toLocaleString()}</span>
                          {p.stok === 0 || p.jumlah > p.stok ? (
                            <span className="text-status-red font-bold flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> INDENT</span>
                          ) : (
                            <span className="text-status-green font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> Ready</span>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={() => handleRemovePartFromEstimasi(p.kode_part)} className="text-ink-subtle hover:text-status-red cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {selectedParts.length === 0 && (
                    <p className="text-xs text-ink-subtle italic text-center p-2 bg-surface-raised/50 rounded-xl">Belum ada tambahan dari SA.</p>
                  )}
                </div>
                </>
                )}
              </div>
            </div>

            {/* Kolom Kanan: Ringkasan Estimasi & Action */}
            <div className="space-y-4">
              <div className="bg-surface rounded-xl p-4 border border-border space-y-3">
                <h4 className="text-xs font-bold text-ink border-b border-border pb-2">Ringkasan Estimasi Customer</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={jasaTermasuk}
                      onChange={(e) => setJasaTermasuk(e.target.checked)}
                      className="w-4 h-4 rounded text-accent focus:ring-accent"
                    />
                    <span className="font-bold text-ink">Sertakan Jasa Servis Dasar</span>
                  </label>
                  {jasaTermasuk && (
                    <div className="flex justify-between items-center gap-2 text-xs">
                      <span className="text-ink-muted">Nominal jasa:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-ink-muted font-bold">Rp</span>
                        <input
                          type="number"
                          min={0}
                          value={jasaNominal}
                          onChange={(e) => setJasaNominal(Math.max(0, Number(e.target.value) || 0))}
                          className="w-32 px-2 py-1.5 rounded-xl border border-border font-mono text-xs font-bold text-right bg-surface focus:ring-2 focus:ring-accent focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-muted">Jasa Servis Dasar:</span>
                  <span className="font-semibold text-ink-muted">Rp {jasaAktif.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-muted">Total Sparepart ({allEstimasiParts.length} item):</span>
                  <span className="font-semibold text-ink-muted">Rp {partsSubtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                  <span className="font-bold text-ink">Total Estimasi Biaya:</span>
                  <span className="font-black text-status-green">Rp {totalEstimasiBiaya.toLocaleString('id-ID')}</span>
                </div>

                <div className="pt-3">
                  <label className="block text-xs font-bold text-ink-muted mb-1">Estimasi Waktu Pengerjaan (Jam)</label>
                  <input
                    type="number"
                    value={estimasiWaktu}
                    onChange={(e) => setEstimasiWaktu(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border font-mono text-sm font-bold bg-surface focus:ring-2 focus:ring-accent focus:outline-none"
                  />
                </div>
              </div>

              {hasEmptyStock && (
                <div className="p-3 bg-status-red-bg rounded-xl border border-status-red/30 text-status-red text-xs flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p><strong>Part Indent Terdeteksi!</strong> Menyetujui estimasi ini akan otomatis membuat PR Part Indent dan menahan status menjadi Waiting Part.</p>
                </div>
              )}
            </div>
          </div>
        </DetailModal>
      )}


      {/* MODAL AJUKAN PR PART */}
      {showPrModal && (
        <DetailModal
          open={Boolean(showPrModal)}
          onClose={() => { setShowPrModal(null); resetPrForm(); }}
          size="md"
          title="Ajukan Purchase Request (PR)"
          subtitle="Kirim permintaan pengadaan sparepart ke Admin Purchasing"
          badge={<span className="font-mono text-xs font-bold text-accent">{showPrModal.no_spk}</span>}
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              <button
                type="button"
                onClick={() => { setShowPrModal(null); resetPrForm(); }}
                className="px-4 py-2.5 bg-surface hover:bg-surface-raised text-ink-muted hover:text-ink font-bold text-xs rounded-xl border border-border transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={prMutation.isPending}
                onClick={() => prMutation.mutate(showPrModal)}
                className="px-5 py-2.5 bg-status-red hover:bg-status-red/90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-status-red/20 transition-all cursor-pointer"
              >
                {prMutation.isPending ? 'Mengirim...' : 'Kirim ke Purchasing'}
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-surface border border-border">
              <div className="font-bold text-ink text-sm">{showPrModal.no_spk} - <span className="font-mono">{formatPlat(showPrModal.no_polisi)}</span></div>
              <div className="text-ink-muted mt-0.5">{showPrModal.nama_customer}</div>
            </div>

            {/* Pilih sparepart (multi-item, stok live gudang) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink-muted">
                Pilih Sparepart <span className="text-status-red">*</span>
                <span className="font-normal"> — part indent SPK ini sudah terisi otomatis</span>
              </label>
              <select
                value={prPickerId}
                onChange={(e) => setPrPickerId(e.target.value)}
                className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-border text-xs bg-surface focus:ring-2 focus:ring-accent focus:outline-none truncate"
              >
                <option value="">-- Pilih sparepart gudang --</option>
                {masterStokPart?.map((p) => (
                  <option key={p.kode_part} value={p.kode_part}>
                    {p.kode_part} - {p.nama_part} | stok: {p.stok}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={prPickerQty}
                  onChange={(e) => setPrPickerQty(Math.max(1, Number(e.target.value) || 1))}
                  className="w-20 shrink-0 px-2 py-2 rounded-xl border border-border text-xs text-center font-bold bg-surface focus:ring-2 focus:ring-accent focus:outline-none"
                  title="Jumlah dibutuhkan"
                />
                <button
                  type="button"
                  disabled={!prPickerId}
                  onClick={() => {
                    const item = masterStokPart?.find((p) => p.kode_part === prPickerId);
                    if (!item) return;
                    if (prParts.some((p) => p.kode_part === item.kode_part)) {
                      toast.warning(`${item.nama_part} sudah ada di daftar PR ini.`);
                      return;
                    }
                    setPrParts([...prParts, {
                      kode_part: item.kode_part,
                      nama_part: item.nama_part,
                      jumlah: prPickerQty,
                      satuan: item.satuan,
                      stok: item.stok,
                    }]);
                    setPrPickerId('');
                    setPrPickerQty(1);
                  }}
                  className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah ke PR
                </button>
              </div>

              {prParts.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {prParts.map((p) => (
                    <div key={p.kode_part} className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface border border-border text-xs gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-ink truncate">{p.nama_part}</div>
                        <div className="text-xs text-ink-muted font-mono">
                          {p.kode_part} | butuh: {p.jumlah} {p.satuan} | stok gudang: {p.stok}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrParts(prParts.filter((x) => x.kode_part !== p.kode_part))}
                        className="p-1.5 rounded-lg text-status-red hover:bg-status-red-bg transition-colors shrink-0 cursor-pointer"
                        title="Hapus dari PR"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-ink-subtle italic text-center p-3 bg-surface rounded-xl border border-dashed border-border">
                  Belum ada part dipilih. Pilih dari daftar di atas lalu Tambah (bisa beberapa item).
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">Catatan Tambahan (Opsional)</label>
              <textarea
                rows={2}
                placeholder="Contoh: butuh urgent untuk unit operasional..."
                value={prNote}
                onChange={(e) => setPrNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-surface focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>
          </div>
        </DetailModal>
      )}


      {/* MODAL PEMERIKSAAN AKHIR (FINAL CHECK SA) SEBELUM FIR CLOSED */}
      {showFinalCheckModal && (
        <DetailModal
          open={Boolean(showFinalCheckModal)}
          onClose={() => setShowFinalCheckModal(null)}
          size="md"
          title="Pemeriksaan Akhir (Final Check SA)"
          subtitle="Verifikasi fisik & dokumen sebelum penutupan FIR dan penerbitan Invoice"
          badge={<StatusBadge status={showFinalCheckModal.status_spk} size="sm" />}
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowFinalCheckModal(null)}
                className="px-4 py-2.5 bg-surface hover:bg-surface-raised border border-border text-ink-muted hover:text-ink font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!isFinalCheckValid || firClosedMutation.isPending}
                onClick={() => firClosedMutation.mutate(showFinalCheckModal)}
                className="px-5 py-2.5 bg-status-green hover:bg-status-green/90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-status-green/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {firClosedMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Invoice...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>FIR Closed &amp; Terbitkan Invoice</span>
                  </>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Info SPK & Hasil QC Foreman */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent">{showFinalCheckModal.no_spk}</span>
                <span className="px-2 py-0.5 rounded-full bg-status-green-bg text-status-green font-bold text-xs flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> QC Passed (Foreman)
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-base font-black font-mono text-ink">{formatPlat(showFinalCheckModal.no_polisi)}</div>
                  <div className="text-xs text-ink-muted font-semibold">{showFinalCheckModal.nama_customer}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-ink-subtle block">Total Biaya SPK:</span>
                  <span className="font-bold text-ink text-xs">
                    Rp {Number(showFinalCheckModal.estimasi_biaya || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              <div className="text-xs text-ink-muted pt-1 border-t border-border/60 flex items-center justify-between">
                <span>Mekanik: <strong>{showFinalCheckModal.nama_mekanik || '-'}</strong></span>
                <span>Foreman: <strong>{showFinalCheckModal.nama_foreman || '-'}</strong></span>
              </div>
            </div>

            {/* Checklist Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-ink uppercase tracking-wider text-xs block">
                  Checklist Pemeriksaan Wajib SA:
                </label>
                <span className="text-xs font-semibold text-ink-muted">
                  {[finalCheckForm.kebersihan, finalCheckForm.tes_jalan, finalCheckForm.kelengkapan_surat].filter(Boolean).length} / 3 Terverifikasi
                </span>
              </div>

              {/* Item 1: Kebersihan Kendaraan */}
              <div
                onClick={() => setFinalCheckForm({ ...finalCheckForm, kebersihan: !finalCheckForm.kebersihan })}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  finalCheckForm.kebersihan
                    ? 'border-status-green bg-status-green-bg text-ink shadow-xs'
                    : 'border-border bg-surface-raised hover:border-border'
                }`}
              >
                <input
                  type="checkbox"
                  checked={finalCheckForm.kebersihan}
                  onChange={(e) => {
                    e.stopPropagation();
                    setFinalCheckForm({ ...finalCheckForm, kebersihan: e.target.checked });
                  }}
                  className="mt-0.5 rounded text-status-green focus:ring-status-green h-4 w-4 shrink-0 cursor-pointer"
                />
                <div>
                  <div className="font-bold text-ink flex items-center gap-1.5">
                    <span>1. Kebersihan Kendaraan</span>
                    {finalCheckForm.kebersihan && <Check className="w-3.5 h-3.5 text-status-green" />}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                    Kabin pengemudi dan bodi luar bersih dari ceceran oli, sisa gemuk/kotoran, serta tidak ada alat teknisi yang tertinggal di unit.
                  </p>
                </div>
              </div>

              {/* Item 2: Tes Jalan / Fisik */}
              <div
                onClick={() => setFinalCheckForm({ ...finalCheckForm, tes_jalan: !finalCheckForm.tes_jalan })}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  finalCheckForm.tes_jalan
                    ? 'border-status-green bg-status-green-bg text-ink shadow-xs'
                    : 'border-border bg-surface-raised hover:border-border'
                }`}
              >
                <input
                  type="checkbox"
                  checked={finalCheckForm.tes_jalan}
                  onChange={(e) => {
                    e.stopPropagation();
                    setFinalCheckForm({ ...finalCheckForm, tes_jalan: e.target.checked });
                  }}
                  className="mt-0.5 rounded text-status-green focus:ring-status-green h-4 w-4 shrink-0 cursor-pointer"
                />
                <div>
                  <div className="font-bold text-ink flex items-center gap-1.5">
                    <span>2. Uji Tes Jalan &amp; Fungsi Fisik</span>
                    {finalCheckForm.tes_jalan && <Check className="w-3.5 h-3.5 text-status-green" />}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                    Sistem pengereman responsif, lampu/kelistrikan menyala normal, mesin langsam stabil, dan keluhan awal customer telah teratasi.
                  </p>
                </div>
              </div>

              {/* Item 3: Kelengkapan Surat */}
              <div
                onClick={() => setFinalCheckForm({ ...finalCheckForm, kelengkapan_surat: !finalCheckForm.kelengkapan_surat })}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  finalCheckForm.kelengkapan_surat
                    ? 'border-status-green bg-status-green-bg text-ink shadow-xs'
                    : 'border-border bg-surface-raised hover:border-border'
                }`}
              >
                <input
                  type="checkbox"
                  checked={finalCheckForm.kelengkapan_surat}
                  onChange={(e) => {
                    e.stopPropagation();
                    setFinalCheckForm({ ...finalCheckForm, kelengkapan_surat: e.target.checked });
                  }}
                  className="mt-0.5 rounded text-status-green focus:ring-status-green h-4 w-4 shrink-0 cursor-pointer"
                />
                <div>
                  <div className="font-bold text-ink flex items-center gap-1.5">
                    <span>3. Kelengkapan Dokumen &amp; Barang Kendaraan</span>
                    {finalCheckForm.kelengkapan_surat && <Check className="w-3.5 h-3.5 text-status-green" />}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                    STNK / KIR asli, buku riwayat servis, kunci kontak, ban serep, dan tool kit lengkap dalam kondisi siap serah terima ke driver.
                  </p>
                </div>
              </div>
            </div>

            {/* Catatan Akhir SA */}
            <div>
              <label className="block text-ink-muted font-bold mb-1 text-xs">
                Catatan Tambahan Pemeriksaan Akhir SA:
              </label>
              <textarea
                rows={2}
                value={finalCheckForm.catatan_final}
                onChange={(e) => setFinalCheckForm({ ...finalCheckForm, catatan_final: e.target.value })}
                placeholder="Catatan kondisi fisik saat serah terima..."
                className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-surface focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>

            {/* Notice Warning if not checked */}
            {!isFinalCheckValid ? (
              <div className="p-3 bg-status-amber-bg rounded-xl border border-status-amber/30 text-status-amber text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Centang <strong>semua 3 checklist di atas</strong> untuk mengaktifkan tombol penutupan FIR dan penerbitan Invoice.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-status-green-bg rounded-xl border border-status-green/30 text-status-green text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>
                  Pemeriksaan akhir lengkap. Tombol <strong>FIR Closed &amp; Terbitkan Invoice</strong> siap dieksekusi.
                </span>
              </div>
            )}
          </div>
        </DetailModal>
      )}


      {/* Detail Modal for Selected SPK */}
      {selectedSpk && (
        <DetailModal
          open={Boolean(selectedSpk)}
          onClose={() => setSelectedSpk(null)}
          title={`SPK ${selectedSpk.no_spk}`}
          subtitle={`${formatPlat(selectedSpk.no_polisi)} • ${selectedSpk.nama_customer || 'Kendaraan'}`}
          badge={<StatusBadge status={selectedSpk.status_spk} size="sm" />}
          size="lg"
          tabs={[
            {
              id: 'ringkasan',
              label: 'Ringkasan & Status',
              content: (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-surface rounded-xl border border-border">
                      <span className="text-xs text-ink-muted block">No. Polisi</span>
                      <span className="text-sm font-black font-mono text-ink">{formatPlat(selectedSpk.no_polisi)}</span>
                    </div>
                    <div className="p-3 bg-surface rounded-xl border border-border">
                      <span className="text-xs text-ink-muted block">Odometer</span>
                      <span className="text-sm font-bold text-ink">{selectedSpk.odometer_km ? `${Number(selectedSpk.odometer_km).toLocaleString('id-ID')} KM` : '-'}</span>
                    </div>
                    <div className="p-3 bg-surface rounded-xl border border-border">
                      <span className="text-xs text-ink-muted block">Mekanik</span>
                      <span className="text-sm font-bold text-ink">{selectedSpk.nama_mekanik || '-'}</span>
                    </div>
                    <div className="p-3 bg-surface rounded-xl border border-border">
                      <span className="text-xs text-ink-muted block">Foreman</span>
                      <span className="text-sm font-bold text-ink">{selectedSpk.nama_foreman || '-'}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Keluhan Customer</h4>
                    <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{selectedSpk.keluhan_customer || 'Tidak ada catatan keluhan.'}</p>
                  </div>

                  <div className="p-4 bg-surface rounded-xl border border-border space-y-3">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Pemeriksaan Fisik Awal SA</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-surface-raised rounded-lg border border-border flex items-center justify-between">
                        <span className="text-ink-muted">Bodi:</span>
                        <span className={`font-bold ${selectedSpk.cek_body === 'OK' ? 'text-status-green' : 'text-status-amber'}`}>{selectedSpk.cek_body || 'OK'}</span>
                      </div>
                      <div className="p-2 bg-surface-raised rounded-lg border border-border flex items-center justify-between">
                        <span className="text-ink-muted">Mesin:</span>
                        <span className={`font-bold ${selectedSpk.cek_mesin === 'OK' ? 'text-status-green' : 'text-status-amber'}`}>{selectedSpk.cek_mesin || 'OK'}</span>
                      </div>
                      <div className="p-2 bg-surface-raised rounded-lg border border-border flex items-center justify-between">
                        <span className="text-ink-muted">Kelistrikan:</span>
                        <span className={`font-bold ${selectedSpk.cek_kelistrikan === 'OK' ? 'text-status-green' : 'text-status-amber'}`}>{selectedSpk.cek_kelistrikan || 'OK'}</span>
                      </div>
                      <div className="p-2 bg-surface-raised rounded-lg border border-border flex items-center justify-between">
                        <span className="text-ink-muted">Kaki-kaki:</span>
                        <span className={`font-bold ${selectedSpk.cek_kaki_kaki === 'OK' ? 'text-status-green' : 'text-status-amber'}`}>{selectedSpk.cek_kaki_kaki || 'OK'}</span>
                      </div>
                    </div>
                    {selectedSpk.catatan_kondisi_awal && (
                      <div className="pt-2 border-t border-border text-xs text-ink-muted">
                        <span className="font-semibold text-ink">Catatan Fisik:</span> {selectedSpk.catatan_kondisi_awal}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-surface rounded-xl border border-border">
                      <span className="text-xs text-ink-muted block">Estimasi Waktu ({labelSumberEta(etaSpk(selectedSpk).sumber)})</span>
                      <span className="text-sm font-bold text-ink">{etaSpk(selectedSpk).jam != null ? `${etaSpk(selectedSpk).jam} Jam` : '-'}</span>
                    </div>
                    <div className="p-3 bg-surface rounded-xl border border-border">
                      <span className="text-xs text-ink-muted block">Estimasi Biaya</span>
                      <span className="text-sm font-black text-status-green">Rp {Number(selectedSpk.estimasi_biaya || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              id: 'pekerjaan',
              label: 'Pekerjaan & Sparepart',
              content: (() => {
                const spkItems = (spkPekerjaanList || []).filter((p) => p.id_spk === selectedSpk.id);
                const spkParts = (spkPartList || []).filter((p) => p.id_spk === selectedSpk.id);
                if (spkItems.length === 0 && spkParts.length === 0) {
                  return (
                    <EmptyState
                      title="Belum Ada Item Pekerjaan atau Sparepart"
                      description="Foreman atau Mekanik belum mendaftarkan rincian pekerjaan atau sparepart untuk SPK ini."
                    />
                  );
                }
                return (
                  <div className="space-y-4">
                    {spkItems.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">Daftar Pekerjaan / Jasa ({spkItems.length})</span>
                        <div className="space-y-2">
                          {spkItems.map((item) => (
                            <div key={item.id} className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <div className="font-bold text-ink truncate">{item.nama_pekerjaan}</div>
                                <div className="text-xs text-ink-muted mt-0.5">
                                  Durasi: {item.estimasi_durasi_jam || 0} Jam • Mekanik: {item.nama_mekanik || '-'}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-ink block">Rp {Number(item.biaya_jasa || 0).toLocaleString('id-ID')}</span>
                                <span className="text-xs text-ink-muted">{item.status_pekerjaan || 'Menunggu'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {spkParts.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">Daftar Sparepart ({spkParts.length})</span>
                        <div className="space-y-2">
                          {spkParts.map((part) => (
                            <div key={part.id} className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <div className="font-bold text-ink truncate">{part.nama_part}</div>
                                <div className="text-xs text-ink-muted mt-0.5 font-mono">
                                  {part.kode_part || '-'} • {part.jumlah} {part.satuan} • Rp {Number(part.harga_satuan || 0).toLocaleString('id-ID')}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-ink block">Rp {Number(part.subtotal || 0).toLocaleString('id-ID')}</span>
                                <span className="text-xs text-ink-muted">{part.status_ketersediaan}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })(),
            },
            {
              id: 'dokumen',
              label: 'Dokumen & Foto',
              content: (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedSpk.foto_odometer ? (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-ink-muted">Foto Odometer</span>
                      <img src={selectedSpk.foto_odometer} alt="Foto Odometer" className="w-full h-40 object-cover rounded-xl border border-border" />
                    </div>
                  ) : null}
                  {selectedSpk.foto_stnk ? (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-ink-muted">Foto STNK</span>
                      <img src={selectedSpk.foto_stnk} alt="Foto STNK" className="w-full h-40 object-cover rounded-xl border border-border" />
                    </div>
                  ) : null}
                  {selectedSpk.foto_kir ? (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-ink-muted">Foto Buku KIR</span>
                      <img src={selectedSpk.foto_kir} alt="Foto KIR" className="w-full h-40 object-cover rounded-xl border border-border" />
                    </div>
                  ) : null}
                  {!selectedSpk.foto_odometer && !selectedSpk.foto_stnk && !selectedSpk.foto_kir && (
                    <div className="col-span-full">
                      <EmptyState
                        title="Tidak Ada Lampiran Foto"
                        description="Belum ada foto odometer, STNK, atau KIR yang diunggah saat penerimaan."
                      />
                    </div>
                  )}
                </div>
              ),
            },
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
                {selectedSpk.status_spk === 'Estimasi Dibuat' && (
                  <button
                    type="button"
                    onClick={() => {
                      const spk = selectedSpk;
                      setSelectedSpk(null);
                      setShowEstimasiModal(spk);
                    }}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <CheckCircle className="w-4 h-4" /> Buat Estimasi Biaya
                  </button>
                )}
                {selectedSpk.status_spk === 'QC Passed' && (
                  <button
                    type="button"
                    onClick={() => {
                      const spk = selectedSpk;
                      setSelectedSpk(null);
                      handleOpenFinalCheck(spk);
                    }}
                    className="px-4 py-2 bg-status-green hover:bg-status-green/90 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <FileCheck className="w-4 h-4" /> Final Check (FIR Closed)
                  </button>
                )}
              </div>
            </div>
          }
        />
      )}

      {/* Printable SPK A4 Modal */}
      {showPrintSpk && (
        <PrintSpkModal
          spk={showPrintSpk}
          onClose={() => setShowPrintSpk(null)}
        />
      )}

      {/* Printable Struk Thermal 80mm (Penjualan Part) */}
      {printThermalInvoice && (
        <PrintThermalInvoiceModal
          invoice={printThermalInvoice}
          onClose={() => setPrintThermalInvoice(null)}
        />
      )}

    </div>
  );
};
