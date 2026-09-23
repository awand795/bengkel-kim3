import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { InvoicePembayaran } from '../types';
import { PrintThermalInvoiceModal } from '../components/print/PrintThermalInvoiceModal';
import { 
  Receipt, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Building2, 
  Printer, 
  CheckCircle2, 
  Search,
  Plus
} from 'lucide-react';

export const KasirInvoiceView: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'belum-lunas' | 'lunas'>('dashboard');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoicePembayaran | null>(null);
  const [metodeBayar, setMetodeBayar] = useState<'Cash' | 'Transfer Bank' | 'QRIS' | 'EDC'>('Transfer Bank');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Belum Lunas' | 'Lunas'>('Semua');

  // Queries
  const { data: invoiceList, isLoading } = useQuery({
    queryKey: ['invoice-list'],
    queryFn: api.getInvoiceList,
    refetchInterval: 8000,
  });

  // Pelunasan Mutation
  const bayarMutation = useMutation({
    mutationFn: async (inv: InvoicePembayaran) => {
      return api.bayarInvoice({
        id: inv.id,
        metode_pembayaran: metodeBayar,
        kasir_pic: currentUser,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert('Pembayaran berhasil diterima! Faktur lunas dan kendaraan dapat check-out di Security.');
    },
  });

  // Derived KPI and filtering
  const allInvoices = invoiceList || [];
  const totalCount = allInvoices.length;
  const unpaidCount = allInvoices.filter(i => i.status_pembayaran !== 'Paid' && i.status_pembayaran !== 'Lunas').length;
  const paidCount = allInvoices.filter(i => i.status_pembayaran === 'Paid' || i.status_pembayaran === 'Lunas').length;
  const totalPaidRevenue = allInvoices
    .filter(i => i.status_pembayaran === 'Paid' || i.status_pembayaran === 'Lunas')
    .reduce((acc, curr) => acc + Number(curr.grand_total || 0), 0);

  const filteredInvoices = allInvoices.filter((inv) => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch = !query ||
      inv.no_invoice?.toLowerCase().includes(query) ||
      inv.no_polisi?.toLowerCase().includes(query) ||
      inv.nama_customer?.toLowerCase().includes(query);

    if (!matchSearch) return false;
    const isPaid = inv.status_pembayaran === 'Paid' || inv.status_pembayaran === 'Lunas';
    if (statusFilter === 'Belum Lunas') return !isPaid;
    if (statusFilter === 'Lunas') return isPaid;
    return true;
  });

  const activeInv = selectedInvoice || filteredInvoices[0] || allInvoices[0];

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Admin Invoice &amp; Pembayaran (Kasir)</h1>
            <p className="text-xs text-slate-500">Penerbitan Faktur, Perhitungan PPN 11%, dan Konfirmasi Pelunasan</p>
          </div>
        </div>
      </div>

      {/* Mini KPI Banners for Kasir */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('Semua')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Semua' ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Faktur</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
          <span className="text-[10px] text-slate-400">Seluruh dokumen</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Belum Lunas')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Belum Lunas' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Belum Lunas</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 mt-1">{unpaidCount}</div>
          <span className="text-[10px] text-amber-700">Menunggu pembayaran</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Lunas')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Lunas' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Faktur Lunas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">{paidCount}</div>
          <span className="text-[10px] text-emerald-600">Terverifikasi kasir</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Omset Lunas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-1">
            Rp {totalPaidRevenue.toLocaleString('id-ID')}
          </div>
          <span className="text-[10px] text-slate-400">Total penerimaan</span>
        </div>
      </div>

      {/* Grid: List Invoice & Detail Faktur Kasir */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Daftar Invoice (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Daftar Faktur &amp; Invoice Masuk</h2>
              <p className="text-xs text-slate-500">Tagihan resmi pekerjaan service dan pembelian sparepart</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
              {filteredInvoices.length} Faktur Ditemukan
            </span>
          </div>

          {/* Live Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari No. Invoice, No. Polisi, atau Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Chips */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['Semua', 'Belum Lunas', 'Lunas'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">No. Invoice</th>
                  <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total Tagihan</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        activeInv?.id === inv.id ? 'bg-blue-50/70 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-blue-600 font-bold">{inv.no_invoice}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{inv.no_polisi}</td>
                      <td className="py-3 px-3 text-slate-700">{inv.nama_customer || '-'}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {new Date(inv.tanggal_invoice).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        Rp {Number(inv.grand_total).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={inv.status_pembayaran} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Pilih →
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ditemukan invoice yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="sm:hidden space-y-2.5">
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeInv?.id === inv.id ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-600">{inv.no_invoice}</span>
                    <StatusBadge status={inv.status_pembayaran} size="sm" />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">{inv.no_polisi}</span>
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      Rp {Number(inv.grand_total).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
                    <span>{inv.nama_customer || '-'}</span>
                    <span>{new Date(inv.tanggal_invoice).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Tidak ditemukan invoice yang cocok.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview Faktur & Pembayaran (image1.png & image2.png Mockup Invoice) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          {activeInv ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600">Detail Pembayaran</span>
                  <h3 className="text-base font-black text-slate-900">{activeInv.no_invoice}</h3>
                  <p className="text-xs text-slate-500">{activeInv.no_polisi} - {activeInv.nama_customer}</p>
                </div>
                <StatusBadge status={activeInv.status_pembayaran} size="md" />
              </div>

              {/* Kalkulasi Biaya */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">Rp {Number(activeInv.subtotal).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>PPN 11%:</span>
                  <span className="font-mono">Rp {Number(activeInv.ppn_nominal).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-900 text-sm font-black pt-1.5 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-700">Rp {Number(activeInv.grand_total).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Pilihan Metode Pembayaran (image1.png & image2.png) */}
              {activeInv.status_pembayaran !== 'Paid' && activeInv.status_pembayaran !== 'Lunas' ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Pilih Metode Pembayaran:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'Transfer Bank', icon: Building2 },
                      { id: 'QRIS', icon: QrCode },
                      { id: 'Cash', icon: Banknote },
                      { id: 'EDC', icon: CreditCard },
                    ].map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMetodeBayar(m.id as any)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all font-semibold ${
                            metodeBayar === m.id
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{m.id}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={bayarMutation.isPending}
                    onClick={() => bayarMutation.mutate(activeInv)}
                    className="w-full mt-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> TERIMA PEMBAYARAN ({metodeBayar.toUpperCase()})
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="text-sm font-bold text-emerald-900">FAKTUR SUDAH LUNAS (PAID)</div>
                  <div className="text-xs text-emerald-700">Metode: {activeInv.metode_pembayaran} | Kasir: {activeInv.kasir_pic || 'Kasir'}</div>
                  <button
                    onClick={() => setShowPrintModal(true)}
                    className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak Struk Thermal (80mm)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Receipt className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Pilih invoice untuk memproses pembayaran kasir.</p>
            </div>
          )}
        </div>

      </div>

      {/* Printable Thermal Receipt Modal */}
      {showPrintModal && activeInv && (
        <PrintThermalInvoiceModal
          invoice={activeInv}
          onClose={() => setShowPrintModal(false)}
        />
      )}

    </div>
  );
};
