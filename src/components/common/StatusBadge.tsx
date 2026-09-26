import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * StatusBadge - Modern KIM3 Bengkel Design System
 * Crisp rounded pill with status dot indicator & high contrast typography.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = (st: string) => {
    switch (st?.toLowerCase()) {
      // Petrol Accent (Check In & Estimasi)
      case 'check in':
      case 'estimasi dibuat':
      case 'estimasi disetujui':
        return 'bg-teal-50 text-teal-800 border-teal-200/80';

      // Blue (Proses / Pengerjaan Mekanik)
      case 'dalam pengerjaan':
      case 'sedang dikerjakan':
      case 'dikerjakan':
      case 'pengecekan mekanik':
      case 'menunggu pengecekan mekanik':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';

      // Amber (Waiting / Pending / Approval / Part)
      case 'booked':
      case 'pending':
      case 'menunggu approval customer':
      case 'menunggu approval':
      case 'waiting part':
      case 'menunggu part':
      case 'diproses purchasing':
      case 'po diterbitkan':
      case 'waiting qc':
      case 'menunggu qc':
        return 'bg-amber-50 text-amber-800 border-amber-200/80';

      // Green (Selesai / QC Passed / Ready / Paid)
      case 'qc passed':
      case 'disetujui sa':
      case 'disetujui':
      case 'barang ready':
      case 'paid':
      case 'selesai':
      case 'fir closed':
      case 'selesai — siap check-out':
      case 'fir closed — siap check-out':
      case 'qc passed — siap check-out':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';

      // Red (Ditolak / Dibatalkan / Error / Unpaid)
      case 'unpaid':
      case 'ditolak':
      case 'dibatalkan':
      case 'tidak sesuai':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';

      // Neutral / Muted
      case 'keluar':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getDotStyle = (st: string) => {
    switch (st?.toLowerCase()) {
      case 'check in':
      case 'estimasi dibuat':
      case 'estimasi disetujui':
        return 'bg-teal-500';
      case 'dalam pengerjaan':
      case 'sedang dikerjakan':
      case 'dikerjakan':
      case 'pengecekan mekanik':
      case 'menunggu pengecekan mekanik':
        return 'bg-blue-500 animate-pulse';
      case 'booked':
      case 'pending':
      case 'menunggu approval customer':
      case 'menunggu approval':
      case 'waiting part':
      case 'menunggu part':
      case 'diproses purchasing':
      case 'po diterbitkan':
      case 'waiting qc':
      case 'menunggu qc':
        return 'bg-amber-500';
      case 'qc passed':
      case 'disetujui sa':
      case 'disetujui':
      case 'barang ready':
      case 'paid':
      case 'selesai':
      case 'fir closed':
      case 'selesai — siap check-out':
      case 'fir closed — siap check-out':
      case 'qc passed — siap check-out':
        return 'bg-emerald-500';
      case 'unpaid':
      case 'ditolak':
      case 'dibatalkan':
      case 'tidak sesuai':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans font-medium tracking-tight rounded-full border shadow-2xs ${getBadgeStyle(
        status
      )} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotStyle(status)}`} />
      <span className="truncate">{status || '-'}</span>
    </span>
  );
};

export default StatusBadge;
