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
  className?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selectedId,
  onChange,
  className = '',
}) => {
  return (
    <div className={`overflow-x-auto pb-1 -mx-1 px-1 ${className}`}>
      <div className="flex items-center gap-1.5 min-w-max">
        {options.map((opt) => {
          const isSelected = opt.id === selectedId;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-accent text-white border-accent shadow-xs'
                  : 'bg-surface-raised text-ink-muted border-border hover:border-accent/40'
              }`}
            >
              <span>{opt.label}</span>
              {opt.count !== undefined && (
                <span
                  className={`text-xs px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-surface text-ink-subtle border border-border'
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
