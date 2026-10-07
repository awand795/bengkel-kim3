import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { ModalActionButton } from './ModalActionButton';

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
    buttonVariant: 'danger' as const,
  },
  green: {
    iconBox: 'bg-status-green-bg text-status-green',
    Icon: CheckCircle2,
    buttonVariant: 'success' as const,
  },
  amber: {
    iconBox: 'bg-status-amber-bg text-status-amber',
    Icon: Info,
    buttonVariant: 'warning' as const,
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
      <div className="fixed inset-0 z-50 bg-[rgba(15,23,42,0.5)] backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:py-10 app-backdrop-in">
        <div className="bg-surface-raised rounded-2xl w-full max-w-sm p-6 sm:p-7 shadow-2xl border border-border space-y-5 my-auto app-modal-in">
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
            <ModalActionButton
              variant="cancel"
              width="group"
              onClick={onClose}
              disabled={isPending}
            >
              {cancelLabel}
            </ModalActionButton>
            <ModalActionButton
              variant={t.buttonVariant}
              width="group"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? 'Memproses...' : confirmLabel}
            </ModalActionButton>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
