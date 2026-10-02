import React from 'react';

export interface RupiahCellProps {
  amount: number | string;
  className?: string;
}

/**
 * RupiahCell - KIM3 Bengkel Design System
 * Formats currency: "Rp" 11px font-medium #94A3B8, amount 13px font-bold #0F172A
 * Text content preserves space: "Rp 405.000"
 */
export const RupiahCell: React.FC<RupiahCellProps> = ({ amount, className = '' }) => {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const formatted = num.toLocaleString('id-ID');

  return (
    <span className={`inline-flex items-baseline tabular-nums select-all ${className}`}>
      <span className="text-[11px] font-medium text-[#94A3B8] dark:text-slate-400">Rp </span>
      <span className="text-[13px] font-bold text-[#0F172A] dark:text-white ml-0.5">{formatted}</span>
    </span>
  );
};

export default RupiahCell;
