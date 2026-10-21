/**
 * Standar status tahapan timeline "Riwayat Aktivitas Service".
 *
 * Satu sumber kebenaran untuk warna dot timeline customer, supaya tidak ada lagi
 * dot yang di-hardcode biru/hijau sehingga terlihat "masih proses" padahal unit
 * sudah selesai.
 *
 * State:
 * - `done`      → tahap sudah lewat (hijau + ikon centang)
 * - `active`    → tahap yang sedang berjalan sekarang (biru + pulse)
 * - `blocked`   → tahap tertahan, mis. menunggu sparepart (merah + pulse)
 * - `attention` → butuh tindakan customer, mis. approval estimasi (amber + pulse)
 * - `pending`   → belum tercapai (disembunyikan dari timeline)
 */

import type { SpkService } from '../types';

export type ServiceStageKey =
  | 'masuk'
  | 'penerimaan'
  | 'wo'
  | 'pengerjaan'
  | 'qc'
  | 'fir'
  | 'pembayaran'
  | 'keluar';

export type ServiceStageState = 'done' | 'active' | 'blocked' | 'attention' | 'pending';

/** Urutan tahap sesuai SOP bengkel (dipakai untuk menentukan tahap terakhir yang tampil). */
export const SERVICE_STAGE_ORDER: ServiceStageKey[] = [
  'masuk',
  'penerimaan',
  'wo',
  'pengerjaan',
  'qc',
  'fir',
  'pembayaran',
  'keluar',
];

/** Status SPK yang menandakan tahap pengecekan mekanik masih berjalan. */
const STATUS_CEK_MEKANIK = ['Menunggu Pengecekan Mekanik', 'Pengecekan Mekanik', 'Estimasi Dibuat'];
/** Status SPK yang menandakan WO sudah terbit (tahap pengecekan selesai). */
const STATUS_WO_TERBIT = ['Estimasi Disetujui', 'Waiting Part', 'Dalam Pengerjaan', 'Pending', 'Waiting QC', 'QC Passed', 'FIR Closed', 'Selesai'];
/** Status SPK yang menandakan pengerjaan teknisi sudah tuntas. */
const STATUS_PENGERJAAN_SELESAI = ['Waiting QC', 'QC Passed', 'FIR Closed', 'Selesai'];
/** Status SPK setelah QC lulus. */
const STATUS_LOLOS_QC = ['QC Passed', 'FIR Closed', 'Selesai'];
/** Status SPK setelah FIR ditutup. */
const STATUS_FIR_CLOSED = ['FIR Closed', 'Selesai'];

type SpkTimelineInput = Pick<
  SpkService,
  | 'status_spk'
  | 'created_at'
  | 'waktu_check_in'
  | 'waktu_mulai_pekerjaan'
  | 'waktu_selesai_pekerjaan'
  | 'waktu_qc'
  | 'tanggal_qc'
  | 'waktu_fir_closed'
  | 'waktu_check_out'
>;

const ada = (v?: string | null): boolean => !!v && String(v).trim() !== '';

/**
 * Tentukan state tiap tahap timeline servis.
 *
 * @param spk            data SPK aktif (boleh null saat belum ada SPK)
 * @param invoiceLunas   true bila invoice sudah dibayar lunas
 */
export const resolveServiceTimeline = (
  spk: SpkTimelineInput | null | undefined,
  invoiceLunas = false
): Record<ServiceStageKey, ServiceStageState> => {
  // Samakan status lama ("Proses Pengerjaan"/"Proses Pekerjaan") dengan status baku
  const rawStatus = String(spk?.status_spk || '');
  const status = rawStatus === 'Proses Pengerjaan' || rawStatus === 'Proses Pekerjaan' ? 'Dalam Pengerjaan' : rawStatus;
  const adaStatus = (list: string[]) => list.includes(status);

  const masuk: ServiceStageState = ada(spk?.waktu_check_in) || ada(spk?.created_at) ? 'done' : 'active';

  // SPK dibuat oleh SA saat penerimaan; status 'Check In' berarti masih di meja SA.
  const penerimaan: ServiceStageState = status === 'Check In' ? 'active' : ada(spk?.created_at) ? 'done' : 'active';

  let wo: ServiceStageState = 'pending';
  if (status === 'Menunggu Approval Customer' || status === 'Waiting Approval') wo = 'attention';
  else if (adaStatus(STATUS_CEK_MEKANIK)) wo = 'active';
  else if (ada(spk?.waktu_mulai_pekerjaan) || adaStatus(STATUS_WO_TERBIT)) wo = 'done';

  let pengerjaan: ServiceStageState = 'pending';
  if (status === 'Waiting Part' || status === 'Pending') pengerjaan = 'blocked';
  else if (ada(spk?.waktu_selesai_pekerjaan) || adaStatus(STATUS_PENGERJAAN_SELESAI)) pengerjaan = 'done';
  else if (status === 'Estimasi Disetujui' || status === 'Dalam Pengerjaan') pengerjaan = 'active';

  let qc: ServiceStageState = 'pending';
  if (ada(spk?.waktu_qc) || ada(spk?.tanggal_qc) || adaStatus(STATUS_LOLOS_QC)) qc = 'done';
  else if (status === 'Waiting QC') qc = 'active';

  let fir: ServiceStageState = 'pending';
  if (ada(spk?.waktu_fir_closed) || adaStatus(STATUS_FIR_CLOSED)) fir = 'done';
  else if (status === 'QC Passed') fir = 'active';

  let pembayaran: ServiceStageState = 'pending';
  if (invoiceLunas) pembayaran = 'done';
  else if (adaStatus(STATUS_FIR_CLOSED)) pembayaran = 'active';

  let keluar: ServiceStageState = 'pending';
  if (ada(spk?.waktu_check_out)) keluar = 'done';
  else if (invoiceLunas || status === 'Selesai') keluar = 'active';

  return { masuk, penerimaan, wo, pengerjaan, qc, fir, pembayaran, keluar };
};

/** Ambil tahap yang perlu ditampilkan (semua yang sudah tercapai atau sedang berjalan). */
export const visibleServiceStages = (timeline: Record<ServiceStageKey, ServiceStageState>): ServiceStageKey[] =>
  SERVICE_STAGE_ORDER.filter((key) => timeline[key] !== 'pending');
