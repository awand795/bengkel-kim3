import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { PurchaseRequestPart } from '../types';
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
  Truck
} from 'lucide-react';

export const PurchasingView: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedPr, setSelectedPr] = useState<PurchaseRequestPart | null>(null);

  // Form Input Penawaran 2 Vendor & ETA State (image1.png Kotak Merah)
  const [poForm, setPoForm] = useState({
    vendor_1_nama: 'PT. Sumber Sparepart Utama',
    vendor_1_harga: 820000,
    vendor_2_nama: 'CV. Berkah Motor KIM',
    vendor_2_harga: 800000,
    vendor_terpilih: 'CV. Berkah Motor KIM',
    harga_kesepakatan: 800000,
    estimasi_tanggal_ready_eta: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    estimasi_jam_ready_eta: '14:00',
    catatan_purchasing: 'Barang dikirim dari distributor besok siang, estimasi sampai jam 14:00 WIB.',
  });

  // Queries
  const { data: purchasingList, isLoading } = useQuery({
    queryKey: ['purchasing-list'],
    queryFn: api.getPurchasingList,
    refetchInterval: 8000,
  });

  // Submit PO & ETA
  const submitPoMutation = useMutation({
    mutationFn: async (pr: PurchaseRequestPart) => {
      const poNo = `PO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      return api.buatPO({
        no_po: poNo,
        id_pr: pr.pr_id,
        id_spk: pr.id_spk,
        nama_admin_purchasing: 'Rina Marlina',
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
      alert('Penawaran 2 Vendor & Input ETA Barang Ready berhasil diterbitkan ke SA!');
      setSelectedPr(null);
    },
    onError: (err: any) => alert('Gagal membuat PO: ' + err?.message),
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Admin Purchasing - Pengadaan Part (Kotak Merah)</h1>
            <p className="text-xs text-slate-500">Proses Penawaran Min. 2 Vendor, Kesepakatan PO, dan Input Estimasi Ketersediaan (ETA)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200">
          <Clock className="w-4 h-4 text-purple-600" />
          <span>Integrasi Lead Time Otomatis</span>
        </div>
      </div>

      {/* Main Grid: PR List & Form Input PO Vendor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: List Purchase Request dari SA (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Daftar Purchase Request (PR) Masuk</h2>
                <p className="text-xs text-slate-500">Part yang tidak ready di stock dari SPK Bengkel</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {purchasingList?.length || 0} Permintaan
              </span>
            </div>

            <div className="space-y-3">
              {purchasingList && purchasingList.length > 0 ? (
                purchasingList.map((item) => (
                  <div
                    key={item.pr_id}
                    onClick={() => setSelectedPr(item)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedPr?.pr_id === item.pr_id
                        ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-700">{item.no_pr}</span>
                      <StatusBadge status={item.status_pr} size="sm" />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <div className="text-sm font-black text-slate-900">{item.no_polisi} - {item.nama_customer}</div>
                        <div className="text-xs text-slate-500">Pemohon SA: <strong>{item.nama_sa_pemohon}</strong></div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-slate-400 block text-[10px]">Tgl Pengajuan:</span>
                        <span className="font-semibold text-slate-700">
                          {new Date(item.tanggal_pr).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-700 bg-white/90 p-2.5 rounded-lg border border-slate-200/80">
                      <span className="font-bold text-slate-800">Kebutuhan Part:</span> {item.catatan_pr}
                    </div>

                    {/* Jika sudah ada PO & ETA */}
                    {item.no_po && (
                      <div className="mt-2 pt-2 border-t border-purple-200/60 flex flex-wrap items-center justify-between text-xs text-purple-900 font-semibold gap-2">
                        <span>PO: {item.no_po} ({item.vendor_terpilih})</span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-mono">
                          ETA: {item.estimasi_tanggal_ready_eta} {item.estimasi_jam_ready_eta}
                        </span>
                        <span>Konfirmasi SA: <strong>{item.status_konfirmasi_sa}</strong></span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada permintaan sparepart pending saat ini.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Form Proses Penawaran 2 Vendor & Input ETA (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          {selectedPr ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] uppercase font-bold text-purple-600">Alur Kotak Merah Tahap 6</span>
                <h3 className="text-base font-black text-slate-900">{selectedPr.no_pr}</h3>
                <p className="text-xs text-slate-600 font-bold">{selectedPr.no_polisi} - {selectedPr.nama_customer}</p>
              </div>

              <div className="space-y-3 text-xs">
                
                {/* Aturan Wajib Min 2 Vendor */}
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                  <strong>Aturan SOP:</strong> Purchasing wajib memproses penawaran harga minimal 2 vendor sebelum menerbitkan PO.
                </div>

                {/* Vendor 1 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block">Penawaran Vendor 1:</span>
                  <input
                    type="text"
                    placeholder="Nama Vendor 1"
                    value={poForm.vendor_1_nama}
                    onChange={(e) => setPoForm({ ...poForm, vendor_1_nama: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Harga Penawaran 1 (Rp)"
                    value={poForm.vendor_1_harga}
                    onChange={(e) => setPoForm({ ...poForm, vendor_1_harga: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                {/* Vendor 2 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block">Penawaran Vendor 2:</span>
                  <input
                    type="text"
                    placeholder="Nama Vendor 2"
                    value={poForm.vendor_2_nama}
                    onChange={(e) => setPoForm({ ...poForm, vendor_2_nama: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Harga Penawaran 2 (Rp)"
                    value={poForm.vendor_2_harga}
                    onChange={(e) => setPoForm({ ...poForm, vendor_2_harga: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                {/* Vendor Terpilih & Kesepakatan */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Vendor Terpilih</label>
                    <input
                      type="text"
                      value={poForm.vendor_terpilih}
                      onChange={(e) => setPoForm({ ...poForm, vendor_terpilih: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">Harga Deal (Rp)</label>
                    <input
                      type="number"
                      value={poForm.harga_kesepakatan}
                      onChange={(e) => setPoForm({ ...poForm, harga_kesepakatan: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 font-mono font-bold text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Input Tanggal & Jam ETA (Kotak Merah Tahap 5) */}
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                  <span className="font-bold text-purple-900 block flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-700" />
                    Input Tanggal & Jam Barang Ready (ETA):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={poForm.estimasi_tanggal_ready_eta}
                      onChange={(e) => setPoForm({ ...poForm, estimasi_tanggal_ready_eta: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none"
                    />
                    <input
                      type="time"
                      value={poForm.estimasi_jam_ready_eta}
                      onChange={(e) => setPoForm({ ...poForm, estimasi_jam_ready_eta: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-purple-700 italic">
                    *Estimasi jam ini otomatis terakumulasi ke estimasi waktu selesai SPK yang dibuat oleh SA.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Catatan Purchasing untuk SA</label>
                  <textarea
                    rows={2}
                    value={poForm.catatan_purchasing}
                    onChange={(e) => setPoForm({ ...poForm, catatan_purchasing: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={submitPoMutation.isPending}
                onClick={() => submitPoMutation.mutate(selectedPr)}
                className="w-full mt-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> TERBITKAN PO & KIRIM ETA KE SA
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <ShoppingBag className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Pilih salah satu PR di sebelah kiri untuk menginput penawaran vendor dan tanggal estimasi barang ready (ETA).</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
