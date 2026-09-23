import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * StatusBadge - KIM3 Bengkel Design System (Stage 8 & 9)
 * Tokens: IBM Plex Sans, border-radius 4-6px, hairline border,
 * Semantic Tokens: text-accent, text-status-*, bg-status-*-bg, etc.
 * Prinsip: Satu elemen solid penuh (warna semantik), sisanya redup (tint lembut).
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = (st: string) => {
    switch (st?.toLowerCase()) {
      // Teal Accent (Check In & Estimasi)
      case 'check in':
      case 'estimasi dibuat':
      case 'estimasi disetujui':
        return 'bg-accent-subtle text-accent border-accent/30';

      // Blue (Proses / Pengerjaan Mekanik)
      case 'dalam pengerjaan':
      case 'sedang dikerjakan':
      case 'dikerjakan':
      case 'pengecekan mekanik':
      case 'menunggu pengecekan mekanik':
        return 'bg-status-blue-bg text-status-blue border-status-blue/20';

      // Amber (Waiting / Pending / Approval / Part)
      case 'booked':
      case 'pending':
      case 'menunggu approval customer':
      case 'menunggu approval':
      case 'waiting part':
      case 'menunggu part':
      case 'diproses purchasing':
      case 'waiting qc':
      case 'menunggu qc':
        return 'bg-status-amber-bg text-status-amber border-status-amber/20';

      // Green (Selesai / QC Passed / Ready / Paid)
      case 'qc passed':
      case 'disetujui sa':
      case 'disetujui':
      case 'barang ready':
      case 'paid':
      case 'selesai':
      case 'fir closed':
        return 'bg-status-green-bg text-status-green border-status-green/20';

      // Red (Ditolak / Dibatalkan / Error / Unpaid)
      case 'unpaid':
      case 'ditolak':
      case 'dibatalkan':
      case 'tidak sesuai':
        return 'bg-status-red-bg text-status-red border-status-red/20';

      // Neutral / Muted (Keluar / Lainnya)
      case 'keluar':
      default:
        return 'bg-surface text-ink-muted border-border';
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] rounded',
    md: 'px-2.5 py-0.5 text-xs rounded',
    lg: 'px-3 py-1 text-xs rounded-md',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans font-semibold tracking-tight tabular-nums border shadow-2xs ${getBadgeStyle(
        status
      )} ${sizeClasses[size]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-90 shrink-0" />
      <span className="truncate">{status || '-'}</span>
    </span>
  );
};

export default StatusBadge;
