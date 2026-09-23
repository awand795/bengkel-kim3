import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * StatusBadge - KIM3 Bengkel Design System (Stage 8 & 9)
 * Tokens: IBM Plex Sans, border-radius 4-6px, hairline border,
 * Prinsip: Satu elemen solid penuh (warna semantik), sisanya redup (tint lembut).
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = (st: string) => {
    switch (st?.toLowerCase()) {
      // Teal Accent (Check In & Estimasi)
      case 'check in':
      case 'estimasi dibuat':
      case 'estimasi disetujui':
        return 'bg-[#E6F3F5] text-[#0F6674] border-[#B2D8DC]';

      // Blue (Proses / Pengerjaan Mekanik)
      case 'dalam pengerjaan':
      case 'sedang dikerjakan':
      case 'dikerjakan':
      case 'pengecekan mekanik':
      case 'menunggu pengecekan mekanik':
        return 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]';

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
        return 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]';

      // Green (Selesai / QC Passed / Ready / Paid)
      case 'qc passed':
      case 'disetujui sa':
      case 'disetujui':
      case 'barang ready':
      case 'paid':
      case 'selesai':
      case 'fir closed':
        return 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]';

      // Red (Ditolak / Dibatalkan / Error / Unpaid)
      case 'unpaid':
      case 'ditolak':
      case 'dibatalkan':
      case 'tidak sesuai':
        return 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]';

      // Neutral / Muted (Keluar / Lainnya)
      case 'keluar':
      default:
        return 'bg-[#F2F4F5] text-[#525C65] border-[#D8DCDF]';
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] rounded-[4px]',
    md: 'px-2.5 py-0.5 text-xs rounded-[4px]',
    lg: 'px-3 py-1 text-xs rounded-[6px]',
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
