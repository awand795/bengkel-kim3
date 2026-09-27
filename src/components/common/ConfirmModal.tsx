import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface ConfirmModalProps {
  title: string;
  /** Teks tunggal atau daftar bullet. */
  message: string | string[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** Warna tombol konfirmasi: red = hapus/batal, green = setuju, amber = lanjut berisiko. */
  tone?: 'red' | 'green' | 'amber';
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const TONE = {
  red: {
    iconBox: 'bg-status-red-bg text-status-red',
    Icon: AlertTriangle,
    button: 'bg-status-red hover:bg-status-red/90 shadow-status-red/20',
  },
  green: {
    iconBox: 'bg-status-green-bg text-status-green',
    Icon: CheckCircle2,
    button: 'bg-status-green hover:bg-status-green/90 shadow-status-green/20',
  },
  amber: {
    iconBox: 'bg-status-amber-bg text-status-amber',
    Icon: Info,
    button: 'bg-status-amber hover:bg-status-amber/90 shadow-status-amber/20',
  },
} as const;

/**
 * ConfirmModal — pengganti window.confirm bawaan browser.
 * Bottom-sheet di mobile, kartu tengah di desktop. Escape/backdrop menutup.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  tone = 'red',
  isPending = false,
  onConfirm,
  onClose,
}) => {
  const t = TONE[tone];
  const Icon = t.Icon;
  const lines = Array.isArray(message) ? message : [message];

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
        <div className="bg-surface-raised rounded-t-2xl sm:rounded-md w-full max-w-sm p-5 sm:p-6 shadow-2xl border border-border space-y-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-md ${t.iconBox} flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-ink">{title}</h3>
              <div className="text-xs text-ink-muted mt-1 space-y-1">
                {lines.map((ln, i) => (
                  <p key={i}>{ln}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-md border border-border bg-surface hover:bg-surface-raised text-ink-muted font-bold text-xs transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className={`flex-1 py-2.5 rounded-md text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 ${t.button}`}
            >
              {isPending ? 'Memproses...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
