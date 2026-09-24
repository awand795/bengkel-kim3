import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let listeners: ToastListener[] = [];
let toastMemory: ToastItem[] = [];

const notify = () => {
  listeners.forEach((listener) => listener([...toastMemory]));
};

export const toast = {
  show: (item: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = {
      id,
      duration: item.duration ?? 4000,
      ...item,
    };
    toastMemory = [newToast, ...toastMemory].slice(0, 5); // Keep max 5 visible
    notify();

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, newToast.duration);
    }
    return id;
  },

  success: (title: string, message?: string, duration?: number) => {
    return toast.show({ type: 'success', title, message, duration });
  },

  error: (title: string, message?: string, duration?: number) => {
    return toast.show({ type: 'error', title, message, duration: duration ?? 5000 });
  },

  info: (title: string, message?: string, duration?: number) => {
    return toast.show({ type: 'info', title, message, duration });
  },

  warning: (title: string, message?: string, duration?: number) => {
    return toast.show({ type: 'warning', title, message, duration });
  },

  dismiss: (id: string) => {
    toastMemory = toastMemory.filter((t) => t.id !== id);
    notify();
  },

  clear: () => {
    toastMemory = [];
    notify();
  },
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>(toastMemory);

  useEffect(() => {
    const listener: ToastListener = (newToasts) => {
      setToasts(newToasts);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';
        const isInfo = t.type === 'info';

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-full p-4 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${
              isSuccess
                ? 'bg-slate-900/95 border-emerald-500/40 text-white'
                : isError
                ? 'bg-slate-900/95 border-rose-500/40 text-white'
                : isWarning
                ? 'bg-slate-900/95 border-amber-500/40 text-white'
                : 'bg-slate-900/95 border-sky-500/40 text-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {isInfo && <Info className="w-5 h-5 text-sky-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-black tracking-tight leading-snug">
                  {t.title}
                </div>
                {t.message && (
                  <div className="text-[11px] text-slate-300 mt-1 leading-relaxed break-words">
                    {t.message}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default toast;
