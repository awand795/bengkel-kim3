import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { SpkService } from '../types';
import { realtimeHub } from '../services/realtimeService';
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
  Printer
} from 'lucide-react';
import { PrintSpkModal } from '../components/print/PrintSpkModal';

export const ServiceAdvisorView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'penerimaan' | 'spk-list' | 'estimasi-pr' | 'fir-closed'>('spk-list');
  const [selectedSpk, setSelectedSpk] = useState<SpkService | null>(null);
  const [showPrModal, setShowPrModal] = useState<SpkService | null>(null);
  const [showPrintSpk, setShowPrintSpk] = useState<SpkService | null>(null);

  // Form Penerimaan SA State
  const [formPenerimaan, setFormPenerimaan] = useState({
    no_polisi: '',
    nama_customer: 'PT. Andi Jaya',
    odometer_km: 125680,
    foto_odometer: '',
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

  // Form PR (Purchase Request)
  const [prNote, setPrNote] = useState('');

  // Queries
  const { data: spkList, isLoading: loadingSpk } = useQuery({
    queryKey: ['spk-list'],
    queryFn: api.getSpkList,
    refetchInterval: 8000,
  });

  const { data: purchasingList } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
  });

  // Submit Penerimaan Kendaraan ke Foreman
  const createSpkMutation = useMutation({
    mutationFn: async (data: typeof formPenerimaan) => {
      const spkNo = `SPK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      return api.buatSpk({
        no_spk: spkNo,
        no_polisi: data.no_polisi,
        nama_customer: data.nama_customer,
        odometer_km: data.odometer_km,
        foto_odometer: data.foto_odometer,
        keluhan_customer: data.keluhan_customer,
        cek_body: data.cek_body,
        cek_mesin: data.cek_mesin,
        cek_kelistrikan: data.cek_kelistrikan,
        cek_kaki_kaki: data.cek_kaki_kaki,
        catatan_kondisi_awal: data.catatan_kondisi_awal,
        nama_sa: 'Budi Santoso',
        estimasi_waktu_jam: data.estimasi_waktu_jam,
        lead_time_jam: data.lead_time_jam,
        catatan_sa: data.catatan_sa,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spk-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      realtimeHub.publish({
        type: 'SPK_CREATED',
        targetRoles: ['Foreman', 'Mekanik', 'Customer Fleet'],
        title: 'SPK Baru Diterbitkan',
        message: `SPK untuk unit ${formPenerimaan.no_polisi} (${formPenerimaan.nama_customer || 'Armada'}) siap untuk penugasan & pengerjaan teknisi.`,
        linkTab: 'foreman',
        urgency: 'info',
      });
      alert('SPK Penerimaan Kendaraan berhasil dibuat & dikirim ke Dashboard Foreman!');
      setActiveTab('spk-list');
    },
    onError: (err: any) => alert('Gagal membuat SPK: ' + err?.message),
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
        nama_sa_pemohon: 'Budi Santoso',
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
            <p className="text-xs text-slate-500">Penerimaan Kendaraan, Estimasi Biaya & Waktu, Pengadaan Part, dan FIR Closed</p>
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
            Kotak Merah (PR & PO)
          </button>
        </div>
      </div>

      {/* TAB 1: DAFTAR SPK AKTIF */}
      {activeTab === 'spk-list' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Semua Work Order SPK Bengkel</h2>
              <p className="text-xs text-slate-500">Pantau progres pekerjaan, status approval customer, dan FIR closed</p>
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
                {spkList?.map((spk) => (
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked card list (pengganti tabel di layar < md) */}
          <div className="block md:hidden space-y-2.5">
            {spkList?.map((spk) => (
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
            ))}
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
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Polisi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BK 5678 CD"
                    value={formPenerimaan.no_polisi}
                    onChange={(e) => setFormPenerimaan({ ...formPenerimaan, no_polisi: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold uppercase text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Customer / Perusahaan</label>
                  <input
                    type="text"
                    required
                    value={formPenerimaan.nama_customer}
                    onChange={(e) => setFormPenerimaan({ ...formPenerimaan, nama_customer: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
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

              {/* Foto Odometer (Kamera / File) */}
              <PhotoUploader
                label="Foto Odometer (Cek Fisik KM)"
                value={formPenerimaan.foto_odometer}
                onChange={(url) => setFormPenerimaan({ ...formPenerimaan, foto_odometer: url })}
                bucket="foto_kendaraan"
              />

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

              <button
                type="submit"
                disabled={createSpkMutation.isPending}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                {createSpkMutation.isPending ? 'Menyimpan SPK...' : 'SUBMIT KE FOREMAN (TERBITKAN SPK)'}
              </button>
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
                  <span className="text-slate-500">Lead Time Estimasi:</span>
                  <span className="font-bold text-blue-600">{formPenerimaan.lead_time_jam} Jam</span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Keluhan Customer:</span>
                  <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 italic">
                    "{formPenerimaan.keluhan_customer || 'Belum diisi...'}"
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900 space-y-1">
              <div className="font-bold">Alur Selanjutnya:</div>
              <div>1. SPK diterbitkan & muncul di Dashboard Foreman.</div>
              <div>2. Foreman pilih mekanik & lakukan pengecekan fisik.</div>
              <div>3. Foreman submit kebutuhan perbaikan ke SA untuk estimasi.</div>
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
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Disetujui SA
                        </span>
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
