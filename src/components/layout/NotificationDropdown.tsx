import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  ChevronRight,
  CheckCheck,
  Check,
  Inbox,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { realtimeHub, RealtimeEvent } from '../../services/realtimeService';
import { toast } from '../common/Toast';
import { Notifikasi } from '../../types';

// Helper to format ISO or SQL timestamp to Indonesian relative or friendly string
function formatNotificationTime(dateStr?: string | null): string {
  if (!dateStr) return 'Baru saja';
  try {
    const date = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  } catch {
    return dateStr;
  }
}

export const NotificationDropdown: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentRole, authUser, setActiveTab } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Real Database Notifications via API
  const { data: notifikasiList = [], isLoading } = useQuery({
    queryKey: ['notifikasi-list'],
    queryFn: api.getNotifikasi,
    refetchInterval: 4000,
  });

  // 2. Mark Single Notification as Read
  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.tandaiNotifikasiBaca(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifikasi-list'] });
    },
    onError: (err: any) => {
      console.warn('Gagal menandai notifikasi dibaca:', err);
    },
  });

  // 3. Mark All Notifications as Read (Facebook Style)
  const markAllReadMutation = useMutation({
    mutationFn: () => api.tandaiSemuaNotifikasiBaca(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifikasi-list'] });
      toast.success('Semua notifikasi telah ditandai sudah dibaca.');
    },
    onError: (err: any) => {
      toast.error('Gagal memperbarui notifikasi', err?.message);
    },
  });

  // 3b. Delete Single Notification (milik sendiri / broadcast terlihat)
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.hapusNotifikasi(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notifikasi-list'] });
      if (res?.rows_affected === 0) {
        toast.warning('Notifikasi tidak terhapus', 'Mungkin sudah dihapus atau bukan milik Anda.');
      } else {
        toast.success('Notifikasi dihapus.');
      }
    },
    onError: (err: any) => {
      toast.error('Gagal menghapus notifikasi', err?.message);
    },
  });

  // 4. Real-time Subscription to trigger instant re-fetch & audio alert.
  // Anti-bocor antar akun/tab: event personal hanya untuk user/pelanggan yang dituju,
  // walau role-nya sama (mis. dua akun Customer Fleet di browser yang sama).
  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((evt: RealtimeEvent) => {
      const myId = authUser?.id ?? null;
      const myPelangganId = authUser?.id_pelanggan ?? null;
      let isForMe = false;
      if (evt.targetUserId != null) {
        isForMe = myId != null && evt.targetUserId === myId;
      } else if (evt.targetPelangganId != null) {
        isForMe = myPelangganId != null && evt.targetPelangganId === myPelangganId;
      } else {
        isForMe =
          evt.targetRoles.includes('ALL') ||
          (currentRole != null && evt.targetRoles.includes(currentRole as any));
      }

      if (isForMe) {
        // Play chime sound
        realtimeHub.playChime(evt.urgency || 'info');
        // Instantly re-fetch notifications from database API
        queryClient.invalidateQueries({ queryKey: ['notifikasi-list'] });
      }
    });

    return () => unsubscribe();
  }, [currentRole, authUser, queryClient]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Unread Counts & Filtered Feed
  const unreadItems = useMemo(() => {
    return notifikasiList.filter((n) => !n.is_read);
  }, [notifikasiList]);

  const unreadCount = unreadItems.length;

  const displayedNotifications = useMemo(() => {
    if (filterTab === 'unread') {
      return unreadItems;
    }
    return notifikasiList;
  }, [filterTab, unreadItems, notifikasiList]);

  // Action: Click item -> Mark read & Navigate
  const handleNotificationClick = (item: Notifikasi) => {
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }
    if (item.link_tab) {
      // Role-safe navigation: Customer Fleet can NEVER be routed to internal staff menus!
      if (currentRole === 'Customer Fleet') {
        const safeTab = item.link_tab.startsWith('fleet-') ? item.link_tab : 'fleet-status';
        setActiveTab(safeTab);
      } else if (currentRole === 'Security') {
        const safeTab = item.link_tab.startsWith('security-') ? item.link_tab : 'security-dashboard';
        setActiveTab(safeTab);
      } else {
        setActiveTab(item.link_tab);
      }
    }
    setIsOpen(false);
  };

  const getIcon = (urgency?: string) => {
    switch (urgency) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-status-red" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-status-amber" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-status-green" />;
      case 'info':
      default:
        return <Wrench className="w-4 h-4 text-accent" />;
    }
  };

  const getBadgeColor = (urgency?: string) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-status-red-bg border-status-red/30 text-status-red';
      case 'warning':
        return 'bg-status-amber-bg border-status-amber/30 text-status-amber';
      case 'success':
        return 'bg-status-green-bg border-status-green/30 text-status-green';
      case 'info':
      default:
        return 'bg-accent-subtle border-accent/30 text-accent';
    }
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Bell Button (Facebook Style with Unread Counter Badge) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all cursor-pointer ${
          isOpen
            ? 'bg-accent-subtle text-accent shadow-xs'
            : 'text-ink-muted hover:text-ink hover:bg-surface active:bg-accent-subtle'
        }`}
        title={`Pusat Notifikasi (${unreadCount} belum dibaca)`}
        aria-label="Pusat Notifikasi"
      >
        <Bell className={`w-5 h-5 transition-transform ${unreadCount > 0 ? 'text-ink' : 'text-ink-muted'}`} />

        {/* Facebook-style Red Badge Counter: ONLY SHOWS IF UNREAD > 0 */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[19px] h-[19px] px-1 bg-status-red text-white rounded-full text-[10px] font-black flex items-center justify-center animate-pulse shadow-xs font-mono ring-2 ring-surface">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Facebook-style Dropdown Popover */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-auto sm:mt-2 w-[calc(100vw-16px)] sm:w-[420px] max-w-md max-h-[calc(100vh-85px)] sm:max-h-[520px] flex flex-col bg-surface-raised rounded-xl border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Facebook Header: Title & Mark All as Read */}
          <div className="shrink-0 p-4 border-b border-border bg-surface flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-ink tracking-tight">Notifikasi</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-status-red text-white text-[10px] font-black font-mono">
                    {unreadCount} baru
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-subtle mt-0.5 font-medium">
                Pusat Aktivitas • {currentRole}
              </p>
            </div>

            {/* Mark All as Read Action (Facebook Style) */}
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-accent hover:text-accent-hover hover:underline font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-accent-subtle/50 transition-colors cursor-pointer disabled:opacity-50"
                title="Tandai semua notifikasi sudah dibaca"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Tandai dibaca</span>
              </button>
            ) : (
              <span className="text-[11px] text-ink-subtle flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5 text-status-green" />
                Semua terbaca
              </span>
            )}
          </div>

          {/* Facebook Filter Pills: "Semua" & "Belum Dibaca" */}
          <div className="shrink-0 px-4 py-2.5 border-b border-border bg-surface-raised flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'all'
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-surface text-ink-muted hover:text-ink hover:bg-surface-raised border border-border'
              }`}
            >
              <span>Semua</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  filterTab === 'all' ? 'bg-white/20 text-white' : 'bg-surface-raised text-ink-muted'
                }`}
              >
                {notifikasiList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'unread'
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-surface text-ink-muted hover:text-ink hover:bg-surface-raised border border-border'
              }`}
            >
              <span>Belum Dibaca</span>
              {unreadCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    filterTab === 'unread' ? 'bg-white/20 text-white' : 'bg-status-red text-white'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Facebook Notification Feed (Strictly bounded with smooth scroll) */}
          <div className="flex-1 max-h-[340px] sm:max-h-[380px] overflow-y-auto divide-y divide-border/60 overscroll-contain">
            {isLoading ? (
              <div className="py-10 text-center text-xs text-ink-muted">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Memuat notifikasi...
              </div>
            ) : displayedNotifications.length > 0 ? (
              displayedNotifications.map((item) => {
                const isRead = Boolean(item.is_read);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative group ${
                      !isRead
                        ? 'bg-accent-subtle/35 hover:bg-accent-subtle/60'
                        : 'bg-surface-raised hover:bg-surface'
                    }`}
                  >
                    {/* Urgency / Category Icon Badge */}
                    <div
                      className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${getBadgeColor(
                        item.urgency
                      )}`}
                    >
                      {getIcon(item.urgency)}
                    </div>

                    {/* Notification Body */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-xs leading-snug line-clamp-1 ${
                            !isRead ? 'font-black text-ink' : 'font-semibold text-ink-muted'
                          }`}
                        >
                          {item.title}
                        </span>
                      </div>

                      <p
                        className={`text-[11px] leading-relaxed line-clamp-2 ${
                          !isRead ? 'text-ink font-medium' : 'text-ink-muted'
                        }`}
                      >
                        {item.pesan}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <span className="font-mono text-ink-subtle">
                          {formatNotificationTime(item.created_at)}
                        </span>

                        <span className="font-bold text-accent group-hover:underline flex items-center gap-0.5">
                          <span>Buka</span>
                          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>

                    {/* Aksi item: selalu terlihat (tanpa hover) agar ketahuan di
                        layar sentuh & oleh pengguna lansia. Target sentuh min. 36px. */}
                    <div className="shrink-0 flex items-center self-center pl-1 gap-1">
                      {!isRead ? (
                        <div className="flex items-center gap-1.5">
                          {/* Facebook Blue Indicator Dot */}
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-accent/30 shadow-xs"
                            title="Belum dibaca"
                          />
                          {/* Quick button to mark read */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markReadMutation.mutate(item.id);
                            }}
                            className="min-w-[36px] min-h-[36px] p-2 rounded-full text-ink-subtle hover:text-accent hover:bg-surface active:bg-accent-subtle transition-all sm:opacity-0 sm:group-hover:opacity-100 sm:min-w-0 sm:min-h-0 sm:p-1"
                            title="Tandai sudah dibaca"
                            aria-label="Tandai sudah dibaca"
                          >
                            <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="w-2.5 h-2.5" />
                      )}
                      {/* Delete notification */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Hapus notifikasi "${item.title}"?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="min-w-[36px] min-h-[36px] p-2 rounded-full text-ink-subtle hover:text-status-red hover:bg-status-red-bg active:bg-status-red-bg transition-all"
                        title="Hapus notifikasi ini"
                        aria-label="Hapus notifikasi ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty State */
              <div className="py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-accent-subtle text-accent flex items-center justify-center mx-auto mb-3">
                  {filterTab === 'unread' ? (
                    <CheckCircle2 className="w-6 h-6 text-status-green" />
                  ) : (
                    <Inbox className="w-6 h-6 text-accent" />
                  )}
                </div>
                <h5 className="text-sm font-bold text-ink">
                  {filterTab === 'unread' ? 'Semua Notifikasi Sudah Dibaca' : 'Belum Ada Notifikasi'}
                </h5>
                <p className="text-xs text-ink-subtle mt-1 max-w-xs mx-auto">
                  {filterTab === 'unread'
                    ? 'Bagus! Tidak ada notifikasi baru yang belum Anda baca saat ini.'
                    : 'Pemberitahuan operasional resmi dan alur bengkel akan muncul di sini secara otomatis.'}
                </p>
                {filterTab === 'unread' && notifikasiList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className="mt-3 text-xs text-accent font-bold hover:underline"
                  >
                    Lihat semua riwayat notifikasi ({notifikasiList.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Facebook Footer: Notification Center Status */}
          <div className="shrink-0 p-3 bg-surface border-t border-border flex items-center justify-between text-[11px] text-ink-subtle">
            <span className="font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent" />
              KIM 3 Live Workshop Hub
            </span>
            <span className="font-medium">
              {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua telah dibaca'}
            </span>
          </div>

        </div>
      )}
    </div>
  );
};
