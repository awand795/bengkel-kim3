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
      // Biru: Terjadwal / Booked / Estimasi Awal
      case 'terjadwal':
      case 'booked':
      case 'booking':
      case 'menunggu konfirmasi booking':
      case 'check in':
      case 'estimasi dibuat':
      case 'estimasi disetujui':
        return 'bg-[#DBEAFE] text-[#1D4ED8] border-[#93C5FD]/40 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50';

      // Amber: Diproses / Diservis / Menunggu Pengerjaan / Sparepart
      case 'dalam pengerjaan':
      case 'sedang dikerjakan':
      case 'dikerjakan':
      case 'pengecekan mekanik':
      case 'menunggu pengecekan mekanik':
      case 'picking warehouse':
      case 'barang siap diambil':
      case 'barang diserahkan':
      case 'pending':
      case 'menunggu approval customer':
      case 'menunggu approval':
      case 'waiting part':
      case 'menunggu part':
      case 'diproses purchasing':
      case 'po diterbitkan':
      case 'waiting qc':
      case 'menunggu qc':
        return 'bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]/40 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50';

      // Hijau: Selesai / QC Passed / Ready / Paid
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
        return 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]/40 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50';

      // Merah: Dibatalkan / Ditolak / Unpaid
      case 'unpaid':
      case 'ditolak':
      case 'dibatalkan':
      case 'booking canceled':
      case 'canceled':
      case 'tidak sesuai':
        return 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]/40 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50';

      // Neutral / Muted (Keluar / Lainnya)
      case 'keluar':
      default:
        return 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1] dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[11px] rounded-full font-semibold',
    md: 'px-3 py-1 text-xs rounded-full font-semibold',
    lg: 'px-3.5 py-1.5 text-xs rounded-full font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans tracking-tight tabular-nums border shadow-2xs ${getBadgeStyle(
        status
      )} ${sizeClasses[size]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-85 shrink-0" />
      <span className="truncate">{status || '-'}</span>
    </span>
  );
};

export default StatusBadge;
