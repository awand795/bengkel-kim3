/** Format tanggal + jam lokal WIB yang dipakai timeline dan riwayat service. */
export const fmtWaktuFull = (iso?: string | null): string => {
  if (!iso || isNaN(new Date(iso).getTime())) return '';
  const d = new Date(iso);
  return `Pukul ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB • ${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};
