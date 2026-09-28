import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { realtimeHub, publishKeCustomer } from '../services/realtimeService';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import { SectionHeader } from '../components/common/SectionHeader';
import { ListItemCard } from '../components/common/ListItemCard';
import { DetailModal } from '../components/common/DetailModal';
import { EmptyState } from '../components/common/EmptyState';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { TransaksiBeliPart, StokSparepart, InvoicePembayaran, MemoKeluar, AntrianKunjungan } from '../types';
import { PrintThermalInvoiceModal } from '../components/print/PrintThermalInvoiceModal';
import { PrintMemoKeluarModal } from '../components/print/PrintMemoKeluarModal';
import { PaginationBar } from '../components/common/PaginationBar';
import { ModalPortal } from '../components/common/ModalPortal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { toast } from '../components/common/Toast';
import { usePpnRate } from '../hooks/usePpnRate';
import { 
  Package,
  PackageCheck, 
  Check, 
  X, 
  ShoppingBag, 
  ArrowRight, 
  Receipt, 
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  Plus,
  Minus,
  Truck,
  Printer,
  FileText,
  User,
  Phone,
  CheckCheck,
  AlertCircle
} from 'lucide-react';

interface CartItem {
  id_part?: number;
  kode: string;
  nama: string;
  harga: number;
  qty: number;
  stok_tersedia?: number;
  lokasi_rak?: string;
}

