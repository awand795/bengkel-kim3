import React from 'react';
import { ChevronRight } from 'lucide-react';

export type StatCardTone = 'accent' | 'amber' | 'blue' | 'green' | 'red' | 'neutral';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  tone?: StatCardTone;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

const TONE_STYLES: Record<StatCardTone, string> = {
  accent: 'bg-accent-subtle text-accent border border-accent/20',
  amber: 'bg-status-amber-bg text-status-amber border border-status-amber/20',
  blue: 'bg-status-blue-bg text-status-blue border border-status-blue/20',
  green: 'bg-status-green-bg text-status-green border border-status-green/20',
  red: 'bg-status-red-bg text-status-red border border-status-red/20',
  neutral: 'bg-surface text-ink-muted border border-border',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  tone = 'accent',
  onClick,
  active = false,
  className = '',
}) => {
  const valueStr = String(value);
  const isLongValue = valueStr.length > 10 || valueStr.startsWith('Rp');

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`card-modern bg-surface-raised rounded-xl p-4 sm:p-5 transition-all relative flex flex-col justify-between ${
        active
          ? 'border-accent bg-accent-subtle/60 ring-1 ring-accent/20'
          : 'hover:border-accent/30 hover:shadow-md'
      } ${
        onClick
          ? 'cursor-pointer group active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-accent'
          : ''
      } ${className}`}
    >
      <div>
        {/* Top Row: Icon Container on Left, Number on Right */}
        <div className="flex items-center justify-between gap-3">
          {Icon ? (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                TONE_STYLES[tone] || TONE_STYLES.accent
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            </div>
          )}

          <div className="flex flex-col items-end min-w-0 flex-1">
            {badge && (
              <span className="text-[11px] font-bold text-ink-subtle uppercase px-2 py-0.5 rounded-md bg-surface border border-border mb-1">
                {badge}
              </span>
            )}
            <div
              className={`font-sans font-semibold tabular-nums text-ink text-right truncate max-w-full leading-tight ${
                isLongValue ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'
              }`}
              title={valueStr}
            >
              {value}
            </div>
          </div>
        </div>

        {/* Title and Subtitle Below */}
        <div className="mt-3">
          <div className="text-[13px] font-semibold text-ink truncate leading-snug">
            {title}
          </div>
          {subtitle && (
            <p className="text-xs text-ink-muted mt-0.5 truncate font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Hover Chevron in bottom-right corner when clickable */}
      {onClick && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2.5 right-2.5 text-accent pointer-events-none">
          <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
