/**
 * Helper tanggal lokal (WIB = zona browser) untuk label "Hari Ini".
 * - todayKey(): 'YYYY-MM-DD' hari ini zona lokal.
 * - isTanggalHariIni(ts): true bila ts (ISO/timestamp) jatuh pada hari ini lokal.
 *   Nilai null/invalid -> false (tidak ikut metrik harian).
 * - isTanggalSamaHariIni(tanggalYMD): untuk kolom DATE 'YYYY-MM-DD'.
 */
export const todayKey = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const isTanggalHariIni = (ts?: string | number | Date | null): boolean => {
  if (ts === undefined || ts === null || ts === '') return false;
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return false;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}` === todayKey();
};

export const isTanggalSamaHariIni = (tanggalYMD?: string | null): boolean => {
  if (!tanggalYMD) return false;
  return tanggalYMD.slice(0, 10) === todayKey();
};

/** Kunci 'YYYY-MM-DD' lokal dari timestamp, atau null bila invalid. */
export const tanggalKey = (ts?: string | number | Date | null): string | null => {
  if (ts === undefined || ts === null || ts === '') return null;
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const keyToDate = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Rentang kalender lokal: 'Semua' | 'Hari Ini' | 'Kemarin' | 'Minggu Ini' (Senin–Minggu) | 'Bulan Ini'. */
export const isDalamRentang = (
  ts: string | number | Date | null | undefined,
  rentang: 'Semua' | 'Hari Ini' | 'Kemarin' | 'Minggu Ini' | 'Bulan Ini'
): boolean => {
  if (rentang === 'Semua') return true;
  const key = tanggalKey(ts);
  if (!key) return false;
  const today = todayKey();
  if (rentang === 'Hari Ini') return key === today;
  if (rentang === 'Bulan Ini') return key.slice(0, 7) === today.slice(0, 7);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffHari = Math.round((keyToDate(today).getTime() - keyToDate(key).getTime()) / dayMs);
  if (rentang === 'Kemarin') return diffHari === 1;
  if (rentang === 'Minggu Ini') {
    // Senin sebagai awal minggu
    const dow = (keyToDate(today).getDay() + 6) % 7;
    return diffHari >= 0 && diffHari <= dow;
  }
  return true;
};
