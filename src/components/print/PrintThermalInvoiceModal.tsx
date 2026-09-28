import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { InvoicePembayaran } from '../../types';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';

interface PrintThermalInvoiceModalProps {
  invoice: InvoicePembayaran;
  onClose: () => void;
}

export const PrintThermalInvoiceModal: React.FC<PrintThermalInvoiceModalProps> = ({ invoice, onClose }) => {
  const { data: settings } = useQuery({
    queryKey: ['admin-pengaturan-sistem'],
    queryFn: api.getPengaturan,
    staleTime: 60000,
  });

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = invoice.tanggal_invoice 
    ? new Date(invoice.tanggal_invoice).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  const formattedTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs printable-container">
        {/* Modal Card */}
        <div className="bg-surface-raised rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Modal Header (Hidden on Print) */}
          <div className="p-4 bg-surface text-ink flex items-center justify-between border-b border-border no-print shrink-0">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-sm tracking-tight">Preview Struk Kasir (Thermal 80mm)</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-raised transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Receipt Preview Area */}
          <div className="p-6 overflow-y-auto bg-slate-100 dark:bg-slate-900/60 flex justify-center flex-1">
            
            {/* Printable Struk Thermal 80mm Container */}
            <div
              id="printable-thermal-receipt"
              className="bg-white p-4 sm:p-5 shadow-md border border-slate-300 w-[78mm] max-w-[78mm] font-mono text-[11px] leading-tight text-slate-900 mx-auto select-text"
            >
              {/* Header Toko / Bengkel */}
              <div className="text-center space-y-0.5 mb-2">
                <div className="font-black text-xs tracking-tight uppercase">{settings?.nama_bengkel || '-'}</div>
                {settings?.slogan_bengkel && (
                  <div className="text-[10px] text-slate-600">{settings.slogan_bengkel}</div>
                )}
                {settings?.alamat_bengkel && (
                  <div className="text-[9px] text-slate-500">{settings.alamat_bengkel}</div>
                )}
                {settings?.no_telepon_bengkel && (
                  <div className="text-[9px] text-slate-500">Telp: {settings.no_telepon_bengkel}</div>
                )}
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

              {/* Rincian Tagihan — hanya nilai faktur riil, tanpa pembagian jasa/part fiktif */}
              <div className="space-y-1 text-[10px]">
                <div className="font-bold text-[10px] mb-1">RINCIAN PEMBAYARAN:</div>
                <div className="flex justify-between">
                  <span>Subtotal Tagihan</span>
                  <span>Rp {invoice.subtotal != null ? Number(invoice.subtotal).toLocaleString('id-ID') : '-'}</span>
                </div>

                {invoice.diskon ? (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon Promo</span>
                    <span>- Rp {invoice.diskon.toLocaleString('id-ID')}</span>
                  </div>
                ) : null}
              </div>

              <div className="border-b border-dashed border-slate-400 my-2"></div>

              {/* Total Perhitungan (nilai tersimpan apa adanya, tanpa angka contoh) */}
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rp {invoice.subtotal != null ? Number(invoice.subtotal).toLocaleString('id-ID') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>PPN{settings?.ppn_persen != null ? ` ${settings.ppn_persen}%` : ''}:</span>
                  <span>Rp {invoice.ppn_nominal != null ? Number(invoice.ppn_nominal).toLocaleString('id-ID') : '-'}</span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                  <span>TOTAL AKHIR:</span>
                  <span>Rp {invoice.grand_total != null ? Number(invoice.grand_total).toLocaleString('id-ID') : '-'}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Metode Bayar:</span>
                  <span className="font-bold uppercase">{invoice.metode_pembayaran || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status Bayar:</span>
                  <span
                    className={`font-bold uppercase ${
                      invoice.status_pembayaran === 'Paid' || invoice.status_pembayaran === 'Lunas'
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {invoice.status_pembayaran === 'Paid' || invoice.status_pembayaran === 'Lunas'
                      ? 'LUNAS (PAID)'
                      : invoice.status_pembayaran || 'UNPAID'}
                  </span>
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
                {settings?.footer_print_invoice && (
                  <div className="font-semibold">* {settings.footer_print_invoice} *</div>
                )}
                <div>Terima kasih atas kunjungan Anda</div>
                <div className="font-bold">{settings?.nama_bengkel || ''}</div>
              </div>
            </div>

          </div>

          {/* Action Buttons (Hidden on Print) */}
          <div className="p-4 bg-surface border-t border-border flex items-center justify-between gap-3 no-print shrink-0">
            <div className="text-xs text-ink-muted flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Format Thermal 80mm Siap Cetak
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border hover:bg-surface-raised text-ink font-semibold text-xs transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" /> Cetak Struk
              </button>
            </div>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default PrintThermalInvoiceModal;
