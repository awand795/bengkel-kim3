import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ShieldCheck, CheckCircle2, Clock, Calendar, Truck, User, Building2, PackageCheck } from 'lucide-react';
import { MemoKeluarItem } from '../../types';

interface DigitalMemoKeluarModalProps {
  memo: MemoKeluarItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DigitalMemoKeluarModal: React.FC<DigitalMemoKeluarModalProps> = ({
  memo,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !memo) return null;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-9999 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      {/* Container Cetak */}
      <div 
        id="printable-memo-keluar"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Action Bar (Hidden saat Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wide">Digital Gate Pass / Memo Keluar</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Isi Dokumen Memo Keluar (Akan Dicetak) */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 bg-white print:p-0 print:space-y-4">
          {/* Header Kop Resmi */}
          <div className="border-b-2 border-slate-900 pb-5 text-center relative">
            <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              Valid Gate Pass &bull; Izin Keluar Resmi
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              BENGKEL MASTER TRUCK - KIM 3
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Kawasan Industri Medan III (KIM 3) &bull; One Stop Truck Maintenance & Spareparts Service
            </p>
            <p className="text-xs text-slate-500">
              Telp: 0812-3456-7890 &bull; Pos Gerbang Security Utama
            </p>

            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-500">NO. MEMO KELUAR:</span>{' '}
                <span className="font-mono font-bold text-slate-900 text-sm">{memo.nomor_memo}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">TANGGAL & JAM:</span>{' '}
                <span className="font-semibold text-slate-900">{memo.tanggal_terbit || memo.waktu_keluar}</span>
              </div>
            </div>
          </div>

          {/* Kartu Ringkasan Nopol */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Nomor Polisi / Armada</div>
                <div className="text-xl font-mono font-black text-slate-900 tracking-wider">
                  {memo.no_polisi}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-900 font-bold text-xs rounded-lg border border-blue-200 uppercase">
                {memo.tipe_kunjungan === 'SERVICE'
                  ? 'SERVICE'
                  : memo.tipe_kunjungan === 'BELI_PART'
                  ? 'PEMBELIAN BARANG'
                  : memo.tipe_kunjungan === 'KUNJUNGAN'
                  ? 'KUNJUNGAN'
                  : memo.tipe_kunjungan === 'LAINNYA'
                  ? 'LAINNYA'
                  : 'TAMU / NON-SERVICE'}
              </span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VERIFIED OUT
              </span>
            </div>
          </div>

          {/* Tabel Informasi Kunjungan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Data Pengemudi / Tamu</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Nama Pengemudi:</span>
                <span className="font-semibold text-slate-900">{memo.nama_pengemudi}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Perusahaan / Fleet:</span>
                <span className="font-semibold text-slate-900">{memo.nama_perusahaan || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">No. HP / WhatsApp:</span>
                <span className="font-semibold text-slate-900">{memo.no_telepon_pengemudi || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Nomor Tiket Masuk:</span>
                <span className="font-mono font-bold text-slate-800">{memo.nomor_tiket}</span>
              </div>
            </div>

            <div className="space-y-2 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Waktu & Pos Jaga</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Waktu Masuk Gerbang:</span>
                <span className="font-semibold text-slate-900">{memo.waktu_masuk || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Waktu Keluar Gerbang:</span>
                <span className="font-semibold text-slate-900">{memo.waktu_keluar || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pos Pemeriksaan:</span>
                <span className="font-semibold text-slate-900">{memo.pos_jaga || 'Pos Gerbang Utama'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Status Pembayaran:</span>
                <span className="font-bold text-emerald-700">LUNAS / SELESAI (CLEAR)</span>
              </div>
            </div>
          </div>

          {/* Rincian Muatan / Barang Keluar */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase">
              <PackageCheck className="w-4 h-4 text-blue-700" />
              <span>Keterangan Barang / Material yang Dibawa Keluar</span>
            </div>
            <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 min-h-[44px] leading-relaxed">
              {memo.keterangan_barang_keluar || memo.catatan || 'Tidak ada barang keluar / muatan kosong (hanya unit kendaraan).'}
            </p>
          </div>

          {/* Area Tanda Tangan */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="font-semibold text-slate-600 mb-1">Pengemudi / Pembawa Unit</div>
              <div className="h-20 flex items-end justify-center pb-1">
                <span className="text-slate-400 italic text-[11px]">( Ditandatangani di gerbang )</span>
              </div>
              <div className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                {memo.nama_pengemudi}
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-600 mb-1">Petugas Security Pemeriksa</div>
              <div className="h-20 flex items-center justify-center">
                {memo.ttd_security ? (
                  <img
                    src={memo.ttd_security}
                    alt="Tanda Tangan Security"
                    className="max-h-18 max-w-full object-contain"
                  />
                ) : (
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[11px]">
                    DIGITALLY VERIFIED
                  </div>
                )}
              </div>
              <div className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                {memo.nama_security || 'Petugas Security Pos 1'}
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-3">
            Dokumen ini merupakan bukti sah gate pass gerbang keluar Bengkel Master Truck KIM 3. Dicetak secara sistem otomatis.
          </div>
        </div>

        {/* Modal Action Bar Bawah (Hidden saat Print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Memo Keluar</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
