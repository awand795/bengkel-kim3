import React from 'react';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  badge,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-base sm:text-lg font-bold text-ink leading-tight">
            {title}
          </h2>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
};

export default SectionHeader;
