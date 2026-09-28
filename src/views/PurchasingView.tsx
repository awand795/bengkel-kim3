import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { PurchaseRequestPart } from '../types';
import { PaginationBar } from '../components/common/PaginationBar';
import { 
  ShoppingBag, 
  Calendar, 
  Clock, 
  Check, 
  Search,
  PackageCheck,
  Building2,
  Send,
  AlertCircle
} from 'lucide-react';
import { realtimeHub, publishKeCustomer } from '../services/realtimeService';
import { toast } from '../components/common/Toast';
import { resolveMechanicId } from '../utils/spkAccess';
import { StatCard } from '../components/common/StatCard';
import { DetailModal } from '../components/common/DetailModal';
import { StepModal } from '../components/common/StepModal';
import { ListItemCard } from '../components/common/ListItemCard';
import { FilterChips } from '../components/common/FilterChips';
import { EmptyState } from '../components/common/EmptyState';
import { SectionHeader } from '../components/common/SectionHeader';

export const PurchasingView: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const [selectedPr, setSelectedPr] = useState<PurchaseRequestPart | null>(null);
  const [isProcessingPo, setIsProcessingPo] = useState(false);
  const [poStep, setPoStep] = useState(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Belum Ada PO' | 'PO Diterbitkan' | 'Barang Ready'>('Belum Ada PO');

  // Pagination State
  const [prPage, setPrPage] = useState(1);
  const [prLimit, setPrLimit] = useState(10);

  React.useEffect(() => {
    setPrPage(1);
  }, [searchQuery, statusFilter]);

  // Form Input Penawaran 2 Vendor & ETA State
  const [poForm, setPoForm] = useState({
    vendor_1_nama: '',
    vendor_1_harga: 0,
    vendor_2_nama: '',
    vendor_2_harga: 0,
    vendor_terpilih: '',
    harga_kesepakatan: 0,
    estimasi_tanggal_ready_eta: '',
    estimasi_jam_ready_eta: '',
    catatan_purchasing: '',
  });

  // Queries
  const { data: purchasingList } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
    refetchInterval: 8000,
  });

  const { data: spkList } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
  });

  // Submit PO & ETA
  const submitPoMutation = useMutation({
    mutationFn: async (pr: PurchaseRequestPart) => {
      if (pr.no_po) {
        throw new Error(`PR ${pr.no_pr} sudah memiliki PO ${pr.no_po}. Lihat di filter "PO Diterbitkan".`);
      }
      const poNo = `PO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      return api.buatPO({
        no_po: poNo,
        id_pr: pr.pr_id,
        id_spk: pr.id_spk,
        nama_admin_purchasing: currentUser,
        vendor_1_nama: poForm.vendor_1_nama,
        vendor_1_harga: poForm.vendor_1_harga,
        vendor_2_nama: poForm.vendor_2_nama,
        vendor_2_harga: poForm.vendor_2_harga,
        vendor_terpilih: poForm.vendor_terpilih,
        harga_kesepakatan: poForm.harga_kesepakatan,
        estimasi_tanggal_ready_eta: poForm.estimasi_tanggal_ready_eta,
        estimasi_jam_ready_eta: poForm.estimasi_jam_ready_eta,
        catatan_purchasing: poForm.catatan_purchasing,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      toast.success('PO berhasil diterbitkan! Status PR menjadi "PO Diterbitkan" — pantau di filter tersebut.');
      setIsProcessingPo(false);
      setSelectedPr(null);
      setPoForm({
        vendor_1_nama: '',
        vendor_1_harga: 0,
        vendor_2_nama: '',
        vendor_2_harga: 0,
        vendor_terpilih: '',
        harga_kesepakatan: 0,
        estimasi_tanggal_ready_eta: '',
        estimasi_jam_ready_eta: '',
        catatan_purchasing: '',
      });
    },
    onError: (err: any) => toast.error('Gagal membuat PO: ' + (err?.message || 'Terjadi kesalahan.')),
  });

  // Simpan ETA setelah SA menyetujui PO
  const updateEtaMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPr?.po_id) throw new Error('PO belum diterbitkan.');
      if (!poForm.estimasi_tanggal_ready_eta || !poForm.estimasi_jam_ready_eta) {
        throw new Error('Isi tanggal & jam ETA terlebih dahulu.');
      }
      return api.updatePOETA({
        id: selectedPr.po_id,
        estimasi_tanggal_ready_eta: poForm.estimasi_tanggal_ready_eta,
        estimasi_jam_ready_eta: poForm.estimasi_jam_ready_eta,
        catatan_purchasing: poForm.catatan_purchasing || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      realtimeHub.publish({
        type: 'SPK_STATUS_CHANGED',
        targetRoles: ['SA'],
        title: 'ETA Barang Diperbarui',
        message: `Purchasing menginput ETA barang ready untuk ${selectedPr?.no_pr} (${selectedPr?.no_polisi}): ${poForm.estimasi_tanggal_ready_eta} ${poForm.estimasi_jam_ready_eta}.`,
        linkTab: 'sa',
        urgency: 'info',
      });
      toast.success('ETA berhasil disimpan! Menunggu barang tiba untuk konfirmasi ready.');
    },
    onError: (err: any) => toast.error('Gagal menyimpan ETA: ' + (err?.message || 'Terjadi kesalahan.')),
  });

  // Konfirmasi Barang Ready / Tiba di Bengkel
  const barangReadyMutation = useMutation({
    mutationFn: async (pr: PurchaseRequestPart) => {
      return api.konfirmasiBarangReady({
        id_pr: pr.pr_id,
        id_spk: pr.id_spk,
      });
    },
    onSuccess: async (_, pr) => {
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      const mechanicId = resolveMechanicId(spkList, pr.id_spk);
      if (mechanicId) {
        realtimeHub.publish({
          type: 'SPK_STATUS_CHANGED',
          targetRoles: ['Mekanik'],
          targetUserId: mechanicId,
          title: 'Barang Ready di Bengkel KIM3',
          message: `Sparepart untuk kendaraan ${pr.no_polisi} telah ready di bengkel. SA finalisasi estimasi untuk approval customer sebelum WO dimulai.`,
          linkTab: 'mekanik',
          urgency: 'info',
        });
      }

      realtimeHub.publish({
        type: 'SPK_STATUS_CHANGED',
        targetRoles: ['Foreman', 'SA'],
        title: 'Barang Ready di Bengkel KIM3',
        message: `Sparepart untuk kendaraan ${pr.no_polisi} telah ready di bengkel. SA finalisasi estimasi untuk approval customer.`,
        linkTab: 'foreman',
        urgency: 'success',
      });

      await publishKeCustomer({
        type: 'SPK_STATUS_CHANGED',
        title: 'Sparepart Kendaraan Tersedia',
        message: `Sparepart untuk kendaraan ${pr.no_polisi} telah tiba di bengkel. SA sedang finalisasi estimasi untuk persetujuan Anda.`,
        linkTab: 'fleet-status',
        urgency: 'info',
        noPolisi: pr.no_polisi,
      });
      toast.success(`Barang untuk ${pr.no_polisi} telah dikonfirmasi READY! Status SPK kembali ke "Estimasi Dibuat" untuk finalisasi SA.`);
    },
    onError: (err: any) => toast.error('Gagal konfirmasi barang ready: ' + (err?.message || 'Terjadi kesalahan.')),
  });

  const allPr = purchasingList || [];
  const totalPrCount = allPr.length;
  const poApproved = (selectedPr?.status_konfirmasi_sa || '') === 'Disetujui SA';
  const poHasEta = !!(selectedPr?.estimasi_tanggal_ready_eta);
  const pendingPoCount = allPr.filter(p => !p.no_po).length;
  const poActiveCount = allPr.filter(p => p.no_po && p.status_pr !== 'Barang Ready').length;
  const barangReadyCount = allPr.filter(p => p.status_pr === 'Barang Ready').length;

  const filteredPrList = allPr.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    const matchSearch = !query ||
      item.no_pr?.toLowerCase().includes(query) ||
      item.no_polisi?.toLowerCase().includes(query) ||
      item.nama_customer?.toLowerCase().includes(query) ||
      item.catatan_pr?.toLowerCase().includes(query) ||
      item.vendor_terpilih?.toLowerCase().includes(query);

    if (!matchSearch) return false;
    if (statusFilter === 'Belum Ada PO') return !item.no_po;
    if (statusFilter === 'PO Diterbitkan') return !!item.no_po && item.status_pr !== 'Barang Ready';
    if (statusFilter === 'Barang Ready') return item.status_pr === 'Barang Ready';
    return true;
  });

  const totalPrPages = Math.ceil(filteredPrList.length / prLimit) || 1;
  const paginatedPrList = filteredPrList.slice((prPage - 1) * prLimit, prPage * prLimit);

  const filterChipsData = [
    { id: 'Semua', label: 'Semua', count: totalPrCount },
    { id: 'Belum Ada PO', label: 'Belum Ada PO', count: pendingPoCount },
    { id: 'PO Diterbitkan', label: 'PO Diterbitkan', count: poActiveCount },
    { id: 'Barang Ready', label: 'Barang Ready', count: barangReadyCount },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <SectionHeader
        title="Admin Purchasing - Pengadaan Part (Part Indent)"
        description="Proses Penawaran Min. 2 Vendor, Kesepakatan PO, dan Input Estimasi Ketersediaan (ETA)"
        badge={
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-red-bg text-status-red text-xs font-bold border border-status-red/30">
            <Clock className="w-3.5 h-3.5 text-status-red" /> Integrasi Lead Time Otomatis
          </span>
        }
      />

      {/* Mini KPI Banners for Purchasing */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Total PR Masuk"
          value={totalPrCount}
          subtitle="Seluruh permintaan"
          icon={ShoppingBag}
          tone="accent"
          active={statusFilter === 'Semua'}
          onClick={() => setStatusFilter('Semua')}
        />
        <StatCard
          title="Perlu Proses 2 Vendor"
          value={pendingPoCount}
          subtitle="Belum ada PO"
          icon={Building2}
          tone="amber"
          active={statusFilter === 'Belum Ada PO'}
          onClick={() => setStatusFilter('Belum Ada PO')}
        />
        <StatCard
          title="PO Aktif / Menunggu ETA"
          value={poActiveCount}
          subtitle="Dalam pengiriman vendor"
          icon={Clock}
          tone="blue"
          active={statusFilter === 'PO Diterbitkan'}
          onClick={() => setStatusFilter('PO Diterbitkan')}
        />
        <StatCard
          title="Barang Ready"
          value={barangReadyCount}
          subtitle="Tiba di bengkel"
          icon={PackageCheck}
          tone="green"
          active={statusFilter === 'Barang Ready'}
          onClick={() => setStatusFilter('Barang Ready')}
        />
      </div>

      {/* Main Container */}
      <div className="card-modern p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Daftar Purchase Request (PR) Masuk</h2>
            <p className="text-xs text-ink-muted">Part yang tidak ready di stock dari SPK Bengkel</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface text-ink-muted self-start sm:self-auto border border-border">
            {filteredPrList.length} Permintaan Ditemukan
          </span>
        </div>

        {/* Live Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari No. PR, No. Polisi, Customer, atau Vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-border text-xs bg-surface focus:bg-surface-raised focus:ring-2 focus:ring-accent focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink-muted text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <FilterChips
            options={filterChipsData}
            selectedId={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
          />
        </div>

        {/* PR List via ListItemCard */}
        <div className="space-y-3">
          {paginatedPrList.length > 0 ? (
            paginatedPrList.map((item) => (
              <ListItemCard
                key={item.pr_id}
                title={item.no_polisi}
                subtitle={`${item.no_pr} • ${item.nama_customer || 'Customer'} • Pemohon: ${item.nama_sa_pemohon || '-'}`}
                badge={<StatusBadge status={item.status_pr} size="sm" />}
                chips={[
                  new Date(item.tanggal_pr).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  }),
                  item.no_po ? `PO: ${item.no_po}` : 'Belum Ada PO'
                ]}
                onClick={() => setSelectedPr(item)}
              />
            ))
          ) : (
            <EmptyState
              title="Tidak Ditemukan Permintaan"
              description={`Tidak ada permintaan sparepart yang sesuai dengan filter "${statusFilter}" atau pencarian.`}
            />
          )}
        </div>

        {/* Pagination Bar */}
        <PaginationBar
          page={prPage}
          totalPages={totalPrPages}
          totalRecords={filteredPrList.length}
          limit={prLimit}
          onPageChange={setPrPage}
          onLimitChange={(newLimit) => {
            setPrLimit(newLimit);
            setPrPage(1);
          }}
          label="permintaan PR"
        />
      </div>

      {/* DetailModal: Rincian PR & Status PO */}
      {selectedPr && (
        <DetailModal
          open={Boolean(selectedPr)}
          onClose={() => {
            setSelectedPr(null);
            setIsProcessingPo(false);
          }}
          title={`Purchase Request ${selectedPr.no_pr}`}
          subtitle={`${selectedPr.no_polisi} • ${selectedPr.nama_customer}`}
          badge={<StatusBadge status={selectedPr.status_pr} size="sm" />}
          size="lg"
          tabs={[
            {
              id: 'rincian',
              label: 'Informasi PR',
              content: (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-surface rounded-xl border border-border">
                      <span className="text-ink-muted text-xs block">Kendaraan</span>
                      <span className="font-bold text-ink text-sm">{selectedPr.no_polisi}</span>
                    </div>
                    <div className="p-3 bg-surface rounded-xl border border-border">
                      <span className="text-ink-muted text-xs block">Customer</span>
                      <span className="font-bold text-ink text-sm">{selectedPr.nama_customer}</span>
                    </div>
                    <div className="p-3 bg-surface rounded-xl border border-border">
                      <span className="text-ink-muted text-xs block">SA Pemohon</span>
                      <span className="font-bold text-ink text-sm">{selectedPr.nama_sa_pemohon}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-surface rounded-xl border border-border space-y-1">
                    <span className="font-bold text-ink uppercase tracking-wider text-xs block">Catatan Kebutuhan Part:</span>
                    <p className="text-ink leading-relaxed">{selectedPr.catatan_pr}</p>
                  </div>

                  {selectedPr.no_po && (
                    <div className="p-4 bg-surface rounded-xl border border-border space-y-2.5">
                      <span className="font-bold text-ink uppercase tracking-wider text-xs block">Status Purchase Order (PO):</span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-ink-muted">No. PO:</span> <span className="font-mono font-bold text-ink">{selectedPr.no_po}</span></div>
                        <div><span className="text-ink-muted">Vendor:</span> <span className="font-bold text-ink">{selectedPr.vendor_terpilih || '-'}</span></div>
                        <div><span className="text-ink-muted">Harga Kesepakatan:</span> <span className="font-mono font-bold text-ink">Rp {Number(selectedPr.harga_kesepakatan || 0).toLocaleString('id-ID')}</span></div>
                        <div><span className="text-ink-muted">Konfirmasi SA:</span> <span className="font-bold text-status-green">{selectedPr.status_konfirmasi_sa || '-'}</span></div>
                        {selectedPr.estimasi_tanggal_ready_eta && (
                          <div className="col-span-2"><span className="text-ink-muted">Estimasi ETA:</span> <span className="font-mono font-bold text-status-red">{selectedPr.estimasi_tanggal_ready_eta} {selectedPr.estimasi_jam_ready_eta}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'po',
              label: selectedPr.no_po ? 'Data & Status PO' : 'Proses PO (2 Vendor)',
              content: (
                <div className="space-y-4 text-xs">
                  {selectedPr.no_po && poApproved && poHasEta ? (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-status-green-bg border border-status-green/30 text-status-green text-xs font-bold flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>PO {selectedPr.no_po} telah lengkap diterbitkan dan disetujui SA.</span>
                      </div>
                      <div className="p-4 bg-surface rounded-xl border border-border space-y-2">
                        <div className="flex justify-between py-1 border-b border-border">
                          <span className="text-ink-muted">Vendor Terpilih:</span>
                          <span className="font-bold text-ink">{selectedPr.vendor_terpilih || '-'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border">
                          <span className="text-ink-muted">Harga Kesepakatan:</span>
                          <span className="font-mono font-bold text-ink">Rp {Number(selectedPr.harga_kesepakatan || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border">
                          <span className="text-ink-muted">Estimasi Tiba (ETA):</span>
                          <span className="font-mono font-bold text-status-red">{selectedPr.estimasi_tanggal_ready_eta || '-'} {selectedPr.estimasi_jam_ready_eta || ''}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-ink-muted">Konfirmasi SA:</span>
                          <span className={`font-bold ${selectedPr.status_konfirmasi_sa === 'Disetujui SA' ? 'text-status-green' : 'text-status-amber'}`}>
                            {selectedPr.status_konfirmasi_sa || 'Menunggu'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        Saat barang tiba di bengkel KIM3, klik tombol <strong>Konfirmasi Barang Ready</strong> di bawah untuk memasukkan stok ke sistem.
                      </p>
                    </div>
                  ) : !selectedPr.no_po ? (
                    <div className="space-y-3 text-center py-4">
                      <div className="w-12 h-12 rounded-2xl bg-status-amber-bg text-status-amber flex items-center justify-center mx-auto mb-2">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-ink">Belum Ada PO Diterbitkan</h4>
                      <p className="text-xs text-ink-muted max-w-sm mx-auto">
                        Sesuai SOP, Purchasing wajib memproses penawaran minimal 2 vendor sebelum menerbitkan PO resmi.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPoStep(0);
                          setIsProcessingPo(true);
                        }}
                        className="mt-3 px-5 py-2.5 rounded-xl bg-status-red hover:bg-status-red/90 text-white font-bold text-xs shadow-md shadow-status-red/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Mulai Proses PO (3 Tahap) →</span>
                      </button>
                    </div>
                  ) : !poApproved ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-surface rounded-xl border border-border space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-ink-muted">No. PO:</span>
                          <span className="font-mono font-bold text-ink">{selectedPr.no_po}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Vendor Terpilih:</span>
                          <span className="font-bold text-ink">{selectedPr.vendor_terpilih || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Harga Deal:</span>
                          <span className="font-mono font-bold text-ink">Rp {Number(selectedPr.harga_kesepakatan || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Konfirmasi SA:</span>
                          <span className="font-bold text-status-amber">{selectedPr.status_konfirmasi_sa || 'Menunggu Konfirmasi'}</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-status-amber-bg border border-status-amber/30 text-status-amber text-xs font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>Menunggu SA menyetujui penawaran. Form input ETA terbuka setelah disetujui.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="p-3.5 rounded-xl bg-status-green-bg border border-status-green/30 text-status-green text-xs font-bold flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>SA menyetujui PO {selectedPr.no_po}. Lanjutkan pembelian &amp; input ETA.</span>
                      </div>
                      <div className="p-4 bg-surface rounded-xl border border-border space-y-2.5">
                        <span className="font-bold text-ink text-xs flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-accent" />
                          Input Tanggal &amp; Jam Barang Ready (ETA):
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="date"
                            value={poForm.estimasi_tanggal_ready_eta}
                            onChange={(e) => setPoForm({ ...poForm, estimasi_tanggal_ready_eta: e.target.value })}
                            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                            className="w-full px-3 py-2 rounded-xl border border-border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer bg-surface text-ink"
                          />
                          <input
                            type="time"
                            value={poForm.estimasi_jam_ready_eta}
                            onChange={(e) => setPoForm({ ...poForm, estimasi_jam_ready_eta: e.target.value })}
                            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                            className="w-full px-3 py-2 rounded-xl border border-border font-mono text-xs focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer bg-surface text-ink"
                          />
                        </div>
                        <p className="text-xs text-ink-muted italic">
                          *Estimasi ini tampil ke SA &amp; customer sebagai perkiraan barang tiba.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={updateEtaMutation.isPending || !poForm.estimasi_tanggal_ready_eta || !poForm.estimasi_jam_ready_eta}
                        onClick={() => updateEtaMutation.mutate()}
                        className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-accent/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Calendar className="w-4 h-4" /> SIMPAN ETA &amp; LANJUT PEMBELIAN
                      </button>
                    </div>
                  )}
                </div>
              ),
            }
          ]}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <button
                type="button"
                onClick={() => setSelectedPr(null)}
                className="px-4 py-2 bg-surface hover:bg-surface-raised border border-border text-ink-muted hover:text-ink font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
              {selectedPr.status_konfirmasi_sa === 'Disetujui SA' && selectedPr.status_pr !== 'Barang Ready' && (
                <button
                  type="button"
                  disabled={barangReadyMutation.isPending}
                  onClick={() => {
                    barangReadyMutation.mutate(selectedPr);
                    setSelectedPr(null);
                  }}
                  className="px-4 py-2 bg-status-green hover:bg-status-green/90 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" /> Konfirmasi Barang Ready
                </button>
              )}
            </div>
          }
        />
      )}

      {/* StepModal: Proses Penerbitan PO (3 Tahap) */}
      {selectedPr && isProcessingPo && (
        <StepModal
          open={true}
          onClose={() => setIsProcessingPo(false)}
          title={`Proses PO untuk ${selectedPr.no_pr}`}
          subtitle={`Kendaraan: ${selectedPr.no_polisi} • ${selectedPr.nama_customer || 'Customer'}`}
          currentStep={poStep}
          onNext={() => setPoStep((prev) => prev + 1)}
          onBack={() => setPoStep((prev) => prev - 1)}
          onSubmit={() => submitPoMutation.mutate(selectedPr)}
          submitLabel="Terbitkan & Kirim PO ke SA"
          isPending={submitPoMutation.isPending}
          size="lg"
          steps={[
            {
              id: 'vendor_penawaran',
              label: 'Penawaran 2 Vendor',
              isValid: Boolean(
                poForm.vendor_1_nama.trim() &&
                poForm.vendor_1_harga > 0 &&
                poForm.vendor_2_nama.trim() &&
                poForm.vendor_2_harga > 0
              ),
              content: (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-status-amber-bg border border-status-amber/30 text-status-amber text-xs leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Purchasing wajib menginput penawaran minimal 2 vendor sebelum PO diterbitkan.</span>
                  </div>

                  {/* Vendor 1 */}
                  <div className="p-3.5 bg-surface rounded-xl border border-border space-y-2">
                    <span className="font-bold text-ink block text-xs">Penawaran Vendor 1:</span>
                    <input
                      type="text"
                      placeholder="Nama vendor 1"
                      value={poForm.vendor_1_nama}
                      onChange={(e) => setPoForm({ ...poForm, vendor_1_nama: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-ink"
                    />
                    <input
                      type="number"
                      placeholder="Harga penawaran vendor 1 (Rp)"
                      value={poForm.vendor_1_harga || ''}
                      onChange={(e) => setPoForm({ ...poForm, vendor_1_harga: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl border border-border font-mono text-xs focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-ink"
                    />
                  </div>

                  {/* Vendor 2 */}
                  <div className="p-3.5 bg-surface rounded-xl border border-border space-y-2">
                    <span className="font-bold text-ink block text-xs">Penawaran Vendor 2:</span>
                    <input
                      type="text"
                      placeholder="Nama vendor 2"
                      value={poForm.vendor_2_nama}
                      onChange={(e) => setPoForm({ ...poForm, vendor_2_nama: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-ink"
                    />
                    <input
                      type="number"
                      placeholder="Harga penawaran vendor 2 (Rp)"
                      value={poForm.vendor_2_harga || ''}
                      onChange={(e) => setPoForm({ ...poForm, vendor_2_harga: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl border border-border font-mono text-xs focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-ink"
                    />
                  </div>
                </div>
              ),
            },
            {
              id: 'vendor_terpilih',
              label: 'Vendor Terpilih & Deal',
              isValid: Boolean(poForm.vendor_terpilih.trim() && poForm.harga_kesepakatan > 0),
              content: (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Pilih Vendor yang Disetujui</label>
                      <input
                        type="text"
                        placeholder="Nama vendor terpilih"
                        value={poForm.vendor_terpilih}
                        onChange={(e) => setPoForm({ ...poForm, vendor_terpilih: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-border text-xs font-semibold focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-ink"
                      />
                      {/* Shortcut buttons from Step 1 */}
                      <div className="flex gap-1.5 mt-1.5">
                        {poForm.vendor_1_nama && (
                          <button
                            type="button"
                            onClick={() => setPoForm({ ...poForm, vendor_terpilih: poForm.vendor_1_nama, harga_kesepakatan: poForm.vendor_1_harga })}
                            className="text-xs px-2 py-0.5 rounded-md bg-surface border border-border text-ink-muted hover:text-accent cursor-pointer"
                          >
                            Pakai Vendor 1
                          </button>
                        )}
                        {poForm.vendor_2_nama && (
                          <button
                            type="button"
                            onClick={() => setPoForm({ ...poForm, vendor_terpilih: poForm.vendor_2_nama, harga_kesepakatan: poForm.vendor_2_harga })}
                            className="text-xs px-2 py-0.5 rounded-md bg-surface border border-border text-ink-muted hover:text-accent cursor-pointer"
                          >
                            Pakai Vendor 2
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Harga Kesepakatan Final (Rp)</label>
                      <input
                        type="number"
                        placeholder="Nominal harga deal"
                        value={poForm.harga_kesepakatan || ''}
                        onChange={(e) => setPoForm({ ...poForm, harga_kesepakatan: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 rounded-xl border border-border font-mono font-bold text-xs focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-ink"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Catatan Purchasing untuk SA</label>
                    <textarea
                      rows={3}
                      placeholder="Informasi pengiriman, ketersediaan, atau catatan khusus..."
                      value={poForm.catatan_purchasing}
                      onChange={(e) => setPoForm({ ...poForm, catatan_purchasing: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-ink"
                    />
                  </div>
                </div>
              ),
            },
            {
              id: 'konfirmasi',
              label: 'Konfirmasi & Terbitkan',
              content: (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-surface rounded-xl border border-border space-y-2.5">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Ringkasan Purchase Order:</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-ink-muted">No. PR:</span>
                        <span className="font-bold text-ink">{selectedPr.no_pr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Kendaraan:</span>
                        <span className="font-bold text-ink">{selectedPr.no_polisi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Vendor 1:</span>
                        <span className="text-ink">{poForm.vendor_1_nama} (Rp {Number(poForm.vendor_1_harga || 0).toLocaleString('id-ID')})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Vendor 2:</span>
                        <span className="text-ink">{poForm.vendor_2_nama} (Rp {Number(poForm.vendor_2_harga || 0).toLocaleString('id-ID')})</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border">
                        <span className="text-ink-muted">Vendor Terpilih:</span>
                        <span className="font-bold text-accent">{poForm.vendor_terpilih}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Harga Kesepakatan:</span>
                        <span className="font-mono font-bold text-ink">Rp {Number(poForm.harga_kesepakatan || 0).toLocaleString('id-ID')}</span>
                      </div>
                      {poForm.catatan_purchasing && (
                        <div className="pt-1 text-ink-muted">
                          <span className="text-ink-subtle block">Catatan:</span>
                          <p>{poForm.catatan_purchasing}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-accent-subtle text-accent text-xs flex items-center gap-2">
                    <Send className="w-4 h-4 shrink-0" />
                    <span>Setelah diterbitkan, Service Advisor akan menerima notifikasi untuk menyetujui PO.</span>
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}

    </div>
  );
};

export default PurchasingView;
