import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface ListItemCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  chips?: React.ReactNode[];
  icon?: React.ComponentType<{ className?: string }>;
  /** Komponen leading kustom (misal DateTile), menggantikan tile icon standar */
  leading?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * ListItemCard - KIM3 Bengkel Design System
 * Clean modern list item card:
 * - 40px icon tile in #EEF2FF with navy #12388F icon (or custom `leading`)
 * - Row 1: Title + status badge
 * - Row 2: Subtitle / meta row
 * - Right: Chevron indicator / actions
 * - Hover: translate-y -1px, border navy, subtle shadow
 */
export const ListItemCard: React.FC<ListItemCardProps> = ({
  title,
  subtitle,
  badge,
  chips,
  icon: Icon,
  leading,
  onClick,
  selected = false,
  className = '',
  actions,
  style,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={style}
      className={`group bg-white dark:bg-surface-raised rounded-xl p-4 border transition-all duration-150 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
        selected
          ? 'border-[#12388F] ring-2 ring-[#12388F]/20 shadow-xs'
          : 'border-[#E2E8F0] dark:border-border hover:-translate-y-[1px] hover:border-[#12388F]/30 hover:shadow-xs'
      } ${
        onClick
          ? 'cursor-pointer active:scale-[0.995] focus:outline-none focus:ring-2 focus:ring-[#12388F]/20'
          : ''
      } ${className}`}
    >
      {/* Main Info */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {leading ? (
          <div className="shrink-0">{leading}</div>
        ) : Icon ? (
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#12388F] dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-[#12388F] dark:text-blue-300" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="text-sm font-bold text-[#0F172A] dark:text-white truncate leading-tight flex items-center gap-2">
              {title}
            </div>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <div className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
              {subtitle}
            </div>
          )}

          {/* Optional small chips */}
          {chips && chips.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              {chips.slice(0, 2).map((chip, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-semibold text-[#64748B] dark:text-slate-300 bg-[#F1F5F9] dark:bg-slate-800 px-2 py-0.5 rounded-md border border-[#E2E8F0] dark:border-slate-700/60"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Slot: Optional Actions + Chevron */}
      <div className="flex items-center justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F1F5F9] dark:border-slate-800">
        {actions && (
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            {actions}
          </div>
        )}
        {onClick && (
          <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] dark:bg-slate-800 flex items-center justify-center text-[#64748B] group-hover:text-[#12388F] dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ListItemCard;
