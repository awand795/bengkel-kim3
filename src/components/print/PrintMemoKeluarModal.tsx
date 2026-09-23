import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { MemoKeluar } from '../../types';
import { Printer, X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface PrintMemoKeluarModalProps {
  memo: MemoKeluar;
  onClose: () => void;
}

export const PrintMemoKeluarModal: React.FC<PrintMemoKeluarModalProps> = ({ memo, onClose }) => {
  const { data: settings } = useQuery({
    queryKey: ['admin-pengaturan-sistem'],
    queryFn: api.getPengaturan,
    staleTime: 60000,
  });

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = memo.waktu_keluar
    ? new Date(memo.waktu_keluar).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  const formattedTime = memo.waktu_keluar
    ? new Date(memo.waktu_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs printable-container">
      {/* Modal Card */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Modal Header (Hidden on Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="font-black text-sm tracking-tight">Preview Surat Memo Keluar (Gate Pass) - Standar HVS A4</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable A4 Document Preview Area */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 flex justify-center flex-1">
          
          {/* Printable A4 Container */}
          <div
            id="printable-a4-document"
            className="bg-white p-8 sm:p-10 shadow-lg border border-slate-300 w-full max-w-[210mm] text-slate-900 mx-auto select-text text-xs leading-relaxed"
          >
            {/* KOP RESMI SECURITY */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black text-xl shadow-xs">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                      POS SECURITY – {settings?.nama_bengkel || 'PT. BENGKEL KIM 3 MEDAN'}
                    </h1>
                    <p className="text-[11px] font-semibold text-slate-700">
                      {settings?.slogan_bengkel || 'Gerbang Utama Kontrol Keluar Masuk Armada & Fasilitas Terpadu KIM 3'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {settings?.alamat_bengkel || 'Jl. Pulau Pinang Raya No. 8, Kawasan Industri Modern 3, Medan, Sumatera Utara'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {settings?.no_telepon_bengkel ? `Layanan Darurat / Pos Security: ${settings.no_telepon_bengkel}` : 'Layanan Darurat / Pos Security: (061) 8920123 / 0812-6543-9870'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                    RESMI &amp; TERVERIFIKASI
                  </span>
                  <div className="text-xs font-mono font-black text-blue-700 mt-1">{memo.no_memo}</div>
                </div>
              </div>
              <div className="border-b border-slate-400 mt-2"></div>
            </div>

            {/* JUDUL DOKUMEN */}
            <div className="text-center my-4">
              <h2 className="text-base font-black tracking-wider uppercase text-slate-900 underline underline-offset-4">
                {settings?.header_print_memo || 'SURAT MEMO KELUAR RESMI (GATE PASS)'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">
                Bukti Izin Resmi Meninggalkan Area Fasilitas {settings?.nama_bengkel || 'Bengkel KIM 3'}
              </p>
            </div>

            {/* IDENTITAS DOKUMEN & KENDARAAN (2 KOLOM) */}
            <div className="border border-slate-300 rounded-xl p-4 mb-4 bg-slate-50/60 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex">
                  <span className="w-32 text-slate-500">No. Memo Keluar</span>
                  <span className="font-bold text-slate-900 font-mono">: {memo.no_memo}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500">Tanggal Keluar</span>
                  <span className="font-semibold text-slate-800">: {formattedDate}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500">Waktu Gerbang</span>
                  <span className="font-semibold text-slate-800">: {formattedTime} WIB</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500">Petugas Security</span>
                  <span className="font-semibold text-slate-800">: {memo.petugas_security || '( Petugas Security )'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex">
                  <span className="w-32 text-slate-500">No. Polisi</span>
                  <span className="font-black text-slate-900 text-sm">: {memo.no_polisi}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500">Customer / Armada</span>
                  <span className="font-semibold text-slate-800">: {memo.nama_customer || 'Pelanggan'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500">Jenis Armada</span>
                  <span className="font-semibold text-slate-800">: {memo.jenis_armada || 'Truk'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500">Tujuan Kedatangan</span>
                  <span className="font-bold text-blue-700">: {memo.tujuan_kedatangan || 'Service Selesai'}</span>
                </div>
              </div>
            </div>

            {/* STATUS VERIFIKASI ADMINISTRASI */}
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3.5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-900 text-[11px]">
                    STATUS ADMINISTRASI: LUNAS &amp; DISETUJUI CHECK OUT
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Faktur tagihan telah diselesaikan di Kasir dan lulus pemeriksaan akhir (FIR Closed).
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-md font-mono font-bold text-[10px]">
                GATE CLEAR
              </span>
            </div>

            {/* RINCIAN BARANG BAWAAN */}
            <div className="border border-slate-300 rounded-xl p-4 mb-4">
              <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wide mb-2">
                Pemeriksaan Fisik Barang &amp; Muatan Keluar:
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 min-h-[50px]">
                {memo.catatan ? (
                  <p>{memo.catatan}</p>
                ) : (
                  <p>Kendaraan selesai service dalam kondisi baik. Membawa sparepart bekas penggantian dan berkas dokumen kendaraan lengkap.</p>
                )}
              </div>
            </div>

            {/* KETENTUAN POS GERBANG */}
            <div className="text-[10px] text-slate-500 mb-8 space-y-1">
              <p className="italic">
                {settings?.footer_print_memo || 'Memo keluar ini merupakan dokumen resmi verifikasi security gate. Kendaraan dan muatan wajib diperiksa sebelum keluar gerbang bengkel.'}
              </p>
              <p>Pengemudi wajib menyerahkan lembar verifikasi ini kepada petugas pos gerbang sebelum meninggalkan lokasi.</p>
            </div>

            {/* KOLOM TANDA TANGAN & STEMPEL */}
            <div className="grid grid-cols-2 gap-8 text-center text-[11px] pt-4 border-t border-slate-300 avoid-break">
              <div>
                <div className="text-slate-500 font-semibold mb-14">Petugas Security Pos Utama</div>
                <div className="font-bold text-slate-900 underline">{memo.petugas_security || '( Petugas Security )'}</div>
                <div className="text-[10px] text-slate-400">Security Gate Control KIM 3</div>
              </div>

              <div>
                <div className="text-slate-500 font-semibold mb-14">Pengemudi / Sopir Armada</div>
                <div className="font-bold text-slate-900 underline">( ........................................ )</div>
                <div className="text-[10px] text-slate-400">Tanda Tangan &amp; Nama Terang</div>
              </div>
            </div>

          </div>

        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 no-print shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Format Dokumen Gate Pass A4 Siap Cetak
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" /> Cetak Memo Keluar (A4)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrintMemoKeluarModal;
