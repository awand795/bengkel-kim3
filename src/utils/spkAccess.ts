import { SpkService, AuthUser } from '../types';

/**
 * Strict ownership check: apakah SPK ditugaskan ke mekanik yang login?
 * - Prioritas: pencocokan ID persis (id_mekanik vs authUser.id).
 * - Fallback: pencocokan nama persis (case-insensitive, trim) — BUKAN substring,
 *   agar "Andi" tidak cocok dengan "Andi Wijaya" milik orang lain.
 * - SPK tanpa mekanik (belum ditugaskan) selalu false: mekanik hanya
 *   melihat WO miliknya sendiri.
 */
export const isSpkAssignedToMechanic = (
  spk: Pick<SpkService, 'id_mekanik' | 'nama_mekanik'>,
  authUser?: Pick<AuthUser, 'id' | 'nama_lengkap'> | null,
  currentUser?: string
): boolean => {
  if (authUser?.id != null && spk.id_mekanik != null) {
    return Number(spk.id_mekanik) === Number(authUser.id);
  }
  const spkName = (spk.nama_mekanik || '').trim().toLowerCase();
  if (!spkName) return false;
  const userName = (authUser?.nama_lengkap || currentUser || '').trim().toLowerCase();
  if (!userName) return false;
  return spkName === userName;
};

/**
 * Cari ID mekanik ter-assign dari sebuah SPK (untuk notifikasi personal).
 * Mengembalikan undefined bila SPK tidak ditemukan / belum ada mekaniknya —
 * pemanggil wajib melewati peran Mekanik bila undefined (ketat, anti-bocor).
 */
export const resolveMechanicId = (
  spkList: Array<Pick<SpkService, 'id' | 'id_mekanik'>> | undefined | null,
  idSpk: number | null | undefined
): number | undefined => {
  if (!spkList || idSpk == null) return undefined;
  const found = spkList.find((s) => Number(s.id) === Number(idSpk));
  const mid = found?.id_mekanik;
  return mid == null ? undefined : Number(mid);
};
