import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatPlat } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import { SectionHeader } from '../components/common/SectionHeader';
import { ListItemCard } from '../components/common/ListItemCard';
import { StepModal } from '../components/common/StepModal';
import { DetailModal } from '../components/common/DetailModal';
import { EmptyState } from '../components/common/EmptyState';
import { FilterChips } from '../components/common/FilterChips';
import { PaginationBar } from '../components/common/PaginationBar';
import { InvoicePembayaran } from '../types';
import { PrintThermalInvoiceModal } from '../components/print/PrintThermalInvoiceModal';
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
  X,
  FileText
} from 'lucide-react';

export const KasirInvoiceView: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  
  // Selection and Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoicePembayaran | null>(null);
  const [modalMode, setModalMode] = useState<'detail' | 'step' | null>(null);
  const [stepModalIndex, setStepModalIndex] = useState(0); // 0: Rincian, 1: Metode Bayar
  const [metodeBayar, setMetodeBayar] = useState<'Cash' | 'Transfer Bank' | 'QRIS' | 'EDC'>('Transfer Bank');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Tarif PPN DB hanya untuk label
  const { rate: ppnRate } = usePpnRate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Belum Lunas' | 'Lunas'>('Semua');

  // Pagination State
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

  // Pelunasan Mutation
  const bayarMutation = useMutation({
    mutationFn: async (inv: InvoicePembayaran) => {
      return api.bayarInvoice({
        id: inv.id,
        metode_pembayaran: metodeBayar,
        kasir_pic: currentUser,
      });
    },
    onSuccess: async (_res, inv) => {
      if (inv.id_spk) {
        try {
          await api.updateSpkStatus({ id: inv.id_spk, status_spk: 'Selesai' });
        } catch (e: any) {
          toast.error('Pembayaran tercatat, tetapi status SPK gagal di-update: ' + (e?.message || 'Terjadi kesalahan.'));
        }
      }
      queryClient.invalidateQueries({ queryKey: ['invoice-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });

      const lunasMsg = `Pembayaran ${inv.no_invoice} (${formatPlat(inv.no_polisi)}) Rp ${Number(inv.grand_total || 0).toLocaleString('id-ID')} telah diterima via ${metodeBayar}.`;
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
      toast.success('Pembayaran berhasil diterima! Faktur telah lunas.');
      
      // Update selectedInvoice locally so detail modal reflects paid status
      setSelectedInvoice({
        ...inv,
        status_pembayaran: 'Lunas',
        metode_pembayaran: metodeBayar,
        kasir_pic: currentUser,
      });
      setModalMode('detail');
    },
    onError: (err: any) => toast.error('Gagal mencatat pembayaran: ' + (err?.message || 'Terjadi kesalahan.')),
  });

  // Open modal handler
  const handleOpenInvoice = (inv: InvoicePembayaran) => {
    setSelectedInvoice(inv);
    const isPaid = inv.status_pembayaran === 'Paid' || inv.status_pembayaran === 'Lunas';
    if (isPaid) {
      setModalMode('detail');
    } else {
      setStepModalIndex(0);
      setModalMode('step');
    }
  };

  const handleCloseModal = () => {
    setSelectedInvoice(null);
    setModalMode(null);
    setStepModalIndex(0);
  };

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

  // Steps for StepModal (Pelunasan Pembayaran)
  const paymentSteps = selectedInvoice ? [
    {
      id: 'rincian',
      label: 'Rincian Biaya',
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-surface rounded-xl border border-border flex items-center justify-between">
            <div>
              <span className="text-xs text-ink-subtle uppercase font-bold tracking-wider">Kendaraan &amp; Customer</span>
              <div className="text-base font-bold font-mono text-ink mt-0.5">{formatPlat(selectedInvoice.no_polisi)}</div>
              <div className="text-xs text-ink-muted">{selectedInvoice.nama_customer || 'Pelanggan Bengkel'}</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-ink-subtle uppercase font-bold tracking-wider">Tanggal Invoice</span>
              <div className="text-xs font-mono font-semibold text-ink mt-0.5">
                {selectedInvoice.tanggal_invoice 
                  ? new Date(selectedInvoice.tanggal_invoice).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })
                  : '-'}
              </div>
            </div>
          </div>

          <div className="p-4 bg-surface-raised rounded-xl border border-border space-y-2.5 text-xs">
            <div className="flex justify-between text-ink-muted">
              <span>Subtotal Jasa &amp; Part:</span>
              <span className="font-mono font-semibold text-ink">
                Rp {Number(selectedInvoice.subtotal || 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>PPN{ppnRate !== null ? ` (${ppnRate}%)` : ''}:</span>
              <span className="font-mono font-semibold text-ink">
                Rp {Number(selectedInvoice.ppn_nominal || 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="pt-2.5 border-t border-border flex justify-between items-center text-sm">
              <span className="font-bold text-ink">Grand Total Tagihan:</span>
              <span className="font-mono font-bold text-accent text-base">
                Rp {Number(selectedInvoice.grand_total || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'metode',
      label: 'Metode Bayar',
      content: (
        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold text-ink block mb-2">Pilih Cara Pembayaran:</span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { id: 'Transfer Bank', icon: Building2, desc: 'BCA / Mandiri / BRI' },
                { id: 'QRIS', icon: QrCode, desc: 'Scan Statis / Dinamis' },
                { id: 'Cash', icon: Banknote, desc: 'Uang Tunai Kasir' },
                { id: 'EDC', icon: CreditCard, desc: 'Debit / Kartu Kredit' },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = metodeBayar === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodeBayar(m.id as any)}
                    className={`p-3.5 rounded-xl border flex flex-col items-start gap-1 transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-accent bg-accent-subtle/80 ring-2 ring-accent/30 shadow-xs'
                        : 'border-border bg-surface hover:border-accent/40 hover:bg-surface-raised'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-accent text-white' : 'bg-surface-raised text-ink-muted'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span className="text-xs font-bold text-accent bg-accent-subtle px-2 py-0.5 rounded-full">
                          Dipilih ✓
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-ink text-sm mt-1">{m.id}</span>
                    <span className="text-xs text-ink-subtle">{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between text-xs">
            <span className="text-ink-muted">Total yang harus diterima:</span>
            <span className="font-mono font-bold text-accent text-base">
              Rp {Number(selectedInvoice.grand_total || 0).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      ),
    },
  ] : [];

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <SectionHeader 
        title="Kasir & Faktur Tagihan"
        description={`Penerbitan faktur resmi, tarif PPN${ppnRate !== null ? ` ${ppnRate}%` : ''}, dan konfirmasi pelunasan pembayaran pelanggan.`}
      />

      {/* Modern KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Faktur"
          value={totalCount}
          subtitle="Seluruh transaksi faktur"
          icon={Receipt}
          tone="accent"
          active={statusFilter === 'Semua'}
          onClick={() => setStatusFilter('Semua')}
        />
        <StatCard
          title="Belum Lunas"
          value={unpaidCount}
          subtitle="Menunggu pembayaran"
          icon={CreditCard}
          tone="amber"
          active={statusFilter === 'Belum Lunas'}
          onClick={() => setStatusFilter('Belum Lunas')}
        />
        <StatCard
          title="Faktur Lunas"
          value={paidCount}
          subtitle="Terverifikasi kasir"
          icon={CheckCircle2}
          tone="green"
          active={statusFilter === 'Lunas'}
          onClick={() => setStatusFilter('Lunas')}
        />
        <StatCard
          title="Penerimaan Lunas"
          value={`Rp ${totalPaidRevenue.toLocaleString('id-ID')}`}
          subtitle="Total kas masuk bengkel"
          icon={Banknote}
          tone="accent"
        />
      </div>

      {/* Main Table / List Container */}
      <div className="card-modern p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink tracking-tight">Daftar Faktur &amp; Invoice</h2>
            <p className="text-xs text-ink-muted">Kelola tagihan pengerjaan bengkel dan penjualan langsung suku cadang</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-raised border border-border text-ink-muted self-start sm:self-auto">
            {filteredInvoices.length} Faktur Ditemukan
          </span>
        </div>

        {/* Live Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari No. Invoice, No. Polisi, atau Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none transition-all placeholder:text-ink-subtle text-ink"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink text-xs font-bold p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <FilterChips
            options={[
              { id: 'Semua', label: 'Semua Faktur', count: totalCount },
              { id: 'Belum Lunas', label: 'Belum Lunas', count: unpaidCount },
              { id: 'Lunas', label: 'Lunas', count: paidCount },
            ]}
            selectedId={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
          />
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-raised text-ink-muted border-y border-border">
              <tr>
                <th className="py-3 px-3.5 font-semibold">No. Invoice</th>
                <th className="py-3 px-3.5 font-semibold">No. Polisi</th>
                <th className="py-3 px-3.5 font-semibold">Customer</th>
                <th className="py-3 px-3.5 font-semibold">Tanggal</th>
                <th className="py-3 px-3.5 font-semibold text-right">Total Tagihan</th>
                <th className="py-3 px-3.5 font-semibold text-center">Status</th>
                <th className="py-3 px-3.5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {paginatedInvoices.length > 0 ? (
                paginatedInvoices.map((inv) => {
                  const isPaid = inv.status_pembayaran === 'Paid' || inv.status_pembayaran === 'Lunas';
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => handleOpenInvoice(inv)}
                      className="hover:bg-surface-raised/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-3.5 font-mono font-bold text-accent">
                        {inv.no_invoice}
                      </td>
                      <td className="py-3.5 px-3.5 font-bold font-mono text-ink">
                        {formatPlat(inv.no_polisi)}
                      </td>
                      <td className="py-3.5 px-3.5 text-ink-muted">
                        {inv.nama_customer || '-'}
                      </td>
                      <td className="py-3.5 px-3.5 text-ink-muted font-mono text-xs">
                        {inv.tanggal_invoice 
                          ? new Date(inv.tanggal_invoice).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '-'}
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-mono font-bold text-ink text-sm">
                        Rp {Number(inv.grand_total || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-3.5 text-center">
                        <StatusBadge status={inv.status_pembayaran} size="sm" />
                      </td>
                      <td className="py-3.5 px-3.5 text-right">
                        {isPaid ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInvoice(inv);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-border text-ink-muted hover:text-ink hover:bg-surface-raised text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-ink-subtle" />
                            <span>Lihat &amp; Cetak</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInvoice(inv);
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Proses Bayar →</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12">
                    <EmptyState
                      icon={Receipt}
                      title="Tidak Ada Faktur Ditemukan"
                      description="Tidak ditemukan invoice yang cocok dengan kriteria pencarian atau filter yang dipilih."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="sm:hidden space-y-3">
          {paginatedInvoices.length > 0 ? (
            paginatedInvoices.map((inv) => (
              <ListItemCard
                key={inv.id}
                title={inv.no_invoice}
                subtitle={`${formatPlat(inv.no_polisi)} • ${inv.nama_customer || 'Pelanggan Umum'}`}
                badge={<StatusBadge status={inv.status_pembayaran} size="sm" />}
                chips={[
                  `Rp ${Number(inv.grand_total || 0).toLocaleString('id-ID')}`,
                  inv.tanggal_invoice ? new Date(inv.tanggal_invoice).toLocaleDateString('id-ID') : '-'
                ]}
                onClick={() => handleOpenInvoice(inv)}
              />
            ))
          ) : (
            <EmptyState
              icon={Receipt}
              title="Tidak Ada Faktur"
              description="Tidak ditemukan data invoice yang cocok."
            />
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

      {/* DETAIL MODAL (Untuk Invoice Lunas / Preview Detail) */}
      {selectedInvoice && modalMode === 'detail' && (
        <DetailModal
          open={true}
          onClose={handleCloseModal}
          title={selectedInvoice.no_invoice}
          subtitle={`${formatPlat(selectedInvoice.no_polisi)} • ${selectedInvoice.nama_customer || 'Pelanggan Umum'}`}
          badge={<StatusBadge status={selectedInvoice.status_pembayaran} size="sm" />}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl border border-border text-ink font-semibold text-xs hover:bg-surface-raised transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Thermal (80mm)</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-surface rounded-xl border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-subtle">No. Polisi / Unit:</span>
                <span className="font-bold font-mono text-ink">{formatPlat(selectedInvoice.no_polisi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Nama Customer:</span>
                <span className="font-semibold text-ink">{selectedInvoice.nama_customer || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Metode Pembayaran:</span>
                <span className="font-semibold text-ink">{selectedInvoice.metode_pembayaran || metodeBayar}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-subtle">Kasir PIC:</span>
                <span className="font-semibold text-ink">{selectedInvoice.kasir_pic || currentUser}</span>
              </div>
            </div>

            <div className="p-4 bg-surface-raised rounded-xl border border-border space-y-2.5 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal Jasa &amp; Part:</span>
                <span className="font-mono font-semibold text-ink">
                  Rp {Number(selectedInvoice.subtotal || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>PPN{ppnRate !== null ? ` (${ppnRate}%)` : ''}:</span>
                <span className="font-mono font-semibold text-ink">
                  Rp {Number(selectedInvoice.ppn_nominal || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center text-sm">
                <span className="font-bold text-ink">Total Tagihan Dibayar:</span>
                <span className="font-mono font-bold text-accent text-base">
                  Rp {Number(selectedInvoice.grand_total || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </DetailModal>
      )}

      {/* STEP MODAL (Untuk Pelunasan Faktur Belum Lunas) */}
      {selectedInvoice && modalMode === 'step' && (
        <StepModal
          open={true}
          onClose={handleCloseModal}
          title={selectedInvoice.no_invoice}
          subtitle="Pelunasan Tagihan Kasir Bengkel"
          steps={paymentSteps}
          currentStep={stepModalIndex}
          onNext={() => setStepModalIndex((prev) => Math.min(prev + 1, paymentSteps.length - 1))}
          onBack={() => setStepModalIndex((prev) => Math.max(prev - 1, 0))}
          onSubmit={() => bayarMutation.mutate(selectedInvoice)}
          submitLabel={`Terima Pembayaran (${metodeBayar})`}
          isPending={bayarMutation.isPending}
          size="md"
        />
      )}

      {/* Printable Thermal Receipt Modal */}
      {showPrintModal && selectedInvoice && (
        <PrintThermalInvoiceModal
          invoice={selectedInvoice}
          onClose={() => setShowPrintModal(false)}
        />
      )}

    </div>
  );
};

export default KasirInvoiceView;
