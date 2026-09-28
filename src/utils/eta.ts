/**
 * Aturan ETA SPK berjenjang (sesuai alur Excel):
 * - Tahap awal (Check In → Estimasi Dibuat): estimasi_waktu_jam masih default
 *   form yang belum bermakna → tampilkan lead_time_jam input SA (sumber 'SA').
 * - Tahap setelahnya: estimasi SA/Foreman sudah diisi via modal estimasi →
 *   tampilkan estimasi_waktu_jam (fallback lead_time_jam), sumber 'Estimasi'.
 */

export interface EtaSpk {
  /** Jam ETA yang harus ditampilkan; null bila keduanya kosong. */
  jam: number | null;
  /** Sumber angka: 'SA' (lead time penerimaan) atau 'Estimasi' (hasil estimasi). */
  sumber: 'SA' | 'Estimasi';
}

const TAHAP_AWAL = ['Check In', 'Menunggu Pengecekan Mekanik', 'Pengecekan Mekanik', 'Estimasi Dibuat'];

export const etaSpk = (spk?: { status_spk?: string; estimasi_waktu_jam?: number | null; lead_time_jam?: number | null } | null): EtaSpk => {
  if (!spk) return { jam: null, sumber: 'SA' };
  const lead = spk.lead_time_jam != null && Number(spk.lead_time_jam) > 0 ? Number(spk.lead_time_jam) : null;
  const estimasi = spk.estimasi_waktu_jam != null && Number(spk.estimasi_waktu_jam) > 0 ? Number(spk.estimasi_waktu_jam) : null;
  if (TAHAP_AWAL.includes(spk.status_spk || '')) {
    return { jam: lead ?? estimasi, sumber: 'SA' };
  }
  return { jam: estimasi ?? lead, sumber: 'Estimasi' };
};

/** Label sumber ETA untuk tampilan ("Lead time SA" / "ETA Bengkel"). */
export const labelSumberEta = (sumber: EtaSpk['sumber']): string =>
  sumber === 'SA' ? 'Lead time SA' : 'ETA Bengkel';
