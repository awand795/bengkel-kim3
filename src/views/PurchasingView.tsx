import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/common/StatusBadge';
import { PurchaseRequestPart } from '../types';
import { PaginationBar } from '../components/common/PaginationBar';
import { ModalPortal } from '../components/common/ModalPortal';
import { 
  ShoppingBag, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Building2, 
  Check, 
  X, 
  AlertCircle, 
  Plus,
  Send,
  Truck,
  PackageCheck,
  Search,
  Filter
} from 'lucide-react';
import { realtimeHub, publishKeCustomer } from '../services/realtimeService';
import { toast } from '../components/common/Toast';
import { resolveMechanicId } from '../utils/spkAccess';

export const PurchasingView: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const [selectedPr, setSelectedPr] = useState<PurchaseRequestPart | null>(null);

  // Search & Filter State — default antrian yang belum diproses (chips = menu riwayat proses)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Belum Ada PO' | 'PO Diterbitkan' | 'Barang Ready'>('Belum Ada PO');

  // Pagination State
  const [prPage, setPrPage] = useState(1);
  const [prLimit, setPrLimit] = useState(10);

  React.useEffect(() => {
    setPrPage(1);
  }, [searchQuery, statusFilter]);

  // Form Input Penawaran 2 Vendor & ETA State (image1.png Kotak Merah)
  // ETA default kosong: diinput TERPISAH setelah SA menyetujui PO (Excel tahap 6).
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
  const { data: purchasingList, isLoading } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
    refetchInterval: 8000,
  });

  // Daftar SPK (cache bersama) untuk resolusi mekanik ter-assign saat notifikasi personal.
  const { data: spkList } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
  });

  // Submit PO & ETA
  const submitPoMutation = useMutation({
    mutationFn: async (pr: PurchaseRequestPart) => {
      // Cegah PO ganda: PR yang sudah ber-PO tidak bisa diterbitkan lagi
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

  // Simpan ETA setelah SA menyetujui PO (Excel tahap 6 langkah 5)
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

  // Konfirmasi Barang Ready / Tiba di Bengkel.
  // Satu panggilan atomic /kim3/barang-ready: stok += qty indent, part jadi Ready,
  // PR -> Barang Ready, SPK -> Estimasi Dibuat (finalisasi SA + approval customer).
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
      // 1a. Notifikasi personal ke mekanik ter-assign (hanya dia yang menerima).
      // Bila belum ada mekanik ter-assign, peran Mekanik dilewati (ketat).
      const mechanicId = resolveMechanicId(spkList, pr.id_spk);
      if (mechanicId) {
        realtimeHub.publish({
          type: 'SPK_STATUS_CHANGED',
          targetRoles: ['Mekanik'],
          targetUserId: mechanicId,
          title: 'Barang Ready di Bengkel KIM3',
          message: `Sparepart untuk armada ${pr.no_polisi} telah ready di bengkel. SA finalisasi estimasi untuk approval customer sebelum WO dimulai.`,
          linkTab: 'mekanik',
          urgency: 'info',
        });
      }

      // 1b. Notifikasi untuk Foreman & SA (koordinator & pemohon PR).
      realtimeHub.publish({
        type: 'SPK_STATUS_CHANGED',
        targetRoles: ['Foreman', 'SA'],
        title: 'Barang Ready di Bengkel KIM3',
        message: `Sparepart untuk armada ${pr.no_polisi} telah ready di bengkel. SA finalisasi estimasi untuk approval customer.`,
        linkTab: 'foreman',
        urgency: 'success',
      });

      // 2. Notifikasi untuk Customer pemilik plat SAJA (anti-bocor antar akun)
      await publishKeCustomer({
        type: 'SPK_STATUS_CHANGED',
        title: 'Sparepart Armada Tersedia',
        message: `Sparepart untuk armada ${pr.no_polisi} telah tiba di bengkel. SA sedang finalisasi estimasi untuk persetujuan Anda.`,
        linkTab: 'fleet-status',
        urgency: 'info',
        noPolisi: pr.no_polisi,
      });
      toast.success(`Barang untuk ${pr.no_polisi} telah dikonfirmasi READY! Status SPK kembali ke "Estimasi Dibuat" untuk finalisasi SA.`);
    },
    onError: (err: any) => toast.error('Gagal konfirmasi barang ready: ' + (err?.message || 'Terjadi kesalahan.')),
  });

  // Derived statistics and filtering
  const allPr = purchasingList || [];
  const totalPrCount = allPr.length;
  // Status turunan PO terpilih untuk panel berfase (Excel tahap 6)
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

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-surface-raised rounded-md p-4 sm:p-5 border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-status-red-bg text-status-red flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-ink">Admin Purchasing - Pengadaan Part (Kotak Merah)</h1>
            <p className="text-xs text-ink-muted">Proses Penawaran Min. 2 Vendor, Kesepakatan PO, dan Input Estimasi Ketersediaan (ETA)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-status-red-bg text-status-red text-xs font-bold border border-status-red/30">
          <Clock className="w-4 h-4 text-status-red" />
          <span>Integrasi Lead Time Otomatis</span>
        </div>
      </div>

      {/* Mini KPI Banners for Purchasing */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('Semua')}
          className={`p-3.5 sm:p-4 rounded-md border transition-all cursor-pointer ${
            statusFilter === 'Semua' ? 'bg-accent-subtle border-accent/30 ring-2 ring-accent/20 shadow-xs' : 'bg-surface-raised border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted">Total PR Masuk</span>
            <div className="w-7 h-7 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-accent mt-1">{totalPrCount}</div>
          <span className="text-[10px] text-ink-subtle">Seluruh permintaan</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Belum Ada PO')}
          className={`p-3.5 sm:p-4 rounded-md border transition-all cursor-pointer ${
            statusFilter === 'Belum Ada PO' ? 'bg-status-amber-bg border-status-amber/30 ring-2 ring-status-amber/20 shadow-xs' : 'bg-surface-raised border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-status-amber">Perlu Proses 2 Vendor</span>
            <div className="w-7 h-7 rounded-md bg-status-amber-bg text-status-amber flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-status-amber mt-1">{pendingPoCount}</div>
          <span className="text-[10px] text-status-amber">Belum ada PO</span>
        </div>

        <div 
          onClick={() => setStatusFilter('PO Diterbitkan')}
          className={`p-3.5 sm:p-4 rounded-md border transition-all cursor-pointer ${
            statusFilter === 'PO Diterbitkan' ? 'bg-status-blue-bg border-status-blue/30 ring-2 ring-status-blue/20 shadow-xs' : 'bg-surface-raised border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-status-blue">PO Aktif / Menunggu ETA</span>
            <div className="w-7 h-7 rounded-md bg-status-blue-bg text-status-blue flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-status-blue mt-1">{poActiveCount}</div>
          <span className="text-[10px] text-status-blue">Dalam pengiriman vendor</span>
        </div>

        <div 
          onClick={() => setStatusFilter('Barang Ready')}
          className={`p-3.5 sm:p-4 rounded-md border transition-all cursor-pointer ${
            statusFilter === 'Barang Ready' ? 'bg-status-green-bg border-status-green/30 ring-2 ring-status-green/20 shadow-xs' : 'bg-surface-raised border-border hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-status-green">Barang Ready</span>
            <div className="w-7 h-7 rounded-md bg-status-green-bg text-status-green flex items-center justify-center">
              <PackageCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-status-green mt-1">{barangReadyCount}</div>
          <span className="text-[10px] text-status-green">Tiba di bengkel</span>
        </div>
      </div>

      {/* List Purchase Request (full width — form pindah ke modal) */}
      <div>
        {/* List Purchase Request dari SA */}
        <div className="space-y-4">
          <div className="bg-surface-raised rounded-md border border-border p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">Daftar Purchase Request (PR) Masuk</h2>
                <p className="text-xs text-ink-muted">Part yang tidak ready di stock dari SPK Bengkel</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface text-ink-muted self-start sm:self-auto">
                {filteredPrList.length} Permintaan Ditemukan
              </span>
            </div>

            {/* Live Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari No. PR, No. Polisi, Customer, atau Vendor..."
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
                {(['Semua', 'Belum Ada PO', 'PO Diterbitkan', 'Barang Ready'] as const).map((st) => (
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

            <div className="space-y-3">
              {paginatedPrList.length > 0 ? (
                paginatedPrList.map((item) => (
                  <div
                    key={item.pr_id}
                    onClick={() => setSelectedPr(item)}
                    className={`p-4 rounded-md border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                      selectedPr?.pr_id === item.pr_id
                        ? 'border-status-red bg-status-red-bg shadow-xs'
                        : 'border-border hover:border-border hover:bg-surface/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-status-red">{item.no_pr}</span>
                      <StatusBadge status={item.status_pr} size="sm" />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <div className="text-sm font-black text-ink">{item.no_polisi} - {item.nama_customer}</div>
                        <div className="text-xs text-ink-muted">Pemohon SA: <strong>{item.nama_sa_pemohon}</strong></div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-ink-subtle block text-[10px]">Tgl Pengajuan:</span>
                        <span className="font-semibold text-ink-muted">
                          {new Date(item.tanggal_pr).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-ink-muted bg-surface-raised/90 p-2.5 rounded-md border border-border">
                      <span className="font-bold text-ink">Kebutuhan Part:</span> {item.catatan_pr}
                    </div>

                    {/* Jika sudah ada PO & ETA */}
                    {item.no_po && (
                      <div className="mt-2 pt-2 border-t border-status-red/30 space-y-2">
                        <div className="flex flex-wrap items-center justify-between text-xs text-status-red font-semibold gap-2">
                          <span>PO: {item.no_po} ({item.vendor_terpilih})</span>
                          <span className="bg-status-red-bg text-status-red px-2 py-0.5 rounded-md font-mono">
                            ETA: {item.estimasi_tanggal_ready_eta} {item.estimasi_jam_ready_eta}
                          </span>
                          <span>Konfirmasi SA: <strong className={item.status_konfirmasi_sa === 'Disetujui SA' ? 'text-status-green' : 'text-status-amber'}>{item.status_konfirmasi_sa || 'Menunggu'}</strong></span>
                        </div>

                        {/* Tombol Konfirmasi Barang Ready: hanya bila disetujui SA DAN belum ready.
                            PR yang sudah Barang Ready tidak bisa dikonfirmasi ulang (stok anti-ganda). */}
                        {item.status_konfirmasi_sa === 'Disetujui SA' && item.status_pr !== 'Barang Ready' && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-status-green font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Disetujui SA
                            </span>
                            <button
                              type="button"
                              disabled={barangReadyMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                barangReadyMutation.mutate(item);
                              }}
                              className="px-3 py-1.5 bg-status-green hover:bg-status-green/90 text-white rounded-md font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
                            >
                              <PackageCheck className="w-4 h-4" /> KONFIRMASI BARANG READY
                            </button>
                          </div>
                        )}
                        {item.status_pr === 'Barang Ready' && (
                          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-status-green font-bold">
                            <Check className="w-3.5 h-3.5" />
                            <span>Barang sudah dikonfirmasi tiba — stok bertambah, SPK kembali ke SA.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-ink-subtle text-xs bg-surface rounded-md border border-dashed border-border">
                  Tidak ditemukan permintaan sparepart yang sesuai dengan pencarian atau filter "{statusFilter}".
                </div>
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
        </div>

        {/* MODAL: Form Proses Penawaran 2 Vendor & Input ETA */}
        {selectedPr && (
          <ModalPortal onClose={() => setSelectedPr(null)}>
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-surface-raised rounded-md max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-border my-8">
          {selectedPr ? (
            <div className="space-y-4">
              <div className="border-b border-border pb-3 flex items-start justify-between gap-3">
                <div>
                <span className="text-[10px] uppercase font-bold text-status-red">Alur Kotak Merah Tahap 6</span>
                <h3 className="text-base font-black text-ink">{selectedPr.no_pr}</h3>
                <p className="text-xs text-ink-muted font-bold">{selectedPr.no_polisi} - {selectedPr.nama_customer}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPr(null)}
                  className="p-2 rounded-md text-ink-subtle hover:text-ink hover:bg-surface transition-colors shrink-0"
                  aria-label="Tutup form purchasing"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                
                {selectedPr.no_po && poApproved && poHasEta ? (
                  /* PO lengkap (vendor + disetujui SA + ETA): read-only */
                  <div className="space-y-3">
                    <div className="p-3 rounded-md bg-status-green-bg border border-status-green/30 text-status-green text-[11px] font-bold flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>PO {selectedPr.no_po} sudah diterbitkan untuk PR ini.</span>
                    </div>
                    <div className="p-3 bg-surface rounded-md border border-border space-y-2">
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Vendor terpilih:</span>
                        <span className="font-bold text-ink">{selectedPr.vendor_terpilih || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Harga deal:</span>
                        <span className="font-mono font-bold text-ink">Rp {Number(selectedPr.harga_kesepakatan || 0).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">ETA ready:</span>
                        <span className="font-mono font-bold text-ink">{selectedPr.estimasi_tanggal_ready_eta || '-'} {selectedPr.estimasi_jam_ready_eta || ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Konfirmasi SA:</span>
                        <span className={`font-bold ${selectedPr.status_konfirmasi_sa === 'Disetujui SA' ? 'text-status-green' : 'text-status-amber'}`}>
                          {selectedPr.status_konfirmasi_sa || 'Menunggu Konfirmasi'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      Langkah berikutnya: pantau konfirmasi SA di daftar PR, lalu gunakan tombol <strong>KONFIRMASI BARANG READY</strong> pada kartu PR saat barang tiba.
                    </p>
                  </div>
                ) : (
                !selectedPr.no_po ? (
                <>
                {/* Fase A: penawaran vendor (tanpa ETA — ETA diinput setelah SA setuju) */}
                <div className="p-2.5 rounded-md bg-status-amber-bg border border-status-amber/30 text-status-amber text-[11px] leading-relaxed">
                  <strong>Aturan SOP:</strong> Purchasing wajib memproses penawaran harga minimal 2 vendor sebelum menerbitkan PO.
                </div>

                {/* Vendor 1 */}
                <div className="p-3 bg-surface rounded-md border border-border space-y-2">
                  <span className="font-bold text-ink block">Penawaran Vendor 1:</span>
                  <input
                    type="text"
                    placeholder="Nama Vendor 1"
                    value={poForm.vendor_1_nama}
                    onChange={(e) => setPoForm({ ...poForm, vendor_1_nama: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border text-xs focus:ring-1 focus:ring-accent focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Harga Penawaran 1 (Rp)"
                    value={poForm.vendor_1_harga}
                    onChange={(e) => setPoForm({ ...poForm, vendor_1_harga: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border font-mono text-xs focus:ring-1 focus:ring-accent focus:outline-none"
                  />
                </div>

                {/* Vendor 2 */}
                <div className="p-3 bg-surface rounded-md border border-border space-y-2">
                  <span className="font-bold text-ink block">Penawaran Vendor 2:</span>
                  <input
                    type="text"
                    placeholder="Nama Vendor 2"
                    value={poForm.vendor_2_nama}
                    onChange={(e) => setPoForm({ ...poForm, vendor_2_nama: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border text-xs focus:ring-1 focus:ring-accent focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Harga Penawaran 2 (Rp)"
                    value={poForm.vendor_2_harga}
                    onChange={(e) => setPoForm({ ...poForm, vendor_2_harga: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border font-mono text-xs focus:ring-1 focus:ring-accent focus:outline-none"
                  />
                </div>

                {/* Vendor Terpilih & Kesepakatan */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-ink-muted mb-1">Vendor Terpilih</label>
                    <input
                      type="text"
                      placeholder="Contoh: CV. Berkah Motor KIM"
                      value={poForm.vendor_terpilih}
                      onChange={(e) => setPoForm({ ...poForm, vendor_terpilih: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-status-red/30 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-muted mb-1">Harga Deal (Rp)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 800000"
                      value={poForm.harga_kesepakatan || ''}
                      onChange={(e) => setPoForm({ ...poForm, harga_kesepakatan: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-status-red/30 font-mono font-bold text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* ETA diinput TERPISAH setelah SA menyetujui PO (lihat form di bawah) */}

                <div>
                  <label className="block text-[10px] font-bold text-ink-muted mb-1">Catatan Purchasing untuk SA</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Barang dikirim dari distributor besok siang, estimasi sampai jam 14:00 WIB."
                    value={poForm.catatan_purchasing}
                    onChange={(e) => setPoForm({ ...poForm, catatan_purchasing: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border text-xs focus:outline-none"
                  />
                </div>

              <button
                type="button"
                disabled={submitPoMutation.isPending}
                onClick={() => submitPoMutation.mutate(selectedPr)}
                className="w-full mt-4 py-2.5 rounded-md bg-status-red hover:bg-status-red/90 text-white font-bold text-xs shadow-md shadow-status-red/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> TERBITKAN PO & KIRIM PENAWARAN KE SA
              </button>
                </>
                ) : !poApproved ? (
                /* Fase B: PO terbit, menunggu persetujuan SA */
                <div className="space-y-3">
                  <div className="p-3 bg-surface rounded-md border border-border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">No. PO:</span>
                      <span className="font-mono font-bold text-ink">{selectedPr.no_po}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Vendor terpilih:</span>
                      <span className="font-bold text-ink">{selectedPr.vendor_terpilih || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Harga deal:</span>
                      <span className="font-mono font-bold text-ink">Rp {Number(selectedPr.harga_kesepakatan || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Konfirmasi SA:</span>
                      <span className="font-bold text-status-amber">{selectedPr.status_konfirmasi_sa || 'Menunggu Konfirmasi'}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-status-amber-bg border border-status-amber/30 text-status-amber text-[11px] font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Menunggu SA menyetujui penawaran. Form input ETA terbuka setelah disetujui.</span>
                  </div>
                </div>
                ) : (
                /* Fase C: SA setuju, belum ada ETA — input tanggal & jam ready */
                <div className="space-y-3">
                  <div className="p-3 rounded-md bg-status-green-bg border border-status-green/30 text-status-green text-[11px] font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>SA menyetujui PO {selectedPr.no_po}. Lanjutkan pembelian & input ETA.</span>
                  </div>
                  <div className="p-3 bg-status-red-bg rounded-md border border-status-red/30 space-y-2">
                    <span className="font-bold text-status-red text-xs block flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-status-red" />
                      Input Tanggal & Jam Barang Ready (ETA):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={poForm.estimasi_tanggal_ready_eta}
                        onChange={(e) => setPoForm({ ...poForm, estimasi_tanggal_ready_eta: e.target.value })}
                        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                        title="Klik untuk memilih tanggal"
                        className="w-full px-2.5 py-1.5 rounded-md border border-border font-mono text-xs focus:outline-none cursor-pointer"
                      />
                      <input
                        type="time"
                        value={poForm.estimasi_jam_ready_eta}
                        onChange={(e) => setPoForm({ ...poForm, estimasi_jam_ready_eta: e.target.value })}
                        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                        title="Klik untuk memilih jam"
                        className="w-full px-2.5 py-1.5 rounded-md border border-border font-mono text-xs focus:outline-none cursor-pointer"
                      />
                    </div>
                    <p className="text-[10px] text-status-red italic">
                      *Estimasi ini tampil ke SA & customer sebagai perkiraan barang tiba.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={updateEtaMutation.isPending}
                    onClick={() => updateEtaMutation.mutate()}
                    className="w-full py-2.5 rounded-md bg-status-blue hover:bg-status-blue/90 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-status-blue/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" /> SIMPAN ETA & LANJUT PEMBELIAN
                  </button>
                </div>
                )
                )}
            </div>
            </div>
          ) : null}
              </div>
            </div>
          </ModalPortal>
        )}
        </div>

    </div>
  );
};
