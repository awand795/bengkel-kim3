import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Check,
} from 'lucide-react';

export interface PaginationBarProps {
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

  /** Batas maksimum baris kustom (default: 200) */
  maxLimit?: number;
  /** Tampilkan kontrol lompat ke halaman (default: 'auto', tampil jika totalPages > 5) */
  showJump?: boolean | 'auto';
  /** Tampilkan tombol ke halaman pertama dan terakhir (default: 'auto', tampil jika totalPages > 5) */
  showFirstLast?: boolean | 'auto';
  /** Aktifkan input baris kustom (default: true) */
  customLimit?: boolean;
  className?: string;
}

type DesktopPaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

// Konstanta stabil di level modul untuk menghindari re-render & dependency cycle
const DEFAULT_LIMIT_OPTIONS = [10, 25, 50, 100];

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
 * PaginationBar - KIM3 Bengkel Design System
 * Enterprise & Dribbble styled unified pagination component:
 * - Desktop: Summary on left | Divider | "Baris:" + Dropdown trigger popover (portal, auto-flip)
 * - Navigation on right: Separate buttons 36px (First, Prev, Page numbers, Next, Last, Jump to page pill)
 * - When totalPages <= 1: Hide right navigation completely (summary and "Baris:" dropdown remain active)
 * - Mobile: Summary top, row 2 with "Baris:" dropdown + compact Prev / "{page} / {totalPages}" / Next (hidden if totalPages <= 1)
 * - Mobile dropdown renders as full-width bottom sheet
 */
