import React from 'react';
import { ChevronRight } from 'lucide-react';

export type StatCardTone = 'accent' | 'navy' | 'amber' | 'blue' | 'green' | 'teal' | 'red' | 'neutral';

interface ToneStyle {
  accent: string;
  topAccentBg: string;
  chipBg: string;
  textAccent: string;
  hoverBorder: string;
}

const TONE_STYLES: Record<StatCardTone, ToneStyle> = {
  blue: {
    accent: '#2563EB',
    topAccentBg: 'bg-[#2563EB]',
    chipBg: 'bg-[#DBEAFE]',
    textAccent: 'text-[#2563EB]',
    hoverBorder: 'hover:border-[#2563EB]/40',
  },
  accent: {
    accent: '#12388F',
    topAccentBg: 'bg-[#12388F]',
    chipBg: 'bg-[#E0E7FF]',
    textAccent: 'text-[#12388F]',
    hoverBorder: 'hover:border-[#12388F]/40',
  },
  navy: {
    accent: '#12388F',
    topAccentBg: 'bg-[#12388F]',
    chipBg: 'bg-[#E0E7FF]',
    textAccent: 'text-[#12388F]',
    hoverBorder: 'hover:border-[#12388F]/40',
  },
  amber: {
    accent: '#D97706',
    topAccentBg: 'bg-[#D97706]',
    chipBg: 'bg-[#FEF3C7]',
    textAccent: 'text-[#D97706]',
    hoverBorder: 'hover:border-[#D97706]/40',
  },
  teal: {
    accent: '#0D9488',
    topAccentBg: 'bg-[#0D9488]',
    chipBg: 'bg-[#CCFBF1]',
    textAccent: 'text-[#0D9488]',
    hoverBorder: 'hover:border-[#0D9488]/40',
  },
  green: {
    accent: '#0D9488',
    topAccentBg: 'bg-[#0D9488]',
    chipBg: 'bg-[#CCFBF1]',
    textAccent: 'text-[#0D9488]',
    hoverBorder: 'hover:border-[#0D9488]/40',
  },
  red: {
    accent: '#DC2626',
    topAccentBg: 'bg-[#DC2626]',
    chipBg: 'bg-[#FEE2E2]',
    textAccent: 'text-[#DC2626]',
    hoverBorder: 'hover:border-[#DC2626]/40',
  },
  neutral: {
    accent: '#64748B',
    topAccentBg: 'bg-[#64748B]',
    chipBg: 'bg-[#F1F5F9]',
    textAccent: 'text-[#64748B]',
    hoverBorder: 'hover:border-[#64748B]/40',
  },
};

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  tone?: StatCardTone;
  accentColor?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  tone = 'accent',
  accentColor,
  onClick,
  active = false,
  className = '',
}) => {
  const theme = TONE_STYLES[tone] || TONE_STYLES.accent;
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
      className={`bg-surface-raised border border-[#E2E8F0] dark:border-border rounded-xl p-4 sm:p-5 relative flex flex-col justify-between overflow-hidden shadow-xs transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md ${
        theme.hoverBorder
      } ${
        active
          ? 'border-[#12388F] ring-1 ring-[#12388F]/20 shadow-sm'
          : ''
      } ${
        onClick
          ? 'cursor-pointer group active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#12388F]'
          : ''
      } ${className}`}
    >
      {/* 3px Accent Line on top edge */}
      <div
        className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-xl ${theme.topAccentBg}`}
        style={accentColor ? { backgroundColor: accentColor } : undefined}
        aria-hidden="true"
      />

      <div>
        {/* Top Row: Icon Container on Left, Number on Right */}
        <div className="flex items-center justify-between gap-3">
          {Icon ? (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${theme.chipBg} ${theme.textAccent} dark:bg-blue-950/50 dark:text-blue-300`}>
              <Icon className={`w-5 h-5 ${theme.textAccent} dark:text-blue-300`} />
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme.chipBg} ${theme.textAccent} dark:bg-blue-950/50 dark:text-blue-300`}>
              <span className={`w-2.5 h-2.5 rounded-full ${theme.topAccentBg} dark:bg-blue-300`} />
            </div>
          )}

          <div className="flex flex-col items-end min-w-0 flex-1">
            {badge && (
              <span className="text-[11px] font-bold text-[#475569] dark:text-slate-300 uppercase px-2 py-0.5 rounded-md bg-[#F1F5F9] dark:bg-surface border border-[#E2E8F0] dark:border-border mb-1">
                {badge}
              </span>
            )}
            <div
              className={`font-sans font-semibold tabular-nums text-right truncate max-w-full leading-tight ${theme.textAccent} dark:text-white ${
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
          <div className="text-[13px] font-semibold text-[#0F172A] dark:text-white truncate leading-snug">
            {title}
          </div>
          {subtitle && (
            <p className="text-xs text-[#475569] dark:text-slate-300 mt-0.5 truncate font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Hover Chevron in bottom-right corner when clickable */}
      {onClick && (
        <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2.5 right-2.5 ${theme.textAccent} dark:text-blue-400 pointer-events-none`}>
          <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
