import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  CheckCircle2,
  CreditCard,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { InvoicePembayaran, SpkItemPekerjaan, SpkItemPart } from '../../types';
import { formatPlat } from '../../api/client';
import { COMPANY_PROFILE, isValidCompanyField } from '../../config/company';
import { terbilangRupiah } from '../../utils/terbilang';
import { usePpnRate } from '../../hooks/usePpnRate';

export interface DigitalFakturModalProps {
  invoice: InvoicePembayaran | null;
  isOpen: boolean;
  onClose: () => void;
  noSpk?: string;
  pekerjaanList?: SpkItemPekerjaan[];
  partList?: SpkItemPart[];
}

export const DigitalFakturModal: React.FC<DigitalFakturModalProps> = ({
  invoice,
  isOpen,
  onClose,
  noSpk,
  pekerjaanList = [],
  partList = [],
}) => {
  const { rate: defaultPpnRate } = usePpnRate();

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

  // Filter item pekerjaan & sparepart yang terikat pada invoice ini bila id_spk ada
  const filteredJasa = useMemo(() => {
    if (!invoice?.id_spk) return [];
    return (pekerjaanList || []).filter((p) => p.id_spk === invoice.id_spk);
  }, [pekerjaanList, invoice?.id_spk]);

  const filteredParts = useMemo(() => {
    if (!invoice?.id_spk) return [];
    return (partList || []).filter((p) => p.id_spk === invoice.id_spk);
  }, [partList, invoice?.id_spk]);

  const hasItemDetails = filteredJasa.length > 0 || filteredParts.length > 0;

  // Filter rekening bank yang valid dan bukan placeholder
  const validBankAccounts = useMemo(() => {
    return (COMPANY_PROFILE.bankAccounts || []).filter(
      (b) => isValidCompanyField(b.accountNumber) && isValidCompanyField(b.bankName)
    );
  }, []);

  if (!isOpen || !invoice) return null;

  const isLunas = invoice.status_pembayaran === 'Paid' || invoice.status_pembayaran === 'Lunas';
  const isProforma = Boolean(invoice.is_proforma);

  // Rekening tujuan transfer HANYA tampil jika invoice BELUM lunas dan ada rekening terdaftar
  const showBankAccounts = !isLunas && validBankAccounts.length > 0;

  // Tarif PPN: hanya tampilkan persentase jika invoice.tarif_ppn_persen valid
  // TODO: Verifikasi tarif PPN dan DPP dengan akuntan jika tidak tercatat pada invoice
  const hasCustomTarifPpn =
    invoice.tarif_ppn_persen != null && !isNaN(Number(invoice.tarif_ppn_persen));
  const tarifPpn = hasCustomTarifPpn ? Number(invoice.tarif_ppn_persen) : defaultPpnRate;

  const tipePajak = (invoice.tipe_pajak || 'E').toUpperCase(); // 'I' = Include, 'E' = Exclude

  // Hitung subtotal kotor item
  const totalJasa = filteredJasa.reduce((acc, curr) => acc + Number(curr.biaya_jasa || 0), 0);
  const totalParts = filteredParts.reduce((acc, curr) => acc + Number(curr.subtotal || 0), 0);

  const subtotalKotor = hasItemDetails
    ? totalJasa + totalParts
    : Number(invoice.subtotal || invoice.grand_total || 0);

  const diskon = Number(invoice.diskon || 0);
  const subtotalSetelahDiskon = Math.max(0, subtotalKotor - diskon);

  // Perhitungan DPP & PPN berdasarkan tipe pajak
  let dpp = subtotalSetelahDiskon;
  let ppnNominal = Number(invoice.ppn_nominal || 0);
  let grandTotal = Number(invoice.grand_total || 0);

  if (tipePajak === 'I') {
    // Include PPN
    if (tarifPpn > 0) {
      dpp = Math.round(subtotalSetelahDiskon / (1 + tarifPpn / 100));
      ppnNominal = subtotalSetelahDiskon - dpp;
      grandTotal = subtotalSetelahDiskon;
    } else {
      dpp = subtotalSetelahDiskon;
      ppnNominal = 0;
      grandTotal = subtotalSetelahDiskon;
    }
  } else {
    // Exclude PPN
    dpp = subtotalSetelahDiskon;
    if (ppnNominal <= 0 && tarifPpn > 0) {
      ppnNominal = Math.round(dpp * (tarifPpn / 100));
    }
    grandTotal = dpp + ppnNominal;
  }

  if (invoice.grand_total && invoice.grand_total > 0) {
    grandTotal = Number(invoice.grand_total);
  }

  // Label PPN tanpa mengasumsikan 0% atau 11% bila tarif_ppn_persen kosong
  let ppnLabel = hasCustomTarifPpn ? `PPN (${tarifPpn}%)` : 'PPN';
  if (tipePajak === 'I') {
    ppnLabel += ' (Include)';
  } else if (tipePajak === 'E' && hasCustomTarifPpn) {
    ppnLabel += ' (Exclude)';
  }

  // Baris DPP hanya tampil jika ada diskon atau nilai PPN > 0
  const showDppRow = diskon > 0 || ppnNominal > 0;

  const formatTanggalWaktu = (dateStr?: string | null) => {
    if (!dateStr || isNaN(new Date(dateStr).getTime())) return '-';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
  };

  const formatTanggalSaja = (dateStr?: string | null) => {
    if (!dateStr || isNaN(new Date(dateStr).getTime())) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-faktur-content');
    if (!printContent) return;

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
            <title>${isProforma ? 'Proforma Invoice' : 'Faktur Penjualan'} - ${invoice.no_invoice}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            ${styles}
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              *, *::before, *::after {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                background: #ffffff !important;
                color: #0f172a !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                font-size: 11pt !important;
                line-height: 1.35 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .faktur-print-wrapper {
                width: 100% !important;
                max-width: 210mm !important;
                margin: 0 auto !important;
                padding: 12mm 15mm !important;
                background: #ffffff !important;
              }
              .no-print {
                display: none !important;
              }
              .logo-chip-print {
                background-color: #0A0D14 !important;
                border: 1px solid #1e293b !important;
                border-radius: 6px !important;
                padding: 6px 12px !important;
                display: inline-flex !important;
                align-items: center !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .logo-chip-print img {
                height: 44px !important;
                width: auto !important;
                object-fit: contain !important;
                display: block !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
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

      const printIframe = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Iframe print error, falling back to window.print():', e);
          window.print();
        }
      };

      // Menunggu seluruh <img> di iframe selesai dimuat sebelum trigger dialog cetak
      const images = Array.from(doc.images);
      if (images.length === 0) {
        setTimeout(printIframe, 150);
      } else {
        let loadedCount = 0;
        let isDone = false;

        const onAllLoaded = () => {
          if (isDone) return;
          isDone = true;
          setTimeout(printIframe, 100);
        };

        const fallbackTimeout = setTimeout(onAllLoaded, 2000);

        images.forEach((img) => {
          if (img.complete) {
            loadedCount++;
            if (loadedCount === images.length) {
              clearTimeout(fallbackTimeout);
              onAllLoaded();
            }
          } else {
            img.onload = img.onerror = () => {
              loadedCount++;
              if (loadedCount === images.length) {
                clearTimeout(fallbackTimeout);
                onAllLoaded();
              }
            };
          }
        });
      }
      return;
    }

    window.print();
  };

  const hasNpwp = isValidCompanyField(COMPANY_PROFILE.npwp);
  const hasPhone = isValidCompanyField(COMPANY_PROFILE.phone);
  const hasEmail = isValidCompanyField(COMPANY_PROFILE.email);
  const hasAnyContact = hasNpwp || hasPhone || hasEmail;
  const isCompanyProfileIncomplete = !hasNpwp || !hasPhone || !hasEmail;

  return createPortal(
    <div className="printable-container fixed inset-0 z-9999 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      {/* Container Utama Modal (Tetap Nyaman di Layar / Dark Mode Backdrop) */}
      <div
        id="printable-faktur"
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Header Modal di Layar (no-print) */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#12388F] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {isProforma ? 'Estimasi Biaya / Proforma Invoice' : 'Invoice / Faktur Penjualan'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans tabular-nums">
                {invoice.no_invoice}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12388F] hover:bg-[#0E2D73] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak A4 / PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifikasi Layar: Jika identitas perusahaan belum lengkap di konfigurasi */}
        {isCompanyProfileIncomplete && (
          <div className="no-print mx-5 my-2.5 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Perhatian:</strong> Lengkapi data perusahaan di konfigurasi sebelum mencetak.
            </span>
          </div>
        )}

        {/* Konten Dokumen Faktur (Bisa Dicetak A4 Portrait) */}
        <div
          id="printable-faktur-content"
          className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 text-slate-800 bg-white"
        >
          {/* 1. KOP DOKUMEN RESMI (Logo Chip Gelap + Identitas Perusahaan & Nomor Faktur) */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 gap-4">
            {/* Sisi Kiri: Chip Logo Master Truck & Profil Bengkel */}
            <div className="flex items-start gap-3.5 flex-1">
              <div className="logo-chip-print bg-[#0A0D14] p-1.5 px-3 rounded-md border border-slate-800 inline-flex items-center shrink-0">
                <img
                  src="/master-truck-logo.png"
                  alt="Master Truck"
                  className="h-11 w-auto object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <div className="text-base font-black tracking-tight text-slate-900 uppercase leading-snug">
                  {COMPANY_PROFILE.tradeName}
                </div>
                <div className="text-[11px] font-semibold text-slate-700">
                  {COMPANY_PROFILE.name}
                </div>
                <div className="text-[10px] text-slate-600 leading-relaxed max-w-md">
                  {COMPANY_PROFILE.address}, {COMPANY_PROFILE.city}, {COMPANY_PROFILE.province} {COMPANY_PROFILE.postalCode}
                </div>
                {/* Baris kontak hanya tampil jika data terisi (tidak pernah mencetak dummy) */}
                {hasAnyContact && (
                  <div className="text-[10px] text-slate-600 flex flex-wrap gap-x-2 pt-0.5">
                    {hasNpwp && (
                      <span><strong>NPWP:</strong> {COMPANY_PROFILE.npwp}</span>
                    )}
                    {hasNpwp && (hasPhone || hasEmail) && <span>•</span>}
                    {hasPhone && (
                      <span><strong>Telp:</strong> {COMPANY_PROFILE.phone}</span>
                    )}
                    {hasPhone && hasEmail && <span>•</span>}
                    {hasEmail && (
                      <span><strong>Email:</strong> {COMPANY_PROFILE.email}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sisi Kanan: Judul Tunggal + Nomor & Tanggal Dokumen */}
            <div className="text-right shrink-0">
              <div className="text-base font-black tracking-tight text-slate-900 uppercase">
                {isProforma ? 'PROFORMA INVOICE' : 'INVOICE / FAKTUR PENJUALAN'}
              </div>
              <div className="text-xs font-bold text-slate-800 tabular-nums mt-0.5">
                NO: {invoice.no_invoice}
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                TGL: {formatTanggalSaja(invoice.tanggal_invoice)}
              </div>
              {invoice.jatuh_tempo && (
                <div className="text-[11px] text-amber-700 font-medium">
                  Jatuh Tempo: {formatTanggalSaja(invoice.jatuh_tempo)}
                </div>
              )}
            </div>
          </div>

          {/* 2. BLOK PEMBELI & REFERENSI ARMADA */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-white p-3 rounded border border-slate-300">
            {/* Kolom Kiri: Data Pembeli (hanya render baris yang ada datanya) */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider block font-bold">
                Tagihan Kepada (Pembeli):
              </span>
              {invoice.nama_customer && (
                <div className="font-bold text-slate-900 text-sm">
                  {invoice.nama_customer}
                </div>
              )}
              {invoice.alamat_customer && (
                <div className="text-[11px] text-slate-600 leading-snug">
                  {invoice.alamat_customer}
                </div>
              )}
              {invoice.npwp_customer && (
                <div className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">NPWP Pembeli:</span> {invoice.npwp_customer}
                </div>
              )}
              {!invoice.nama_customer && !invoice.alamat_customer && !invoice.npwp_customer && (
                <div className="text-slate-700 font-medium">Pelanggan Tunai / Walk-In</div>
              )}
            </div>

            {/* Kolom Kanan: Detail Armada & Referensi SPK/WO */}
            <div className="space-y-1 text-right">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block font-bold">
                  No. Polisi Armada:
                </span>
                <span className="font-bold text-slate-900 text-xs px-2 py-0.5 bg-white border border-slate-300 rounded inline-block mt-0.5">
                  {formatPlat(invoice.no_polisi)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block font-bold">
                  Referensi SPK / WO:
                </span>
                <span className="font-bold text-slate-800 text-xs">
                  {noSpk || (invoice.id_spk ? `SPK #${invoice.id_spk}` : 'Pembelian Langsung')}
                </span>
              </div>
            </div>
          </div>

          {/* 3. TABEL RINCIAN ITEM (JASA & SPAREPART) */}
          <div className="border border-slate-300 rounded">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2 w-10 text-center border-r border-slate-300">No</th>
                  <th className="px-3 py-2 border-r border-slate-300">Deskripsi Barang / Jasa</th>
                  <th className="px-3 py-2 text-center w-14 border-r border-slate-300">Qty</th>
                  <th className="px-3 py-2 text-center w-16 border-r border-slate-300">Satuan</th>
                  <th className="px-3 py-2 text-right w-28 border-r border-slate-300">Harga Satuan</th>
                  <th className="px-3 py-2 text-right w-32">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {hasItemDetails ? (
                  <>
                    {/* Kelompok A: JASA PERBAIKAN */}
                    {filteredJasa.length > 0 && (
                      <tr className="bg-slate-50 font-bold text-slate-800">
                        <td colSpan={6} className="px-3 py-1.5 text-[11px] tracking-wide text-[#12388F]">
                          A. JASA PERBAIKAN & PERAWATAN
                        </td>
                      </tr>
                    )}
                    {filteredJasa.map((item, idx) => (
                      <tr key={`jasa-${item.id || idx}`} className="text-slate-800">
                        <td className="px-3 py-1.5 text-center text-slate-600 tabular-nums border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-1.5 font-medium border-r border-slate-200">
                          {item.nama_pekerjaan}
                        </td>
                        <td className="px-3 py-1.5 text-center tabular-nums border-r border-slate-200">1</td>
                        <td className="px-3 py-1.5 text-center text-slate-600 border-r border-slate-200">Jasa</td>
                        <td className="px-3 py-1.5 text-right tabular-nums border-r border-slate-200">
                          Rp {Number(item.biaya_jasa || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                          Rp {Number(item.biaya_jasa || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}

                    {/* Kelompok B: SPAREPART / SUKU CADANG */}
                    {filteredParts.length > 0 && (
                      <tr className="bg-slate-50 font-bold text-slate-800">
                        <td colSpan={6} className="px-3 py-1.5 text-[11px] tracking-wide text-[#12388F]">
                          B. SUKU CADANG & BAHAN (SPAREPARTS)
                        </td>
                      </tr>
                    )}
                    {filteredParts.map((part, idx) => (
                      <tr key={`part-${part.id || idx}`} className="text-slate-800">
                        <td className="px-3 py-1.5 text-center text-slate-600 tabular-nums border-r border-slate-200">
                          {filteredJasa.length + idx + 1}
                        </td>
                        <td className="px-3 py-1.5 border-r border-slate-200">
                          <span className="font-medium">{part.nama_part}</span>
                          {part.kode_part && (
                            <span className="ml-1.5 text-[10px] text-slate-600 font-mono">
                              ({part.kode_part})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center tabular-nums border-r border-slate-200">
                          {part.jumlah}
                        </td>
                        <td className="px-3 py-1.5 text-center text-slate-600 border-r border-slate-200">
                          {part.satuan || 'Pcs'}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums border-r border-slate-200">
                          Rp {Number(part.harga_satuan || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                          Rp {Number(part.subtotal || (part.jumlah * part.harga_satuan) || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  /* Bila rincian item tidak ada di sistem, tampilkan 1 baris ringkasan tanpa mengarang item */
                  <tr className="text-slate-800">
                    <td className="px-3 py-2.5 text-center text-slate-600 tabular-nums border-r border-slate-200">
                      1
                    </td>
                    <td className="px-3 py-2.5 border-r border-slate-200">
                      <div className="font-medium">Biaya Jasa Servis & Penggantian Suku Cadang Terpadu</div>
                      <div className="text-[10px] text-slate-600 italic">
                        (Rincian paket perbaikan tertera pada Formulir Inspeksi / Surat Perintah Kerja)
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums border-r border-slate-200">1</td>
                    <td className="px-3 py-2.5 text-center text-slate-600 border-r border-slate-200">Paket</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-r border-slate-200">
                      Rp {subtotalKotor.toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                      Rp {subtotalKotor.toLocaleString('id-ID')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. BLOK RINGKASAN ANGKA, PEMBAYARAN & TERBILANG (Jarak 16px, items-start rata atas, avoid-break) */}
          <div className="avoid-break mt-4 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Sisi Kiri: Terbilang, Rekening (bila belum lunas), dan Blok Pembayaran Ringkas */}
              <div className="space-y-2.5">
                {/* Terbilang */}
                <div className="p-2.5 bg-white rounded border border-slate-300">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">
                    Terbilang:
                  </span>
                  <p className="text-xs font-semibold text-slate-800 italic leading-snug">
                    # {terbilangRupiah(grandTotal)} #
                  </p>
                </div>

                {/* Blok Pembayaran & Status Terpadu (Ringkas) */}
                <div className="p-2.5 bg-white rounded border border-slate-300 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Status Pembayaran:
                    </span>
                    {isLunas ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        LUNAS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <AlertCircle className="w-3.5 h-3.5" />
                        BELUM LUNAS
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-slate-700 pt-0.5">
                    <span className="text-[11px]">Metode:</span>
                    <span className="font-semibold text-slate-800">{invoice.metode_pembayaran || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-[11px]">Tanggal Bayar:</span>
                    <span className="tabular-nums text-slate-800 font-medium">
                      {invoice.tanggal_bayar ? formatTanggalWaktu(invoice.tanggal_bayar) : '-'}
                    </span>
                  </div>
                </div>

                {/* Rekening Tujuan Transfer Resmi (HANYA tampil jika BELUM lunas) */}
                {showBankAccounts && (
                  <div className="p-2.5 bg-white rounded border border-slate-300 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Rekening Pembayaran Transfer:
                    </span>
                    {validBankAccounts.map((rek, idx) => (
                      <div key={idx} className="tabular-nums text-[11px] text-slate-800 leading-tight">
                        <strong>{rek.bankName}:</strong> {rek.accountNumber}{' '}
                        <span className="text-slate-600">a/n {rek.accountHolder}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sisi Kanan: Tabel Ringkasan Nilai (Subtotal -> Diskon -> DPP -> PPN -> Grand Total) */}
              <div className="border border-slate-300 rounded overflow-hidden bg-white">
                <table className="w-full text-xs font-medium">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="px-3 py-1.5 text-slate-700">Subtotal</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-800">
                        Rp {subtotalKotor.toLocaleString('id-ID')}
                      </td>
                    </tr>
                    {diskon > 0 && (
                      <tr>
                        <td className="px-3 py-1.5 text-rose-600">Potongan / Diskon</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-rose-600">
                          - Rp {diskon.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    )}
                    {/* Baris DPP hanya tampil jika ada diskon atau nilai PPN > 0 */}
                    {showDppRow && (
                      <tr>
                        <td className="px-3 py-1.5 text-slate-700 font-semibold">
                          DPP (Dasar Pengenaan Pajak)
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-slate-800">
                          Rp {dpp.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-3 py-1.5 text-slate-700">
                        {ppnLabel}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-800">
                        Rp {ppnNominal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                    <tr>
                      <td className="px-3 py-2 text-sm uppercase">Grand Total</td>
                      <td className="px-3 py-2 text-right tabular-nums text-base text-[#12388F]">
                        Rp {grandTotal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 5. TANDA TANGAN & STEMPEL RESMI (avoid-break) */}
            <div className="pt-3 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
              {/* Kolom Kiri: Pelanggan */}
              <div className="space-y-1">
                <div className="text-slate-700 font-medium text-xs">Diterima oleh Pelanggan / Sopir,</div>
                <div className="h-16 flex items-center justify-center">
                  {/* Ruang kosong untuk tanda tangan basah pelanggan */}
                </div>
                <div className="border-b border-slate-400 w-44 mx-auto"></div>
                <div className="font-semibold text-slate-800 text-xs">
                  ( {invoice.nama_customer || 'Pelanggan'} )
                </div>
              </div>

              {/* Kolom Kanan: Kasir & Keuangan Bengkel KIM 3 */}
              <div className="space-y-1">
                <div className="text-slate-700 font-medium text-xs">Kasir & Keuangan Bengkel KIM 3,</div>
                <div className="h-16 flex items-center justify-center relative">
                  {/* Stempel PAID / LUNAS tunggal, diposisikan aman tanpa menimpa teks kasir */}
                  {isLunas && (
                    <div className="border-2 border-emerald-600 text-emerald-700 font-black text-xs uppercase px-3 py-1 rounded tracking-widest rotate-[-5deg] opacity-85 select-none pointer-events-none">
                      PAID / LUNAS
                    </div>
                  )}
                </div>
                <div className="border-b border-slate-400 w-44 mx-auto"></div>
                <div className="font-semibold text-slate-800 text-xs">
                  {invoice.kasir_pic ? `( ${invoice.kasir_pic} )` : '( ___________________________ )'}
                </div>
              </div>
            </div>

            {/* Catatan Kaki Dokumen (Minimal slate-600) */}
            <div className="text-[10px] text-slate-600 text-center pt-1 leading-relaxed">
              Dokumen ini merupakan Faktur Penjualan Komersial resmi yang diterbitkan secara elektronik oleh Sistem Bengkel KIM 3.
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
