/**
 * Normalisasi label status SPK dan Penentu Status Dinamis Berjenjang (Lifecycle State Engine).
 *
 * Nilai `status_spk` di database ditulis oleh aplikasi POS dan sebagian masih
 * memakai istilah lama yang tidak konsisten. Semua tampilan (badge, timeline,
 * pencarian riwayat) wajib lewat helper ini agar riwayat service memakai satu
 * istilah yang akurat dan dinamis sesuai kondisi fisik lapangan & administrasi.
 */

/** Pemetaan nilai status lama → label tampilan baku (key: lowercase). */
const SPK_STATUS_LABEL: Record<string, string> = {
  'proses pekerjaan': 'Proses Pengerjaan',
  'proses pengerjaan': 'Proses Pengerjaan',
  'dalam pengerjaan': 'Proses Pengerjaan',
  'selesai dikerjakan': 'Menunggu QC',
  'waiting qc': 'Menunggu QC',
  'menunggu qc': 'Menunggu QC',
  'qc passed': 'QC Passed',
  'fir closed': 'FIR Closed',
  'menunggu invoice/kasir': 'Menunggu Invoice/Kasir',
  'siap keluar (lunas)': 'Siap Keluar (Lunas)',
  'selesai & keluar': 'Selesai & Keluar',
  'selesai': 'Selesai',
};

/** Label tampilan status SPK (sudah dinormalisasi). */
export const spkStatusLabel = (status?: string | null): string => {
  const raw = String(status ?? '').trim();
  if (!raw) return '-';
  return SPK_STATUS_LABEL[raw.toLowerCase()] ?? raw;
};

/** Kunci status untuk pencocokan warna / pencarian (lowercase label ternormalisasi). */
export const spkStatusKey = (status?: string | null): string => spkStatusLabel(status).toLowerCase();

/** Status yang setara dengan tahap "menunggu inspeksi QC Foreman". */
const STATUS_MENUNGGU_QC = ['Waiting QC', 'Selesai Dikerjakan'];

/** Status yang setara dengan "sedang dikerjakan mekanik". */
const STATUS_PROSES = ['Proses Pekerjaan', 'Proses Pengerjaan', 'Dalam Pengerjaan'];

/**
 * Ubah status lama menjadi status baku yang dipakai logika alur bengkel,
 * supaya timeline dan badge selalu menampilkan tahap yang sama.
 */
export const normalizeSpkStatus = (status?: string | null): string => {
  const raw = String(status ?? '').trim();
  if (STATUS_MENUNGGU_QC.includes(raw)) return 'Waiting QC';
  if (STATUS_PROSES.includes(raw)) return 'Dalam Pengerjaan';
  return raw;
};

export interface DynamicStatusInput {
  status_spk?: string | null;
  waktu_check_out?: string | null;
  waktu_check_in?: string | null;
  waktu_mulai_pekerjaan?: string | null;
  waktu_selesai_pekerjaan?: string | null;
  waktu_qc?: string | null;
  waktu_fir_closed?: string | null;
  status_invoice?: string | null;
  no_invoice?: string | null;
  total_invoice?: number | null;
  total_bayar?: number | null;
  sumber?: string | null;
  created_at?: string | null;
}

/**
 * Evaluasi Status Dinamis Berjenjang Penuh:
 * 1. Keluar Gerbang: jika waktu_check_out terisi -> 'Selesai & Keluar'
 * 2. Pasca-Pekerjaan Mekanik (WO Selesai / FIR / QC):
 *    - Jika invoice lunas -> 'Siap Keluar (Lunas)'
 *    - Jika invoice belum lunas / belum ada -> 'Menunggu Invoice/Kasir'
 * 3. Dalam Pengerjaan / QC / Part / Approval / Check-in -> Sesuai tahap aktif
 */
export const getSpkDynamicStatus = (item?: DynamicStatusInput | null): string => {
  if (!item) return '-';

  // 1. Truk sudah resmi checkout dan melintas keluar gerbang pos security
  if (item.waktu_check_out && String(item.waktu_check_out).trim() !== '') {
    return 'Selesai & Keluar';
  }

  // Khusus kunjungan gate-only (belum terbit WO oleh SA)
  if (item.sumber === 'kunjungan') {
    return 'Check In (Menunggu SA)';
  }

  const raw = String(item.status_spk || '').trim();
  const normalized = normalizeSpkStatus(raw);

  // 2. Tahap Pasca-Pengerjaan Mekanik (Pengerjaan teknis tuntas, WO Closed, QC, FIR)
  const isWorkDone =
    ['Selesai', 'FIR Closed', 'Siap Keluar', 'QC Passed'].includes(normalized) ||
    !!item.waktu_selesai_pekerjaan ||
    !!item.waktu_fir_closed;

  if (isWorkDone) {
    const isLunas =
      item.status_invoice === '01' ||
      item.status_invoice === 'Lunas' ||
      (typeof item.total_invoice === 'number' &&
        item.total_invoice > 0 &&
        typeof item.total_bayar === 'number' &&
        item.total_bayar >= item.total_invoice);

    if (isLunas) {
      return 'Siap Keluar (Lunas)';
    }
    return 'Menunggu Invoice/Kasir';
  }

  // 3. Tahap Pengerjaan & Inspeksi Teknis
  if (normalized === 'Waiting QC' || raw === 'Selesai Dikerjakan') {
    return 'Menunggu QC';
  }
  if (normalized === 'Waiting Part' || raw === 'Pending') {
    return 'Menunggu Part';
  }
  if (normalized === 'Menunggu Approval Customer' || raw === 'Waiting Approval') {
    return 'Perlu Persetujuan';
  }
  if (normalized === 'Dalam Pengerjaan' || raw === 'Proses Pekerjaan' || raw === 'Proses Pengerjaan') {
    return 'Proses Pengerjaan';
  }
  if (normalized === 'Estimasi Disetujui') {
    return 'Estimasi Disetujui';
  }
  if (normalized === 'Estimasi Dibuat' || normalized === 'Pengecekan Mekanik' || normalized === 'Menunggu Pengecekan Mekanik') {
    return 'Pengecekan Mekanik';
  }
  if (normalized === 'Check In') {
    return 'Check In';
  }

  return spkStatusLabel(raw);
};