export const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = DEFAULT_LIMIT_OPTIONS,
  label = 'data',
  isLoading = false,
  maxLimit = 200,
  showJump = 'auto',
  showFirstLast = 'auto',
  customLimit = true,
  className = '',
}) => {
  // ── HOOKS DEKLARASI DI AWAL (Rules of Hooks: tidak boleh kondisional) ──
  const safeTotalPages = Math.max(totalPages, 1);
  const currentPage = Math.min(Math.max(page, 1), safeTotalPages);

  // Sinkronkan page jika di luar rentang (mis. total records mengecil)
  useEffect(() => {
    if (page !== currentPage) {
      onPageChange(currentPage);
    }
  }, [page, currentPage, onPageChange]);

  const from = (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, Math.max(totalRecords, 0));
  const desktopItems = getDesktopPaginationItems(currentPage, safeTotalPages);

  const isPresetActive = useMemo(() => limitOptions.includes(limit), [limitOptions, limit]);

  // Responsive state for mobile bottom-sheet vs desktop popover
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 640;
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dropdown open state & positions
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });

  // Custom limit input states
  const [customInputVal, setCustomInputVal] = useState<string>(() =>
    !isPresetActive ? String(limit) : ''
  );
  const [customError, setCustomError] = useState<string>('');

  // Keyboard navigation highlight index for preset listbox
  const [highlightIndex, setHighlightIndex] = useState<number>(() => {
    const idx = limitOptions.indexOf(limit);
    return idx >= 0 ? idx : 0;
  });

  // Dua ref terpisah untuk desktop dan mobile agar posisi akurat
  const desktopTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const getActiveTrigger = useCallback(() => {
    return isMobile ? mobileTriggerRef.current : desktopTriggerRef.current;
  }, [isMobile]);

  // Hitung posisi popover desktop dengan auto-flip
  const updatePopoverPosition = useCallback(() => {
    const triggerEl = getActiveTrigger();
    if (!triggerEl || typeof window === 'undefined') return;
    const rect = triggerEl.getBoundingClientRect();
    const popoverWidth = 208;
    const popoverHeight = popoverRef.current?.offsetHeight || 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement: 'top' | 'bottom' = 'bottom';
    let top = rect.bottom + 6;

    // Flip otomatis ke atas jika ruang di bawah tidak cukup dan ruang di atas memadai
    if (spaceBelow < popoverHeight && spaceAbove > popoverHeight) {
      placement = 'top';
      top = rect.top - popoverHeight - 6;
    }

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) left = 8;

    setPopoverPos({ top, left, placement });
  }, [getActiveTrigger]);

  // Update posisi saat popover terbuka di desktop
  useEffect(() => {
    if (isOpen && !isMobile) {
      requestAnimationFrame(() => {
        updatePopoverPosition();
      });
    }
  }, [isOpen, isMobile, updatePopoverPosition]);

  // Fokuskan popover saat terbuka untuk navigasi keyboard
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        popoverRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Toggle dropdown buka / tutup
  const toggleDropdown = () => {
    if (isLoading) return;
    if (!isOpen) {
      updatePopoverPosition();
      setCustomError('');
      setCustomInputVal(!isPresetActive ? String(limit) : '');
      const idx = limitOptions.indexOf(limit);
      setHighlightIndex(idx >= 0 ? idx : 0);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      getActiveTrigger()?.focus();
    }
  };

  // Sinkronkan customInputVal hanya saat limit berubah dari luar (dependency string stabil)
  const limitOptionsKey = limitOptions.join(',');
  useEffect(() => {
    if (!limitOptions.includes(limit)) {
      setCustomInputVal(String(limit));
    } else {
      setCustomInputVal('');
    }
    setCustomError('');
  }, [limit, limitOptionsKey, limitOptions]);

  // Click outside, Escape, dan Scroll handler
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const triggerEl = getActiveTrigger();
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerEl &&
        !triggerEl.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        getActiveTrigger()?.focus();
      }
    };

    const handleScrollOrResize = () => {
      if (!isMobile) {
        updatePopoverPosition();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, isMobile, updatePopoverPosition, getActiveTrigger]);

  // Validasi input kustom angka bulat positif 1..maxLimit tanpa leading zero aneh
  const applyCustomLimit = (valStr: string) => {
    const trimmed = valStr.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) {
      setCustomError(`Isi angka 1-${maxLimit}`);
      return;
    }
    const num = parseInt(trimmed, 10);
    if (isNaN(num) || num < 1 || num > maxLimit) {
      setCustomError(`Isi angka 1-${maxLimit}`);
      return;
    }
    setCustomError('');
    onLimitChange(num);
    setIsOpen(false);
    getActiveTrigger()?.focus();
  };

  // Handle pemilihan preset
  const handleSelectPreset = (opt: number) => {
    setCustomInputVal('');
    setCustomError('');
    onLimitChange(opt);
    setIsOpen(false);
    getActiveTrigger()?.focus();
  };

  // Navigasi keyboard dan Tab-trap di dalam popover
  const handlePopoverKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % limitOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + limitOptions.length) % limitOptions.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlightIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlightIndex(limitOptions.length - 1);
    } else if (e.key === 'Enter') {
      // Jika Enter ditekan saat fokus di container popover/listbox, pilih opsi yang sedang di-highlight
      if (document.activeElement === popoverRef.current) {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < limitOptions.length) {
          handleSelectPreset(limitOptions[highlightIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      // Tab trap sederhana agar fokus tidak lari ke belakang popover
      const focusableEls = popoverRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableEls && focusableEls.length > 0) {
        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  };

  // Jump to page state
  const [jumpPageInput, setJumpPageInput] = useState<string>('');
  const handleJumpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = jumpPageInput.trim();
    if (!trimmed) return;
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) return;
    const targetPage = Math.min(Math.max(1, num), safeTotalPages);
    onPageChange(targetPage);
    setJumpPageInput('');
  };

  const shouldShowFirstLast =
    safeTotalPages > 5 && (showFirstLast === true || showFirstLast === 'auto');
  const shouldShowJump =
    safeTotalPages > 5 && (showJump === true || showJump === 'auto');

  // ── SETELAH SEMUA HOOK: Jika totalRecords <= 0 kembalikan null ──
  if (totalRecords <= 0) return null;

  // Popover Content Component
  const popoverContent = (
    <div
      ref={popoverRef}
      role="listbox"
      aria-label="Pilihan baris per halaman"
      tabIndex={-1}
      onKeyDown={handlePopoverKeyDown}
      className={
        isMobile
          ? 'fixed inset-x-0 bottom-0 z-[1000] bg-white dark:bg-slate-900 rounded-t-2xl p-4 pb-8 shadow-2xl border-t border-[#E2E8F0] dark:border-slate-800 animate-in slide-in-from-bottom duration-200 outline-none'
          : `w-[208px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.12)] p-1.5 z-[9999] outline-none animate-popover-in ${
              popoverPos.placement === 'top' ? 'origin-bottom' : 'origin-top'
            }`
      }
      style={
        !isMobile
          ? {
              position: 'fixed',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
            }
          : undefined
      }
    >
      {/* Mobile handle bar indicator */}
      {isMobile && (
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-3" />
      )}

      {/* Preset options */}
      <div className="space-y-0.5">
        {limitOptions.map((opt, idx) => {
          const isSelected = opt === limit;
          const isHighlighted = idx === highlightIndex;
          return (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelectPreset(opt)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`w-full flex items-center justify-between px-3 text-[13px] rounded-md transition-colors cursor-pointer tabular-nums select-none ${
                isMobile ? 'h-11' : 'h-9'
              } ${
                isSelected
                  ? 'bg-[#EEF2FF] text-[#12388F] dark:bg-blue-950/50 dark:text-blue-300 font-semibold'
                  : isHighlighted
                  ? 'bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-white font-medium'
                  : 'text-[#334155] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 font-medium'
              }`}
            >
              <span>{opt}</span>
              {isSelected && (
                <Check className="w-4 h-4 text-[#12388F] dark:text-blue-300 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Limit Section */}
      {customLimit && (
        <>
          <div className="my-1.5 border-t border-[#E2E8F0] dark:border-slate-800" />
          <div className="pt-0.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyCustomLimit(customInputVal);
              }}
              className="flex items-center gap-1.5"
            >
              <input
                ref={customInputRef}
                type="text"
                inputMode="numeric"
                placeholder="Kustom"
                value={customInputVal}
                onChange={(e) => {
                  setCustomInputVal(e.target.value);
                  if (customError) setCustomError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsOpen(false);
                    getActiveTrigger()?.focus();
                  }
                }}
                aria-label="Jumlah baris kustom"
                className={`flex-1 px-2.5 text-xs text-center rounded-md border transition-all tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  isMobile ? 'h-11 text-sm' : 'h-9'
                } ${
                  customError
                    ? 'border-[#DC2626] ring-1 ring-[#DC2626] text-[#DC2626] bg-red-50/50 dark:bg-red-950/20'
                    : !isPresetActive
                    ? 'ring-1 ring-[#12388F] border-[#12388F] bg-[#EEF2FF] text-[#12388F] font-semibold dark:bg-blue-950/30 dark:text-blue-300'
                    : 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white focus:border-[#12388F] focus:ring-1 focus:ring-[#12388F]'
                }`}
              />
              <button
                type="submit"
                aria-label="Terapkan kustom"
                className={`shrink-0 flex items-center justify-center rounded-md bg-[#12388F] hover:bg-[#0D2A6B] text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12388F]/20 focus-visible:outline-none ${
                  isMobile ? 'w-11 h-11' : 'w-9 h-9'
                }`}
              >
                <Check className="w-4 h-4" />
              </button>
            </form>
            {customError && (
              <span className="text-[11px] text-[#DC2626] font-medium mt-1 px-1 block animate-in fade-in duration-100">
                {customError}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div
      className={`flex flex-col gap-3 pt-4 border-t border-[#E2E8F0] dark:border-slate-800 ${className}`}
    >
      {/* ── Desktop View (>= 640px) ────────────────────────────────────────── */}
      <div className="hidden sm:flex sm:items-center sm:justify-between gap-4">
        {/* Sisi Kiri: Ringkasan | Divider | "Baris:" Dropdown trigger */}
        <div
          className={`flex items-center gap-4 flex-wrap ${
            isLoading ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          {/* Ringkasan: Tanpa kata 'Menampilkan' */}
          <span
            aria-live="polite"
            className="text-[13px] text-[#475569] dark:text-slate-400 select-none"
          >
            <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
              {from}
            </span>
            –
            <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
              {to}
            </span>{' '}
            dari{' '}
            <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
              {totalRecords}
            </span>{' '}
            {label}
          </span>

          {/* Pemisah vertikal 1px x 16px */}
          <div
            className="w-[1px] h-4 bg-[#E2E8F0] dark:bg-slate-700 shrink-0"
            aria-hidden="true"
          />

          {/* "Baris:" + Single Dropdown Button (Desktop) */}
          <div className="inline-flex items-center gap-2">
            <span className="text-[13px] text-[#64748B] dark:text-slate-400 select-none">
              Baris:
            </span>
            <button
              ref={desktopTriggerRef}
              type="button"
              disabled={isLoading}
              onClick={toggleDropdown}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-label="Jumlah baris per halaman"
              className={`h-9 px-3 rounded-lg border transition-all inline-flex items-center gap-2 text-[13px] font-semibold tabular-nums cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12388F]/20 focus-visible:border-[#12388F] focus:outline-none ${
                !isPresetActive
                  ? 'bg-[#EEF2FF] border-[#12388F]/40 text-[#12388F] dark:bg-blue-950/40 dark:border-blue-500/50 dark:text-blue-300'
                  : 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-slate-800'
              }`}
            >
              <span>{limit}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#64748B] dark:text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sisi Kanan: Navigasi Halaman (HANYA tampil jika safeTotalPages > 1) */}
        {safeTotalPages > 1 && (
          <div
            className={`flex items-center gap-1 shrink-0 ${
              isLoading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            {/* Tombol Pertama (First) jika totalPages > 5 */}
            {shouldShowFirstLast && (
              <button
                type="button"
                onClick={() => onPageChange(1)}
                disabled={currentPage <= 1 || isLoading}
                aria-label="Halaman pertama"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#475569] dark:text-slate-300 hover:bg-[#F8FAFC] hover:border-[#CBD5E1] dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-45 disabled:bg-[#F8FAFC] dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#12388F]/20 focus-visible:outline-none"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Tombol Sebelumnya (disabled di halaman pertama) */}
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              aria-label="Halaman sebelumnya"
              className="h-9 px-3 inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#334155] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#F8FAFC] hover:border-[#CBD5E1] dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-45 disabled:bg-[#F8FAFC] dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#12388F]/20 focus-visible:outline-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            {/* Nomor-nomor halaman terpisah */}
            {desktopItems.map((item, idx) => {
              if (typeof item === 'string') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-9 h-9 flex items-center justify-center text-[#94A3B8] font-bold text-xs select-none"
                  >
                    …
                  </span>
                );
              }
              const isActive = item === currentPage;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  disabled={isLoading}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-9 h-9 flex items-center justify-center text-[13px] tabular-nums rounded-lg transition-colors cursor-pointer border-none focus-visible:ring-2 focus-visible:ring-[#12388F]/20 focus-visible:outline-none ${
                    isActive
                      ? 'bg-[#12388F] text-white font-semibold shadow-[0_2px_6px_rgba(18,56,143,0.28)]'
                      : 'text-[#334155] dark:text-slate-200 font-medium hover:bg-[#F1F5F9] dark:hover:bg-slate-800'
                  }`}
                >
                  {item}
                </button>
              );
            })}

            {/* Tombol Berikutnya (disabled di halaman terakhir) */}
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= safeTotalPages || isLoading}
              aria-label="Halaman berikutnya"
              className="h-9 px-3 inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#334155] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-[#F8FAFC] hover:border-[#CBD5E1] dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-45 disabled:bg-[#F8FAFC] dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#12388F]/20 focus-visible:outline-none"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Tombol Terakhir (Last) jika totalPages > 5 */}
            {shouldShowFirstLast && (
              <button
                type="button"
                onClick={() => onPageChange(safeTotalPages)}
                disabled={currentPage >= safeTotalPages || isLoading}
                aria-label="Halaman terakhir"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#475569] dark:text-slate-300 hover:bg-[#F8FAFC] hover:border-[#CBD5E1] dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-45 disabled:bg-[#F8FAFC] dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#12388F]/20 focus-visible:outline-none"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Lompat Halaman (Pill) jika totalPages > 5 */}
            {shouldShowJump && (
              <form
                onSubmit={handleJumpSubmit}
                className="ml-1 h-9 rounded-lg border border-[#E2E8F0] dark:border-slate-700 inline-flex items-center overflow-hidden bg-white dark:bg-slate-900 shadow-2xs focus-within:ring-2 focus-within:ring-[#12388F]/20 focus-within:border-[#12388F]"
              >
                <span className="text-xs text-[#64748B] dark:text-slate-400 bg-[#F8FAFC] dark:bg-slate-800 px-3 h-full flex items-center select-none font-medium border-r border-[#E2E8F0] dark:border-slate-700">
                  Ke halaman
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={isLoading}
                  placeholder={String(currentPage)}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  aria-label="Lompat ke halaman"
                  className="w-12 h-full text-center text-xs tabular-nums text-[#0F172A] dark:text-white bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="submit"
                  disabled={isLoading || !jumpPageInput.trim()}
                  className="h-full px-2.5 border-l border-[#E2E8F0] dark:border-slate-700 text-xs text-[#12388F] dark:text-blue-400 font-semibold hover:bg-[#EEF2FF] dark:hover:bg-blue-950/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
                >
                  Ke
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile View (< 640px) ──────────────────────────────────────────── */}
      <div className="sm:hidden flex flex-col gap-3 w-full">
        {/* Row 1: Ringkasan tanpa kata 'Menampilkan' */}
        <span
          aria-live="polite"
          className="text-[13px] text-[#475569] dark:text-slate-400 select-none"
        >
          <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
            {from}
          </span>
          –
          <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
            {to}
          </span>{' '}
          dari{' '}
          <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
            {totalRecords}
          </span>{' '}
          {label}
        </span>

        {/* Row 2: "Baris:" dropdown trigger on left, compact navigation on right (hanya jika safeTotalPages > 1) */}
        <div className="flex items-center justify-between gap-2">
          {/* Dropdown Baris trigger (Mobile) */}
          <div className="inline-flex items-center gap-1.5">
            <span className="text-[13px] text-[#64748B] dark:text-slate-400 font-normal">
              Baris:
            </span>
            <button
              ref={mobileTriggerRef}
              type="button"
              disabled={isLoading}
              onClick={toggleDropdown}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-label="Jumlah baris per halaman"
              className={`h-10 px-3 rounded-lg border transition-all inline-flex items-center gap-2 text-[13px] font-semibold tabular-nums cursor-pointer focus-visible:ring-2 focus-visible:ring-[#12388F]/20 focus-visible:border-[#12388F] focus:outline-none ${
                !isPresetActive
                  ? 'bg-[#EEF2FF] border-[#12388F]/40 text-[#12388F] dark:bg-blue-950/40 dark:border-blue-500/50 dark:text-blue-300'
                  : 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
            >
              <span>{limit}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#64748B] dark:text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {/* Compact Nav (HANYA tampil jika safeTotalPages > 1) */}
          {safeTotalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                aria-label="Halaman sebelumnya"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#475569] dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="h-10 px-3 rounded-lg bg-[#F1F5F9] dark:bg-slate-800 text-[13px] font-semibold tabular-nums text-[#0F172A] dark:text-white flex items-center justify-center select-none border border-[#E2E8F0] dark:border-slate-700/60">
                {currentPage} / {safeTotalPages}
              </span>

              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= safeTotalPages || isLoading}
                aria-label="Halaman berikutnya"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#475569] dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Popover / Bottom Sheet Render via Portal ───────────────────────── */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* Mobile backdrop */}
            {isMobile && (
              <div
                onClick={() => {
                  setIsOpen(false);
                  getActiveTrigger()?.focus();
                }}
                className="fixed inset-0 bg-black/40 z-[999] backdrop-blur-[1px] animate-in fade-in duration-150"
              />
            )}
            {popoverContent}
          </>,
          document.body
        )}
    </div>
  );
};

export default PaginationBar;
