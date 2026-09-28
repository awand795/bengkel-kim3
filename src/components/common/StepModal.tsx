import React, { useRef, useEffect } from 'react';
import { X, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

export interface StepItem {
  id: string;
  label: string;
  content: React.ReactNode;
  isValid?: boolean;
}

export interface StepModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  steps: StepItem[];
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  isPending?: boolean;
  size?: 'md' | 'lg';
}

export const StepModal: React.FC<StepModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  steps,
  currentStep,
  onNext,
  onBack,
  onSubmit,
  submitLabel = 'Selesai & Konfirmasi',
  isPending = false,
  size = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Focus management: capture trigger element, focus dialog, return on unmount
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

  if (!open || steps.length === 0) return null;

  const stepIndex = Math.max(0, Math.min(currentStep, steps.length - 1));
  const activeStep = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const isCurrentValid = activeStep?.isValid !== false;

  const sizeClasses = size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl';

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 app-backdrop-in">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="step-modal-title"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={`app-modal-in bg-surface-raised w-full ${sizeClasses} rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden focus:outline-none`}
        >
          {/* Mobile Drag Handle */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
            <span className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              <h2 id="step-modal-title" className="text-base sm:text-lg font-black text-ink leading-snug">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-ink-muted mt-1 leading-normal">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface transition-colors cursor-pointer shrink-0"
              aria-label="Tutup jendela modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Horizontal Stepper */}
          <div className="px-5 py-3 border-b border-border bg-surface shrink-0">
            {/* Desktop Stepper */}
            <div className="hidden sm:flex items-center justify-between gap-2 overflow-x-auto py-0.5">
              {steps.map((st, idx) => {
                const isPassed = idx < stepIndex;
                const isCurrent = idx === stepIndex;
                return (
                  <React.Fragment key={st.id}>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isPassed
                            ? 'bg-status-green text-white shadow-xs'
                            : isCurrent
                            ? 'bg-accent text-white shadow-xs ring-2 ring-accent/30'
                            : 'bg-surface-raised border border-border text-ink-muted'
                        }`}
                      >
                        {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span
                        className={`text-xs whitespace-nowrap ${
                          isCurrent ? 'text-ink font-bold' : isPassed ? 'text-ink font-semibold' : 'text-ink-muted font-medium'
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 min-w-3 mx-1 transition-colors ${
                          idx < stepIndex ? 'bg-status-green' : 'bg-border'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Mobile Stepper (Progress Bar & Step Indicator) */}
            <div className="sm:hidden space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-accent">
                  Langkah {stepIndex + 1} dari {steps.length}: <span className="text-ink font-bold">{activeStep?.label}</span>
                </span>
                <span className="text-ink-muted font-bold text-xs">
                  {Math.round(((stepIndex + 1) / steps.length) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300 rounded-full"
                  style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Modal Body with internal scroll */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div key={activeStep?.id || stepIndex} className="app-page-transition">
              {activeStep?.content}
            </div>
          </div>

          {/* Modal Footer Sticky */}
          <div className="px-5 py-3.5 border-t border-border bg-surface-raised flex items-center justify-between gap-3 shrink-0 safe-bottom">
            <div>
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={isPending}
                  className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-ink-muted hover:text-ink font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-ink font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              {isLastStep ? (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!isCurrentValid || isPending}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-md shadow-accent/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{submitLabel}</span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!isCurrentValid || isPending}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-md shadow-accent/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Lanjut</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default StepModal;
