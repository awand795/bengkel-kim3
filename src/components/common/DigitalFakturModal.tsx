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
  const hasCustomTarifPpn =
    invoice.tarif_ppn_persen != null && !isNaN(Number(invoice.tarif_ppn_persen));
  const tarifPpn = hasCustomTarifPpn ? Number(invoice.tarif_ppn_persen) : defaultPpnRate;

  // Tentukan tipe pajak ('E' = Exclude, 'I' = Include); untuk proforma tanpa field tipe_pajak, deteksi dari item
  const rawSubtotalFirstItem =
    filteredJasa[0]?.biaya_jasa ?? filteredParts[0]?.subtotal ?? 0;
  const rawDppFirstItem =
    filteredJasa[0]?.total_dpp ?? filteredParts[0]?.total_dpp;
  const rawNettoFirstItem =
    filteredJasa[0]?.total_netto ?? filteredParts[0]?.total_netto;
  const inferredExcludeFromItems =
    !invoice.tipe_pajak &&
    rawDppFirstItem != null &&
    rawNettoFirstItem != null &&
    Number(rawNettoFirstItem) > Number(rawDppFirstItem) + 0.5 &&
    Math.abs(Number(rawSubtotalFirstItem) - Number(rawDppFirstItem)) < 1;

  const tipePajak = (
    invoice.tipe_pajak || (inferredExcludeFromItems ? 'E' : 'I')
  ).toUpperCase();
  const fmtRp = (val: number) =>
    Number(val || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });

  // Helper terpadu konversi item POS/WO menjadi angka tampil (harga termasuk PPN seperti cetakan Faktur POS)
  const computeLineDisplay = (params: {
    qty: number;
    hargaSatuanRaw: number;
    grossSubtotalRaw: number;
    disc1?: number;
    disc2?: number;
    disc3?: number;
    diskonTotalRaw?: number;
    totalNettoRaw?: number;
  }) => {
    const qty = params.qty > 0 ? params.qty : 1;
    const baseUnit = Number(params.hargaSatuanRaw || 0);
    const hargaSatuanTampil =
      tipePajak === 'E' && tarifPpn > 0
        ? Math.round(baseUnit) + Math.round(Math.round(baseUnit) * (tarifPpn / 100))
        : baseUnit;

    let nettoItem: number;
    if (params.totalNettoRaw != null && !isNaN(Number(params.totalNettoRaw))) {
      nettoItem = Number(params.totalNettoRaw);
    } else {
      const afterDisc = Math.max(
        0,
        Number(params.grossSubtotalRaw || baseUnit * qty) - Number(params.diskonTotalRaw || 0)
      );
      nettoItem =
        tipePajak === 'E' && tarifPpn > 0
          ? Math.round(afterDisc) + Math.round(Math.round(afterDisc) * (tarifPpn / 100))
          : afterDisc;
    }

    const hasDiscount =
      Number(params.disc1 || 0) > 0 ||
      Number(params.disc2 || 0) > 0 ||
      Number(params.disc3 || 0) > 0 ||
      Number(params.diskonTotalRaw || 0) > 0;
    const diskonInclPpn = hasDiscount
      ? Math.max(0, hargaSatuanTampil * qty - nettoItem)
      : 0;

    return {
      qty,
      hargaSatuanTampil,
      diskonInclPpn,
      nettoItem,
    };
  };

  const jasaRows = filteredJasa.map((item) => {
    const qty = Number(item.qty || 1);
    const hargaSatuanRaw = Number(
      item.harga_satuan ?? (qty > 0 ? Number(item.biaya_jasa || 0) / qty : item.biaya_jasa) ?? 0
    );
    const grossSubtotalRaw = Number(item.biaya_jasa || qty * hargaSatuanRaw || 0);
    const display = computeLineDisplay({
      qty,
      hargaSatuanRaw,
      grossSubtotalRaw,
      disc1: item.disc1,
      disc2: item.disc2,
      disc3: item.disc3,
      diskonTotalRaw: item.diskon,
      totalNettoRaw: item.total_netto,
    });
    return { item, ...display };
  });

  const partRows = filteredParts.map((part) => {
    const qty = Number(part.jumlah || 1);
    const hargaSatuanRaw = Number(part.harga_satuan || 0);
    const grossSubtotalRaw = Number(part.subtotal ?? qty * hargaSatuanRaw);
    const display = computeLineDisplay({
      qty,
      hargaSatuanRaw,
      grossSubtotalRaw,
      disc1: part.disc1,
      disc2: part.disc2,
      disc3: part.disc3,
      diskonTotalRaw: part.diskon,
      totalNettoRaw: part.total_netto,
    });
    return { part, ...display };
  });

  const subtotalJasaNetto = jasaRows.reduce((acc, r) => acc + r.nettoItem, 0);
  const subtotalPartNetto = partRows.reduce((acc, r) => acc + r.nettoItem, 0);
  const totalDiskonItemsInclPpn =
    jasaRows.reduce((acc, r) => acc + r.diskonInclPpn, 0) +
    partRows.reduce((acc, r) => acc + r.diskonInclPpn, 0);

  // Hitung subtotal kotor item (basis DPP sebelum PPN bila 'E')
  const totalJasa = filteredJasa.reduce((acc, curr) => acc + Number(curr.biaya_jasa || 0), 0);
  const totalParts = filteredParts.reduce(
    (acc, curr) => acc + Number(curr.subtotal ?? (Number(curr.jumlah || 0) * Number(curr.harga_satuan || 0))),
    0
  );
  const totalDiskonItems =
    filteredJasa.reduce((acc, curr) => acc + Number(curr.diskon || 0), 0) +
    filteredParts.reduce((acc, curr) => acc + Number(curr.diskon || 0), 0);

  const hasDbInvoiceNumbers =
    !isProforma &&
    (Number(invoice.grand_total || 0) > 0 ||
      invoice.dpp_nominal != null ||
      Number(invoice.ppn_nominal || 0) > 0);

  const subtotalKotor =
    !isProforma && Number(invoice.subtotal || 0) > 0
      ? Number(invoice.subtotal)
      : hasItemDetails
        ? totalJasa + totalParts
        : Number(invoice.subtotal || invoice.grand_total || 0);

  const diskonItem =
    !isProforma && invoice.diskon_item != null ? Number(invoice.diskon_item) : totalDiskonItems;
  const ekstraDiskon =
    !isProforma && invoice.ekstra_diskon != null ? Number(invoice.ekstra_diskon) : 0;
  const diskon =
    !isProforma &&
    (invoice.diskon != null || invoice.diskon_item != null || invoice.ekstra_diskon != null)
      ? Math.max(Number(invoice.diskon ?? 0), diskonItem + ekstraDiskon)
      : totalDiskonItems > 0
        ? totalDiskonItems
        : Number(invoice.diskon || 0);

  const subtotalSetelahDiskon = Math.max(0, subtotalKotor - diskon);

  // Gunakan bilangan exact dari POS (total_dpp, total_ppn, total_netto) tanpa pembulatan ulang
  let dpp = subtotalSetelahDiskon;
  let ppnNominal = Number(invoice.ppn_nominal || 0);
  let grandTotal = Number(invoice.grand_total || 0);

  if (hasDbInvoiceNumbers) {
    dpp =
      invoice.dpp_nominal != null && !isNaN(Number(invoice.dpp_nominal))
        ? Number(invoice.dpp_nominal)
        : tipePajak === 'I' && tarifPpn > 0
          ? subtotalSetelahDiskon / (1 + tarifPpn / 100)
          : subtotalSetelahDiskon;
    ppnNominal = Number(invoice.ppn_nominal || 0);
    grandTotal =
      Number(invoice.grand_total || 0) > 0
        ? Number(invoice.grand_total)
        : tipePajak === 'I'
          ? subtotalSetelahDiskon
          : dpp + ppnNominal;
  } else if (
    hasItemDetails &&
    (filteredJasa.some((j) => j.total_netto != null) ||
      filteredParts.some((p) => p.total_netto != null))
  ) {
    const sumDpp =
      filteredJasa.reduce((acc, c) => acc + Number(c.total_dpp ?? c.biaya_jasa ?? 0), 0) +
      filteredParts.reduce((acc, c) => acc + Number(c.total_dpp ?? c.subtotal ?? 0), 0);
    const sumPpn =
      filteredJasa.reduce((acc, c) => acc + Number(c.total_ppn ?? 0), 0) +
      filteredParts.reduce((acc, c) => acc + Number(c.total_ppn ?? 0), 0);
    const sumNetto = subtotalJasaNetto + subtotalPartNetto;
    dpp = sumDpp;
    ppnNominal = sumPpn;
    grandTotal = sumNetto > 0 ? sumNetto : subtotalSetelahDiskon;
  } else if (tipePajak === 'I') {
    if (tarifPpn > 0) {
      dpp = subtotalSetelahDiskon * (100 / (100 + tarifPpn));
      ppnNominal = subtotalSetelahDiskon - dpp;
      grandTotal = subtotalSetelahDiskon;
    } else {
      dpp = subtotalSetelahDiskon;
      ppnNominal = 0;
      grandTotal = subtotalSetelahDiskon;
    }
  } else {
    dpp = subtotalSetelahDiskon;
    if (ppnNominal <= 0 && tarifPpn > 0) {
      ppnNominal = dpp * (tarifPpn / 100);
    }
    grandTotal = dpp + ppnNominal;
  }

  // Total Harga Jual tampil (sudah termasuk PPN, identik dengan POS "Total Harga Jual")
  const totalHargaJualTampil = hasItemDetails
    ? subtotalJasaNetto + subtotalPartNetto
    : grandTotal + ekstraDiskon;

  const displayNoSpk = noSpk || invoice.no_spk;
  const formatDiscDetail = (d1?: number, d2?: number, d3?: number, discInclPpn?: number) => {
    const pcts = [d1, d2, d3].filter((v) => Number(v || 0) > 0).map((v) => `${Number(v)}%`);
    if (pcts.length > 0 && Number(discInclPpn || 0) > 0) {
      return `${pcts.join('+')} (-Rp ${fmtRp(Number(discInclPpn))})`;
    }
    if (Number(discInclPpn || 0) > 0) {
      return `-Rp ${fmtRp(Number(discInclPpn))}`;
    }
    return '-';
  };

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
            <title>${isProforma ? 'Proforma Invoice' : 'Faktur Penjualan'}</title>
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
            <div className="text-right shrink-0 space-y-0.5">
              <div className="text-base font-black tracking-tight text-slate-900 uppercase">
                {isProforma ? 'PROFORMA INVOICE' : 'INVOICE / FAKTUR PENJUALAN'}
              </div>
              {invoice.no_invoice && (
                <div className="text-xs font-bold text-[#12388F] font-mono">
                  No. Faktur: {invoice.no_invoice}
                </div>
              )}
              {displayNoSpk && (
                <div className="text-[11px] text-slate-700 font-semibold font-mono">
                  No. SPK: {displayNoSpk}
                </div>
              )}
              <div className="text-[11px] text-slate-600 font-medium">
                Tgl. Faktur: {formatTanggalSaja(invoice.tanggal_invoice)}
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
              {invoice.kode_customer && (
                <div className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Kode Customer:</span> {invoice.kode_customer}
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

            {/* Kolom Kanan: Detail Armada & Mekanik */}
            <div className="space-y-1.5 text-right">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block font-bold">
                  No. Polisi Armada:
                </span>
                <span className="font-bold text-slate-900 text-xs px-2 py-0.5 bg-white border border-slate-300 rounded inline-block mt-0.5">
                  {formatPlat(invoice.no_polisi)}
                </span>
              </div>
              {invoice.nama_mekanik && (
                <div className="text-[11px] text-slate-700">
                  <span className="text-slate-500">Mekanik:</span>{' '}
                  <span className="font-semibold text-slate-900">{invoice.nama_mekanik}</span>
                </div>
              )}
              {!isProforma && invoice.kasir_pic && (
                <div className="text-[11px] text-slate-700">
                  <span className="text-slate-500">Kasir:</span>{' '}
                  <span className="font-semibold text-slate-900">{invoice.kasir_pic}</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. TABEL RINCIAN ITEM (JASA & SPAREPART) */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-2.5 py-2 w-9 text-center border-r border-slate-300">No</th>
                  <th className="px-3 py-2 border-r border-slate-300">Deskripsi Barang / Jasa</th>
                  <th className="px-2.5 py-2 text-center w-20 border-r border-slate-300">Qty</th>
                  <th className="px-3 py-2 text-right w-28 border-r border-slate-300">Harga (Rp)</th>
                  <th className="px-2.5 py-2 text-right w-24 border-r border-slate-300">Diskon</th>
                  <th className="px-3 py-2 text-right w-28">Netto (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {hasItemDetails ? (
                  <>
                    {/* Kelompok A: JASA PERBAIKAN */}
                    {jasaRows.length > 0 && (
                      <tr className="bg-slate-50 font-bold text-slate-800">
                        <td colSpan={6} className="px-3 py-1.5 text-[11px] tracking-wide text-[#12388F]">
                          A. JASA PERBAIKAN & PERAWATAN
                        </td>
                      </tr>
                    )}
                    {jasaRows.map(({ item, qty, hargaSatuanTampil, diskonInclPpn, nettoItem }, idx) => (
                      <tr key={`jasa-${item.id || idx}`} className="text-slate-800">
                        <td className="px-2.5 py-1.5 text-center text-slate-600 tabular-nums border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-1.5 font-medium border-r border-slate-200">
                          <span>{item.nama_pekerjaan}</span>
                          {item.kode_pekerjaan && (
                            <span className="ml-1.5 text-[10px] text-slate-500 font-mono">
                              ({item.kode_pekerjaan})
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 text-center tabular-nums border-r border-slate-200">
                          {qty} Jasa
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums border-r border-slate-200">
                          Rp {fmtRp(hargaSatuanTampil)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums border-r border-slate-200 text-rose-600 text-[11px]">
                          {formatDiscDetail(item.disc1, item.disc2, item.disc3, diskonInclPpn)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                          Rp {fmtRp(nettoItem)}
                        </td>
                      </tr>
                    ))}
                    {jasaRows.length > 0 && (
                      <tr className="bg-slate-50/70 font-semibold text-slate-800">
                        <td colSpan={5} className="px-3 py-1.5 text-right text-[11px] border-r border-slate-200">
                          Subtotal Jasa
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-[11px] font-bold">
                          Rp {fmtRp(subtotalJasaNetto)}
                        </td>
                      </tr>
                    )}

                    {/* Kelompok B: SPAREPART / SUKU CADANG */}
                    {partRows.length > 0 && (
                      <tr className="bg-slate-50 font-bold text-slate-800">
                        <td colSpan={6} className="px-3 py-1.5 text-[11px] tracking-wide text-[#12388F]">
                          B. SUKU CADANG & BAHAN (SPAREPARTS)
                        </td>
                      </tr>
                    )}
                    {partRows.map(({ part, qty, hargaSatuanTampil, diskonInclPpn, nettoItem }, idx) => (
                      <tr key={`part-${part.id || idx}`} className="text-slate-800">
                        <td className="px-2.5 py-1.5 text-center text-slate-600 tabular-nums border-r border-slate-200">
                          {jasaRows.length + idx + 1}
                        </td>
                        <td className="px-3 py-1.5 border-r border-slate-200">
                          <span className="font-medium">{part.nama_part}</span>
                          {part.kode_part && (
                            <span className="ml-1.5 text-[10px] text-slate-500 font-mono">
                              ({part.kode_part})
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 text-center tabular-nums border-r border-slate-200">
                          {qty} {part.satuan || 'Pcs'}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums border-r border-slate-200">
                          Rp {fmtRp(hargaSatuanTampil)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums border-r border-slate-200 text-rose-600 text-[11px]">
                          {formatDiscDetail(part.disc1, part.disc2, part.disc3, diskonInclPpn)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                          Rp {fmtRp(nettoItem)}
                        </td>
                      </tr>
                    ))}
                    {partRows.length > 0 && (
                      <tr className="bg-slate-50/70 font-semibold text-slate-800">
                        <td colSpan={5} className="px-3 py-1.5 text-right text-[11px] border-r border-slate-200">
                          Subtotal Sparepart
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-[11px] font-bold">
                          Rp {fmtRp(subtotalPartNetto)}
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  /* Bila rincian item tidak ada di sistem, tampilkan 1 baris ringkasan tanpa mengarang item */
                  <tr className="text-slate-800">
                    <td className="px-2.5 py-2.5 text-center text-slate-600 tabular-nums border-r border-slate-200">
                      1
                    </td>
                    <td className="px-3 py-2.5 border-r border-slate-200">
                      <div className="font-medium">Biaya Jasa Servis & Penggantian Suku Cadang Terpadu</div>
                      <div className="text-[10px] text-slate-600 italic">
                        (Rincian paket perbaikan tertera pada Formulir Inspeksi / Surat Perintah Kerja)
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-center tabular-nums border-r border-slate-200">1 Paket</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-r border-slate-200">
                      Rp {fmtRp(totalHargaJualTampil)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums border-r border-slate-200">-</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                      Rp {fmtRp(totalHargaJualTampil)}
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

              {/* Sisi Kanan: Tabel Ringkasan Nilai Selaras Faktur POS (Total Harga Jual -> Ekstra Diskon -> Grand Total + Catatan PPN) */}
              <div className="space-y-1.5">
                <div className="border border-slate-300 rounded overflow-hidden bg-white">
                  <table className="w-full text-xs font-medium">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="px-3 py-1.5 text-slate-700">Total Harga Jual</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-slate-800">
                          Rp {fmtRp(totalHargaJualTampil)}
                        </td>
                      </tr>
                      {totalDiskonItemsInclPpn > 0 && (
                        <tr>
                          <td className="px-3 py-1.5 text-[11px] text-slate-500">
                            Diskon Item (Sudah Dipotong)
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-[11px] text-rose-600">
                            - Rp {fmtRp(totalDiskonItemsInclPpn)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="px-3 py-1.5 text-slate-700">Ekstra Diskon</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-rose-600">
                          {ekstraDiskon > 0 ? `- Rp ${fmtRp(ekstraDiskon)}` : 'Rp 0'}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                      <tr>
                        <td className="px-3 py-2 text-sm uppercase">Grand Total</td>
                        <td className="px-3 py-2 text-right tabular-nums text-base text-[#12388F]">
                          Rp {fmtRp(grandTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="text-[10px] text-slate-600 text-right leading-relaxed px-1">
                  <div className="font-semibold italic text-slate-700">*Harga sudah termasuk PPN</div>
                  {(dpp > 0 || ppnNominal > 0) && (
                    <div className="tabular-nums">
                      DPP: Rp {fmtRp(dpp)} • PPN{hasCustomTarifPpn ? ` (${tarifPpn}%)` : ''}: Rp {fmtRp(ppnNominal)}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
