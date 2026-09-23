import React from 'react';
import { InvoicePembayaran } from '../../types';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface PrintThermalInvoiceModalProps {
  invoice: InvoicePembayaran;
  onClose: () => void;
}

export const PrintThermalInvoiceModal: React.FC<PrintThermalInvoiceModalProps> = ({ invoice, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = invoice.tanggal_invoice 
    ? new Date(invoice.tanggal_invoice).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  const formattedTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs printable-container">
      {/* Modal Card */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header (Hidden on Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <h3 className="font-black text-sm tracking-tight">Preview Struk Kasir (Thermal 80mm)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center flex-1">
          
          {/* Printable Struk Thermal 80mm Container */}
          <div
            id="printable-thermal-receipt"
            className="bg-white p-4 sm:p-5 shadow-md border border-slate-300 w-[78mm] max-w-[78mm] font-mono text-[11px] leading-tight text-slate-900 mx-auto select-text"
          >
            {/* Header Toko / Bengkel */}
            <div className="text-center space-y-0.5 mb-2">
              <div className="font-black text-xs tracking-tight uppercase">PT. BENGKEL KIM 3 MEDAN</div>
              <div className="text-[10px] text-slate-600">Kawasan Industri Medan III (KIM 3)</div>
              <div className="text-[9px] text-slate-500">Jl. Pulau Bunyu, Deli Serdang, Sumut</div>
              <div className="text-[9px] text-slate-500">Telp: (061) 8888-KIM3 / 0812-3456-7890</div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* Info Transaksi */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>No. Inv :</span>
                <span className="font-bold">{invoice.no_invoice}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu   :</span>
                <span>{formattedDate} {formattedTime} WIB</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir   :</span>
                <span>{invoice.kasir_pic || 'Kasir'}</span>
              </div>
              <div className="flex justify-between">
                <span>No. Pol :</span>
                <span className="font-bold">{invoice.no_polisi}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="truncate max-w-[120px]">{invoice.nama_customer || 'Pelanggan Umum'}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* Rincian Tagihan */}
            <div className="space-y-1 text-[10px]">
              <div className="font-bold text-[10px] mb-1">RINCIAN PEMBAYARAN:</div>
              <div className="flex justify-between">
                <span>Jasa Servis &amp; Perbaikan</span>
                <span>Rp {(invoice.subtotal ? invoice.subtotal * 0.4 : 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Sparepart &amp; Material</span>
                <span>Rp {(invoice.subtotal ? invoice.subtotal * 0.6 : 0).toLocaleString('id-ID')}</span>
              </div>

              {invoice.diskon ? (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon Promo</span>
                  <span>- Rp {invoice.diskon.toLocaleString('id-ID')}</span>
                </div>
              ) : null}
            </div>

            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* Total Perhitungan */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rp {(invoice.subtotal || 1500000).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>PPN 11%:</span>
                <span>Rp {(invoice.ppn_nominal || 165000).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                <span>TOTAL AKHIR:</span>
                <span>Rp {(invoice.grand_total || 1665000).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Metode Bayar:</span>
                <span className="font-bold uppercase">{invoice.metode_pembayaran || 'TUNAI / CASH'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status Bayar:</span>
                <span className="font-bold text-emerald-700 uppercase">LUNAS (PAID)</span>
              </div>
            </div>

            {/* Barcode Simulator */}
            <div className="my-3 text-center">
              <div className="font-mono text-[9px] tracking-widest text-slate-400">||| | |||| | ||| || |||| | |||||</div>
              <div className="text-[8px] text-slate-400">{invoice.no_invoice}</div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2"></div>

            {/* Footer Ucapan */}
            <div className="text-center text-[9px] text-slate-600 space-y-0.5">
              <div className="font-semibold">* Simpan struk ini sebagai bukti sah *</div>
              <div>Terima kasih atas kepercayaan Anda</div>
              <div className="font-bold">BENGKEL KIM 3 MEDAN</div>
            </div>
          </div>

        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 no-print shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Format Thermal 80mm Siap Cetak
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" /> Cetak Struk (80mm)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrintThermalInvoiceModal;
