import React from 'react';

export interface FilterChipOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterChipsProps {
  options: FilterChipOption[];
  selectedId: string;
  onChange: (id: string) => void;
  variant?: 'segmented' | 'tabs';
  className?: string;
}

/**
 * FilterChips - KIM3 Bengkel Design System
 * Supports:
 * - 'segmented' (default): background track #F1F5F9 with white active pill card
 * - 'tabs': clean underline tabs with counter pill, border-b-2 navy on active, scrollable on mobile
 */
export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selectedId,
  onChange,
  variant = 'segmented',
  className = '',
}) => {
  if (variant === 'tabs') {
    return (
      <div className={`overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
        <div
          role="tablist"
          aria-label="Filter status"
          className="inline-flex items-center gap-6 min-w-max"
        >
          {options.map((opt) => {
            const isSelected = opt.id === selectedId;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onChange(opt.id)}
                className={`pb-3 text-[13px] transition-all flex items-center gap-2 cursor-pointer shrink-0 select-none -mb-px border-b-2 font-medium focus-visible:outline-none ${
                  isSelected
                    ? 'border-[#12388F] text-[#12388F] dark:border-[#60A5FA] dark:text-[#60A5FA] font-semibold'
                    : 'border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:border-slate-300'
                }`}
              >
                <span>{opt.label}</span>
                {opt.count !== undefined && (
                  <span
                    className={`min-w-5 h-5 rounded-full px-1.5 text-[11px] tabular-nums font-semibold flex items-center justify-center leading-none transition-colors ${
                      isSelected
                        ? 'bg-[#EEF2FF] text-[#12388F] dark:bg-blue-950/50 dark:text-[#60A5FA]'
                        : 'bg-[#F1F5F9] text-[#64748B] dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default: Segmented control
  return (
    <div className={`overflow-x-auto pb-0.5 ${className}`}>
      <div
        role="group"
        aria-label="Filter status"
        className="p-1 rounded-lg bg-[#F1F5F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 inline-flex items-center gap-1 min-w-max"
      >
        {options.map((opt) => {
          const isSelected = opt.id === selectedId;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`px-3 py-1.5 rounded-md text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 select-none ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 text-[#12388F] dark:text-blue-400 font-bold shadow-xs'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white font-medium hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span>{opt.label}</span>
              {opt.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-colors min-w-[18px] text-center tabular-nums leading-none ${
                    isSelected
                      ? 'bg-[#EEF2FF] text-[#12388F] dark:bg-blue-950/70 dark:text-blue-300'
                      : 'bg-slate-200/80 text-[#64748B] dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterChips;
