import React from 'react';

type ModalActionVariant = 'primary' | 'secondary' | 'cancel' | 'danger' | 'success' | 'warning';
type ModalActionWidth = 'group' | 'responsive' | 'full';

interface ModalActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ModalActionVariant;
  width?: ModalActionWidth;
}

const VARIANT_CLASSES: Record<ModalActionVariant, string> = {
  primary: 'bg-[#12388F] text-white shadow-sm hover:bg-[#0D2A6B] focus-visible:ring-[#12388F]/30',
  secondary: 'border border-[#C9D3E0] bg-[#EEF2F7] text-[#334155] hover:border-[#B5C2D3] hover:bg-[#E2E9F2] focus-visible:ring-slate-400/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  cancel: 'border border-[#F2C4C4] bg-[#FFF1F1] text-[#A33A3A] hover:border-[#E8AAAA] hover:bg-[#FFE4E4] focus-visible:ring-rose-500/30 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70',
  danger: 'bg-[#DC2626] text-white shadow-sm hover:bg-[#B91C1C] focus-visible:ring-red-500/30',
  success: 'bg-status-green text-white shadow-sm hover:bg-status-green/90 focus-visible:ring-status-green/30',
  warning: 'bg-status-amber text-white shadow-sm hover:bg-status-amber/90 focus-visible:ring-status-amber/30',
};

const WIDTH_CLASSES: Record<ModalActionWidth, string> = {
  group: 'min-w-0 flex-1 sm:w-40 sm:flex-none',
  responsive: 'w-full sm:w-40',
  full: 'w-full',
};

export const ModalActionButton: React.FC<ModalActionButtonProps> = ({
  variant = 'primary',
  width = 'group',
  className = '',
  type = 'button',
  children,
  ...props
}) => (
  <button
    type={type}
    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-center text-xs font-bold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${WIDTH_CLASSES[width]} ${VARIANT_CLASSES[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default ModalActionButton;
