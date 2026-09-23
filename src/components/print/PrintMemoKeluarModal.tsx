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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-surface-dark/60 backdrop-blur-xs printable-container">
      {/* Modal Card */}
      <div className="bg-surface-raised rounded-md shadow-2xl border border-border w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Modal Header (Hidden on Print) */}
        <div className="p-4 bg-surface-dark text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <h3 className="font-black text-sm tracking-tight">Preview Surat Memo Keluar (Gate Pass) - Standar HVS A4</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-ink-subtle hover:text-white hover:bg-surface-dark/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable A4 Document Preview Area */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-surface flex justify-center flex-1">
          
          {/* Printable A4 Container */}
          <div
            id="printable-a4-document"
            className="bg-surface-raised p-8 sm:p-10 shadow-lg border border-border w-full max-w-[210mm] text-ink mx-auto select-text text-xs leading-relaxed"
          >
            {/* KOP RESMI SECURITY */}
            <div className="border-b-2 border-ink pb-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-accent text-white flex items-center justify-center font-black text-xl shadow-xs">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-base font-black tracking-tight text-ink uppercase">
                      POS SECURITY – {settings?.nama_bengkel || '-'}
                    </h1>
                    {settings?.slogan_bengkel && (
                      <p className="text-[11px] font-semibold text-ink-muted">
                        {settings.slogan_bengkel}
                      </p>
                    )}
                    {settings?.alamat_bengkel && (
                      <p className="text-[10px] text-ink-subtle">
                        {settings.alamat_bengkel}
                      </p>
                    )}
                    {settings?.no_telepon_bengkel && (
                      <p className="text-[10px] text-ink-subtle">
                        Layanan Darurat / Pos Security: {settings.no_telepon_bengkel}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-md bg-status-green-bg text-status-green font-bold text-[10px] border border-status-green/30">
                    RESMI &amp; TERVERIFIKASI
                  </span>
                  <div className="text-xs font-mono font-black text-accent mt-1">{memo.no_memo}</div>
                </div>
              </div>
              <div className="border-b border-border mt-2"></div>
            </div>

            {/* JUDUL DOKUMEN */}
            <div className="text-center my-4">
              <h2 className="text-base font-black tracking-wider uppercase text-ink underline underline-offset-4">
                {settings?.header_print_memo || 'SURAT MEMO KELUAR RESMI (GATE PASS)'}
              </h2>
              <p className="text-[11px] text-ink-subtle mt-1">
                Bukti Izin Resmi Meninggalkan Area Fasilitas {settings?.nama_bengkel || ''}
              </p>
            </div>

            {/* IDENTITAS DOKUMEN & KENDARAAN (2 KOLOM) */}
            <div className="border border-border rounded-md p-4 mb-4 bg-surface/60 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex">
                  <span className="w-32 text-ink-muted">No. Memo Keluar</span>
                  <span className="font-bold text-ink font-mono">: {memo.no_memo}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-ink-muted">Tanggal Keluar</span>
                  <span className="font-semibold text-ink">: {formattedDate}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-ink-muted">Waktu Gerbang</span>
                  <span className="font-semibold text-ink">: {formattedTime} WIB</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-ink-muted">Petugas Security</span>
                  <span className="font-semibold text-ink">: {memo.petugas_security || '( Petugas Security )'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex">
                  <span className="w-32 text-ink-muted">No. Polisi</span>
                  <span className="font-black text-ink text-sm">: {memo.no_polisi}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-ink-muted">Customer / Armada</span>
                  <span className="font-semibold text-ink">: {memo.nama_customer || 'Pelanggan'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-ink-muted">Jenis Armada</span>
                  <span className="font-semibold text-ink">: {memo.jenis_armada || 'Truk'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-ink-muted">Tujuan Kedatangan</span>
                  <span className="font-bold text-accent">: {memo.tujuan_kedatangan || 'Service Selesai'}</span>
                </div>
              </div>
            </div>

            {/* STATUS VERIFIKASI ADMINISTRASI */}
            <div className="border border-status-green/30 bg-status-green-bg/50 rounded-md p-3.5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-status-green shrink-0" />
                <div>
                  <div className="font-bold text-status-green text-[11px]">
                    STATUS ADMINISTRASI: LUNAS &amp; DISETUJUI CHECK OUT
                  </div>
                  <div className="text-[10px] text-status-green/80">
                    Faktur tagihan telah diselesaikan di Kasir dan lulus pemeriksaan akhir (FIR Closed).
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-status-green text-white rounded-md font-mono font-bold text-[10px]">
                GATE CLEAR
              </span>
            </div>

            {/* RINCIAN BARANG BAWAAN */}
            <div className="border border-border rounded-md p-4 mb-4">
              <div className="font-bold text-ink text-[11px] uppercase tracking-wide mb-2">
                Pemeriksaan Fisik Barang &amp; Muatan Keluar:
              </div>
              <div className="p-3 bg-surface rounded-md border border-border text-ink min-h-[50px]">
                {memo.catatan ? (
                  <p>{memo.catatan}</p>
                ) : (
                  <p>Kendaraan selesai service dalam kondisi baik. Membawa sparepart bekas penggantian dan berkas dokumen kendaraan lengkap.</p>
                )}
              </div>
            </div>

            {/* KETENTUAN POS GERBANG */}
            <div className="text-[10px] text-ink-subtle mb-8 space-y-1">
              <p className="italic">
                {settings?.footer_print_memo || ''}
              </p>
              <p>Pengemudi wajib menyerahkan lembar verifikasi ini kepada petugas pos gerbang sebelum meninggalkan lokasi.</p>
            </div>

            {/* KOLOM TANDA TANGAN & STEMPEL */}
            <div className="grid grid-cols-2 gap-8 text-center text-[11px] pt-4 border-t border-border avoid-break">
              <div>
                <div className="text-ink-muted font-semibold mb-14">Petugas Security Pos Utama</div>
                <div className="font-bold text-ink underline">{memo.petugas_security || '( Petugas Security )'}</div>
                <div className="text-[10px] text-ink-subtle">Security Gate Control KIM 3</div>
              </div>

              <div>
                <div className="text-ink-muted font-semibold mb-14">Pengemudi / Sopir Armada</div>
                <div className="font-bold text-ink underline">( ........................................ )</div>
                <div className="text-[10px] text-ink-subtle">Tanda Tangan &amp; Nama Terang</div>
              </div>
            </div>

          </div>

        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="p-4 bg-surface-raised border-t border-border flex items-center justify-between gap-3 no-print shrink-0">
          <div className="text-[11px] text-ink-muted flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-status-green" /> Format Dokumen Gate Pass A4 Siap Cetak
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border hover:bg-surface text-ink font-bold text-xs transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-md bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
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
