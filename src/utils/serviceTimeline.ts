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
import { normalizeSpkStatus } from './statusLabel';

export type ServiceStageKey =
  | 'booking'
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
  'booking',
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
const STATUS_WO_TERBIT = ['Estimasi Disetujui', 'Waiting Part', 'Dalam Pengerjaan', 'Pending', 'Waiting QC', 'QC Passed', 'FIR Closed', 'Menunggu Invoice/Kasir', 'Siap Keluar (Lunas)', 'Siap Keluar', 'Selesai'];
/** Status SPK yang menandakan pengerjaan teknisi sudah tuntas. */
const STATUS_PENGERJAAN_SELESAI = ['Waiting QC', 'QC Passed', 'FIR Closed', 'Menunggu Invoice/Kasir', 'Siap Keluar (Lunas)', 'Siap Keluar', 'Selesai'];
/** Status SPK setelah QC lulus. */
const STATUS_LOLOS_QC = ['QC Passed', 'FIR Closed', 'Menunggu Invoice/Kasir', 'Siap Keluar (Lunas)', 'Siap Keluar', 'Selesai'];
/** Status SPK setelah FIR ditutup. */
const STATUS_FIR_CLOSED = ['FIR Closed', 'Menunggu Invoice/Kasir', 'Siap Keluar (Lunas)', 'Siap Keluar', 'Selesai'];

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
  | 'is_booking'
  | 'booking_id'
  | 'no_booking'
  | 'waktu_booking'
  | 'tanggal_booking'
> & {
  sumber?: 'spk' | 'kunjungan';
  isPreSpk?: boolean;
};

const ada = (v?: string | null): boolean => !!v && String(v).trim() !== '';

/** Cek apakah suatu entri SPK / Kunjungan berasal dari Booking Service. */
export const hasServiceBooking = (
  spk?: {
    is_booking?: boolean | null;
    booking_id?: number | null;
    no_booking?: string | null;
    waktu_booking?: string | null;
    tanggal_booking?: string | null;
  } | null
): boolean => {
  if (!spk) return false;
  if (spk.is_booking === true) return true;
  if (spk.booking_id != null && Number(spk.booking_id) > 0) return true;
  if (ada(spk.no_booking)) return true;
  return false;
};

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
  const booking: ServiceStageState = hasServiceBooking(spk) ? 'done' : 'pending';

  // Khusus data kunjungan gerbang saja (gate-only / tanpa SPK pengerjaan bengkel):
  // - Bila kendaraan langsung check out dari gerbang (misal batal servis / kunjungan biasa):
  //   hanya tampil 2 tahap: masuk (done) dan keluar (done). Tahap bengkel lainnya pending (tidak tampil).
  // - Bila masih di dalam bengkel: masuk (done), penerimaan SA (active: Menunggu SA), sisanya pending.
  if (spk?.sumber === 'kunjungan') {
    const masuk: ServiceStageState = ada(spk?.waktu_check_in) || ada(spk?.created_at) ? 'done' : 'active';
    const keluar: ServiceStageState = ada(spk?.waktu_check_out) ? 'done' : 'pending';
    const penerimaan: ServiceStageState = ada(spk?.waktu_check_out) ? 'pending' : 'active';
    const wo: ServiceStageState = 'pending';
    const pengerjaan: ServiceStageState = 'pending';
    const qc: ServiceStageState = 'pending';
    const fir: ServiceStageState = 'pending';
    const pembayaran: ServiceStageState = 'pending';

    return { booking, masuk, penerimaan, wo, pengerjaan, qc, fir, pembayaran, keluar };
  }

  // Status lama ("Proses Pekerjaan", "Selesai Dikerjakan") disamakan ke status baku
  const status = normalizeSpkStatus(spk?.status_spk);
  const adaStatus = (list: string[]) => list.includes(status);

  // Bila unit sudah resmi check out dari gerbang atau berstatus Selesai, SEMUA tahap servis tuntas (done)
  if (ada(spk?.waktu_check_out) || status === 'Selesai') {
    return {
      booking,
      masuk: 'done',
      penerimaan: 'done',
      wo: 'done',
      pengerjaan: 'done',
      qc: 'done',
      fir: 'done',
      pembayaran: 'done',
      keluar: 'done',
    };
  }

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
  if (invoiceLunas || status === 'Siap Keluar (Lunas)' || status === 'Siap Keluar') pembayaran = 'done';
  else if (status === 'Menunggu Invoice/Kasir' || adaStatus(STATUS_FIR_CLOSED)) pembayaran = 'active';

  let keluar: ServiceStageState = 'pending';
  if (ada(spk?.waktu_check_out)) keluar = 'done';
  else if (invoiceLunas || status === 'Siap Keluar (Lunas)' || status === 'Siap Keluar') keluar = 'active';

  return { booking, masuk, penerimaan, wo, pengerjaan, qc, fir, pembayaran, keluar };
};

/** Ambil tahap yang perlu ditampilkan (semua yang sudah tercapai atau sedang berjalan). */
export const visibleServiceStages = (timeline: Record<ServiceStageKey, ServiceStageState>): ServiceStageKey[] =>
  SERVICE_STAGE_ORDER.filter((key) => timeline[key] !== 'pending');
