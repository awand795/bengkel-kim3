import React from 'react';

export interface TabBarItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface TabBarProps {
  tabs: TabBarItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'segmented' | 'underline';
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'segmented',
  className = '',
}) => {
  if (variant === 'underline') {
    return (
      <div className={`border-b border-border overflow-x-auto ${className}`}>
        <div className="flex items-center gap-2 min-w-max">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`py-2.5 px-3.5 border-b-2 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-accent text-accent font-bold'
                    : 'border-transparent text-ink-muted hover:text-ink hover:border-border'
                }`}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums ${
                      isActive
                        ? 'bg-accent/15 text-accent'
                        : 'bg-surface border border-border text-ink-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default: Segmented tab bar
  return (
    <div
      className={`p-1 bg-surface rounded-xl border border-border flex items-center gap-1 overflow-x-auto ${className}`}
    >
      <div className="flex items-center gap-1 min-w-max w-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-surface-raised text-accent font-bold shadow-xs border border-border/60'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-raised/40 border border-transparent'
              }`}
            >
              {Icon && <Icon className="w-4 h-4 shrink-0" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums ${
                    isActive
                      ? 'bg-accent/15 text-accent'
                      : 'bg-surface border border-border text-ink-muted'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabBar;
