import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { realtimeHub } from '../services/realtimeService';
import { StatusBadge } from '../components/common/StatusBadge';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { TransaksiBeliPart, StokSparepart, InvoicePembayaran, MemoKeluar, AntrianKunjungan } from '../types';
import { PrintThermalInvoiceModal } from '../components/print/PrintThermalInvoiceModal';
import { PrintMemoKeluarModal } from '../components/print/PrintMemoKeluarModal';
import { 
  Package, 
  PlusCircle, 
  Check, 
  X, 
  ShoppingBag, 
  ArrowRight, 
  Camera, 
  Receipt, 
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  Building2,
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

export const BeliPartView: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'transaksi' | 'estimasi' | 'picking'>('transaksi');
  const [selectedTransaksi, setSelectedTransaksi] = useState<TransaksiBeliPart | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [partSearchQuery, setPartSearchQuery] = useState('');
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
    lokasi_rak: 'Rak A-02, Rak B-01, Rak C-03',
    catatan: 'Permintaan pembelian suku cadang langsung tanpa servis.',
  });

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { kode: 'SP-001', nama: 'Brake Pad Hino Dutro (Depan)', harga: 450000, qty: 2, stok_tersedia: 6, lokasi_rak: 'Rak A-02' },
    { kode: 'SP-045', nama: 'Oli Mesin Rimula R4 10W-40 (4L)', harga: 380000, qty: 4, stok_tersedia: 12, lokasi_rak: 'Rak B-01' },
    { kode: 'SP-078', nama: 'Filter Oli Canter / Dutro', harga: 85000, qty: 1, stok_tersedia: 3, lokasi_rak: 'Rak C-03' },
  ]);

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

  const { data: pelangganList } = useQuery({
    queryKey: ['pelanggan-list'],
    queryFn: api.getPelanggan,
  });

  const { data: kendaraanList } = useQuery({
    queryKey: ['kendaraan-list'],
    queryFn: api.getKendaraan,
  });

  // Cart Calculations
  const subtotal = cartItems.reduce((acc, curr) => acc + curr.qty * curr.harga, 0);
  const ppn11 = Math.round(subtotal * 0.11);
  const grandTotal = subtotal + ppn11;

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
      const now = new Date();
      const estNo = `EST-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(100 + Math.random() * 900))}`;
      const prPick = `PR-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(100 + Math.random() * 900))}`;

      return api.buatBeliPart({
        no_transaksi: estNo,
        id_antrian: formCustomer.id_antrian,
        nama_customer: formCustomer.nama_customer || 'Pelanggan Walk-In',
        no_polisi: formCustomer.no_polisi.toUpperCase().trim(),
        no_telepon: formCustomer.no_telepon,
        no_picking_request: prPick,
        status_transaksi: 'Picking Warehouse',
        subtotal: subtotal,
        ppn_11: ppn11,
        total_biaya: grandTotal,
        lokasi_rak: formCustomer.lokasi_rak,
        catatan: formCustomer.catatan,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beli-part-list'] });
      alert('Transaksi Estimasi Beli Part berhasil dibuat & diteruskan ke Warehouse Picking!');
      setActiveTab('transaksi');
    },
    onError: (err: any) => alert('Gagal membuat transaksi: ' + (err?.message || 'Coba lagi.')),
  });

  // Mutation: Selesaikan Pembayaran Kasir & Terbitkan Invoice Resmi
  const selesaikanPembayaranMutation = useMutation({
    mutationFn: async ({ item, metode }: { item: TransaksiBeliPart; metode: 'Cash' | 'Transfer Bank' | 'QRIS' | 'EDC' }) => {
      const now = new Date();
      const invNo = `INV-PART-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

      // 1. Panggil api.buatInvoice agar masuk rekap kasir & keuangan
      await api.buatInvoice({
        no_invoice: invNo,
        id_transaksi_beli_part: item.id,
        no_polisi: item.no_polisi,
        nama_customer: item.nama_customer,
        tanggal_invoice: now.toISOString(),
        subtotal: Number(item.subtotal || item.total_biaya * 0.89),
        ppn_nominal: Number(item.ppn_11 || item.total_biaya * 0.11),
        diskon: 0,
        grand_total: Number(item.total_biaya),
        metode_pembayaran: metode,
        status_pembayaran: 'Paid',
        kasir_pic: currentUser || 'Kasir',
      });

      // 2. Update status transaksi beli part
      await api.updateBeliPartStatus({
        id: item.id,
        status_transaksi: 'Selesai',
      });

      return { invNo, item, metode };
    },
    onSuccess: ({ invNo, item }) => {
      queryClient.invalidateQueries({ queryKey: ['beli-part-list'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      realtimeHub.publish({
        type: 'INVOICE_PAID',
        targetRoles: ['Admin Invoice', 'SA', 'Customer Fleet'],
        title: 'Pembayaran Part Lunas',
        message: `Faktur ${invNo} untuk pembelian part armada ${item.no_polisi} (${item.nama_customer}) telah lunas dan masuk rekap kasir.`,
        linkTab: 'kasir',
        urgency: 'success',
      });

      alert(`Pembayaran berhasil dicatat!\n\nInvoice resmi ${invNo} telah diterbitkan dan tercatat di Kasir & Keuangan.`);
    },
    onError: (err: any) => alert('Gagal memproses invoice kasir: ' + (err?.message || 'Coba lagi.')),
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

      // 1. Buat Memo Keluar resmi
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

      // 2. Check out antrian di security jika ada id_antrian
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

      // 3. Update status transaksi beli part
      await api.updateBeliPartStatus({
        id: trx.id,
        status_transaksi: 'Barang Diserahkan',
        foto_penyerahan: fotoPenyerahan,
        catatan: catatanPenyerahan,
      });

      return { memoNo, trx };
    },
    onSuccess: ({ memoNo, trx }) => {
      queryClient.invalidateQueries({ queryKey: ['beli-part-list'] });
      queryClient.invalidateQueries({ queryKey: ['antrian-list'] });
      queryClient.invalidateQueries({ queryKey: ['memo-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      realtimeHub.publish({
        type: 'VEHICLE_CHECKED_OUT',
        targetRoles: ['Security', 'SA', 'Customer Fleet'],
        title: 'Memo Keluar Part Terbit',
        message: `Barang untuk ${trx.no_polisi} telah diserahkan. Memo Keluar ${memoNo} otomatis dikirim ke Pos Security.`,
        linkTab: 'security-memo',
        urgency: 'success',
      });

      alert(`Barang resmi diserahkan ke Customer!\n\nMemo Keluar resmi ${memoNo} telah diterbitkan dan dikirimkan ke Pos Security untuk validasi gerbang.`);
      setActiveTab('transaksi');
    },
    onError: (err: any) => alert('Gagal memproses penyerahan barang: ' + (err?.message || 'Coba lagi.')),
  });

  // Filtered Transaksi List
  const filteredTransaksi = (transaksiList || []).filter((item) => {
    const q = searchFilter.toLowerCase();
    return (
      item.no_transaksi.toLowerCase().includes(q) ||
      item.no_polisi.toLowerCase().includes(q) ||
      item.nama_customer.toLowerCase().includes(q)
    );
  });

  // Filtered Stock Search for POS
  const filteredStock = (stokList || []).filter((s) => {
    if (!partSearchQuery.trim()) return true;
    const q = partSearchQuery.toLowerCase();
    return s.nama_part.toLowerCase().includes(q) || s.kode_part.toLowerCase().includes(q);
  });

  const activeTransaksi = selectedTransaksi || filteredTransaksi[0];

  // Helper function to create thermal invoice object on the fly for printing
  const handlePrintReceipt = (item: TransaksiBeliPart) => {
    const invoiceObj: InvoicePembayaran = {
      id: item.id,
      no_invoice: `INV-PART-${item.no_transaksi}`,
      no_polisi: item.no_polisi,
      nama_customer: item.nama_customer,
      tanggal_invoice: item.created_at || new Date().toISOString(),
      subtotal: item.subtotal || item.total_biaya * 0.89,
      ppn_nominal: item.ppn_11 || item.total_biaya * 0.11,
      diskon: 0,
      grand_total: item.total_biaya,
      metode_pembayaran: metodeBayarKasir,
      status_pembayaran: 'Paid',
      kasir_pic: currentUser || 'Kasir',
    };
    setPrintThermalInvoice(invoiceObj);
  };

  // Helper function to create gate pass memo keluar on the fly for printing
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
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Penjualan Part Langsung</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-[10px] font-black uppercase tracking-wider">
                Tanpa Service Workshop
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Alur Masuk → SA Estimasi & Approval → Warehouse Picking → Penyerahan → Kasir Faktur → Memo Keluar
            </p>
          </div>
        </div>

        {/* Action Button & Sub-tab Pill Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('transaksi')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'transaksi'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Transaksi ({filteredTransaksi.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('estimasi')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'estimasi'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Estimasi & POS Baru
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('picking')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'picking'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Warehouse Picking
            </button>
          </div>
        </div>
      </div>

      {/* 8-Step Interactive Alur Timeline Banner (image2.png Flow Header) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[820px] text-center text-xs">
          {[
            { step: 1, title: 'Masuk Bengkel', pic: 'Security', active: true },
            { step: 2, title: 'Bertemu SA', pic: 'SA', active: true },
            { step: 3, title: 'Estimasi & Approval', pic: 'Customer', active: true },
            { step: 4, title: 'Pengadaan Barang', pic: 'Warehouse', active: true },
            { step: 5, title: 'Barang Siap', pic: 'Warehouse', active: true },
            { step: 6, title: 'Penyerahan Barang', pic: 'SA', active: true },
            { step: 7, title: 'Invoice & Payment', pic: 'Kasir', active: true },
            { step: 8, title: 'Keluar Bengkel', pic: 'Security', active: true },
          ].map((item, idx) => (
            <div key={item.step} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs mb-1.5 shadow-xs transition-all ${
                  item.step <= 4
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {item.step}
                </div>
                <div className="font-bold text-slate-800 text-[11px] leading-tight">{item.title}</div>
                <div className="text-[10px] text-slate-400 font-medium">{item.pic}</div>
              </div>
              {idx < 7 && <div className="w-6 sm:w-10 h-0.5 bg-slate-200"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DAFTAR TRANSAKSI BELI PART & DETAIL SPLIT VIEW   */}
      {/* ======================================================== */}
      {activeTab === 'transaksi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: List Transaksi (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900">Daftar Transaksi Pembelian Barang</h2>
                <p className="text-xs text-slate-500">Histori dan status berjalan penjualan langsung sparepart</p>
              </div>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nopol / transaksi..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">No. Transaksi</th>
                    <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                    <th className="py-2.5 px-3 font-semibold">Customer</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total Biaya</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransaksi.length > 0 ? (
                    filteredTransaksi.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedTransaksi(item)}
                        className={`cursor-pointer transition-colors ${
                          activeTransaksi?.id === item.id ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-blue-600">{item.no_transaksi}</td>
                        <td className="py-3 px-3 font-black text-slate-900">{item.no_polisi}</td>
                        <td className="py-3 px-3 text-slate-700">{item.nama_customer}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          Rp {Number(item.total_biaya || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={item.status_transaksi} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-600 rounded-lg border border-slate-200 font-bold text-[11px]"
                          >
                            Detail →
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada transaksi beli part yang tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Detail Transaksi Aktif & Cetak Struk */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
            {activeTransaksi ? (
              <div className="space-y-4 text-xs">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-600">Detail Pembelian</span>
                    <h3 className="text-base font-black text-slate-900">{activeTransaksi.no_transaksi}</h3>
                    <p className="text-xs text-slate-500 font-medium">{activeTransaksi.no_polisi} • {activeTransaksi.nama_customer}</p>
                  </div>
                  <StatusBadge status={activeTransaksi.status_transaksi} size="md" />
                </div>

                {/* Info Card */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">No. Picking Gudang:</span>
                    <span className="font-mono font-bold text-slate-700">{activeTransaksi.no_picking_request || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lokasi Rak Gudang:</span>
                    <span className="font-bold text-slate-800">{activeTransaksi.lokasi_rak || 'Rak Utama'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kontak Pembeli:</span>
                    <span className="font-medium text-slate-800">{activeTransaksi.no_telepon || '-'}</span>
                  </div>
                </div>

                {/* Ringkasan Biaya */}
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-1.5 font-semibold">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Barang:</span>
                    <span className="font-mono">Rp {Number(activeTransaksi.subtotal || activeTransaksi.total_biaya * 0.89).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>PPN 11%:</span>
                    <span className="font-mono">Rp {Number(activeTransaksi.ppn_11 || activeTransaksi.total_biaya * 0.11).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 text-sm font-black pt-2 border-t border-blue-200">
                    <span>Total Tagihan:</span>
                    <span className="font-mono text-blue-700">Rp {Number(activeTransaksi.total_biaya).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Pembayaran Kasir & Penerbitan Invoice Resmi */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      Status Pembayaran &amp; Faktur Kasir
                    </span>
                    {activeTransaksi.status_transaksi === 'Selesai' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        LUNAS (INVOICE TERBIT)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                        MENUNGGU PEMBAYARAN KASIR
                      </span>
                    )}
                  </div>

                  {activeTransaksi.status_transaksi !== 'Selesai' ? (
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Pilih Metode Pembayaran:</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['Cash', 'Transfer Bank', 'QRIS', 'EDC'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMetodeBayarKasir(m)}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                metodeBayarKasir === m
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
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
                        onClick={() => selesaikanPembayaranMutation.mutate({ item: activeTransaksi, metode: metodeBayarKasir })}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{selesaikanPembayaranMutation.isPending ? 'Menerbitkan Invoice Kasir...' : 'BAYAR & TERBITKAN INVOICE KASIR'}</span>
                      </button>
                      <p className="text-[10px] text-slate-400 text-center">
                        Tagihan otomatis masuk ke rekap keuangan di menu Kasir &amp; Faktur.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Faktur pembelian part resmi telah lunas dan terdaftar di Kasir.</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Cetak Struk Thermal & Surat Jalan */}
                <div className="pt-2 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Cetak Dokumen Resmi
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt(activeTransaksi)}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Receipt className="w-4 h-4 text-emerald-400" />
                      <span>Struk Thermal 80mm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintMemo(activeTransaksi)}
                      className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Surat Jalan / Memo</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Pilih transaksi di sebelah kiri untuk melihat rincian lengkap.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: KATALOG SPAREPART & ESTIMASI BARU (SA POS)       */}
      {/* ======================================================== */}
      {activeTab === 'estimasi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Form Customer & Keranjang Belanja (2 Cols) */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Customer & Vehicle Header Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">1. Data Pelanggan & Unit Kendaraan</h3>
                  <p className="text-xs text-slate-500">Pilih armada dari gerbang atau input nama pembeli sparepart langsung</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                  Langkah 2: Service Advisor
                </span>
              </div>

              {/* Dropdown Antrean Gerbang Security */}
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    Pilih Armada dari Antrean Gerbang (Security Check-in):
                  </label>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-200 text-blue-800">
                    {antrianBeliPart.length} Menunggu di Gerbang
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 font-bold text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Pilih Armada Antrean Gerbang atau Ketik Manual di Bawah --</option>
                  {antrianBeliPart.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.no_polisi} - {a.nama_customer || 'Pelanggan'} ({new Date(a.waktu_masuk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB) - {a.keperluan || 'Beli Part'}
                    </option>
                  ))}
                </select>
                {antrianBeliPart.length === 0 && (
                  <p className="text-[11px] text-blue-700/80 italic">
                    Belum ada armada berstatus "Beli Part" di pos gerbang saat ini. Anda dapat menginput plat nomor secara manual di bawah.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Polisi <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BK 5678 CD"
                    value={formCustomer.no_polisi}
                    onChange={(e) => setFormCustomer({ ...formCustomer, no_polisi: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold uppercase text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Customer / Perusahaan <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT. Sumber Makmur"
                    value={formCustomer.nama_customer}
                    onChange={(e) => setFormCustomer({ ...formCustomer, nama_customer: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={formCustomer.no_telepon}
                    onChange={(e) => setFormCustomer({ ...formCustomer, no_telepon: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Cart Box (Barang yang Dipilih) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">2. Keranjang Sparepart yang Dipesan</h3>
                  <p className="text-xs text-slate-500">Sesuaikan kuantitas pemesanan barang</p>
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {cartItems.length} Item Terpilih
                </span>
              </div>

              {cartItems.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between bg-white text-xs gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{item.nama}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span>Kode: {item.kode}</span>
                          <span>•</span>
                          <span>Rak: {item.lokasi_rak || 'Gudang'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Qty +/- Controls */}
                        <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, -1)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 font-bold font-mono text-xs text-slate-800">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, 1)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Subtotal Item */}
                        <div className="w-28 text-right font-mono font-black text-slate-900 text-xs">
                          Rp {(item.qty * item.harga).toLocaleString('id-ID')}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                  Keranjang belanja masih kosong. Pilih suku cadang dari katalog di sebelah kanan.
                </div>
              )}

              {/* Total Calculation & Submit Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Subtotal Sparepart:</span>
                  <span className="font-mono font-bold">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>PPN 11%:</span>
                  <span className="font-mono font-bold">Rp {ppn11.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Estimasi Biaya:</span>
                  <span className="font-mono text-blue-700 text-base">Rp {grandTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('transaksi')}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={buatTransaksiMutation.isPending || cartItems.length === 0}
                  onClick={() => buatTransaksiMutation.mutate()}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {buatTransaksiMutation.isPending ? 'Menyimpan...' : 'KIRIM ESTIMASI KE CUSTOMER →'}
                </button>
              </div>

            </div>

          </div>

          {/* Right Column: Live Search Stok Sparepart (Katalog POS) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] uppercase font-bold text-orange-600">Gudang KIM 3</span>
              <h3 className="text-base font-black text-slate-900">Pilih / Cari Barang</h3>
              <p className="text-xs text-slate-500">Katalog stok suku cadang siap kirim</p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik kode / nama barang..."
                value={partSearchQuery}
                onChange={(e) => setPartSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredStock && filteredStock.length > 0 ? (
                filteredStock.map((part) => (
                  <div
                    key={part.id}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{part.nama_part}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {part.kode_part} • Stok: <strong className="text-emerald-700">{part.stok} {part.satuan}</strong>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-blue-700 mt-1">
                        Rp {Number(part.harga_jual || 0).toLocaleString('id-ID')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToCart(part)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada sparepart yang sesuai dengan kata kunci.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: WAREHOUSE PICKING & PENYERAHAN BARANG (MOCKUP 3 & 4) */}
      {/* ======================================================== */}
      {activeTab === 'picking' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card 1: Warehouse Picking Request (image2.png Mockup 3) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600">Langkah 4: Warehouse</span>
                <h3 className="text-base font-black text-slate-900">Picking Request Gudang</h3>
                <p className="text-xs text-slate-500">Pengambilan barang sesuai rak penyimpanan</p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                {activeTransaksi?.no_picking_request || activeTransaksi?.no_transaksi || '-'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">SA Pemohon:</span>
                  <span className="font-bold text-slate-800">{activeTransaksi?.sa_pic || currentUser || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Customer / Nopol:</span>
                  <span className="font-bold text-slate-800">
                    {activeTransaksi ? `${activeTransaksi.nama_customer || '-'} (${activeTransaksi.no_polisi})` : '-'}
                  </span>
                </div>
              </div>

              {/* Rincian Rak Gudang */}
              <div>
                <span className="font-bold text-slate-700 block mb-1.5">Lokasi Rak Pengambilan:</span>
                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 font-mono font-bold text-amber-900">
                  {activeTransaksi?.lokasi_rak || 'Rak Utama Bengkel'}
                </div>
              </div>

              {/* Detail Barang */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                <div className="p-2.5 bg-slate-50 font-semibold text-slate-600 flex justify-between">
                  <span>Nama Barang</span>
                  <span>Catatan / Status</span>
                </div>
                <div className="p-3 bg-white text-slate-700">
                  {activeTransaksi?.catatan || 'Pesanan suku cadang langsung siap diserahkan ke pelanggan.'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert('Warehouse mengonfirmasi: Barang siap diambil oleh SA!')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                <span>PICKING &amp; KONFIRMASI BARANG SIAP</span>
              </button>
            </div>
          </div>

          {/* Card 2: Penyerahan Barang ke Customer (image2.png Mockup 4) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600">Langkah 5 & 6: Service Advisor</span>
                <h3 className="text-base font-black text-slate-900">Serahkan Barang ke Customer</h3>
                <p className="text-xs text-slate-500">Serah terima barang dan dokumentasi foto</p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                Siap Diambil
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-900">Warehouse sudah konfirmasi barang siap diambil!</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">SA dapat mengambil barang di counter gudang.</div>
                </div>
              </div>

              <PhotoUploader
                label="Foto Bukti Penyerahan Barang ke Customer (Kamera / File)"
                value={fotoPenyerahan}
                onChange={(url) => setFotoPenyerahan(url)}
                bucket="foto_barang"
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Penyerahan</label>
                <input
                  type="text"
                  placeholder="Kondisi barang baik dan sesuai pesanan..."
                  value={catatanPenyerahan}
                  onChange={(e) => setCatatanPenyerahan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Info Armada yang Diserahkan */}
              {activeTransaksi && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Armada / Customer:</span>
                    <span className="font-bold text-slate-800">{activeTransaksi.no_polisi} - {activeTransaksi.nama_customer}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">No. Transaksi:</span>
                    <span className="font-mono font-bold text-blue-700">{activeTransaksi.no_transaksi}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={serahkanBarangMutation.isPending || !activeTransaksi}
                onClick={() => {
                  if (!activeTransaksi) {
                    alert('Pilih transaksi yang akan diserahkan terlebih dahulu dari daftar transaksi.');
                    return;
                  }
                  serahkanBarangMutation.mutate(activeTransaksi);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                <span>
                  {serahkanBarangMutation.isPending 
                    ? 'Menerbitkan Memo Keluar & Checkout Gerbang...' 
                    : 'KONFIRMASI BARANG TELAH DISERAHKAN (TERBITKAN MEMO KELUAR)'}
                </span>
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                Otomatis menerbitkan Memo Keluar resmi (format MK-YYMMDD-XXXX) dan memvalidasi checkout Security di gerbang.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* BOTTOM SECTION: AKTIVITAS PIC & INFORMASI KENDARAAN       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Notifikasi Sistem Log */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Clock className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Status Aktivitas</h4>
          </div>
          <div className="space-y-2 text-[11px]">
            {activeTransaksi ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>{activeTransaksi.created_at ? new Date(activeTransaksi.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} • Transaksi {activeTransaksi.no_transaksi} dibuat</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Status saat ini: <strong className="text-slate-800">{activeTransaksi.status_transaksi}</strong></span>
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-center py-2">Belum ada aktivitas transaksi</div>
            )}
          </div>
        </div>

        {/* Aktivitas Terkait PIC */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <User className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Aktivitas Terkait (PIC)</h4>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">PIC Kasir / Invoice:</span>
              <span className="font-bold text-slate-800">{activeTransaksi?.kasir_pic || 'Kasir'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">PIC Penyerahan:</span>
              <span className="font-bold text-slate-800">{activeTransaksi?.sa_pic || 'Service Advisor'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status Gerbang:</span>
              <span className="font-bold text-slate-800">{activeTransaksi?.status_transaksi === 'Selesai' ? 'Memo Terbit (Siap Keluar)' : 'Di Area Bengkel'}</span>
            </div>
          </div>
        </div>

        {/* Informasi Kendaraan Pembeli */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Truck className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Informasi Kendaraan</h4>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">No. Polisi:</span>
              <span className="font-black text-slate-900 font-mono">{activeTransaksi?.no_polisi || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nama Customer:</span>
              <span className="font-bold text-slate-800">{activeTransaksi?.nama_customer || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">No. Telepon:</span>
              <span className="font-bold text-slate-800">{activeTransaksi?.no_telepon || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status Pembelian:</span>
              <span className="font-bold text-emerald-700">{activeTransaksi?.status_transaksi || '-'}</span>
            </div>
          </div>
        </div>

      </div>

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

    </div>
  );
};
