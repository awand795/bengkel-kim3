import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/**
 * Tarif PPN strictly dari database (pengaturan_sistem.ppn_persen via /kim3/pengaturan).
 * TANPA fallback diam-diam: bila null berarti belum dimuat / belum diatur admin
 * dan pemanggil WAJIB memblokir aksi yang butuh angka dengan pesan eksplisit.
 */
export const usePpnRate = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pengaturan'],
    queryFn: api.getPengaturan,
    staleTime: 5 * 60 * 1000,
  });

  const raw = data?.ppn_persen;
  const rate: number | null =
    typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : null;

  const calcPpn = (subtotal: number): number | null =>
    rate === null ? null : Math.round(subtotal * (rate / 100));

  return { rate, isLoading, isError, refetch, calcPpn };
};
