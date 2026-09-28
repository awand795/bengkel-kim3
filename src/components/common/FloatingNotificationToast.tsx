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
  const { currentRole, authUser, setActiveTab } = useAppStore();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((event) => {
      // Role matching check
      const isRoleTarget =
        event.targetRoles.includes('ALL') ||
        event.targetRoles.includes(currentRole as NotificationRole);

      if (!isRoleTarget) return;

      // User-specific targeting check (e.g. specific PIC or customer)
      if (event.targetUserEmail && authUser?.email && event.targetUserEmail.toLowerCase() !== authUser.email.toLowerCase()) {
        return;
      }
      if (event.targetUserId && authUser?.id && event.targetUserId !== authUser.id) {
        return;
      }

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
  }, [currentRole, authUser]);

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

        let badgeBg = 'bg-status-blue-bg text-status-blue border border-status-blue/30';
        let icon = <Info className="w-5 h-5 text-status-blue" />;
        let borderAccent = 'border-l-4 border-l-status-blue';

        if (urgency === 'urgent') {
          badgeBg = 'bg-status-red-bg text-status-red border border-status-red/30';
          icon = <AlertTriangle className="w-5 h-5 text-status-red" />;
          borderAccent = 'border-l-4 border-l-status-red';
        } else if (urgency === 'warning') {
          badgeBg = 'bg-status-amber-bg text-status-amber border border-status-amber/30';
          icon = <Clock className="w-5 h-5 text-status-amber" />;
          borderAccent = 'border-l-4 border-l-status-amber';
        } else if (urgency === 'success') {
          badgeBg = 'bg-status-green-bg text-status-green border border-status-green/30';
          icon = <CheckCircle2 className="w-5 h-5 text-status-green" />;
          borderAccent = 'border-l-4 border-l-status-green';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-surface-raised rounded-2xl p-4 shadow-xl border border-border ${borderAccent} transition-all duration-300 animate-slide-in flex flex-col gap-2.5`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${badgeBg} shrink-0`}>
                  {icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-ink leading-tight">
                      {event.title}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-surface text-ink-subtle text-xs font-semibold border border-border">
                      Live
                    </span>
                  </div>
                  <span className="text-xs text-ink-subtle">
                    {new Date(event.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="p-1 text-ink-subtle hover:text-ink hover:bg-surface rounded-lg transition-colors cursor-pointer"
                title="Tutup Notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink-muted font-medium leading-relaxed">
              {event.message}
            </p>

            {event.linkTab && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAction(toast)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
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
