import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { PhotoUploader } from '../components/common/PhotoUploader';
import { TransaksiBeliPart } from '../types';
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
  Clock
} from 'lucide-react';

export const BeliPartView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedTransaksi, setSelectedTransaksi] = useState<TransaksiBeliPart | null>(null);

  // Form Pembelian Part State (image2.png Mockup SA)
  const [formPart, setFormPart] = useState({
    nama_customer: 'Hisar (PT. Andi Jaya)',
    no_polisi: 'BK 5678 CD',
    no_telepon: '0812-3456-7890',
    item_parts: [
      { kode: 'SP-001', nama: 'Brake Pad (Kampas Rem)', qty: 2, harga: 450000 },
      { kode: 'SP-045', nama: 'Oli Rimula R4 10W-40 (4L)', qty: 4, harga: 380000 },
      { kode: 'SP-078', nama: 'Filter Oli Canter', qty: 1, harga: 85000 },
    ],
    catatan: 'Permintaan pembelian langsung tanpa pengerjaan service di workshop.',
    foto_penyerahan: '',
  });

  // Queries
  const { data: transaksiList } = useQuery({
    queryKey: ['beli-part-list'],
    queryFn: api.getBeliPartList,
    refetchInterval: 8000,
  });

  const subtotal = formPart.item_parts.reduce((acc, curr) => acc + curr.qty * curr.harga, 0);
  const ppn11 = subtotal * 0.11;
  const grandTotal = subtotal + ppn11;

  // Mutation: Buat Transaksi Beli Part Baru
  const buatTransaksiMutation = useMutation({
    mutationFn: async () => {
      const estNo = `EST-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const prPick = `PR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      return api.buatBeliPart({
        no_transaksi: estNo,
        nama_customer: formPart.nama_customer,
        no_polisi: formPart.no_polisi,
        no_telepon: formPart.no_telepon,
        no_picking_request: prPick,
        subtotal: subtotal,
        ppn_11: ppn11,
        total_biaya: grandTotal,
        lokasi_rak: 'Rak A-02, Rak B-01, Rak C-03',
        catatan: formPart.catatan,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beli-part-list'] });
      alert('Estimasi Pembelian Barang berhasil dibuat & diteruskan ke Warehouse Picking!');
    },
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Pembelian Sparepart (Tanpa Service)</h1>
            <p className="text-xs text-slate-500">Alur Masuk → SA Estimasi & Approval → Warehouse Picking → Penyerahan → Kasir → Memo Keluar</p>
          </div>
        </div>

        <button
          onClick={() => buatTransaksiMutation.mutate()}
          disabled={buatTransaksiMutation.isPending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" /> + Transaksi Beli Part Baru
        </button>
      </div>

      {/* 8-Step Timeline Indicator (image2.png Flow Header) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[750px] text-center text-xs">
          {[
            { step: 1, title: 'Masuk Bengkel', pic: 'Security' },
            { step: 2, title: 'Bertemu SA', pic: 'SA' },
            { step: 3, title: 'Estimasi & Approval', pic: 'Customer' },
            { step: 4, title: 'Pengadaan Barang', pic: 'Warehouse' },
            { step: 5, title: 'Barang Siap', pic: 'Warehouse' },
            { step: 6, title: 'Penyerahan Barang', pic: 'SA' },
            { step: 7, title: 'Invoice & Payment', pic: 'Admin Kasir' },
            { step: 8, title: 'Keluar Bengkel', pic: 'Security' },
          ].map((item, idx) => (
            <div key={item.step} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                  item.step <= 4 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {item.step}
                </div>
                <div className="font-bold text-slate-800 text-[11px] leading-tight">{item.title}</div>
                <div className="text-[10px] text-slate-400">{item.pic}</div>
              </div>
              {idx < 7 && <div className="w-8 h-0.5 bg-slate-200"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Form Estimasi SA & Warehouse Picking Request */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Estimasi untuk Customer (image2.png Mockup SA) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600">Langkah 2 & 3: Service Advisor</span>
              <h2 className="text-base font-bold text-slate-900">Permintaan & Estimasi Harga Part</h2>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">{formPart.no_polisi}</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Customer:</span>
                <span className="font-bold text-slate-800">{formPart.nama_customer}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">No. Telepon:</span>
                <span className="font-bold text-slate-800">{formPart.no_telepon}</span>
              </div>
            </div>

            {/* List Barang yang Dipilih */}
            <div>
              <span className="font-bold text-slate-700 block mb-2">Item Sparepart yang Dipesan:</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {formPart.item_parts.map((item, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between bg-white text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{item.nama}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Kode: {item.kode} | Qty: {item.qty}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-800">
                      Rp {(item.qty * item.harga).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Kalkulasi */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-semibold">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Part:</span>
                <span className="font-mono">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>PPN 11%:</span>
                <span className="font-mono">Rp {ppn11.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-900 text-sm font-black pt-1.5 border-t border-slate-200">
                <span>Total Estimasi Biaya:</span>
                <span className="font-mono text-blue-700">Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Approval Customer Buttons (image2.png Mockup SA) */}
            <div className="pt-2">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">Persetujuan Customer:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => alert('Customer Menyetujui Estimasi! Alur berlanjut ke Warehouse Picking.')}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" /> APPROVE (SETUJU)
                </button>
                <button
                  type="button"
                  onClick={() => alert('Customer Menolak Estimasi.')}
                  className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" /> REJECT (TOLAK)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Warehouse Picking & Penyerahan (image2.png Mockup 3 & 4) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-600">Langkah 4, 5 & 6: Warehouse & SA</span>
              <h2 className="text-base font-bold text-slate-900">Picking Request & Penyerahan Barang</h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
              Barang Siap Diambil
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-emerald-900">Warehouse sudah konfirmasi barang siap diambil!</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Lokasi Rak: <strong>Rak A-02, Rak B-01, Rak C-03</strong></div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert('SA Mengambil Barang di Warehouse!')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              AMBIL BARANG DARI WAREHOUSE
            </button>

            {/* Serahkan ke Customer & Foto Penyerahan */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="font-bold text-slate-800 block">Serahkan Barang ke Customer:</span>
              
              <PhotoUploader
                label="Foto Penyerahan Barang (Opsional)"
                value={formPart.foto_penyerahan}
                onChange={(url) => setFormPart({ ...formPart, foto_penyerahan: url })}
                bucket="foto_barang"
              />

              <button
                type="button"
                onClick={() => alert('Barang resmi diserahkan ke customer! Status lanjut ke Admin Kasir untuk Pembayaran & Faktur.')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> KONFIRMASI BARANG TELAH DISERAHKAN
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
