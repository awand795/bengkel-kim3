/**
 * Utilitas Terbilang Bahasa Indonesia untuk Dokumen Keuangan / Faktur
 * Mengonversi nilai numerik menjadi representasi kalimat dalam Bahasa Indonesia.
 */

const SATUAN = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas',
];

export function terbilang(n: number): string {
  const nominal = Math.floor(Math.abs(n));

  if (nominal === 0) {
    return 'Nol';
  }

  if (nominal < 12) {
    return SATUAN[nominal];
  }

  if (nominal < 20) {
    return `${terbilang(nominal - 10)} Belas`;
  }

  if (nominal < 100) {
    const sisa = nominal % 10;
    return `${terbilang(Math.floor(nominal / 10))} Puluh${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  }

  if (nominal < 200) {
    const sisa = nominal - 100;
    return `Seratus${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  }

  if (nominal < 1000) {
    const sisa = nominal % 100;
    return `${terbilang(Math.floor(nominal / 100))} Ratus${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  }

  if (nominal < 2000) {
    const sisa = nominal - 1000;
    return `Seribu${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  }

  if (nominal < 1000000) {
    const sisa = nominal % 1000;
    return `${terbilang(Math.floor(nominal / 1000))} Ribu${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  }

  if (nominal < 1000000000) {
    const sisa = nominal % 1000000;
    return `${terbilang(Math.floor(nominal / 1000000))} Juta${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  }

  if (nominal < 1000000000000) {
    const sisa = nominal % 1000000000;
    return `${terbilang(Math.floor(nominal / 1000000000))} Miliar${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  }

  if (nominal < 1000000000000000) {
    const sisa = nominal % 1000000000000;
    return `${terbilang(Math.floor(nominal / 1000000000000))} Triliun${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  }

  return nominal.toLocaleString('id-ID');
}

/**
 * Format terbilang lengkap dengan akhiran "Rupiah".
 * Contoh: 1550000 -> "Satu Juta Lima Ratus Lima Puluh Ribu Rupiah"
 */
export function terbilangRupiah(n: number): string {
  const hasil = terbilang(n);
  return `${hasil.trim()} Rupiah`;
}
