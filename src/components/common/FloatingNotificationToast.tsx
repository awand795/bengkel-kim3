import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { realtimeHub, RealtimeEvent, NotificationRole } from '../../services/realtimeService';
import { 
  Bell, 
  X, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Clock, 
  Truck, 
  Calendar,
  Wrench,
  Receipt
} from 'lucide-react';

interface ToastItem {
  id: string;
  event: RealtimeEvent;
  createdAt: number;
}

export const FloatingNotificationToast: React.FC = () => {
  const { currentRole, setActiveTab } = useAppStore();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((event) => {
      // Role matching check
      const isTarget =
        event.targetRoles.includes('ALL') ||
        event.targetRoles.includes(currentRole as NotificationRole);

      if (!isTarget) return;

      const newToast: ToastItem = {
        id: event.id,
        event,
        createdAt: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 2)]); // Keep max 3 toasts

      // Auto dismiss after 6.5 seconds
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== newToast.id));
      }, 6500);
    });

    return () => {
      unsubscribe();
    };
  }, [currentRole]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAction = (toast: ToastItem) => {
    if (toast.event.linkTab) {
      setActiveTab(toast.event.linkTab);
    }
    dismissToast(toast.id);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {toasts.map((toast) => {
        const { event } = toast;
        const urgency = event.urgency || 'info';

        let badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
        let icon = <Info className="w-5 h-5 text-blue-600" />;
        let borderAccent = 'border-l-4 border-l-blue-600';

        if (urgency === 'urgent') {
          badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
          icon = <AlertTriangle className="w-5 h-5 text-rose-600" />;
          borderAccent = 'border-l-4 border-l-rose-600';
        } else if (urgency === 'warning') {
          badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
          icon = <Clock className="w-5 h-5 text-amber-600" />;
          borderAccent = 'border-l-4 border-l-amber-500';
        } else if (urgency === 'success') {
          badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
          borderAccent = 'border-l-4 border-l-emerald-500';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white rounded-2xl p-4 shadow-xl shadow-slate-900/10 border border-slate-200 ${borderAccent} transition-all duration-300 animate-slide-in flex flex-col gap-2.5`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${badgeBg} shrink-0`}>
                  {icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 leading-tight">
                      {event.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-semibold">
                      Live
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(event.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Tutup Notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {event.message}
            </p>

            {event.linkTab && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAction(toast)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xs shadow-blue-500/20 transition-all"
                >
                  <span>Tindak Lanjuti</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
