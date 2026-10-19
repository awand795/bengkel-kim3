import React, { useState, useRef, useEffect } from 'react';
import { X, LogOut, PenTool, RotateCcw, ShieldCheck, CheckCircle2, Truck, AlertTriangle } from 'lucide-react';
import { api, getApiErrorMessage } from '../../api/client';
import { toast } from '../common/Toast';
import { useAppStore } from '../../store/useAppStore';

interface SecurityCheckOutModalProps {
  kunjungan: {
    id: number;
    nomor_tiket: string;
    no_polisi: string;
    nama_pengemudi: string;
    nama_perusahaan?: string;
    tipe_kunjungan: string;
    waktu_masuk: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (memoId: number, memoNomor: string) => void;
}

export const SecurityCheckOutModal: React.FC<SecurityCheckOutModalProps> = ({
  kunjungan,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { authUser } = useAppStore();
  const [catatanKeluar, setCatatanKeluar] = useState('');
  const [keteranganBarang, setKeteranganBarang] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Inisialisasi Canvas saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setCatatanKeluar('');
      setKeteranganBarang('');
      setHasSignature(false);
      setTimeout(clearSignature, 100);
    }
  }, [isOpen]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Tinta hitam pekat
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kunjungan) return;

    setIsSubmitting(true);
    try {
      let signatureDataUrl = '';
      if (canvasRef.current && hasSignature) {
        signatureDataUrl = canvasRef.current.toDataURL('image/png');
      }

      const res = await api.securityCheckOut({
        kunjungan_id: kunjungan.id,
        catatan_keluar: catatanKeluar.trim() || 'Unit keluar dalam keadaan aman dan tertib.',
        keterangan_barang_keluar: keteranganBarang.trim() || 'Tidak ada barang keluar / muatan kosong.',
        ttd_security: signatureDataUrl,
        nama_security: authUser?.nama_lengkap || 'Security Gerbang KIM 3',
      });

      const memoId = res?.data?.memo_id || res?.data?.id || 1;
      const memoNo = res?.data?.nomor_memo || 'MK-TERBIT';

      toast.success(`Check-Out Berhasil! Memo Keluar ${memoNo} telah diterbitkan.`);
      onSuccess(memoId, memoNo);
      onClose();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Gagal memproses Check-Out gerbang.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !kunjungan) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1D4ED8] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <LogOut className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">Pemeriksaan Check-Out Gerbang</h3>
              <p className="text-[11px] text-blue-100">Penerbitan Digital Gate Pass / Memo Keluar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 text-xs text-slate-700">
          {/* Card Info Kendaraan */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#12388F] text-white flex items-center justify-center font-bold text-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-mono font-black text-base text-slate-900 flex items-center gap-2">
                  <span>{kunjungan.no_polisi}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DBEAFE] text-[#12388F]">
                    {kunjungan.tipe_kunjungan === 'SERVICE'
                      ? 'Service'
                      : kunjungan.tipe_kunjungan === 'BELI_PART'
                      ? 'Pembelian Barang'
                      : kunjungan.tipe_kunjungan === 'KUNJUNGAN'
                      ? 'Kunjungan'
                      : kunjungan.tipe_kunjungan === 'LAINNYA'
                      ? 'Lainnya'
                      : kunjungan.tipe_kunjungan}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Supir: <span className="font-semibold text-slate-800">{kunjungan.nama_pengemudi}</span> ({kunjungan.nama_perusahaan || 'Umum'})
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[11px] font-bold text-[#12388F] bg-[#EFF6FF] px-2 py-0.5 rounded border border-blue-200">
                {kunjungan.nomor_tiket}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Masuk: {kunjungan.waktu_masuk}
              </div>
            </div>
          </div>

          {/* Form Keterangan Barang Keluar */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Keterangan Barang / Sparepart Keluar
            </label>
            <textarea
              rows={2}
              value={keteranganBarang}
              onChange={(e) => setKeteranganBarang(e.target.value)}
              placeholder="Contoh: 1 set ban bekas, filter oli bekas, nota service asli..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#12388F] focus:ring-1 focus:ring-[#12388F]"
            />
          </div>

          {/* Form Catatan Petugas */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Catatan Pemeriksaan Gerbang Keluar
            </label>
            <input
              type="text"
              value={catatanKeluar}
              onChange={(e) => setCatatanKeluar(e.target.value)}
              placeholder="Contoh: Unit dan muatan telah diperiksa aman, lampu dan rem normal..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#12388F] focus:ring-1 focus:ring-[#12388F]"
            />
          </div>

          {/* Tanda Tangan Digital Security */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-[#12388F]" />
                <span>Tanda Tangan Digital Petugas Security (Layar / Mouse)</span>
              </label>
              <button
                type="button"
                onClick={clearSignature}
                className="text-[11px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Hapus
              </button>
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden touch-none relative">
              <canvas
                ref={canvasRef}
                width={460}
                height={130}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-32 cursor-crosshair bg-white block"
              />
              {!hasSignature && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs italic">
                  Goreskan tanda tangan petugas security di sini
                </div>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Petugas: {authUser?.nama_lengkap || 'Security Gerbang'}</span>
              <span>Format output: PNG Digital Signature</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Memproses...' : 'Check-Out & Terbitkan Memo Keluar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
