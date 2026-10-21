/**
 * Normalisasi label status SPK untuk tampilan.
 *
 * Nilai `status_spk` di database ditulis oleh aplikasi POS dan sebagian masih
 * memakai istilah lama yang tidak konsisten. Semua tampilan (badge, timeline,
 * pencarian riwayat) wajib lewat helper ini agar riwayat service memakai satu
 * istilah: "Proses Pengerjaan" untuk unit yang sedang dikerjakan.
 */

/** Pemetaan nilai status lama → label tampilan baku (key: lowercase). */
const SPK_STATUS_LABEL: Record<string, string> = {
  'proses pekerjaan': 'Proses Pengerjaan',
  'proses pengerjaan': 'Proses Pengerjaan',
  'dalam pengerjaan': 'Proses Pengerjaan',
  'selesai dikerjakan': 'Menunggu QC',
  'waiting qc': 'Menunggu QC',
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
