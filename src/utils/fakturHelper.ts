import { InvoicePembayaran, SpkItemPart, SpkItemPekerjaan } from '../types';

export interface LineItemDisplay {
  qty: number;
  hargaSatuanTampil: number;
  diskonInclPpn: number;
  nettoItem: number;
}

export interface JasaLineRow extends LineItemDisplay {
  item: SpkItemPekerjaan;
}

export interface PartLineRow extends LineItemDisplay {
  part: SpkItemPart;
}

export interface FakturCalculationResult {
  tipePajak: string;
  tarifPpn: number;
  hasCustomTarifPpn: boolean;
  jasaRows: JasaLineRow[];
  partRows: PartLineRow[];
  hasItemDetails: boolean;
  subtotalJasaNetto: number;
  subtotalPartNetto: number;
  totalDiskonItemsInclPpn: number;
  totalHargaJualTampil: number;
  ekstraDiskon: number;
  dpp: number;
  ppnNominal: number;
  grandTotal: number;
}

export const fmtRpExact = (val: number): string =>
  Number(val || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });

export const formatDiscDetail = (
  d1?: number,
  d2?: number,
  d3?: number,
  discInclPpn?: number
): string => {
  const pcts = [d1, d2, d3].filter((v) => Number(v || 0) > 0).map((v) => `${Number(v)}%`);
  if (pcts.length > 0 && Number(discInclPpn || 0) > 0) {
    return `${pcts.join('+')} (-Rp ${fmtRpExact(Number(discInclPpn))})`;
  }
  if (Number(discInclPpn || 0) > 0) {
    return `-Rp ${fmtRpExact(Number(discInclPpn))}`;
  }
  return '-';
};

/**
 * Menghitung harga item (sudah termasuk PPN sesuai rumus cetak POS),
 * diskon bertingkat, subtotal seksi, DPP, PPN, dan Grand Total.
 */
