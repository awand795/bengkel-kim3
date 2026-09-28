import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface ListItemCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  chips?: React.ReactNode[];
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  actions?: React.ReactNode;
}

export const ListItemCard: React.FC<ListItemCardProps> = ({
  title,
  subtitle,
  badge,
  chips,
  icon: Icon,
  onClick,
  selected = false,
  className = '',
  actions,
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
      className={`card-modern group bg-surface-raised rounded-xl p-4 border transition-all relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        selected
          ? 'border-accent ring-2 ring-accent/30 shadow-md'
          : 'border-border hover:border-accent/40 hover:shadow-md'
      } ${
        onClick
          ? 'cursor-pointer active:scale-[0.995] focus:outline-none focus:ring-2 focus:ring-accent'
          : ''
      } ${className}`}
    >
      {/* Main Info (Max 3 primary items: Title, Subtitle, Badge) */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent border border-accent/20 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold text-ink truncate leading-tight">
              {title}
            </span>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs text-ink-muted truncate font-medium">
              {subtitle}
            </p>
          )}

          {/* Optional small chips (max 1-2) */}
          {chips && chips.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              {chips.slice(0, 2).map((chip, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-semibold text-ink-subtle bg-surface px-2 py-0.5 rounded-md border border-border"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Slot: Optional Quick Action + Chevron */}
      <div className="flex items-center justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
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
          <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-ink-subtle group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ListItemCard;
