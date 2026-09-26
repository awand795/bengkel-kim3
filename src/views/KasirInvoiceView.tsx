import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { InvoicePembayaran } from '../types';
import { PrintThermalInvoiceModal } from '../components/print/PrintThermalInvoiceModal';
import { PaginationBar } from '../components/common/PaginationBar';
import { toast } from '../components/common/Toast';
import { usePpnRate } from '../hooks/usePpnRate';
import { realtimeHub, publishKeCustomer } from '../services/realtimeService';
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

  // Tarif PPN DB hanya untuk label (nilai faktur yang tampil = tersimpan apa adanya)
  const { rate: ppnRate } = usePpnRate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Belum Lunas' | 'Lunas'>('Semua');

  // Pagination State (Standar 10 baris per halaman)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  // Queries
  const { data: invoiceList, isLoading } = useQuery({
    queryKey: ['invoice-list'],
    queryFn: api.getInvoiceList,
    refetchInterval: 8000,
  });

  // Pelunasan Mutation: invoice lunas -> SPK Selesai + notifikasi.
  // Tanpa ini SPK stuck di FIR Closed selamanya (tidak ada penulis status Selesai).
  const bayarMutation = useMutation({
    mutationFn: async (inv: InvoicePembayaran) => {
      return api.bayarInvoice({
        id: inv.id,
        metode_pembayaran: metodeBayar,
        kasir_pic: currentUser,
      });
    },
    onSuccess: async (_res, inv) => {
      // 1. Tutup WO service: invoice service (ada id_spk) -> SPK Selesai.
      //    Invoice beli-part langsung (tanpa id_spk) dilewati.
      if (inv.id_spk) {
        try {
          await api.updateSpkStatus({ id: inv.id_spk, status_spk: 'Selesai' });
        } catch (e: any) {
          toast.error('Pembayaran tercatat, tetapi SPK gagal di-closed: ' + (e?.message || 'Terjadi kesalahan.'));
        }
      }
      queryClient.invalidateQueries({ queryKey: ['invoice-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });

      // 2. Notifikasi pelunasan ke customer PEMILIK saja (anti-bocor antar akun)
      const lunasMsg = `Pembayaran ${inv.no_invoice} (${inv.no_polisi}) Rp ${Number(inv.grand_total || 0).toLocaleString('id-ID')} telah diterima secara ${metodeBayar}.`;
      await publishKeCustomer({
        type: 'INVOICE_PAID',
        title: 'Pembayaran Lunas',
        message: `${lunasMsg} Unit bisa diambil — check-out di Pos Security.`,
        linkTab: 'fleet-status',
        urgency: 'success',
        noPolisi: inv.no_polisi,
        pelangganId: inv.id_pelanggan ?? null,
      });
      if (inv.id_spk) {
        realtimeHub.publish({
          type: 'INVOICE_PAID',
          targetRoles: ['SA', 'Security'],
          title: 'Unit Lunas, Siap Check-Out',
          message: `${lunasMsg} SPK closed (Selesai).`,
          linkTab: 'security-onprogress',
          urgency: 'info',
        });
      }
      toast.success('Pembayaran berhasil diterima! Faktur lunas dan kendaraan dapat check-out di Security.');
    },
    onError: (err: any) => toast.error('Gagal mencatat pembayaran: ' + (err?.message || 'Terjadi kesalahan.')),
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

  const totalPages = Math.ceil(filteredInvoices.length / limit) || 1;
  const paginatedInvoices = filteredInvoices.slice((page - 1) * limit, page * limit);
  const activeInv = selectedInvoice || paginatedInvoices[0] || filteredInvoices[0] || allInvoices[0];

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-100 shadow-2xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Admin Invoice &amp; Pembayaran (Kasir)</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/70">
                FAKTUR RESMI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Penerbitan Faktur, Perhitungan PPN{ppnRate !== null ? ` ${ppnRate}%` : ''}, dan Konfirmasi Pelunasan</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60 self-start sm:self-auto">
          <Banknote className="w-4 h-4 text-emerald-600" />
          <span>Faktur Terintegrasi Sistem</span>
        </div>
      </div>

      {/* Mini KPI Banners for Kasir */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('Semua')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Semua' ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-500/20 shadow-xs' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Faktur</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-900 mt-1 tabular-nums">{totalCount}</div>
          <span className="text-[10px] text-slate-400">Seluruh dokumen</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Belum Lunas')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Belum Lunas' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Belum Lunas</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1 tabular-nums">{unpaidCount}</div>
          <span className="text-[10px] text-amber-600">Menunggu pembayaran</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Lunas')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Lunas' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Faktur Lunas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 tabular-nums">{paidCount}</div>
          <span className="text-[10px] text-emerald-600">Terverifikasi kasir</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Omset Lunas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-1 tabular-nums">
            Rp {totalPaidRevenue.toLocaleString('id-ID')}
          </div>
          <span className="text-[10px] text-slate-400">Total penerimaan</span>
        </div>
      </div>

      {/* Grid: List Invoice & Detail Faktur Kasir */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Daftar Invoice (2 Cols) */}
        <div className="lg:col-span-2 bg-surface-raised rounded-md border border-border p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">Daftar Faktur &amp; Invoice Masuk</h2>
              <p className="text-xs text-ink-muted">Tagihan resmi pekerjaan service dan pembelian sparepart</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface text-ink-muted self-start sm:self-auto">
              {filteredInvoices.length} Faktur Ditemukan
            </span>
          </div>

          {/* Live Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari No. Invoice, No. Polisi, atau Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-md border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted text-xs font-bold p-1"
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

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-ink-muted border-y border-border">
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
              <tbody className="divide-y divide-border">
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        activeInv?.id === inv.id ? 'bg-accent-subtle font-bold' : 'hover:bg-surface'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-accent font-bold">{inv.no_invoice}</td>
                      <td className="py-3 px-3 font-bold text-ink">{inv.no_polisi}</td>
                      <td className="py-3 px-3 text-ink-muted">{inv.nama_customer || '-'}</td>
                      <td className="py-3 px-3 text-ink-muted font-mono">
                        {new Date(inv.tanggal_invoice).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-ink">
                        Rp {Number(inv.grand_total).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={inv.status_pembayaran} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-xs font-semibold text-accent hover:text-accent-hover"
                        >
                          Pilih →
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-subtle">
                      Tidak ditemukan invoice yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="sm:hidden space-y-2.5">
            {paginatedInvoices.length > 0 ? (
              paginatedInvoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-3.5 rounded-md border transition-all cursor-pointer ${
                    activeInv?.id === inv.id ? 'border-accent bg-accent-subtle ring-1 ring-accent' : 'border-border bg-surface-raised'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-accent">{inv.no_invoice}</span>
                    <StatusBadge status={inv.status_pembayaran} size="sm" />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-black text-ink">{inv.no_polisi}</span>
                    <span className="text-xs font-bold text-ink font-mono">
                      Rp {Number(inv.grand_total).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-ink-muted flex items-center justify-between">
                    <span>{inv.nama_customer || '-'}</span>
                    <span>{new Date(inv.tanggal_invoice).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-ink-subtle text-xs bg-surface rounded-md border border-dashed border-border">
                Tidak ditemukan invoice yang cocok.
              </div>
            )}
          </div>

          {/* Pagination Bar */}
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalRecords={filteredInvoices.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            label="faktur invoice"
          />
        </div>

        {/* Right Column: Preview Faktur & Pembayaran (image1.png & image2.png Mockup Invoice) */}
        <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs flex flex-col justify-between">
          {activeInv ? (
            <div className="space-y-4">
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-accent">Detail Pembayaran</span>
                  <h3 className="text-base font-black text-ink">{activeInv.no_invoice}</h3>
                  <p className="text-xs text-ink-muted">{activeInv.no_polisi} - {activeInv.nama_customer}</p>
                </div>
                <StatusBadge status={activeInv.status_pembayaran} size="md" />
              </div>

              {/* Kalkulasi Biaya */}
              <div className="p-3 bg-surface rounded-md border border-border text-xs space-y-1.5">
                <div className="flex justify-between text-ink-muted">
                  <span>Subtotal:</span>
                  <span className="font-mono">Rp {Number(activeInv.subtotal).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>PPN{ppnRate !== null ? ` ${ppnRate}%` : ''}:</span>
                  <span className="font-mono">Rp {Number(activeInv.ppn_nominal).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-ink text-sm font-black pt-1.5 border-t border-border">
                  <span>Grand Total:</span>
                  <span className="font-mono text-status-green">Rp {Number(activeInv.grand_total).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Pilihan Metode Pembayaran (image1.png & image2.png) */}
              {activeInv.status_pembayaran !== 'Paid' && activeInv.status_pembayaran !== 'Lunas' ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-ink block">Pilih Metode Pembayaran:</span>
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
                          className={`p-2.5 rounded-md border flex items-center gap-2 transition-all font-semibold ${
                            metodeBayar === m.id
                              ? 'border-accent bg-accent-subtle text-accent shadow-xs'
                              : 'border-border text-ink-muted hover:bg-surface'
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
                    className="w-full mt-3 py-3 rounded-md bg-status-green hover:bg-status-green/90 text-white font-black text-xs shadow-md shadow-status-green/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> TERIMA PEMBAYARAN ({metodeBayar.toUpperCase()})
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-md bg-status-green-bg border border-status-green/30 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-status-green mx-auto" />
                  <div className="text-sm font-bold text-status-green">FAKTUR SUDAH LUNAS (PAID)</div>
                  <div className="text-xs text-status-green">Metode: {activeInv.metode_pembayaran} | Kasir: {activeInv.kasir_pic || 'Kasir'}</div>
                  <button
                    onClick={() => setShowPrintModal(true)}
                    className="w-full mt-2 py-2 bg-surface hover:bg-surface-raised border border-border text-ink-muted rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak Struk Thermal (80mm)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-subtle">
              <Receipt className="w-10 h-10 text-ink-subtle mb-2" />
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
