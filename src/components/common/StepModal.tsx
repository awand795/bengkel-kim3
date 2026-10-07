import React, { useRef, useEffect } from 'react';
import { X, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { ModalActionButton } from './ModalActionButton';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-2.5 backdrop-blur-sm app-backdrop-in sm:p-5">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="step-modal-title"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={`app-modal-in my-auto flex max-h-[94dvh] w-full ${sizeClasses} flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl focus:outline-none sm:max-h-[min(760px,92dvh)]`}
        >
          {/* Mobile Drag Handle */}
          <div className="flex shrink-0 justify-center pb-1 pt-2.5 sm:hidden">
            <span className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Modal Header */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-white px-4 py-3.5 sm:px-6 sm:py-4 dark:bg-surface-raised">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DCE5F5] bg-[#F5F8FD] text-[#34517C] sm:flex dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
                <span className="text-xs font-bold tabular-nums">{String(stepIndex + 1).padStart(2, '0')}</span>
              </div>
              <div className="min-w-0">
              <h2 id="step-modal-title" className="text-sm font-bold leading-snug tracking-tight text-ink sm:text-base">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-[11px] leading-normal text-ink-muted sm:text-xs">{subtitle}</p>
              )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="shrink-0 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Horizontal Stepper */}
          <div className="shrink-0 border-b border-border bg-[#F8FAFC] px-4 py-3 sm:px-6 dark:bg-slate-900/40">
            {/* Desktop Stepper */}
            <div className="hidden items-center gap-2 overflow-x-auto py-0.5 sm:flex">
              {steps.map((st, idx) => {
                const isPassed = idx < stepIndex;
                const isCurrent = idx === stepIndex;
                return (
                  <React.Fragment key={st.id}>
                    <div className="flex shrink-0 items-center gap-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                          isPassed
                            ? 'bg-[#15803D] text-white'
                            : isCurrent
                            ? 'bg-[#34517C] text-white ring-4 ring-[#34517C]/10'
                            : 'border border-[#D5DDE8] bg-white text-[#738198] dark:border-border dark:bg-surface-raised'
                        }`}
                      >
                        {isPassed ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                      </div>
                      <span
                        className={`whitespace-nowrap text-[11px] ${
                          isCurrent ? 'font-bold text-ink' : isPassed ? 'font-semibold text-ink-muted' : 'font-medium text-ink-subtle'
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`h-px min-w-4 flex-1 transition-colors ${
                          idx < stepIndex ? 'bg-[#15803D]/60' : 'bg-[#D5DDE8] dark:bg-border'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Mobile Stepper (Progress Bar & Step Indicator) */}
            <div className="space-y-2 sm:hidden">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-ink">
                  {String(stepIndex + 1).padStart(2, '0')} <span className="text-ink-subtle">/ {String(steps.length).padStart(2, '0')}</span>
                  <span className="ml-2">{activeStep?.label}</span>
                </span>
                <span className="text-[10px] font-semibold tabular-nums text-ink-subtle">
                  {Math.round(((stepIndex + 1) / steps.length) * 100)}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-[#34517C] transition-all duration-300"
                  style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Modal Body with internal scroll */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-surface-raised px-4 py-4 sm:px-6 sm:py-5">
            <div key={activeStep?.id || stepIndex} className="app-page-transition">
              {activeStep?.content}
            </div>
          </div>

          {/* Modal Footer Sticky */}
          <div className="grid shrink-0 grid-cols-2 items-center gap-2 border-t border-border bg-white px-4 py-3 sm:flex sm:justify-between sm:gap-3 sm:px-6 dark:bg-surface-raised">
            <div className="col-span-2 min-w-0 sm:col-span-1">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={isPending}
                  className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-muted shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-raised"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>
              )}
              {isFirstStep && (
                <span className="hidden text-[11px] font-medium text-ink-subtle sm:inline">
                  Langkah {stepIndex + 1} dari {steps.length}
                </span>
              )}
            </div>

            <div className="col-span-2 flex w-full shrink-0 items-stretch gap-2 sm:w-auto">
              <ModalActionButton
                variant="cancel"
                width="group"
                onClick={onClose}
                disabled={isPending}
              >
                Batal
              </ModalActionButton>

              {isLastStep ? (
                <ModalActionButton
                  variant="primary"
                  width="group"
                  onClick={onSubmit}
                  disabled={!isCurrentValid || isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{submitLabel}</span>
                  )}
                </ModalActionButton>
              ) : (
                <ModalActionButton
                  variant="primary"
                  width="group"
                  onClick={onNext}
                  disabled={!isCurrentValid || isPending}
                >
                  <span>Lanjut</span>
                  <ChevronRight className="w-4 h-4" />
                </ModalActionButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default StepModal;
