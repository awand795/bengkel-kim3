/** Format tanggal + jam lokal WIB yang dipakai timeline dan riwayat service. */
export const fmtWaktuFull = (iso?: string | null): string => {
  if (!iso || isNaN(new Date(iso).getTime())) return '';
  const d = new Date(iso);
  return `Pukul ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB • ${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};

/** Format hanya tanggal lokal Indonesia tanpa jam (contoh: 11 Nov 2026). */
export const fmtTanggalSaja = (iso?: string | null): string => {
  if (!iso) return '-';
  const cleanStr = String(iso).replace(' ', 'T');
  const d = new Date(cleanStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