export const BeliPartView: React.FC<{ initialTab?: 'transaksi' | 'estimasi' | 'picking' }> = ({ initialTab = 'transaksi' }) => {
  const queryClient = useQueryClient();
  const { currentUser, currentRole, navTick, activeTab: storeActiveTab } = useAppStore();
  const [activeTab, setActiveTab] = useState<'transaksi' | 'estimasi' | 'picking'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!navTick && !storeActiveTab) return;
    if (storeActiveTab === 'beli-part-transaksi' || storeActiveTab === 'beli-part') setActiveTab('transaksi');
    else if (storeActiveTab === 'beli-part-estimasi') setActiveTab('estimasi');
    else if (storeActiveTab === 'beli-part-picking') setActiveTab('picking');
  }, [navTick, storeActiveTab]);

  const [selectedTransaksi, setSelectedTransaksi] = useState<TransaksiBeliPart | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [transaksiPage, setTransaksiPage] = useState(1);
  const [transaksiLimit, setTransaksiLimit] = useState(10);
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [showKatalogModal, setShowKatalogModal] = useState(false);
  const [pickingStep, setPickingStep] = useState<null | 'picking' | 'serah'>(null);
  
  // Lokasi rak diinput Warehouse saat konfirmasi picking
  const [lokasiRakPicking, setLokasiRakPicking] = useState('');
  // Peringatan non-blokir serah-terima
  const [showSerahWarning, setShowSerahWarning] = useState(false);
  const [metodeBayarKasir, setMetodeBayarKasir] = useState<'Cash' | 'Transfer Bank' | 'QRIS' | 'EDC'>('Cash');

  // Modals for Printing
  const [printThermalInvoice, setPrintThermalInvoice] = useState<InvoicePembayaran | null>(null);
  const [printMemoModal, setPrintMemoModal] = useState<MemoKeluar | null>(null);

  // Form State Estimasi Baru (SA POS)
  const [formCustomer, setFormCustomer] = useState({
    id_antrian: undefined as number | undefined,
    nama_customer: '',
    no_polisi: '',
    no_telepon: '',
  });

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Gerbang aksi per role
  const bolehBayarKasir = currentRole === 'Admin Invoice' || currentRole === 'Super Admin';
  const bolehKelolaGudang = currentRole === 'Warehouse' || currentRole === 'Super Admin';

  // Form Penyerahan Barang State
  const [fotoPenyerahan, setFotoPenyerahan] = useState('');
  const [catatanPenyerahan, setCatatanPenyerahan] = useState('');

  // Queries
  const { data: transaksiList, isLoading: loadingTransaksi } = useQuery({
    queryKey: ['beli-part-list'],
    queryFn: api.getBeliPartList,
    refetchInterval: 8000,
  });

  const { data: antrianList } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
  });

  const antrianBeliPart = (antrianList || []).filter(
    (a) => a.tujuan_kedatangan === 'Beli Part' && a.status_kunjungan !== 'Selesai'
  );

  const { data: stokList } = useQuery({
    queryKey: ['stok-part'],
    queryFn: api.getStokPart,
  });

  // Cart Calculations
  const { rate: ppnRate } = usePpnRate();
  const subtotal = cartItems.reduce((acc, curr) => acc + curr.qty * curr.harga, 0);
  const ppn11 = ppnRate === null ? null : Math.round(subtotal * (ppnRate / 100));
  const grandTotal = ppn11 === null ? null : subtotal + ppn11;

  // Add Item to Cart
  const handleAddToCart = (part: StokSparepart) => {
    const existingIndex = cartItems.findIndex((item) => item.kode === part.kode_part);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].qty += 1;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          id_part: part.id,
          kode: part.kode_part,
          nama: part.nama_part,
          harga: Number(part.harga_jual || 0),
          qty: 1,
          stok_tersedia: part.stok,
          lokasi_rak: part.lokasi_rak || 'Rak Utama',
        },
      ]);
    }
  };

  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...cartItems];
    const newQty = updated[index].qty + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].qty = newQty;
    }
    setCartItems(updated);
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = [...cartItems];
    updated.splice(index, 1);
    setCartItems(updated);
  };

  // Mutation: Buat Transaksi Beli Part Baru
  const buatTransaksiMutation = useMutation({
    mutationFn: async () => {
      if (ppnRate === null || ppn11 === null || grandTotal === null) {
        throw new Error('Tarif PPN belum diatur — hubungi Super Admin untuk mengisi Pengaturan Sistem.');
      }
      const now = new Date();
      const estNo = `EST-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(100 + Math.random() * 900))}`;
      const prPick = `PR-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(100 + Math.random() * 900))}`;

      return {
        res: await api.buatBeliPart({
          no_transaksi: estNo,
          id_antrian: formCustomer.id_antrian,
          nama_customer: formCustomer.nama_customer || 'Pelanggan Walk-In',
          no_polisi: formCustomer.no_polisi.toUpperCase().trim(),
          no_telepon: formCustomer.no_telepon,
          no_picking_request: prPick,
          status_transaksi: 'Menunggu Approval',
          subtotal: subtotal,
          ppn_11: ppn11,
          total_biaya: grandTotal,
          lokasi_rak: undefined,
          catatan: undefined,
        }),
        estNo,
        prPick,
      };
    },
    onSuccess: async ({ res }) => {
      queryClient.invalidateQueries({ queryKey: ['beli-part-list'] });
      const rowBaru = (res as any)?.data?.[0] ?? (res as any)?.data ?? res;
      const idBaru = rowBaru?.id != null ? Number(rowBaru.id) : null;
      await publishKeCustomer({
        type: 'PART_REQUESTED',
        title: 'Estimasi Pembelian Part Menunggu Persetujuan',
        message: `Estimasi pembelian part untuk ${formCustomer.no_polisi.toUpperCase().trim()} (${formCustomer.nama_customer || 'Pelanggan Walk-In'}) menunggu persetujuan Anda di portal.`,
        linkTab: idBaru != null ? `fleet-history:part:${idBaru}` : 'fleet-history',
        urgency: 'warning',
        noPolisi: formCustomer.no_polisi.toUpperCase().trim(),
      });
      toast.success('Transaksi Estimasi Beli Part tersimpan — menunggu persetujuan pelanggan.');
      setCartItems([]);
      setFormCustomer({ id_antrian: undefined, nama_customer: '', no_polisi: '', no_telepon: '' });
      setActiveTab('transaksi');
    },
    onError: (err: any) => toast.error('Gagal membuat transaksi: ' + (err?.message || 'Coba lagi.')),
  });

  // Mutation: Selesaikan Pembayaran Kasir & Terbitkan Invoice Resmi
  const selesaikanPembayaranMutation = useMutation({
    mutationFn: async ({ item, metode }: { item: TransaksiBeliPart; metode: 'Cash' | 'Transfer Bank' | 'QRIS' | 'EDC' }) => {
      const now = new Date();
      const invNo = `INV-PART-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const sub = Number(item.subtotal ?? 0);
      const ppnStored = item.ppn_11 != null ? Number(item.ppn_11) : null;
      const ppn = ppnStored ?? (ppnRate !== null ? Math.round(sub * (ppnRate / 100)) : null);
      if (ppn === null) {
        throw new Error('Tarif PPN belum diatur — hubungi Super Admin untuk mengisi Pengaturan Sistem.');
      }
      const grand = Number(item.total_biaya ?? (sub + ppn));

      await api.buatInvoice({
        no_invoice: invNo,
        id_transaksi_beli_part: item.id,
        no_polisi: item.no_polisi,
        nama_customer: item.nama_customer,
        tanggal_invoice: now.toISOString(),
        subtotal: sub,
        ppn_nominal: ppn,
        diskon: 0,
        grand_total: grand,
        metode_pembayaran: metode,
        status_pembayaran: 'Paid',
        kasir_pic: currentUser || 'Kasir',
      });

      await api.updateBeliPartStatus({
        id: item.id,
        status_transaksi: 'Selesai',
      });

      return { invNo, item, metode };
    },
    onSuccess: async ({ invNo, item }) => {
      queryClient.invalidateQueries({ queryKey: ['beli-part-list'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      realtimeHub.publish({
        type: 'INVOICE_PAID',
        targetRoles: ['Admin Invoice', 'SA'],
        title: 'Pembayaran Part Lunas',
        message: `Faktur ${invNo} untuk pembelian part armada ${item.no_polisi} (${item.nama_customer}) telah lunas dan masuk rekap kasir.`,
        linkTab: 'kasir',
        urgency: 'success',
      });

      await publishKeCustomer({
        type: 'INVOICE_PAID',
        title: 'Pembayaran Pembelian Part Berhasil',
        message: `Faktur ${invNo} untuk pembelian sparepart telah tercatat lunas. Silakan lakukan pengambilan barang di gudang/pos.`,
        linkTab: 'fleet-status',
        urgency: 'success',
        noPolisi: item.no_polisi,
      });

      toast.success(`Pembayaran berhasil dicatat! Invoice resmi ${invNo} telah diterbitkan dan tercatat di Kasir & Keuangan.`);
      if (selectedTransaksi) {
        setSelectedTransaksi({
          ...selectedTransaksi,
          status_transaksi: 'Selesai',
        });
      }
    },
    onError: (err: any) => toast.error('Gagal memproses invoice kasir: ' + (err?.message || 'Coba lagi.')),
  });

  // Mutation: Serahkan Barang ke Customer & Terbitkan Memo Keluar Security
  const serahkanBarangMutation = useMutation({
    mutationFn: async (trx: TransaksiBeliPart) => {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const seq = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0');
      const memoNo = `MK-${yy}${mm}${dd}-${seq}`;

      await api.buatMemoKeluar({
        no_memo: memoNo,
        id_antrian: trx.id_antrian,
        id_transaksi_beli_part: trx.id,
        no_polisi: trx.no_polisi,
        jenis_armada: 'Truk / Mobil',
        nama_customer: trx.nama_customer,
        tujuan_kedatangan: 'Beli Part',
        waktu_keluar: now.toISOString(),
        status: 'Selesai',
        foto_keluar: fotoPenyerahan,
        catatan: `Barang suku cadang telah diserahkan dan lunas. ${catatanPenyerahan || ''}`,
        petugas_security: 'Pos Gerbang KIM 3',
      });

      if (trx.id_antrian) {
        await api.checkOutSecurity({
          id: trx.id_antrian,
          barang_dibawa_keluar: true,
          detail_barang_keluar: `Sparepart pembelian langsung (${trx.no_transaksi}): ${catatanPenyerahan || 'Suku Cadang'}`,
          foto_kendaraan_keluar: fotoPenyerahan,
          foto_barang: fotoPenyerahan,
          no_memo_keluar: memoNo,
        });
      }

      await api.updateBeliPartStatus({
        id: trx.id,
        status_transaksi: 'Barang Diserahkan',
        foto_penyerahan: fotoPenyerahan,
        catatan: catatanPenyerahan,
      });

      return { memoNo, trx };
    },
    onSuccess: async ({ memoNo, trx }) => {
      queryClient.invalidateQueries({ queryKey: ['beli-part-list'] });
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['memo-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      realtimeHub.publish({
        type: 'VEHICLE_CHECKED_OUT',
        targetRoles: ['Security', 'SA'],
        title: 'Memo Keluar Part Terbit',
        message: `Barang untuk ${trx.no_polisi} telah diserahkan. Memo Keluar ${memoNo} otomatis dikirim ke Pos Security.`,
        linkTab: 'security-memo',
        urgency: 'success',
      });

      await publishKeCustomer({
        type: 'VEHICLE_CHECKED_OUT',
        title: 'Pengambilan Part Selesai',
        message: `Barang untuk ${trx.no_polisi} telah diserahkan dan Memo Keluar resmi telah diterbitkan di Pos Security.`,
        linkTab: 'fleet-status',
        urgency: 'success',
        noPolisi: trx.no_polisi,
      });

      toast.success(`Barang resmi diserahkan ke Customer! Memo Keluar ${memoNo} telah dikirim ke Pos Security.`);
      setPickingStep(null);
      setActiveTab('transaksi');
    },
    onError: (err: any) => toast.error('Gagal memproses penyerahan barang: ' + (err?.message || 'Coba lagi.')),
  });

  // Mutation: Warehouse konfirmasi picking selesai
  const pickingSiapMutation = useMutation({
    mutationFn: async (trx: TransaksiBeliPart) => {
      if (!trx) throw new Error('Pilih transaksi yang akan diproses terlebih dahulu.');
      return api.updateBeliPartStatus({
        id: trx.id,
        status_transaksi: 'Barang Siap Diambil',
        lokasi_rak: lokasiRakPicking.trim() || undefined,
      });
    },
    onSuccess: (_res, trx) => {
      queryClient.invalidateQueries({ queryKey: ['beli-part-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      realtimeHub.publish({
        type: 'PART_READY',
        targetRoles: ['SA', 'Admin Invoice'],
        title: 'Barang Siap Diambil (Picking Selesai)',
        message: `Gudang telah selesai picking untuk transaksi ${trx.no_transaksi} (${trx.no_polisi} - ${trx.nama_customer}). Barang siap diambil SA di gudang${lokasiRakPicking.trim() ? ` (Rak: ${lokasiRakPicking.trim()})` : ''}.`,
        linkTab: 'beli-part',
        urgency: 'success',
      });

      toast.success(`Picking selesai! Barang untuk ${trx.no_transaksi} kini berstatus "Barang Siap Diambil".`);
      setPickingStep('serah');
    },
    onError: (err: any) => toast.error('Gagal konfirmasi picking: ' + (err?.message || 'Coba lagi.')),
  });

  // Filtered Transaksi List
  const allTransaksi = transaksiList || [];
  const totalCount = allTransaksi.length;
  const waitingApprovalCount = allTransaksi.filter(t => t.status_transaksi === 'Menunggu Approval' || t.status_transaksi === 'Estimasi Disetujui').length;
  const readyCount = allTransaksi.filter(t => t.status_transaksi === 'Barang Siap Diambil' || t.status_transaksi === 'Picking Warehouse').length;
  const selesaiCount = allTransaksi.filter(t => t.status_transaksi === 'Selesai' || t.status_transaksi === 'Barang Diserahkan').length;

  const filteredTransaksi = allTransaksi.filter((item) => {
    const q = searchFilter.toLowerCase();
    return (
      item.no_transaksi.toLowerCase().includes(q) ||
      item.no_polisi.toLowerCase().includes(q) ||
      item.nama_customer.toLowerCase().includes(q)
    );
  });

  const totalTransaksi = filteredTransaksi.length;
  const totalTransaksiPages = Math.ceil(totalTransaksi / transaksiLimit) || 1;
  const paginatedTransaksi = filteredTransaksi.slice(
    (transaksiPage - 1) * transaksiLimit,
    transaksiPage * transaksiLimit
  );

  const filteredStock = (stokList || []).filter((s) => {
    if (!partSearchQuery.trim()) return true;
    const q = partSearchQuery.toLowerCase();
    return s.nama_part.toLowerCase().includes(q) || s.kode_part.toLowerCase().includes(q);
  });

  const activeTransaksi = selectedTransaksi || filteredTransaksi[0];

  const handlePrintReceipt = (item: TransaksiBeliPart) => {
    const sub = Number(item.subtotal ?? 0);
    const ppn = item.ppn_11 != null
      ? Number(item.ppn_11)
      : (ppnRate !== null ? Math.round(sub * (ppnRate / 100)) : null);
    if (ppn === null) {
      toast.error('Tarif PPN belum diatur — hubungi Super Admin untuk mengisi Pengaturan Sistem.');
      return;
    }
    const invoiceObj: InvoicePembayaran = {
      id: item.id,
      no_invoice: `INV-PART-${item.no_transaksi}`,
      no_polisi: item.no_polisi,
      nama_customer: item.nama_customer,
      tanggal_invoice: item.created_at || new Date().toISOString(),
      subtotal: sub,
      ppn_nominal: ppn,
      diskon: 0,
      grand_total: Number(item.total_biaya ?? (sub + ppn)),
      metode_pembayaran: metodeBayarKasir,
      status_pembayaran: 'Paid',
      kasir_pic: currentUser || 'Kasir',
    };
    setPrintThermalInvoice(invoiceObj);
  };

  const handlePrintMemo = (item: TransaksiBeliPart) => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const seq = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0');
    const memoNo = `MK-${yy}${mm}${dd}-${seq}`;

    const memoObj: MemoKeluar = {
      id: item.id,
      no_memo: memoNo,
      id_antrian: item.id_antrian,
      id_transaksi_beli_part: item.id,
      no_polisi: item.no_polisi,
      nama_customer: item.nama_customer,
      jenis_armada: 'Truk / Mobil',
      tujuan_kedatangan: 'Pembelian Barang (Beli Part)',
      waktu_keluar: now.toISOString(),
      status: 'Selesai',
      catatan: `Barang bawaan suku cadang telah diserahkan dan lunas (${item.catatan || 'Sparepart Resmi'}).`,
      petugas_security: '( Petugas Security )',
    };
    setPrintMemoModal(memoObj);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <SectionHeader 
        title="Penjualan Part Langsung"
        description="Alur penjualan sparepart bengkel tanpa workshop service: Masuk Pos → SA Estimasi → Gudang Picking → Kasir Faktur → Memo Keluar."
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-accent-subtle border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider">
            POS Sparepart
          </span>
        }
      />

      {/* Main Mode Tabs */}
      <div className="flex border-b border-border gap-2 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('transaksi')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'transaksi'
              ? 'border-accent text-accent bg-accent-subtle/50'
              : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-raised'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Daftar Transaksi</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-surface-raised text-ink font-semibold">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('estimasi')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'estimasi'
              ? 'border-accent text-accent bg-accent-subtle/50'
              : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-raised'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Buat Estimasi Baru (SA)</span>
          {cartItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-accent text-white font-bold">
              {cartItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('picking')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'picking'
              ? 'border-accent text-accent bg-accent-subtle/50'
              : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-raised'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Warehouse Picking &amp; Serah</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DAFTAR TRANSAKSI BELI PART                        */}
      {/* ======================================================== */}
      {activeTab === 'transaksi' && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <StatCard
              title="Total Transaksi"
              value={totalCount}
              subtitle="Seluruh order suku cadang"
              icon={Receipt}
              tone="accent"
            />
            <StatCard
              title="Menunggu Approval"
              value={waitingApprovalCount}
              subtitle="Persetujuan customer"
              icon={Clock}
              tone="amber"
            />
            <StatCard
              title="Siap Diambil"
              value={readyCount}
              subtitle="Picking gudang selesai"
              icon={PackageCheck}
              tone="blue"
            />
            <StatCard
              title="Selesai / Lunas"
              value={selesaiCount}
              subtitle="Faktur & memo terbit"
              icon={CheckCircle2}
              tone="green"
            />
          </div>

          <div className="card-modern p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink tracking-tight">Histori Transaksi Pembelian</h2>
                <p className="text-xs text-ink-muted">Daftar order sparepart langsung pelanggan &amp; armada</p>
              </div>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nopol / transaksi..."
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    setTransaksiPage(1);
                  }}
                  className="pl-9 pr-3.5 py-2 rounded-xl border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none w-64 text-ink"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-raised text-ink-muted border-y border-border">
                  <tr>
                    <th className="py-3 px-3.5 font-semibold">No. Transaksi</th>
                    <th className="py-3 px-3.5 font-semibold">No. Polisi</th>
                    <th className="py-3 px-3.5 font-semibold">Customer</th>
                    <th className="py-3 px-3.5 font-semibold text-right">Total Biaya</th>
                    <th className="py-3 px-3.5 font-semibold text-center">Status</th>
                    <th className="py-3 px-3.5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {paginatedTransaksi.length > 0 ? (
                    paginatedTransaksi.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedTransaksi(item)}
                        className="cursor-pointer hover:bg-surface-raised/80 transition-colors"
                      >
                        <td className="py-3.5 px-3.5 font-mono font-bold text-accent">{item.no_transaksi}</td>
                        <td className="py-3.5 px-3.5 font-bold text-ink">{item.no_polisi}</td>
                        <td className="py-3.5 px-3.5 text-ink-muted">{item.nama_customer || '-'}</td>
                        <td className="py-3.5 px-3.5 text-right font-mono font-bold text-ink">
                          Rp {Number(item.total_biaya || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-3.5 text-center">
                          <StatusBadge status={item.status_transaksi} size="sm" />
                        </td>
                        <td className="py-3.5 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransaksi(item);
                            }}
                            className="px-3 py-1.5 bg-surface-raised hover:bg-surface text-ink font-semibold rounded-lg border border-border text-xs transition-colors"
                          >
                            Detail →
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <EmptyState
                          icon={Receipt}
                          title="Belum Ada Transaksi"
                          description="Belum ada transaksi beli part yang cocok dengan pencarian."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="sm:hidden space-y-3">
              {paginatedTransaksi.length > 0 ? (
                paginatedTransaksi.map((item) => (
                  <ListItemCard
                    key={item.id}
                    title={item.no_transaksi}
                    subtitle={`${item.no_polisi} • ${item.nama_customer || 'Pelanggan Umum'}`}
                    badge={<StatusBadge status={item.status_transaksi} size="sm" />}
                    chips={[
                      `Rp ${Number(item.total_biaya || 0).toLocaleString('id-ID')}`,
                      item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'
                    ]}
                    onClick={() => setSelectedTransaksi(item)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={Receipt}
                  title="Belum Ada Transaksi"
                  description="Belum ada transaksi beli part yang tercatat."
                />
              )}
            </div>

            {/* Pagination Bar */}
            <PaginationBar
              page={transaksiPage}
              totalPages={totalTransaksiPages}
              totalRecords={totalTransaksi}
              limit={transaksiLimit}
              onPageChange={setTransaksiPage}
              onLimitChange={(l) => {
                setTransaksiLimit(l);
                setTransaksiPage(1);
              }}
              label="transaksi"
              isLoading={loadingTransaksi}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: KATALOG SPAREPART & ESTIMASI BARU (SA POS)       */}
      {/* ======================================================== */}
      {activeTab === 'estimasi' && (
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Customer & Vehicle Header Box */}
          <div className="card-modern p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">1. Data Pelanggan &amp; Unit Kendaraan</h3>
                <p className="text-xs text-ink-muted">Pilih armada dari gerbang atau input nama pembeli sparepart</p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-accent-subtle text-accent font-bold text-xs border border-accent/20">
                Service Advisor POS
              </span>
            </div>

            {/* Dropdown Antrean Gerbang Security */}
            <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-accent" />
                  <span>Pilih dari Antrean Gerbang Pos Security:</span>
                </label>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-subtle text-accent">
                  {antrianBeliPart.length} Menunggu di Pos
                </span>
              </div>
              <select
                value={formCustomer.id_antrian || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setFormCustomer(prev => ({
                      ...prev,
                      id_antrian: undefined,
                      no_polisi: '',
                      nama_customer: '',
                      no_telepon: '',
                    }));
                    return;
                  }
                  const selected = antrianBeliPart.find(a => a.id === Number(val));
                  if (selected) {
                    setFormCustomer(prev => ({
                      ...prev,
                      id_antrian: selected.id,
                      no_polisi: selected.no_polisi,
                      nama_customer: selected.nama_customer || '',
                      no_telepon: selected.no_hp_customer || '',
                    }));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border font-semibold text-xs bg-surface-raised text-ink focus:ring-2 focus:ring-accent focus:outline-none cursor-pointer"
              >
                <option value="">-- Pilih Armada Antrean Gerbang atau Ketik Manual di Bawah --</option>
                {antrianBeliPart.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.no_polisi} - {a.nama_customer || 'Pelanggan'} ({new Date(a.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  Nomor Polisi <span className="text-status-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BK 5678 CD"
                  value={formCustomer.no_polisi}
                  onChange={(e) => setFormCustomer({ ...formCustomer, no_polisi: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border font-bold uppercase text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  Nama Customer / PT <span className="text-status-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama pembeli / fleet..."
                  value={formCustomer.nama_customer}
                  onChange={(e) => setFormCustomer({ ...formCustomer, nama_customer: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-semibold bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">No. WhatsApp / HP</label>
                <input
                  type="text"
                  placeholder="0812-xxxx-xxxx"
                  value={formCustomer.no_telepon}
                  onChange={(e) => setFormCustomer({ ...formCustomer, no_telepon: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-mono bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none text-ink"
                />
              </div>
            </div>
          </div>

          {/* Cart Box (Barang yang Dipilih) */}
          <div className="card-modern p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">2. Keranjang Sparepart Pesanan</h3>
                <p className="text-xs text-ink-muted">Sesuaikan jenis barang dan kuantitas</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-surface-raised border border-border text-ink-muted">
                {cartItems.length} Item Terpilih
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowKatalogModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Barang dari Katalog Gudang</span>
            </button>

            {cartItems.length > 0 ? (
              <div className="divide-y border-border border rounded-xl overflow-hidden">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between bg-surface-raised text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-ink truncate">{item.nama}</div>
                      <div className="text-xs text-ink-muted font-mono flex items-center gap-2 mt-0.5">
                        <span>Kode: {item.kode}</span>
                        <span>•</span>
                        <span>Rak: {item.lokasi_rak || 'Gudang'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Qty Controls */}
                      <div className="flex items-center border border-border rounded-lg bg-surface overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, -1)}
                          className="p-1.5 hover:bg-surface-raised text-ink-muted transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 font-bold font-mono text-xs text-ink">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, 1)}
                          className="p-1.5 hover:bg-surface-raised text-ink-muted transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Subtotal Item */}
                      <div className="w-24 text-right font-mono font-bold text-ink text-xs">
                        Rp {(item.qty * item.harga).toLocaleString('id-ID')}
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(idx)}
                        className="p-1.5 text-ink-subtle hover:text-status-red transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-ink-subtle text-xs border border-dashed border-border rounded-xl">
                Keranjang belanja masih kosong. Klik "Tambah Barang dari Katalog Gudang" untuk memilih suku cadang.
              </div>
            )}

            {/* Total Calculation & Submit Box */}
            <div className="p-4 bg-surface rounded-xl border border-border space-y-2 text-xs">
              {ppnRate === null && (
                <p className="text-xs text-status-red font-bold text-center">
                  Tarif PPN belum diatur — hubungi Super Admin untuk mengisi Pengaturan Sistem sebelum transaksi.
                </p>
              )}
              <div className="flex justify-between text-ink-muted font-medium">
                <span>Subtotal Sparepart:</span>
                <span className="font-mono font-bold text-ink">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-ink-muted font-medium">
                <span>PPN{ppnRate !== null ? ` (${ppnRate}%)` : ''}:</span>
                <span className="font-mono font-bold text-ink">Rp {ppn11 !== null ? ppn11.toLocaleString('id-ID') : '-'}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-ink pt-2 border-t border-border">
                <span>Total Estimasi Biaya:</span>
                <span className="font-mono font-bold text-accent text-base">
                  Rp {grandTotal !== null ? grandTotal.toLocaleString('id-ID') : '-'}
                </span>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('transaksi')}
                className="py-2.5 px-5 bg-surface hover:bg-surface-raised border border-border text-ink-muted font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={buatTransaksiMutation.isPending || cartItems.length === 0 || ppnRate === null || !formCustomer.no_polisi.trim()}
                onClick={() => buatTransaksiMutation.mutate()}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {buatTransaksiMutation.isPending ? 'Menyimpan...' : 'Kirim Estimasi ke Customer →'}
              </button>
            </div>

          </div>

          {/* MODAL: Katalog Sparepart Picker */}
          {showKatalogModal && (
            <ModalPortal onClose={() => setShowKatalogModal(false)}>
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto">
                <div className="bg-surface-raised rounded-t-2xl sm:rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-border my-0 sm:my-8 max-h-[92vh] sm:max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-4 shrink-0">
                    <div>
                      <span className="text-xs uppercase font-bold text-accent">Katalog Gudang</span>
                      <h3 className="text-base font-bold text-ink">Pilih Suku Cadang</h3>
                      <p className="text-xs text-ink-muted">{cartItems.length} item di keranjang saat ini</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKatalogModal(false)}
                      className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface transition-colors shrink-0"
                      aria-label="Tutup katalog"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="overflow-y-auto space-y-4 pr-0.5">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Ketik kode part atau nama barang..."
                        value={partSearchQuery}
                        onChange={(e) => setPartSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none text-ink"
                      />
                    </div>

                    <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                      {filteredStock && filteredStock.length > 0 ? (
                        filteredStock.map((part) => (
                          <div
                            key={part.id}
                            className="p-3 rounded-xl border border-border hover:border-accent/40 bg-surface hover:bg-surface-raised transition-all flex items-center justify-between text-xs gap-3"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-ink truncate">{part.nama_part}</div>
                              <div className="text-xs text-ink-muted font-mono mt-0.5">
                                {part.kode_part} • Stok: <strong className="text-status-green">{part.stok} {part.satuan}</strong>
                              </div>
                              <div className="text-xs font-mono font-bold text-ink mt-1">
                                Rp {Number(part.harga_jual || 0).toLocaleString('id-ID')}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddToCart(part)}
                              className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold text-xs shadow-xs shrink-0 cursor-pointer flex items-center gap-1 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" /> Tambah
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-ink-subtle text-xs">
                          Tidak ada sparepart yang sesuai dengan kata kunci.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ModalPortal>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: WAREHOUSE PICKING & PENYERAHAN BARANG             */}
      {/* ======================================================== */}
      {activeTab === 'picking' && (
        <div className="space-y-6">
          <div className="card-modern p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1.5">
                Pilih Transaksi yang Akan Diproses Gudang:
              </label>
              <select
                value={activeTransaksi?.id || ''}
                onChange={(e) => {
                  const found = (transaksiList || []).find((t) => t.id === Number(e.target.value));
                  setSelectedTransaksi(found || null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-bold bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              >
                <option value="">-- Pilih Transaksi Beli Part --</option>
                {(transaksiList || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.no_transaksi} — {t.no_polisi} ({t.status_transaksi})
                  </option>
                ))}
              </select>
            </div>

            {activeTransaksi ? (
              <div className="p-4 bg-surface rounded-xl border border-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <span className="text-xs uppercase font-bold text-accent">Status Transaksi</span>
                    <h3 className="text-base font-bold text-ink">
                      {activeTransaksi.no_transaksi} • {activeTransaksi.no_polisi}
                    </h3>
                    <p className="text-xs text-ink-muted">{activeTransaksi.nama_customer || 'Pelanggan Umum'}</p>
                  </div>
                  <StatusBadge status={activeTransaksi.status_transaksi} size="md" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={pickingSiapMutation.isPending || !bolehKelolaGudang || !['Picking Warehouse', 'Estimasi Disetujui'].includes(activeTransaksi.status_transaksi)}
                    onClick={() => { setLokasiRakPicking(activeTransaksi?.lokasi_rak || ''); setPickingStep('picking'); }}
                    className="py-3 px-4 bg-status-amber hover:bg-status-amber/90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>1. Proses Picking Barang</span>
                  </button>

                  <button
                    type="button"
                    disabled={serahkanBarangMutation.isPending || !bolehKelolaGudang}
                    onClick={() => setPickingStep('serah')}
                    className="py-3 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>2. Serahkan Barang &amp; Memo Keluar</span>
                  </button>
                </div>

                {!bolehKelolaGudang && (
                  <p className="text-xs text-ink-subtle text-center pt-1">
                    Picking &amp; penyerahan barang khusus peran Warehouse atau Super Admin.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-ink-subtle">
                Pilih salah satu transaksi beli part di atas untuk memproses picking atau penyerahan barang.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DETAIL MODAL: DETAIL TRANSAKSI & PEMBAYARAN KASIR        */}
      {/* ======================================================== */}
      {selectedTransaksi && (
        <DetailModal
          open={true}
          onClose={() => setSelectedTransaksi(null)}
          title={selectedTransaksi.no_transaksi}
          subtitle={`${selectedTransaksi.no_polisi} • ${selectedTransaksi.nama_customer || 'Pelanggan Umum'}`}
          badge={<StatusBadge status={selectedTransaksi.status_transaksi} size="sm" />}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={() => setSelectedTransaksi(null)}
                className="px-4 py-2 rounded-xl border border-border text-ink font-semibold text-xs hover:bg-surface-raised transition-colors"
              >
                Tutup
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(selectedTransaksi)}
                  className="px-3.5 py-2 rounded-xl border border-border text-ink hover:bg-surface-raised font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5 text-ink-subtle" />
                  <span>Struk (80mm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintMemo(selectedTransaksi)}
                  className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Surat Jalan</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Informasi Transaksi */}
            <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-subtle">No. Picking Request:</span>
                <span className="font-mono font-bold text-ink">{selectedTransaksi.no_picking_request || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Lokasi Rak Gudang:</span>
                <span className="font-bold text-ink">{selectedTransaksi.lokasi_rak || 'Rak Utama'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Kontak Telepon:</span>
                <span className="font-semibold text-ink">{selectedTransaksi.no_telepon || '-'}</span>
              </div>
            </div>

            {/* Rincian Biaya */}
            <div className="p-4 bg-surface-raised rounded-xl border border-border space-y-2 font-medium">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal Barang:</span>
                <span className="font-mono font-bold text-ink">
                  Rp {selectedTransaksi.subtotal != null ? Number(selectedTransaksi.subtotal).toLocaleString('id-ID') : '-'}
                </span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>PPN{ppnRate !== null ? ` (${ppnRate}%)` : ''}:</span>
                <span className="font-mono font-bold text-ink">
                  Rp {selectedTransaksi.ppn_11 != null ? Number(selectedTransaksi.ppn_11).toLocaleString('id-ID') : '-'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-ink pt-2 border-t border-border">
                <span>Total Biaya:</span>
                <span className="font-mono font-bold text-accent text-base">
                  Rp {Number(selectedTransaksi.total_biaya || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Pembayaran Kasir & Penerbitan Invoice Resmi */}
            <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-accent" />
                  Status Kasir &amp; Faktur
                </span>
                {selectedTransaksi.status_transaksi === 'Selesai' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-status-green-bg text-status-green text-xs font-bold">
                    Lunas
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-status-amber-bg text-status-amber text-xs font-bold">
                    Menunggu Pembayaran
                  </span>
                )}
              </div>

              {selectedTransaksi.status_transaksi !== 'Selesai' && bolehBayarKasir ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-ink-muted mb-1.5">Metode Pembayaran:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Cash', 'Transfer Bank', 'QRIS', 'EDC'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMetodeBayarKasir(m)}
                          className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            metodeBayarKasir === m
                              ? 'border-accent bg-accent-subtle text-accent shadow-xs'
                              : 'bg-surface-raised text-ink-muted border-border hover:border-accent/40'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={selesaikanPembayaranMutation.isPending}
                    onClick={() => selesaikanPembayaranMutation.mutate({ item: selectedTransaksi, metode: metodeBayarKasir })}
                    className="w-full py-2.5 bg-status-green hover:bg-status-green/90 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{selesaikanPembayaranMutation.isPending ? 'Menerbitkan Invoice Kasir...' : 'Bayar & Terbitkan Invoice Kasir'}</span>
                  </button>
                </div>
              ) : selectedTransaksi.status_transaksi === 'Selesai' ? (
                <div className="p-3 bg-status-green-bg rounded-xl border border-status-green/30 text-status-green text-xs flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 shrink-0" />
                  <span>Faktur pembelian part resmi telah lunas dan terdaftar di Kasir.</span>
                </div>
              ) : null}
            </div>
          </div>
        </DetailModal>
      )}

      {/* Picking Modal */}
      {pickingStep === 'picking' && activeTransaksi && (
        <ModalPortal onClose={() => setPickingStep(null)}>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto">
            <div className="bg-surface-raised rounded-t-2xl sm:rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-border my-0 sm:my-8 flex flex-col">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4 shrink-0">
                <div>
                  <span className="text-xs uppercase font-bold text-accent">Gudang KIM 3</span>
                  <h3 className="text-base font-bold text-ink">Konfirmasi Picking Part</h3>
                  <p className="text-xs text-ink-muted">{activeTransaksi.no_transaksi} • {activeTransaksi.no_polisi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickingStep(null)}
                  className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Lokasi Rak Pengambilan:</label>
                  <input
                    type="text"
                    value={lokasiRakPicking}
                    onChange={(e) => setLokasiRakPicking(e.target.value)}
                    placeholder={activeTransaksi?.lokasi_rak || 'Rak Utama Bengkel'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border font-bold text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none text-ink"
                  />
                </div>

                <div className="p-3 bg-surface rounded-xl border border-border text-ink-muted">
                  {activeTransaksi?.catatan || 'Pesanan suku cadang langsung siap diserahkan ke pelanggan.'}
                </div>

                <button
                  type="button"
                  disabled={pickingSiapMutation.isPending || !['Picking Warehouse', 'Estimasi Disetujui'].includes(activeTransaksi.status_transaksi)}
                  onClick={() => pickingSiapMutation.mutate(activeTransaksi)}
                  className="w-full py-2.5 bg-status-green hover:bg-status-green/90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{pickingSiapMutation.isPending ? 'Mengonfirmasi...' : 'Konfirmasi Barang Selesai Picking'}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Serah Terima Modal */}
      {pickingStep === 'serah' && activeTransaksi && (
        <ModalPortal onClose={() => setPickingStep(null)}>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto">
            <div className="bg-surface-raised rounded-t-2xl sm:rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-border my-0 sm:my-8 flex flex-col">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4 shrink-0">
                <div>
                  <span className="text-xs uppercase font-bold text-accent">Penyerahan Barang</span>
                  <h3 className="text-base font-bold text-ink">Serahkan ke Customer</h3>
                  <p className="text-xs text-ink-muted">{activeTransaksi.no_transaksi} • {activeTransaksi.no_polisi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickingStep(null)}
                  className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <PhotoUploader
                  label="Foto Bukti Penyerahan Barang (Kamera / File)"
                  value={fotoPenyerahan}
                  onChange={(url) => setFotoPenyerahan(url)}
                />

                <div>
                  <label className="block text-xs font-bold text-ink-muted mb-1">Catatan Penyerahan:</label>
                  <input
                    type="text"
                    placeholder="Kondisi barang baik dan sesuai pesanan..."
                    value={catatanPenyerahan}
                    onChange={(e) => setCatatanPenyerahan(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none text-ink"
                  />
                </div>

                <button
                  type="button"
                  disabled={serahkanBarangMutation.isPending}
                  onClick={() => {
                    const belumLunas = activeTransaksi.status_transaksi !== 'Selesai';
                    const tanpaFoto = !fotoPenyerahan;
                    if (belumLunas || tanpaFoto) {
                      setShowSerahWarning(true);
                      return;
                    }
                    serahkanBarangMutation.mutate(activeTransaksi);
                  }}
                  className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {serahkanBarangMutation.isPending 
                      ? 'Menerbitkan Memo Keluar...' 
                      : 'Konfirmasi Serah Terima & Terbitkan Memo Keluar'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Printable Modals */}
      {printThermalInvoice && (
        <PrintThermalInvoiceModal
          invoice={printThermalInvoice}
          onClose={() => setPrintThermalInvoice(null)}
        />
      )}

      {printMemoModal && (
        <PrintMemoKeluarModal
          memo={printMemoModal}
          onClose={() => setPrintMemoModal(null)}
        />
      )}

      {/* Peringatan non-blokir serah-terima */}
      {showSerahWarning && activeTransaksi && (
        <ConfirmModal
          title={`Perhatian sebelum serah-terima ${activeTransaksi.no_transaksi}`}
          message={[
            ...(activeTransaksi.status_transaksi !== 'Selesai'
              ? [`Status "${activeTransaksi.status_transaksi}" (belum lunas di Kasir)`]
              : []),
            ...(!fotoPenyerahan ? ['Foto penyerahan belum diunggah'] : []),
            'Lanjutkan serah-terima?',
          ]}
          confirmLabel="Tetap Serahkan"
          cancelLabel="Periksa Dulu"
          tone="amber"
          isPending={serahkanBarangMutation.isPending}
          onClose={() => setShowSerahWarning(false)}
          onConfirm={() => {
            setShowSerahWarning(false);
            if (activeTransaksi) serahkanBarangMutation.mutate(activeTransaksi);
          }}
        />
      )}

    </div>
  );
};

export default BeliPartView;
