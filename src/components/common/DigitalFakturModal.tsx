import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, CheckCircle2, Clock, Calendar, Truck, User, Building2, CreditCard, FileText } from 'lucide-react';
import { InvoicePembayaran } from '../../types';
import { formatPlat } from '../../api/client';

interface DigitalFakturModalProps {
  invoice: InvoicePembayaran | null;
  isOpen: boolean;
  onClose: () => void;
  noSpk?: string;
}

export const DigitalFakturModal: React.FC<DigitalFakturModalProps> = ({
  invoice,
  isOpen,
  onClose,
  noSpk,
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

  if (!isOpen || !invoice) return null;

  const isLunas = invoice.status_pembayaran === 'Paid' || invoice.status_pembayaran === 'Lunas';

  const formatTanggalWaktu = (dateStr?: string | null) => {
    if (!dateStr || isNaN(new Date(dateStr).getTime())) return '-';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-faktur-content');
    if (printContent) {
      let iframe = document.getElementById('faktur-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'faktur-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (doc) {
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
          .map((el) => el.outerHTML)
          .join('\n');

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html lang="id">
            <head>
              <title>Faktur Penjualan & Servis - ${invoice.no_invoice}</title>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              ${styles}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 12mm 15mm;
                }
                *, *::before, *::after {
                  box-sizing: border-box;
                }
                html, body {
                  background: #ffffff !important;
                  color: #0f172a !important;
                  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .faktur-print-wrapper {
                  width: 100% !important;
                  max-width: 800px !important;
                  margin: 0 auto !important;
                  padding: 16px !important;
                  background: #ffffff !important;
                }
                .no-print {
                  display: none !important;
                }
                .kop-header {
                  display: flex !important;
                  justify-content: space-between !important;
                  align-items: flex-start !important;
                  width: 100% !important;
                  border-bottom: 2px solid #0f172a !important;
                  padding-bottom: 16px !important;
                  margin-bottom: 16px !important;
                }
                .kop-left {
                  text-align: left !important;
                  flex: 1 !important;
                }
                .kop-right {
                  text-align: right !important;
                  float: right !important;
                }
              </style>
            </head>
            <body>
              <div class="faktur-print-wrapper">
                ${printContent.innerHTML}
              </div>
            </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('Iframe print error, falling back to window.print():', e);
            window.print();
          }
        }, 350);
        return;
      }
    }

    window.print();
  };

  return createPortal(
    <div className="printable-container fixed inset-0 z-9999 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      {/* Container Cetak */}
      <div 
        id="printable-faktur"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Header Modal - Layar (Disembunyikan saat cetak) */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#12388F] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Faktur Penjualan & Servis</h3>
              <p className="text-[11px] text-slate-500 font-mono">Invoice #{invoice.no_invoice}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12388F] hover:bg-[#0E2D73] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Konten Dokumen Faktur */}
        <div 
          id="printable-faktur-content"
          className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 bg-white"
        >
          {/* KOP RESMI DOKUMEN (Kiri: Bengkel KIM 3 | Kanan Float: Faktur & No Invoice) */}
          <div className="kop-header flex justify-between items-start border-b-2 border-slate-900 pb-4 gap-4">
            {/* Sisi Kiri: Identitas Bengkel */}
            <div className="kop-left space-y-1">
              <div className="text-xl font-black tracking-tight text-slate-900 leading-none">
                BENGKEL MASTER TRUCK - KIM 3
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Kawasan Industri Medan III (KIM 3) • One Stop Truck Maintenance & Spareparts Service
              </div>
              <div className="text-[11px] text-slate-500">
                Telp: 0812-3456-7890 • Email: billing@bengkelkim3.co.id
              </div>
            </div>

            {/* Sisi Kanan (Float Kanan): Judul & Nomor Faktur */}
            <div className="kop-right text-right shrink-0">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#12388F] border border-blue-200 uppercase tracking-wider mb-1">
                Tax Invoice • Faktur Resmi
              </div>
              <div className="text-base font-black tracking-tight text-slate-900 uppercase">
                FAKTUR PENJUALAN & SERVIS
              </div>
              <div className="text-xs font-mono font-bold text-slate-700">
                NO: {invoice.no_invoice}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                TGL: {formatTanggalWaktu(invoice.tanggal_invoice)}
              </div>
            </div>
          </div>

          {/* Grid Informasi Customer, Unit & SPK */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-2">
              <div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">Pelanggan / Customer:</span>
                <span className="font-bold text-slate-900 text-sm">{invoice.nama_customer || 'Mitra Fleet KIM 3'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">Nomor Polisi Armada:</span>
                <span className="font-bold font-mono text-slate-900 text-xs px-2 py-0.5 bg-white border border-slate-300 rounded inline-block mt-0.5">
                  {formatPlat(invoice.no_polisi)}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-right">
              <div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">Referensi SPK / WO:</span>
                <span className="font-mono font-bold text-slate-900">
                  {noSpk || (invoice.id_spk ? `SPK #${invoice.id_spk}` : 'Pembelian Langsung')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">Petugas Kasir / Billing:</span>
                <span className="font-semibold text-slate-700">{invoice.kasir_pic || 'Kasir Bengkel KIM 3'}</span>
              </div>
            </div>
          </div>

          {/* Rincian Tagihan & Nominal */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Keterangan Biaya</th>
                  <th className="px-4 py-2.5 text-right">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="px-4 py-2 text-slate-700">Subtotal DPP (Dasar Pengenaan Pajak)</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-800">
                    Rp {Number(invoice.subtotal || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-slate-700">
                    PPN {invoice.tarif_ppn_persen != null ? `(${Number(invoice.tarif_ppn_persen)}%)` : Number(invoice.ppn_nominal || 0) > 0 ? '(11%)' : '(0%)'}
                    {invoice.tipe_pajak === 'I' && (
                      <span className="ml-1 text-[10px] text-slate-500 font-normal italic">(Include)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-800">
                    Rp {Number(invoice.ppn_nominal || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
                {Number(invoice.diskon || 0) > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-status-red">Potongan / Diskon</td>
                    <td className="px-4 py-2 text-right font-mono text-status-red">
                      - Rp {Number(invoice.diskon).toLocaleString('id-ID')}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td className="px-4 py-3 text-sm uppercase">Total Tagihan (Grand Total)</td>
                  <td className="px-4 py-3 text-right font-mono text-base text-[#12388F]">
                    Rp {Number(invoice.grand_total || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Informasi Status & Pembayaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">Metode Pembayaran:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#12388F]" />
                {invoice.metode_pembayaran || 'Transfer Bank / Tempo'}
              </span>
              {invoice.tanggal_bayar && (
                <div className="text-[11px] text-slate-500 pt-0.5">
                  Waktu Bayar: {formatTanggalWaktu(invoice.tanggal_bayar)}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">Status Pembayaran:</span>
                <span className="text-xs text-slate-600 font-medium">Status Resmi Sistem POS</span>
              </div>
              <div>
                {isLunas ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    LUNAS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-3.5 h-3.5" />
                    MENUNGGU PEMBAYARAN
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tanda Tangan & Cap Validasi */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-12">
              <div className="text-slate-500 font-medium">Diterima oleh Pelanggan / Driver,</div>
              <div className="border-b border-slate-400 w-36 mx-auto"></div>
              <div className="font-bold text-slate-700">( {invoice.nama_customer || 'Customer'} )</div>
            </div>
            <div className="space-y-12 relative">
              <div className="text-slate-500 font-medium">Kasir & Keuangan Bengkel KIM 3,</div>
              {isLunas && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 border-2 border-emerald-600 text-emerald-700 font-black text-xs uppercase px-3 py-1 rounded tracking-widest rotate-[-6deg] opacity-75">
                  PAID / LUNAS
                </div>
              )}
              <div className="border-b border-slate-400 w-36 mx-auto"></div>
              <div className="font-bold text-slate-700">( {invoice.kasir_pic || 'Kasir KIM 3'} )</div>
            </div>
          </div>

          {/* Catatan Dokumen */}
          <div className="text-[10px] text-slate-400 text-center pt-2">
            Dokumen ini dicetak otomatis dari Sistem Manajemen Bengkel KIM 3 (Terhubung dengan POS). Sah tanpa stempel basah.
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
