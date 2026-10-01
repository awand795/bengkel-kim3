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
  /** Nama entitas untuk teks ringkasan, mis. "kendaraan" atau "riwayat service". */
  label?: string;
  isLoading?: boolean;
}

type DesktopPaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * Generate pagination array with 1 ... n-1 n n+1 ... total pattern for desktop
 */
const getDesktopPaginationItems = (current: number, total: number): DesktopPaginationItem[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', total];
  }
  if (current >= total - 3) {
    return [1, 'ellipsis-start', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, 'ellipsis-start', current - 1, current, current + 1, 'ellipsis-end', total];
};

/**
 * Generate compact 3-number window for mobile
 */
const getMobilePaginationItems = (current: number, total: number): number[] => {
  if (total <= 3) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - 1);
  let end = Math.min(total, start + 2);
  start = Math.max(1, end - 2);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

/**
 * PaginationBar - KIM3 Bengkel Design System
 * Clean unified pagination bar:
 * - Summary on left: "Menampilkan x–y dari z [label]"
 * - Segmented control for page size limit: "Baris: [10][25][50][100]"
 * - Unified 32px button group for page navigation on right
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
  const desktopItems = getDesktopPaginationItems(page, safeTotalPages);
  const mobileItems = getMobilePaginationItems(page, safeTotalPages);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3.5 pb-1">
      {/* Left: Summary text & Limit segmented control */}
      <div className={isLoading ? 'flex flex-wrap items-center gap-3 opacity-60' : 'flex flex-wrap items-center gap-3'}>
        <span className="text-xs text-[#64748B] dark:text-slate-400">
          Menampilkan <span className="font-bold text-[#0F172A] dark:text-white tabular-nums">{from}</span>–
          <span className="font-bold text-[#0F172A] dark:text-white tabular-nums">{to}</span> dari{' '}
          <span className="font-bold text-[#0F172A] dark:text-white tabular-nums">{totalRecords}</span> {label}
        </span>

        {/* Limit segmented control */}
        <div className="inline-flex items-center gap-1.5 text-xs text-[#64748B] dark:text-slate-400">
          <span className="hidden sm:inline font-medium">Baris:</span>
          <div
            role="group"
            aria-label="Jumlah baris per halaman"
            className="inline-flex items-center p-0.5 rounded-lg bg-[#F1F5F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60"
          >
            {limitOptions.map((opt) => {
              const isSelected = opt === limit;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onLimitChange(opt)}
                  className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all cursor-pointer tabular-nums ${
                    isSelected
                      ? 'bg-[#12388F] text-white shadow-2xs font-bold'
                      : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Unified 32px button group */}
      {safeTotalPages > 1 && (
        <nav
          aria-label="Navigasi halaman"
          className="inline-flex items-center self-start sm:self-auto rounded-lg border border-[#E2E8F0] dark:border-slate-700 divide-x divide-[#E2E8F0] dark:divide-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs"
        >
          {/* Tombol Sebelumnya */}
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            aria-label="Halaman sebelumnya"
            className="h-8 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-medium text-[#475569] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {/* Desktop page buttons with ellipsis */}
          <div className="hidden sm:inline-flex items-center divide-x divide-[#E2E8F0] dark:divide-slate-700">
            {desktopItems.map((item, idx) => {
              if (typeof item === 'string') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-8 h-8 flex items-center justify-center text-xs text-[#94A3B8] dark:text-slate-500 font-bold select-none"
                  >
                    …
                  </span>
                );
              }
              const isActive = item === page;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  disabled={isLoading}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-8 h-8 flex items-center justify-center text-xs tabular-nums transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#12388F] text-white font-bold'
                      : 'text-[#475569] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-white font-medium'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Mobile page buttons (compact: 3 buttons) */}
          <div className="sm:hidden inline-flex items-center divide-x divide-[#E2E8F0] dark:divide-slate-700">
            {mobileItems.map((p) => {
              const isActive = p === page;
              return (
                <button
                  key={`m-${p}`}
                  type="button"
                  onClick={() => onPageChange(p)}
                  disabled={isLoading}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-8 h-8 flex items-center justify-center text-xs tabular-nums transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#12388F] text-white font-bold'
                      : 'text-[#475569] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-white font-medium'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Tombol Berikutnya */}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= safeTotalPages || isLoading}
            aria-label="Halaman berikutnya"
            className="h-8 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-medium text-[#475569] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </nav>
      )}
    </div>
  );
};
