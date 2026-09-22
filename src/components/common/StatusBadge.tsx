import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = (st: string) => {
    switch (st?.toLowerCase()) {
      case 'check in':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'booked':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'menunggu pengecekan mekanik':
      case 'pengecekan mekanik':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'estimasi dibuat':
      case 'estimasi disetujui':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'menunggu approval customer':
      case 'menunggu approval':
        return 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse';
      case 'waiting part':
      case 'menunggu part':
      case 'diproses purchasing':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'dalam pengerjaan':
      case 'sedang dikerjakan':
      case 'dikerjakan':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
      case 'pending':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'waiting qc':
      case 'menunggu qc':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'qc passed':
      case 'disetujui sa':
      case 'disetujui':
      case 'barang ready':
      case 'paid':
      case 'selesai':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
      case 'fir closed':
        return 'bg-teal-50 text-teal-700 border-teal-200 font-semibold';
      case 'keluar':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'unpaid':
      case 'ditolak':
      case 'dibatalkan':
      case 'tidak sesuai':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${getBadgeStyle(status)} ${sizeClasses[size]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
      {status || '-'}
    </span>
  );
};
