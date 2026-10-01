import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  variant?: 'bare' | 'card';
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  variant = 'bare',
  action,
  className = '',
}) => {
  const ActionIcon = action?.icon;

  const containerClasses =
    variant === 'card'
      ? `card-modern bg-surface-raised rounded-xl border border-dashed border-border py-8 px-6 text-center flex flex-col items-center justify-center space-y-3 ${className}`
      : `py-8 px-4 text-center flex flex-col items-center justify-center space-y-2.5 ${className}`;

  return (
    <div className={containerClasses}>
      <div className="w-11 h-11 rounded-xl bg-[var(--menu-accent-subtle,var(--color-accent-subtle))] text-[var(--menu-accent-text,var(--color-accent))] border border-[var(--menu-accent,var(--color-accent))]/20 flex items-center justify-center shadow-2xs">
        <Icon className="w-5 h-5 text-[var(--menu-accent-text,var(--color-accent))]" />
      </div>
      <div className="max-w-md space-y-0.5">
        <h3 className="text-sm font-bold text-ink">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-ink-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 px-4 py-2 rounded-xl bg-[#12388F] hover:bg-[#0D2A6B] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;
