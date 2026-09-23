import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { SpkService } from '../types';
import { realtimeHub } from '../services/realtimeService';
import { useAppStore } from '../store/useAppStore';
import { 
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
  Search,
  Filter
} from 'lucide-react';
import { PrintSpkModal } from '../components/print/PrintSpkModal';

export const ServiceAdvisorView: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<'penerimaan' | 'spk-list' | 'estimasi-pr' | 'fir-closed'>('spk-list');
  const [selectedSpk, setSelectedSpk] = useState<SpkService | null>(null);
  const [showPrModal, setShowPrModal] = useState<SpkService | null>(null);
  const [showPrintSpk, setShowPrintSpk] = useState<SpkService | null>(null);

  // Search & Filter State for SPK List
  const [saSearchQuery, setSaSearchQuery] = useState('');
  const [saStatusFilter, setSaStatusFilter] = useState<'Semua' | 'Dalam Pengerjaan' | 'Waiting Part' | 'QC Passed' | 'FIR Closed'>('Semua');

  // Form Penerimaan SA State
  const [formPenerimaan, setFormPenerimaan] = useState({
    id_antrian: undefined as number | undefined,
    no_polisi: '',
    nama_customer: '',
    odometer_km: '' as number | '',
    foto_odometer: '',
    foto_stnk: '',
    foto_kir: '',
    keluhan_customer: '',
    cek_body: 'OK',
    cek_mesin: 'OK',
    cek_kelistrikan: 'OK',
    cek_kaki_kaki: 'OK',
    catatan_kondisi_awal: 'Bodi mulus, mesin kering, kelistrikan normal',
    estimasi_waktu_jam: 6,
    lead_time_jam: 6,
    catatan_sa: '',
  });

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

  // Form PR (Purchase Request)
  const [prNote, setPrNote] = useState('');

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

  const { data: antrianList } = useQuery({
    queryKey: ['antrian-list'],
    queryFn: api.getAntrian,
    refetchInterval: 8000,
  });

  const antrianMenungguSA = (antrianList || []).filter(
    a => a.status_kunjungan === 'Check In' && a.tujuan_kedatangan === 'Service'
  );

  const { data: purchasingList } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
  });

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

  const hasEmptyStock = selectedParts.some(p => p.stok === 0 || p.jumlah > p.stok);
  const emptyPartsList = selectedParts.filter(p => p.stok === 0 || p.jumlah > p.stok);
  const partsSubtotal = selectedParts.reduce((acc, p) => acc + (p.harga_satuan * p.jumlah), 0);
  const totalEstimasiBiaya = 250000 + partsSubtotal; // Jasa dasar + sparepart

  // Submit Penerimaan Kendaraan ke Foreman
  const createSpkMutation = useMutation({
    mutationFn: async (data: typeof formPenerimaan) => {
      const spkNo = `SPK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const spkRes = await api.buatSpk({
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

      const spkId = spkRes?.data?.id || (await api.getSpkList()).find(s => s.no_spk === spkNo)?.id;

      if (spkId) {
        // Automatically set it to Menunggu Pengecekan Mekanik (or Check In) so Foreman can see it.
        await api.updateSpkStatus({
          id: spkId,
          status_spk: 'Check In', // Or 'Menunggu Pengecekan Mekanik'
        });
      }

      return { spkNo };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      realtimeHub.publish({
        type: 'SPK_CREATED',
        targetRoles: ['Foreman', 'Mekanik', 'Customer Fleet'],
        title: 'SPK Penerimaan Dibuat',
        message: `SPK untuk unit ${formPenerimaan.no_polisi} (${formPenerimaan.nama_customer || 'Armada'}) siap untuk dicek Mekanik/Foreman.`,
        linkTab: 'foreman',
        urgency: 'info',
      });
      alert('SPK Penerimaan Kendaraan berhasil dibuat! Kendaraan diserahkan ke Foreman untuk Pengecekan.');

      setFormPenerimaan({
        id_antrian: undefined,
        no_polisi: '',
        nama_customer: '',
        odometer_km: '',
        foto_odometer: '',
        foto_stnk: '',
        foto_kir: '',
        keluhan_customer: '',
        cek_body: 'OK',
        cek_mesin: 'OK',
        cek_kelistrikan: 'OK',
        cek_kaki_kaki: 'OK',
        catatan_kondisi_awal: 'Bodi mulus, mesin kering, kelistrikan normal',
        estimasi_waktu_jam: 6,
        lead_time_jam: 6,
        catatan_sa: '',
      });
      setActiveTab('spk-list');
    },
    onError: (err: any) => alert('Gagal membuat SPK: ' + err?.message),
  });

  // Submit Estimasi Biaya (Setelah Pengecekan Mekanik)
  const submitEstimasiMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      // 1. Simpan item part yang dipilih ke SPK
      for (const p of selectedParts) {
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
      
      if (result.hasEmptyStock) {
        realtimeHub.publish({
          type: 'PURCHASE_REQUEST_CREATED',
          targetRoles: ['Admin Purchasing', 'SA', 'Customer Fleet'],
          title: 'PR Part Masuk (Kotak Merah)',
          message: `Estimasi SPK ${spk.no_spk} memerlukan [${result.emptyNames}] yang kosong di gudang. Status kendaraan: Waiting Part.`,
          linkTab: 'purchasing',
          urgency: 'warning',
        });
        alert(`Estimasi Berhasil!\n\nPerhatian: Karena sparepart [${result.emptyNames}] stoknya KOSONG, PR diajukan dan status armada diset ke "Waiting Part".`);
      } else {
        alert('Estimasi Biaya berhasil disubmit ke Customer untuk Approval.');
      }
      setShowEstimasiModal(null);
      setSelectedParts([]);
    }
  });

  // Submit PR (Purchase Request ke Purchasing)
  const prMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      const prNo = `PR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      
      // Update SPK status to Waiting Part
      await api.updateSpkStatus({
        id: spk.id,
        status_spk: 'Waiting Part',
      });

      return api.ajukanPR({
        no_pr: prNo,
        id_spk: spk.id,
        nama_sa_pemohon: currentUser,
        catatan_pr: prNote || `Kebutuhan sparepart tidak ready untuk armada ${spk.no_polisi}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      alert('Purchase Request berhasil diajukan ke Admin Purchasing (Kotak Merah)!');
      setShowPrModal(null);
      setPrNote('');
    },
    onError: (err: any) => alert('Gagal mengajukan PR: ' + err?.message),
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
      alert('Respon konfirmasi ketersediaan barang berhasil diperbarui!');
    },
  });

  // Konfirmasi Barang Tiba di Bengkel (Barang Ready)
  const barangReadyMutation = useMutation({
    mutationFn: async (pr: any) => {
      await api.updateSpkStatus({
        id: pr.id_spk,
        status_spk: 'Dalam Pengerjaan',
      });
      return true;
    },
    onSuccess: (_, pr) => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchasing-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      realtimeHub.publish({
        type: 'SPK_STATUS_CHANGED',
        targetRoles: ['Mekanik', 'Foreman', 'Customer Fleet'],
        title: 'Barang Ready di Bengkel',
        message: `Sparepart untuk SPK ${pr.no_spk || ''} (${pr.no_polisi || ''}) telah tiba di bengkel. Status SPK beralih ke 'Dalam Pengerjaan'.`,
        linkTab: 'mekanik',
        urgency: 'success',
      });
      alert('Barang dikonfirmasi READY! Status SPK dikembalikan ke "Dalam Pengerjaan" untuk pengerjaan teknisi.');
    },
    onError: (err: any) => alert('Gagal konfirmasi barang ready: ' + err?.message),
  });

  // SA FIR Closed & Terbitkan Invoice Otomatis
  const firClosedMutation = useMutation({
    mutationFn: async (spk: SpkService) => {
      // 1. Update SPK to FIR Closed
      await api.updateSpkStatus({
        id: spk.id,
        status_spk: 'FIR Closed',
      });

      // 2. Buat Invoice otomatis
      const invNo = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const subtotal = Number(spk.estimasi_biaya || 1110000);
      const ppn = subtotal * 0.11;
      const grandTotal = subtotal + ppn;

      return api.buatInvoice({
        no_invoice: invNo,
        id_spk: spk.id,
        no_polisi: spk.no_polisi,
        nama_customer: spk.nama_customer,
        subtotal: subtotal,
        ppn_nominal: ppn,
        diskon: 0,
        grand_total: grandTotal,
        metode_pembayaran: 'Transfer Bank',
        kasir_pic: 'Siti Rahma',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert('FIR Closed Berhasil! Work Order resmi selesai dan Invoice Pembayaran otomatis diterbitkan.');
    },
    onError: (err: any) => alert('Gagal menutup FIR: ' + err?.message),
  });

  // Derived statistics and filtering for SA
  const allSpks = spkList || [];
  const totalSpkCount = allSpks.length;
  const inProgressCount = allSpks.filter(s => s.status_spk === 'Dalam Pengerjaan').length;
  const waitingPartCount = allSpks.filter(s => s.status_spk === 'Waiting Part').length;
  const qcPassedCount = allSpks.filter(s => s.status_spk === 'QC Passed').length;

  const filteredSpkList = allSpks.filter((spk) => {
    const query = saSearchQuery.toLowerCase().trim();
    const matchSearch = !query ||
      spk.no_spk?.toLowerCase().includes(query) ||
      spk.no_polisi?.toLowerCase().includes(query) ||
      spk.nama_customer?.toLowerCase().includes(query) ||
      spk.keluhan_customer?.toLowerCase().includes(query) ||
      spk.nama_mekanik?.toLowerCase().includes(query);

    if (!matchSearch) return false;
    if (saStatusFilter === 'Dalam Pengerjaan') return spk.status_spk === 'Dalam Pengerjaan';
    if (saStatusFilter === 'Waiting Part') return spk.status_spk === 'Waiting Part';
    if (saStatusFilter === 'QC Passed') return spk.status_spk === 'QC Passed';
    if (saStatusFilter === 'FIR Closed') return spk.status_spk === 'FIR Closed' || spk.status_spk === 'Selesai';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Service Advisor (SA)</h1>
            <p className="text-xs text-slate-500">Penerimaan Kendaraan, Estimasi Biaya &amp; Waktu, Pengadaan Part, dan FIR Closed</p>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('spk-list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'spk-list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar SPK Aktif
          </button>
          <button
            onClick={() => setActiveTab('penerimaan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'penerimaan' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Buat SPK Penerimaan
          </button>
          <button
            onClick={() => setActiveTab('estimasi-pr')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'estimasi-pr' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kotak Merah (PR &amp; PO)
          </button>
        </div>
      </div>

      {/* Mini KPI Banners for SA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setSaStatusFilter('Semua')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            saStatusFilter === 'Semua' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total SPK Aktif</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalSpkCount}</div>
          <span className="text-[10px] text-slate-400">Seluruh antrian bengkel</span>
        </div>

        <div 
          onClick={() => setSaStatusFilter('Dalam Pengerjaan')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            saStatusFilter === 'Dalam Pengerjaan' ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">Dalam Pengerjaan</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-900 mt-1">{inProgressCount}</div>
          <span className="text-[10px] text-indigo-600">Sedang diservis teknisi</span>
        </div>

        <div 
          onClick={() => setSaStatusFilter('Waiting Part')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            saStatusFilter === 'Waiting Part' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Menunggu Part (PR)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 mt-1">{waitingPartCount}</div>
          <span className="text-[10px] text-amber-700">Proses purchasing</span>
        </div>

        <div 
          onClick={() => setSaStatusFilter('QC Passed')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            saStatusFilter === 'QC Passed' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Siap FIR Closed</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-1">{qcPassedCount}</div>
          <span className="text-[10px] text-emerald-600">QC Passed siap invoice</span>
        </div>
      </div>

      {/* TAB 1: DAFTAR SPK AKTIF */}
      {activeTab === 'spk-list' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Semua Work Order SPK Bengkel</h2>
              <p className="text-xs text-slate-500">Pantau progres pekerjaan, status approval customer, dan FIR closed</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
              {filteredSpkList.length} SPK Ditemukan
            </span>
          </div>

          {/* Live Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari No. SPK, No. Polisi, Customer, Mekanik, atau Keluhan..."
                value={saSearchQuery}
                onChange={(e) => setSaSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
              {saSearchQuery && (
                <button
                  onClick={() => setSaSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Chips */}
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['Semua', 'Dalam Pengerjaan', 'Waiting Part', 'QC Passed', 'FIR Closed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSaStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    saStatusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">No. SPK</th>
                  <th className="py-2.5 px-3 font-semibold">No. Polisi</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Status Alur</th>
                  <th className="py-2.5 px-3 font-semibold">Mekanik / Foreman</th>
                  <th className="py-2.5 px-3 font-semibold">Estimasi Biaya</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi SA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSpkList.length > 0 ? (
                  filteredSpkList.map((spk) => (
                    <tr key={spk.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{spk.no_spk}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{spk.no_polisi}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{spk.nama_customer || '-'}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{spk.keluhan_customer}</div>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={spk.status_spk} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {spk.nama_mekanik ? `${spk.nama_mekanik} (${spk.nama_foreman || 'Foreman'})` : 'Menunggu Foreman'}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        Rp {Number(spk.estimasi_biaya || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {spk.status_spk === 'Estimasi Dibuat' && (
                            <button
                              type="button"
                              onClick={() => setShowEstimasiModal(spk)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Buat Estimasi Biaya
                            </button>
                          )}

                          {/* Jika QC Passed -> SA Tombol FIR Closed */}
                          {spk.status_spk === 'QC Passed' && (
                            <button
                              type="button"
                              onClick={() => firClosedMutation.mutate(spk)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1"
                            >
                              <FileCheck className="w-3.5 h-3.5" /> FIR Closed
                            </button>
                          )}

                          {/* Ajukan PR jika part tidak ready */}
                          {spk.status_spk !== 'FIR Closed' && spk.status_spk !== 'Selesai' && (
                            <button
                              type="button"
                              onClick={() => setShowPrModal(spk)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-xs border border-purple-200 flex items-center gap-1"
                              title="Ajukan PR ke Purchasing jika part tidak ready"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" /> PR Part
                            </button>
                          )}

                          {/* Cetak SPK A4 */}
                          <button
                            type="button"
                            onClick={() => setShowPrintSpk(spk)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs border border-slate-300 flex items-center gap-1 transition-colors"
                            title="Cetak Surat Perintah Kerja (SPK) A4"
                          >
                            <Printer className="w-3.5 h-3.5" /> Cetak SPK
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ditemukan SPK yang sesuai dengan filter atau pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked card list (pengganti tabel di layar < md) */}
          <div className="block md:hidden space-y-2.5">
            {filteredSpkList.length > 0 ? (
              filteredSpkList.map((spk) => (
              <div key={spk.id} className="rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-bold text-blue-600">{spk.no_spk}</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">{spk.no_polisi}</div>
                    <div className="text-xs font-semibold text-slate-600 mt-0.5">{spk.nama_customer || '-'}</div>
                  </div>
                  <StatusBadge status={spk.status_spk} size="sm" />
                </div>

                <p className="mt-2 text-[11px] text-slate-400 line-clamp-2">{spk.keluhan_customer}</p>

                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex items-start justify-between gap-3">
                    <span className="shrink-0">Mekanik / Foreman</span>
                    <span className="font-semibold text-slate-600 text-right">
                      {spk.nama_mekanik ? `${spk.nama_mekanik} (${spk.nama_foreman || 'Foreman'})` : 'Menunggu Foreman'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimasi Biaya</span>
                    <span className="font-bold text-slate-900">
                      Rp {Number(spk.estimasi_biaya || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {spk.status_spk === 'Estimasi Dibuat' && (
                  <button
                    type="button"
                    onClick={() => setShowEstimasiModal(spk)}
                    className="mt-3 w-full min-h-[44px] py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Buat Estimasi Biaya
                  </button>
                )}

                {spk.status_spk === 'QC Passed' && (
                  <button
                    type="button"
                    onClick={() => firClosedMutation.mutate(spk)}
                    className="mt-3 w-full min-h-[44px] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <FileCheck className="w-4 h-4" /> FIR Closed
                  </button>
                )}

                {spk.status_spk !== 'FIR Closed' && spk.status_spk !== 'Selesai' && (
                  <button
                    type="button"
                    onClick={() => setShowPrModal(spk)}
                    className="mt-2 w-full min-h-[44px] py-2.5 bg-purple-50 active:bg-purple-100 text-purple-700 rounded-xl font-bold text-xs border border-purple-200 flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-4 h-4" /> Ajukan PR Part
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPrintSpk(spk)}
                  className="mt-2 w-full min-h-[44px] py-2.5 bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border border-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Cetak SPK (HVS A4)
                </button>
              </div>
            ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Tidak ditemukan SPK yang sesuai dengan filter atau pencarian.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FORM PENERIMAAN KENDARAAN (image1.png Mockup 2 & 3) */}
      {activeTab === 'penerimaan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Input Penerimaan (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Penerimaan Kendaraan oleh Service Advisor</h2>
              <p className="text-xs text-slate-500">Cek awal, odometer, keluhan, dan kondisi fisik kendaraan</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSpkMutation.mutate(formPenerimaan);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Antrian Kendaraan Masuk (Dari Gate Security)</label>
                  <select
                    required
                    value={formPenerimaan.id_antrian || ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const antrian = antrianMenungguSA.find(a => a.id === id);
                      if (antrian) {
                        setFormPenerimaan({
                          ...formPenerimaan,
                          id_antrian: id,
                          no_polisi: antrian.no_polisi,
                          nama_customer: antrian.nama_customer || '',
                        });
                      } else {
                        setFormPenerimaan({
                          ...formPenerimaan,
                          id_antrian: undefined,
                          no_polisi: '',
                          nama_customer: '',
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Kendaraan Menunggu SA --</option>
                    {antrianMenungguSA.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.no_polisi} - {a.nama_customer || 'Tanpa Nama'} ({a.jenis_armada || 'Truk'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Odometer (KM)</label>
                  <input
                    type="number"
                    required
                    value={formPenerimaan.odometer_km}
                    onChange={(e) => setFormPenerimaan({ ...formPenerimaan, odometer_km: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Time Estimasi (Jam)</label>
                  <input
                    type="number"
                    value={formPenerimaan.lead_time_jam}
                    onChange={(e) => setFormPenerimaan({ ...formPenerimaan, lead_time_jam: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Foto Dokumen (Odometer, STNK, KIR) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PhotoUploader
                  label="Foto Odometer (Cek Fisik KM)"
                  value={formPenerimaan.foto_odometer}
                  onChange={(url) => setFormPenerimaan({ ...formPenerimaan, foto_odometer: url })}
                  bucket="foto_kendaraan"
                />
                <PhotoUploader
                  label="Foto STNK"
                  value={formPenerimaan.foto_stnk}
                  onChange={(url) => setFormPenerimaan({ ...formPenerimaan, foto_stnk: url })}
                  bucket="dokumen_armada"
                />
                <PhotoUploader
                  label="Foto BUKU KIR"
                  value={formPenerimaan.foto_kir}
                  onChange={(url) => setFormPenerimaan({ ...formPenerimaan, foto_kir: url })}
                  bucket="dokumen_armada"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catat Keluhan Customer</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Rem bunyi saat pengereman dan tarikan mesin agak berat..."
                  value={formPenerimaan.keluhan_customer}
                  onChange={(e) => setFormPenerimaan({ ...formPenerimaan, keluhan_customer: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Checklist Kondisi Awal (image1.png Mockup SA) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="block text-xs font-bold text-slate-800 mb-2">Checklist Awal Kondisi Armada:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'cek_body', label: 'Bodi Kendaraan' },
                    { key: 'cek_mesin', label: 'Ruang Mesin' },
                    { key: 'cek_kelistrikan', label: 'Kelistrikan' },
                    { key: 'cek_kaki_kaki', label: 'Kaki-kaki / Rem' },
                  ].map((item) => (
                    <div key={item.key} className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">{item.label}</span>
                      <select
                        value={(formPenerimaan as any)[item.key]}
                        onChange={(e) => setFormPenerimaan({ ...formPenerimaan, [item.key]: e.target.value })}
                        className="w-full text-xs font-bold px-2 py-1 rounded border border-slate-200 focus:outline-none"
                      >
                        <option value="OK">OK (Baik)</option>
                        <option value="Perlu Dicek">Perlu Dicek</option>
                        <option value="Rusak">Ada Kerusakan</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={createSpkMutation.isPending || !formPenerimaan.id_antrian}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  {createSpkMutation.isPending ? 'Menyimpan...' : 'Submit Penerimaan Kendaraan'}
                  {!createSpkMutation.isPending && <CheckCircle className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </div>

          {/* Ringkasan Penerimaan Preview (1 Col) - image1.png Ringkasan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Ringkasan Penerimaan</h3>
                <span className="text-[11px] font-mono text-slate-500">{new Date().toLocaleTimeString()} WIB</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Armada / No. Polisi</div>
                  <div className="text-base font-black text-slate-900">{formPenerimaan.no_polisi || 'BK -'}</div>
                  <div className="text-xs text-slate-600 font-semibold">{formPenerimaan.nama_customer}</div>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Odometer KM:</span>
                  <span className="font-mono font-bold text-slate-800">{formPenerimaan.odometer_km.toLocaleString()} KM</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Status Alur Awal:</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                    Menunggu Pengecekan Mekanik
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Keluhan Customer:</span>
                  <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 italic">
                    "{formPenerimaan.keluhan_customer || 'Belum diisi...'}"
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 rounded-xl border text-[11px] space-y-1 bg-blue-50 border-blue-200 text-blue-900">
              <div className="font-bold">Alur Selanjutnya:</div>
              <div>1. SPK diterbitkan & muncul di Dashboard Foreman (Check In).</div>
              <div>2. Foreman menugaskan mekanik untuk Pengecekan Kendaraan.</div>
              <div>3. Foreman submit Rekomendasi Perbaikan ke SA.</div>
              <div>4. SA menyusun Estimasi Biaya & Waktu (Kotak Merah jika Part Kosong).</div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: KOTAK MERAH PURCHASING INTEGRASI (image1.png Kotak Merah) */}
      {activeTab === 'estimasi-pr' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-purple-900 text-white shadow-md flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-800 text-purple-200 text-[10px] font-bold uppercase tracking-wider mb-1">
                Tahap 6: Integrasi Estimasi Part & Purchasing
              </div>
              <h2 className="text-lg font-black">Status Part Tidak Ready di Stock & PO Purchasing</h2>
              <p className="text-xs text-purple-200">
                SA mengajukan PR → Purchasing proses penawaran harga min. 2 vendor → SA setuju → Purchasing input ETA ketersediaan barang.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchasingList?.map((pr) => (
              <div key={pr.pr_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700">{pr.no_pr}</span>
                  <StatusBadge status={pr.status_pr} size="sm" />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="font-black text-slate-900 text-sm">{pr.no_polisi} - {pr.nama_customer}</div>
                  <div className="text-xs text-slate-600 mt-1">{pr.catatan_pr}</div>
                </div>

                {/* Info Penawaran PO dari Purchasing */}
                {pr.no_po ? (
                  <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-purple-900">
                      <span>No. PO: {pr.no_po}</span>
                      <span>Admin: {pr.nama_admin_purchasing}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 bg-white rounded border border-purple-100">
                        <span className="text-slate-400 block font-semibold">Vendor 1:</span>
                        <div className="font-bold text-slate-800">{pr.vendor_1_nama}</div>
                        <div className="text-slate-600">Rp {Number(pr.vendor_1_harga || 0).toLocaleString()}</div>
                      </div>
                      <div className="p-2 bg-white rounded border border-purple-100">
                        <span className="text-slate-400 block font-semibold">Vendor 2:</span>
                        <div className="font-bold text-slate-800">{pr.vendor_2_nama}</div>
                        <div className="text-slate-600">Rp {Number(pr.vendor_2_harga || 0).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-purple-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block">Vendor Terpilih & Harga:</span>
                        <span className="font-bold text-purple-900">{pr.vendor_terpilih} (Rp {Number(pr.harga_kesepakatan || 0).toLocaleString()})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-semibold block">Estimasi ETA Ready:</span>
                        <span className="font-mono font-bold text-purple-900">{pr.estimasi_tanggal_ready_eta} ({pr.estimasi_jam_ready_eta})</span>
                      </div>
                    </div>

                    {/* SA Konfirmasi Button */}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Konfirmasi SA:</span>
                      {pr.status_konfirmasi_sa === 'Disetujui SA' ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Disetujui SA
                          </span>
                          <button
                            type="button"
                            disabled={barangReadyMutation.isPending}
                            onClick={() => barangReadyMutation.mutate(pr)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
                            title="Konfirmasi barang fisik telah tiba di bengkel dan kembalikan status SPK ke Dalam Pengerjaan"
                          >
                            <Package className="w-3.5 h-3.5" /> Konfirmasi Barang Sampai
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => konfirmasiPoMutation.mutate({ poId: pr.po_id!, setuju: true })}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs"
                          >
                            Setujui PO
                          </button>
                          <button
                            type="button"
                            onClick={() => konfirmasiPoMutation.mutate({ poId: pr.po_id!, setuju: false })}
                            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg font-bold text-xs"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Menunggu Admin Purchasing menginput penawaran vendor dan estimasi ETA...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL BUAT ESTIMASI BIAYA */}
      {showEstimasiModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
            <div className="sticky top-0 bg-white/90 backdrop-blur px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-black text-slate-900">Buat Estimasi Biaya & Waktu</h3>
                <p className="text-xs text-slate-500">Berdasarkan hasil pengecekan {showEstimasiModal.nama_foreman || 'Foreman'} untuk {showEstimasiModal.no_polisi}</p>
              </div>
              <button 
                onClick={() => { setShowEstimasiModal(null); setSelectedParts([]); }} 
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kolom Kiri: Info Pengecekan Mekanik & Input Part */}
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-slate-500"/> Hasil Pengecekan Foreman/Mekanik</h4>
                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {showEstimasiModal.catatan_foreman || 'Belum ada catatan dari Foreman.'}
                  </div>
                </div>

                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5"><Package className="w-4 h-4 text-blue-600"/> Tambah Sparepart / Jasa Tambahan</h4>
                  <div className="flex gap-2">
                    <select
                      value={partPickerId}
                      onChange={(e) => setPartPickerId(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Pilih Sparepart --</option>
                      {masterStokPart?.map(p => (
                        <option key={p.kode_part} value={p.kode_part}>
                          {p.nama_part} - Stok: {p.stok} {p.satuan} (Rp {p.harga_jual.toLocaleString()})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={partPickerQty}
                      onChange={(e) => setPartPickerQty(Number(e.target.value))}
                      className="w-16 px-2 py-2 rounded-xl border border-slate-300 text-xs text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPartToEstimasi}
                      disabled={!partPickerId}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* List Part Terpilih */}
                  <div className="mt-3 space-y-2">
                    {selectedParts.map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-800">{p.nama_part}</div>
                          <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                            <span>{p.jumlah} {p.satuan} x Rp {p.harga_satuan.toLocaleString()}</span>
                            {p.stok === 0 || p.jumlah > p.stok ? (
                              <span className="text-rose-600 font-bold flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> INDENT</span>
                            ) : (
                              <span className="text-emerald-600 font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> Ready</span>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemovePartFromEstimasi(p.kode_part)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {selectedParts.length === 0 && (
                      <p className="text-[10px] text-slate-500 italic text-center p-2 bg-white/50 rounded-lg">Belum ada part ditambahkan.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Ringkasan Estimasi & Action */}
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">Ringkasan Estimasi Customer</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Jasa Servis Dasar:</span>
                    <span className="font-semibold text-slate-700">Rp 250.000</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Total Sparepart ({selectedParts.length} item):</span>
                    <span className="font-semibold text-slate-700">Rp {partsSubtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-900">Total Estimasi Biaya:</span>
                    <span className="font-black text-emerald-600">Rp {totalEstimasiBiaya.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="pt-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Estimasi Waktu Pengerjaan (Jam)</label>
                    <input
                      type="number"
                      value={estimasiWaktu}
                      onChange={(e) => setEstimasiWaktu(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {hasEmptyStock && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-[10px] flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-purple-700" />
                    <p><strong>Part Indent Terdeteksi!</strong> Menyetujui estimasi ini akan otomatis membuat PR Kotak Merah dan menahan status menjadi Waiting Part.</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => submitEstimasiMutation.mutate(showEstimasiModal)}
                  disabled={submitEstimasiMutation.isPending}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitEstimasiMutation.isPending ? 'Memproses...' : 'Submit Estimasi ke Customer'}
                  <CheckCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJUKAN PR PART */}
      {showPrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Ajukan Purchase Request (PR)</h3>
                <p className="text-xs text-slate-500">Kirim permintaan pengadaan sparepart ke Admin Purchasing</p>
              </div>
              <button
                onClick={() => setShowPrModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">{showPrModal.no_spk} - {showPrModal.no_polisi}</div>
                <div className="text-slate-600 mt-0.5">{showPrModal.nama_customer}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rincian Kebutuhan Sparepart / Catatan</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Sebutkan jenis part, jumlah, spesifikasi, dan estimasi waktu..."
                  value={prNote}
                  onChange={(e) => setPrNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPrModal(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={prMutation.isPending}
                onClick={() => prMutation.mutate(showPrModal)}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20"
              >
                {prMutation.isPending ? 'Mengirim...' : 'KIRIM KE PURCHASING'}
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
