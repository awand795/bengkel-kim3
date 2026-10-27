/**
 * Konfigurasi Profil Identitas Perusahaan & Bengkel KIM 3
 * Digunakan untuk Kop Dokumen Resmi, Faktur/Invoice, Surat Jalan, dsb.
 *
 * Kolom yang masih kosong ('') atau tidak memiliki rekening akan disembunyikan
 * secara otomatis di dokumen cetak sampai Anda mengisinya dengan data resmi.
 */

export interface BankAccountInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  cabang?: string;
}

export interface CompanyProfile {
  name: string;
  tradeName: string;
  tagline: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  /** NPWP Resmi Badan Usaha - Kosongkan jika belum ada/belum PKP */
  npwp: string;
  /** No Telepon Kantor/Kasir */
  phone: string;
  /** No WhatsApp Layanan Pelanggan */
  whatsapp?: string;
  /** Email Resmi Billing/Keuangan */
  email: string;
  /** Alamat Website Resmi */
  website?: string;
  /** Daftar Rekening Bank Penerima Transfer */
  bankAccounts: BankAccountInfo[];
}

export const COMPANY_PROFILE: CompanyProfile = {
  name: 'PT MASTER TRUCK INDONESIA',
  tradeName: 'BENGKEL MASTER TRUCK - KIM 3',
  tagline: 'Kawasan Industri Medan III (KIM 3) • One Stop Truck Maintenance & Spareparts Service',
  address: 'Kawasan Industri Medan III (KIM 3), Jl. Pulau Pinang Raya No. 88, Saentis, Percut Sei Tuan',
  city: 'Deli Serdang',
  province: 'Sumatera Utara',
  postalCode: '20371',

  // =========================================================================
  // TODO: SILAKAN ISI DATA LEGAL & REKENING RESMI PERUSAHAAN DI BAWAH INI:
  // Bila dibiarkan kosong (''), baris informasi bersangkutan akan otomatis
  // disembunyikan pada dokumen cetak invoice agar tidak mencetak data dummy.
  // =========================================================================
  npwp: '', // TODO: Isi NPWP resmi perusahaan (contoh: '01.234.567.8-123.000')
  phone: '', // TODO: Isi no. telp bengkel (contoh: '061-6871234' atau '0812xxxx')
  whatsapp: '', // TODO: Isi no. WA pelayanan bengkel jika ada
  email: '', // TODO: Isi email resmi billing (contoh: 'finance@bengkelkim3.co.id')
  website: '', // TODO: Isi website resmi jika ada

  bankAccounts: [
    // TODO: Tambahkan rekening resmi bila ingin ditampilkan saat invoice BELUM LUNAS:
    // {
    //   bankName: 'Bank Mandiri',
    //   accountNumber: '106-00-xxxxxxx-x',
    //   accountHolder: 'PT Master Truck Indonesia',
    //   cabang: 'KCP Medan KIM',
    // },
    // {
    //   bankName: 'Bank Central Asia (BCA)',
    //   accountNumber: '822-0xxxxxx-x',
    //   accountHolder: 'PT Master Truck Indonesia',
    //   cabang: 'KCU Medan',
    // },
  ],
};

/**
 * Helper untuk memeriksa apakah suatu nilai konfigurasi valid dan bukan placeholder lama.
 */
export const isValidCompanyField = (val?: string | null): boolean => {
  if (!val) return false;
  const trimmed = val.trim();
  if (trimmed === '') return false;
  const knownPlaceholders = [
    '01.234.567.8-123.000',
    '0812-3456-7890',
    'billing@bengkelkim3.co.id',
    'www.bengkelkim3.co.id',
    '106-00-1234567-8',
    '822-0987654-1',
  ];
  return !knownPlaceholders.includes(trimmed);
};
