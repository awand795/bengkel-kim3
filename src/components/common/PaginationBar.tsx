import React from 'react';

export interface PaginationBarProps {
  /** Halaman aktif (1-based). */
  page: number;
  totalPages: number;
  totalRecords: number;
  /** Jumlah baris per halaman yang sedang dipakai. */
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  /** Pilihan jumlah baris per halaman (opsional). */
  limitOptions?: number[];
  /** Nama entitas untuk teks ringkasan, mis. "kendaraan" atau "riwayat service". */
  label?: string;
  isLoading?: boolean;
  maxLimit?: number;
  showJump?: boolean | 'auto';
  showFirstLast?: boolean | 'auto';
  customLimit?: boolean;
  className?: string;
}

/**
 * PaginationBar - KIM3 Bengkel Design System
 * Unified minimal clean pagination component matching Security Portal style:
 * - Left: "Menampilkan {startCount} - {endCount} dari {totalRecords} {label}"
 * - Right: "<" "[1]" "[2]" "[...]" "[N]" ">"
 */
export const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
  label = 'data',
  isLoading = false,
  className = '',
}) => {
  const safeTotalPages = Math.max(1, totalPages || Math.ceil(totalRecords / (limit || 10)));
  const safeCurrentPage = Math.min(Math.max(1, page), safeTotalPages);
  const startCount = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * limit + 1;
  const endCount = Math.min(safeCurrentPage * limit, totalRecords);

  const renderPageButtons = () => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }).map((_, i) => {
        const pageNum = i + 1;
        const isActive = safeCurrentPage === pageNum;
        return (
          <button
            key={pageNum}
            type="button"
            disabled={isLoading}
            onClick={() => onPageChange(pageNum)}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
              isActive
                ? 'bg-[#12388F] text-white shadow-xs'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:bg-surface dark:border-border dark:text-slate-300 dark:hover:bg-surface-raised'
            }`}
          >
            {pageNum}
          </button>
        );
      });
    }

    const pages: (number | string)[] = [];
    if (safeCurrentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', safeTotalPages);
    } else if (safeCurrentPage >= safeTotalPages - 3) {
      pages.push(
        1,
        '...',
        safeTotalPages - 4,
        safeTotalPages - 3,
        safeTotalPages - 2,
        safeTotalPages - 1,
        safeTotalPages
      );
    } else {
      pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', safeTotalPages);
    }

    return pages.map((p, idx) => {
      if (typeof p === 'string') {
        return (
          <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-xs select-none">
            ...
          </span>
        );
      }
      const isActive = safeCurrentPage === p;
      return (
        <button
          key={p}
          type="button"
          disabled={isLoading}
          onClick={() => onPageChange(p)}
          className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
            isActive
              ? 'bg-[#12388F] text-white shadow-xs'
              : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:bg-surface dark:border-border dark:text-slate-300 dark:hover:bg-surface-raised'
          }`}
        >
          {p}
        </button>
      );
    });
  };

  return (
    <div
      className={`px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 dark:bg-surface-raised dark:border-border dark:text-slate-400 ${className}`}
    >
      <div>
        Menampilkan {startCount} - {endCount} dari {totalRecords} {label}
      </div>
      {safeTotalPages > 1 ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safeCurrentPage <= 1 || isLoading}
            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer text-xs dark:bg-surface dark:border-border dark:text-slate-300"
            aria-label="Previous Page"
            title={safeCurrentPage <= 1 ? 'Sudah di halaman pertama' : 'Halaman sebelumnya'}
          >
            &lt;
          </button>
          {renderPageButtons()}
          <button
            type="button"
            disabled={safeCurrentPage >= safeTotalPages || isLoading}
            onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer text-xs dark:bg-surface dark:border-border dark:text-slate-300"
            aria-label="Next Page"
            title={safeCurrentPage >= safeTotalPages ? 'Sudah di halaman terakhir' : 'Halaman berikutnya'}
          >
            &gt;
          </button>
        </div>
      ) : totalRecords > 0 ? (
        <span className="text-[11px] text-slate-400">Halaman 1 dari 1</span>
      ) : null}
    </div>
  );
};
