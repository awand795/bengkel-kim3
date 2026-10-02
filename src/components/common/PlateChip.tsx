import React from 'react';
import { formatPlat } from '../../api/client';

export interface PlateChipProps {
  plat?: string;
  className?: string;
}

/**
 * PlateChip - KIM3 Bengkel Design System
 * Enterprise & Dribbble style vehicle license plate chip:
 * font-mono, 12px, font-bold, tracking-wider, bg #F8FAFC, border 1.5px #CBD5E1, rounded-md, px-2.5 py-1, text #0F172A
 */
export const PlateChip: React.FC<PlateChipProps> = ({ plat, className = '' }) => {
  return (
    <span
      className={`inline-block px-2.5 py-1 font-mono font-bold tracking-wider text-xs rounded-md bg-[#F8FAFC] dark:bg-slate-800 border-[1.5px] border-[#CBD5E1] dark:border-slate-600 text-[#0F172A] dark:text-white select-all shadow-2xs ${className}`}
    >
      {formatPlat(plat || '')}
    </span>
  );
};

export default PlateChip;