export function computeFakturCalculation(params: {
  invoice?: Partial<InvoicePembayaran> | null;
  pekerjaanList?: SpkItemPekerjaan[];
  partList?: SpkItemPart[];
  defaultPpnRate?: number;
  isProforma?: boolean;
  fallbackEstimasiTotal?: number;
}): FakturCalculationResult {
  const {
    invoice,
    pekerjaanList = [],
    partList = [],
    defaultPpnRate = 11,
    isProforma = false,
    fallbackEstimasiTotal = 0,
  } = params;

  const hasCustomTarifPpn =
    invoice?.tarif_ppn_persen != null && !isNaN(Number(invoice.tarif_ppn_persen));
  const tarifPpn = hasCustomTarifPpn ? Number(invoice!.tarif_ppn_persen) : defaultPpnRate;

  const rawSubtotalFirstItem =
    pekerjaanList[0]?.biaya_jasa ?? partList[0]?.subtotal ?? 0;
  const rawDppFirstItem =
    pekerjaanList[0]?.total_dpp ?? partList[0]?.total_dpp;
  const rawNettoFirstItem =
    pekerjaanList[0]?.total_netto ?? partList[0]?.total_netto;
  const inferredExcludeFromItems =
    !invoice?.tipe_pajak &&
    rawDppFirstItem != null &&
    rawNettoFirstItem != null &&
    Number(rawNettoFirstItem) > Number(rawDppFirstItem) + 0.5 &&
    Math.abs(Number(rawSubtotalFirstItem) - Number(rawDppFirstItem)) < 1;

  const tipePajak = (
    invoice?.tipe_pajak || (inferredExcludeFromItems ? 'E' : 'I')
  ).toUpperCase();

  const computeLine = (line: {
    qty: number;
    hargaSatuanRaw: number;
    grossSubtotalRaw: number;
    disc1?: number;
    disc2?: number;
    disc3?: number;
    diskonTotalRaw?: number;
    totalNettoRaw?: number;
  }): LineItemDisplay => {
    const qty = line.qty > 0 ? line.qty : 1;
    const baseUnit = Number(line.hargaSatuanRaw || 0);
    const hargaSatuanTampil =
      tipePajak === 'E' && tarifPpn > 0
        ? Math.round(baseUnit) + Math.round(Math.round(baseUnit) * (tarifPpn / 100))
        : baseUnit;

    let nettoItem: number;
    if (line.totalNettoRaw != null && !isNaN(Number(line.totalNettoRaw))) {
      nettoItem = Number(line.totalNettoRaw);
    } else {
      const afterDisc = Math.max(
        0,
        Number(line.grossSubtotalRaw || baseUnit * qty) - Number(line.diskonTotalRaw || 0)
      );
      nettoItem =
        tipePajak === 'E' && tarifPpn > 0
          ? Math.round(afterDisc) + Math.round(Math.round(afterDisc) * (tarifPpn / 100))
          : afterDisc;
    }

    const hasDiscount =
      Number(line.disc1 || 0) > 0 ||
      Number(line.disc2 || 0) > 0 ||
      Number(line.disc3 || 0) > 0 ||
      Number(line.diskonTotalRaw || 0) > 0;
    const diskonInclPpn = hasDiscount
      ? Math.max(0, hargaSatuanTampil * qty - nettoItem)
      : 0;

    return { qty, hargaSatuanTampil, diskonInclPpn, nettoItem };
  };

  const jasaRows: JasaLineRow[] = pekerjaanList.map((item) => {
    const qty = Number(item.qty || 1);
    const hargaSatuanRaw = Number(
      item.harga_satuan ?? (qty > 0 ? Number(item.biaya_jasa || 0) / qty : item.biaya_jasa) ?? 0
    );
    const grossSubtotalRaw = Number(item.biaya_jasa || qty * hargaSatuanRaw || 0);
    return {
      item,
      ...computeLine({
        qty,
        hargaSatuanRaw,
        grossSubtotalRaw,
        disc1: item.disc1,
        disc2: item.disc2,
        disc3: item.disc3,
        diskonTotalRaw: item.diskon,
        totalNettoRaw: item.total_netto,
      }),
    };
  });

  const partRows: PartLineRow[] = partList.map((part) => {
    const qty = Number(part.jumlah || 1);
    const hargaSatuanRaw = Number(part.harga_satuan || 0);
    const grossSubtotalRaw = Number(part.subtotal ?? qty * hargaSatuanRaw);
    return {
      part,
      ...computeLine({
        qty,
        hargaSatuanRaw,
        grossSubtotalRaw,
        disc1: part.disc1,
        disc2: part.disc2,
        disc3: part.disc3,
        diskonTotalRaw: part.diskon,
        totalNettoRaw: part.total_netto,
      }),
    };
  });

  const hasItemDetails = jasaRows.length > 0 || partRows.length > 0;
  const subtotalJasaNetto = jasaRows.reduce((acc, r) => acc + r.nettoItem, 0);
  const subtotalPartNetto = partRows.reduce((acc, r) => acc + r.nettoItem, 0);
  const totalDiskonItemsInclPpn =
    jasaRows.reduce((acc, r) => acc + r.diskonInclPpn, 0) +
    partRows.reduce((acc, r) => acc + r.diskonInclPpn, 0);

  const totalJasaRaw = pekerjaanList.reduce((acc, c) => acc + Number(c.biaya_jasa || 0), 0);
  const totalPartsRaw = partList.reduce(
    (acc, c) => acc + Number(c.subtotal ?? Number(c.jumlah || 0) * Number(c.harga_satuan || 0)),
    0
  );
  const totalDiskonItemsRaw =
    pekerjaanList.reduce((acc, c) => acc + Number(c.diskon || 0), 0) +
    partList.reduce((acc, c) => acc + Number(c.diskon || 0), 0);

  const hasDbInvoiceNumbers =
    !isProforma &&
    invoice != null &&
    (Number(invoice.grand_total || 0) > 0 ||
      invoice.dpp_nominal != null ||
      Number(invoice.ppn_nominal || 0) > 0);

  const subtotalKotor =
    !isProforma && Number(invoice?.subtotal || 0) > 0
      ? Number(invoice!.subtotal)
      : hasItemDetails
        ? totalJasaRaw + totalPartsRaw
        : Number(invoice?.subtotal || invoice?.grand_total || fallbackEstimasiTotal || 0);

  const diskonItem =
    !isProforma && invoice?.diskon_item != null
      ? Number(invoice.diskon_item)
      : totalDiskonItemsRaw;
  const ekstraDiskon =
    !isProforma && invoice?.ekstra_diskon != null ? Number(invoice.ekstra_diskon) : 0;
  const diskon =
    !isProforma &&
    (invoice?.diskon != null || invoice?.diskon_item != null || invoice?.ekstra_diskon != null)
      ? Math.max(Number(invoice?.diskon ?? 0), diskonItem + ekstraDiskon)
      : totalDiskonItemsRaw > 0
        ? totalDiskonItemsRaw
        : Number(invoice?.diskon || 0);

  const subtotalSetelahDiskon = Math.max(0, subtotalKotor - diskon);

  let dpp = subtotalSetelahDiskon;
  let ppnNominal = Number(invoice?.ppn_nominal || 0);
  let grandTotal = Number(invoice?.grand_total || 0);

  if (hasDbInvoiceNumbers && invoice) {
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
    (pekerjaanList.some((j) => j.total_netto != null) ||
      partList.some((p) => p.total_netto != null))
  ) {
    dpp =
      pekerjaanList.reduce((acc, c) => acc + Number(c.total_dpp ?? c.biaya_jasa ?? 0), 0) +
      partList.reduce((acc, c) => acc + Number(c.total_dpp ?? c.subtotal ?? 0), 0);
    ppnNominal =
      pekerjaanList.reduce((acc, c) => acc + Number(c.total_ppn ?? 0), 0) +
      partList.reduce((acc, c) => acc + Number(c.total_ppn ?? 0), 0);
    const sumNetto = subtotalJasaNetto + subtotalPartNetto;
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

  const totalHargaJualTampil = hasItemDetails
    ? subtotalJasaNetto + subtotalPartNetto
    : grandTotal + ekstraDiskon;

  return {
    tipePajak,
    tarifPpn,
    hasCustomTarifPpn,
    jasaRows,
    partRows,
    hasItemDetails,
    subtotalJasaNetto,
    subtotalPartNetto,
    totalDiskonItemsInclPpn,
    totalHargaJualTampil,
    ekstraDiskon,
    dpp,
    ppnNominal,
    grandTotal,
  };
}
