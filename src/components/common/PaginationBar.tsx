import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  /** Halaman aktif (1-based). */
  page: number;
  totalPages: number;
  totalRecords: number;
  /** Jumlah baris per halaman yang sedang dipakai. */
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  /** Pilihan jumlah baris per halaman. */
  limitOptions?: number[];
  /** Nama entitas untuk teks ringkasan, mis. "armada" atau "riwayat service". */
  label?: string;
  isLoading?: boolean;
}

/** Jendela nomor halaman maksimal 5 tombol di sekitar halaman aktif. */
const getPageWindow = (page: number, totalPages: number): number[] => {
  const size = Math.min(5, Math.max(totalPages, 1));
  let start = Math.max(1, page - Math.floor(size / 2));
  const end = Math.min(totalPages, start + size - 1);
  start = Math.max(1, end - size + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

/**
 * PaginationBar - KIM3 Bengkel Design System
 * Dipakai untuk daftar yang di-paginate server-side lewat API Builder
 * (param `page` + `limit`). Pemakai bisa mengubah jumlah baris per halaman.
 */
export const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50, 100],
  label = 'data',
  isLoading = false,
}) => {
  if (totalRecords <= 0) return null;

  const safeTotalPages = Math.max(totalPages, 1);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, totalRecords);
  const pages = getPageWindow(page, safeTotalPages);

  const navBtn =
    'inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-surface-raised text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 mt-1 border-t border-border">
      <div className={isLoading ? 'flex flex-wrap items-center gap-2 opacity-60' : 'flex flex-wrap items-center gap-2'}>
        <span className="text-xs text-ink-muted">
          Menampilkan <span className="font-bold text-ink tabular-nums">{from}</span>–
          <span className="font-bold text-ink tabular-nums">{to}</span> dari{' '}
          <span className="font-bold text-ink tabular-nums">{totalRecords}</span> {label}
        </span>
        <label className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="hidden sm:inline">Baris:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={isLoading}
            aria-label="Jumlah baris per halaman"
            className="px-2 py-1.5 rounded-md border border-border bg-surface-raised text-xs font-semibold text-ink focus:ring-2 focus:ring-accent focus:outline-hidden cursor-pointer disabled:cursor-not-allowed"
          >
            {limitOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      {safeTotalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className={navBtn}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              disabled={isLoading}
              aria-current={p === page ? 'page' : undefined}
              className={
                p === page
                  ? 'min-w-8 px-2 py-1.5 rounded-md border border-accent bg-accent text-white text-xs font-bold tabular-nums cursor-pointer'
                  : navBtn + ' min-w-8 tabular-nums'
              }
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= safeTotalPages || isLoading}
            className={navBtn}
            aria-label="Halaman berikutnya"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PaginationBar;
