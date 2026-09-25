import { useState, useEffect } from 'react';
import { api } from '../api/client';

export interface PemilikPlat {
  id_kendaraan: number;
  no_polisi: string;
  id_pelanggan: number | null;
  nama_perusahaan: string | null;
  user_id: number | null;
  nama_lengkap: string | null;
  email: string | null;
}

/**
 * Lookup pemilik kendaraan by plat (walk-in primary key).
 * Debounced 400ms, min. 3 karakter ternormalisasi.
 * Dipakai Security/SA untuk menampilkan pemilik + mengarahkan notifikasi personal.
 */
export const usePemilikPlat = (noPolisi: string, enabled = true) => {
  const [data, setData] = useState<PemilikPlat | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const plat = (noPolisi || '').toUpperCase().replace(/\s+/g, '');
    if (!enabled || plat.length < 3) {
      setData(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const rows = await api.cariPemilikPlat(plat);
        if (alive) setData(rows[0] || null);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [noPolisi, enabled]);

  return { pemilik: data, loading };
};
