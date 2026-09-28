import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

export interface DetailTabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  count?: number;
}

export interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  tabs?: DetailTabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export const DetailModal: React.FC<DetailModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  badge,
  tabs,
  activeTab: externalActiveTab,
  onTabChange,
  children,
  footer,
  size = 'lg',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    () => (tabs && tabs.length > 0 ? tabs[0].id : '')
  );

  // Focus management
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        triggerRef.current?.focus();
      };
    }
  }, [open]);

  // Tab key trap inside dialog
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  if (!open) return null;

  const currentTabId = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const currentTab = tabs?.find((t) => t.id === currentTabId) || tabs?.[0];

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  };

  const sizeClasses = {
    md: 'sm:max-w-xl',
    lg: 'sm:max-w-3xl',
    xl: 'sm:max-w-5xl',
  }[size];

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 app-backdrop-in">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={`card-modern app-modal-in bg-surface-raised w-full ${sizeClasses} rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden focus:outline-none`}
        >
          {/* Mobile Drag Handle */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
            <span className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="detail-modal-title" className="text-base sm:text-lg font-bold text-ink truncate leading-tight">
                  {title}
                </h2>
                {badge && <div className="shrink-0">{badge}</div>}
              </div>
              {subtitle && (
                <p className="text-xs text-ink-muted mt-1 truncate">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface transition-colors cursor-pointer shrink-0"
              aria-label="Tutup detail modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Optional Segmented Tab Bar */}
          {tabs && tabs.length > 0 && (
            <div className="px-5 pt-2 pb-0 border-b border-border bg-surface shrink-0 overflow-x-auto">
              <div className="flex items-center gap-1.5 min-w-max pb-2">
                {tabs.map((tb) => {
                  const isActive = tb.id === (currentTab?.id || tabs[0].id);
                  return (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={() => handleTabClick(tb.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-surface-raised text-accent border border-border/80 shadow-xs'
                          : 'text-ink-muted hover:text-ink hover:bg-surface-raised/50'
                      }`}
                    >
                      <span>{tb.label}</span>
                      {tb.count !== undefined && (
                        <span
                          className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                            isActive ? 'bg-accent/15 text-accent' : 'bg-surface border border-border text-ink-muted'
                          }`}
                        >
                          {tb.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Body Internal Scroll */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {tabs && tabs.length > 0 ? (
              <div key={currentTab?.id} className="app-page-transition">
                {currentTab?.content}
              </div>
            ) : (
              children
            )}
          </div>

          {/* Optional Footer Sticky */}
          {footer && (
            <div className="px-5 py-3.5 border-t border-border bg-surface-raised flex items-center justify-end gap-3 shrink-0 safe-bottom">
              {footer}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default DetailModal;
