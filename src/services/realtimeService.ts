// Real-time Event Hub & Notification Service for KIM 3 Bengkel
// Supports: BroadcastChannel (cross-tab sync), SSE connection, differential polling, and Web Audio API chime

export type NotificationRole =
  | 'Security'
  | 'SA'
  | 'Foreman'
  | 'Mekanik'
  | 'Admin Purchasing'
  | 'Admin Invoice'
  | 'Warehouse'
  | 'PIC Terkait'
  | 'Customer Fleet'
  | 'ALL';

export type EventType =
  | 'BOOKING_CREATED'
  | 'VEHICLE_CHECKED_IN'
  | 'SPK_CREATED'
  | 'PART_REQUESTED'
  | 'PURCHASE_REQUEST_CREATED'
  | 'PART_READY'
  | 'PART_HANDED_OVER'
  | 'SPK_STATUS_CHANGED'
  | 'QC_PASSED'
  | 'INVOICE_PAID'
  | 'MEMO_TERBIT'
  | 'VEHICLE_CHECKED_OUT'
  | 'KUNJUNGAN_ARRIVED'
  | 'KUNJUNGAN_CONFIRMED'
  | 'TAMBAHAN_PEKERJAAN';

export interface RealtimeEvent {
  id: string;
  type: EventType;
  targetRoles?: NotificationRole[];
  targetUserId?: number;
  id_pengguna?: number;
  targetUserEmail?: string;
  targetPelangganId?: number | null;
  title: string;
  message: string;
  timestamp: string;
  linkTab?: string;
  urgency?: 'urgent' | 'warning' | 'info' | 'success';
  meta?: Record<string, any>;
}

type EventCallback = (event: RealtimeEvent) => void;

class RealtimeNotificationHub {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<EventCallback> = new Set();
  private eventHistory: RealtimeEvent[] = [];
  private sseSource: EventSource | null = null;
  private isAudioUnlocked = false;
  private streamIntervalId: any = null;
  private lastKnownNotifIds: Set<number> = new Set();
  private isStreaming = false;

  private loadKnownNotifIds(): Set<number> {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const raw = sessionStorage.getItem('bengkel_known_notif_ids');
        return raw ? new Set(JSON.parse(raw)) : new Set();
      }
    } catch {}
    return new Set();
  }

  private saveKnownNotifIds() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const arr = Array.from(this.lastKnownNotifIds).slice(-300);
        sessionStorage.setItem('bengkel_known_notif_ids', JSON.stringify(arr));
      }
    } catch {}
  }

  constructor() {
    this.lastKnownNotifIds = this.loadKnownNotifIds();
    this.initBroadcastChannel();
    this.setupAudioUnlocker();
    this.initSSE();
  }

  // Cross-tab communication via BroadcastChannel
  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('bengkel_kim3_realtime_hub');
        this.channel.onmessage = (event) => {
          if (event.data && event.data.type) {
            this.handleIncomingEvent(event.data, false);
          }
        };
      } catch (err) {
        console.warn('[RealtimeHub] BroadcastChannel unavailable:', err);
      }
    }
  }

  // Unlock audio on first user click anywhere on page
  private setupAudioUnlocker() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.isAudioUnlocked = true;
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  // SSE listener with seamless differential stream fallback
  private initSSE() {
    if (typeof window === 'undefined') return;
    try {
      const sseUrl = '/api/data/kim3/stream';
      this.sseSource = new EventSource(sseUrl);

      this.sseSource.onopen = () => {
        // SSE connected natively
        if (this.streamIntervalId) {
          clearInterval(this.streamIntervalId);
          this.streamIntervalId = null;
        }
      };

      this.sseSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && parsed.title) {
            this.handleIncomingEvent(parsed, false);
          }
        } catch (_) {}
      };

      this.sseSource.onerror = () => {
        // Close on 404 or backend refusal, graceful fallback to active differential streaming
        if (this.sseSource) {
          this.sseSource.close();
          this.sseSource = null;
        }
        this.startDifferentialStream();
      };
    } catch (_) {
      this.startDifferentialStream();
    }
  }

  // Active Differential Real-time Streaming Engine
  // Emulates live server push by continuously listening to new database notifications & dispatching events
  public startDifferentialStream() {
    if (this.streamIntervalId || typeof window === 'undefined') return;
    this.isStreaming = true;

    const streamPulse = async () => {
      try {
        const { api } = await import('../api/client');
        const notifs = await api.getNotifikasi();
        if (Array.isArray(notifs) && notifs.length > 0) {
          if (this.lastKnownNotifIds.size === 0) {
            // First run: seed existing IDs so we only alert on NEW incoming items
            notifs.forEach((n) => this.lastKnownNotifIds.add(n.id));
            this.saveKnownNotifIds();
            return;
          }

          // Detect new arrivals
          const incoming = notifs.filter((n) => !this.lastKnownNotifIds.has(n.id));
          if (incoming.length > 0) {
            incoming.forEach((n) => this.lastKnownNotifIds.add(n.id));
            this.saveKnownNotifIds();
          }

          incoming.forEach((n) => {
            // Infer event type from notification title & link_tab
            let evtType: EventType = 'SPK_STATUS_CHANGED';
            const titleLower = (n.title || '').toLowerCase();
            const linkTab = n.link_tab || '';

            if (titleLower.includes('booking') || linkTab.includes('booking')) {
              evtType = 'BOOKING_CREATED';
            } else if (titleLower.includes('check-in') || titleLower.includes('check in') || titleLower.includes('masuk')) {
              evtType = 'VEHICLE_CHECKED_IN';
            } else if (titleLower.includes('check-out') || titleLower.includes('check out') || titleLower.includes('keluar')) {
              evtType = 'VEHICLE_CHECKED_OUT';
            } else if (titleLower.includes('memo')) {
              evtType = 'MEMO_TERBIT';
            }

            const targetRoles: NotificationRole[] = linkTab.startsWith('security-')
              ? ['Security']
              : ['ALL'];

            const syntheticEvent: RealtimeEvent = {
              id: `notif-${n.id}`,
              type: evtType,
              targetRoles,
              title: n.title,
              message: n.pesan,
              linkTab: n.link_tab,
              urgency: (n.urgency as any) || 'info',
              timestamp: String(n.created_at || new Date().toISOString()),
            };

            this.handleIncomingEvent(syntheticEvent, false);
          });
        }
      } catch (err) {
        // Silent error to prevent UI disturbance
      }
    };

    // First check after 1s, then active stream interval every 3.5s
    setTimeout(streamPulse, 1000);
    this.streamIntervalId = setInterval(streamPulse, 3500);

    // Instant pulse on tab focus
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        streamPulse();
      }
    });
  }

  // Play audio chime synthesized with Web Audio API (no external MP3 asset needed!)
  public playChime(urgency: 'urgent' | 'warning' | 'info' | 'success' = 'info') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      if (urgency === 'urgent') {
        // High alert two-tone
        osc1.frequency.setValueAtTime(659.25, now); // E5
        osc1.frequency.setValueAtTime(880.0, now + 0.12); // A5
        osc2.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
      } else if (urgency === 'success') {
        // Ascending major chord (C - E - G)
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.frequency.setValueAtTime(659.25, now + 0.1);
        osc1.frequency.setValueAtTime(783.99, now + 0.2);
        osc2.frequency.setValueAtTime(392.0, now);
      } else {
        // Pleasant bell chime
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.setValueAtTime(880.0, now + 0.12); // A5
        osc2.frequency.setValueAtTime(440.0, now); // A4
      }

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch (e) {
      // Audio might be suppressed by browser autoplay policy
    }
  }

  // Subscribe to real-time events
  public subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Publish / Dispatch event locally and across tabs
  public publish(event: Omit<RealtimeEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) {
    const fullEvent: RealtimeEvent = {
      id: event.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: event.timestamp || new Date().toISOString(),
      ...event,
    };

    // Broadcast across browser tabs
    if (this.channel) {
      try {
        this.channel.postMessage(fullEvent);
      } catch (err) {
        console.warn('[RealtimeHub] postMessage error:', err);
      }
    }

    // Persist ke database backend agar tersimpan di lonceng notifikasi:
    // - Jika ditargetkan untuk Security (linkTab 'security-*' atau targetRoles 'Security'), id_pengguna harus null
    //   karena user Security ada di sch_pos.tbl_pengguna (bukan foreign key sch_fleet.pengguna).
    //   link_tab 'security-*' akan otomatis difilter di NotificationDropdown agar HANYA tampil untuk role Security.
    // - Jika ditargetkan untuk Customer Fleet tertentu, gunakan id_pengguna / targetUserId.
    if (typeof window !== 'undefined') {
      const isSecurityTarget =
        event.targetRoles?.includes('Security') ||
        Boolean(event.linkTab && event.linkTab.startsWith('security-'));

      const targetUserId = isSecurityTarget ? null : (event.id_pengguna ?? event.targetUserId ?? null);
      const linkTab = event.linkTab || (isSecurityTarget ? 'security-booking' : undefined);

      import('../api/client').then(({ api }) => {
        api.kirimNotifikasi({
          id_pengguna: targetUserId,
          title: event.title,
          pesan: event.message,
          link_tab: linkTab,
          urgency: event.urgency || 'info',
        }).catch((err) => {
          console.warn('[RealtimeHub] kirimNotifikasi error:', err);
        });
      }).catch(() => {});
    }

    // Process in current tab
    this.handleIncomingEvent(fullEvent, true);
  }

  private handleIncomingEvent(event: RealtimeEvent, isOriginTab: boolean) {
    // Prevent duplicate processing
    if (this.eventHistory.some((e) => e.id === event.id)) return;
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 50) this.eventHistory.pop();

    // Play sound chime
    this.playChime(event.urgency || 'info');

    // Notify registered UI listeners (Toasts, Dropdown, etc.)
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error('[RealtimeHub] Listener error:', err);
      }
    });

    // Optional browser native notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(event.title, {
          body: event.message,
          icon: '/master-truck-logo.png',
        });
      } catch (_) {}
    }
  }

  public getHistory(): RealtimeEvent[] {
    return [...this.eventHistory];
  }
}

// Singleton instance
export const realtimeHub = new RealtimeNotificationHub();

export interface CustomerNotifOpts {
  title: string;
  message: string;
  linkTab?: string;
  urgency?: 'urgent' | 'warning' | 'info' | 'success';
  type?: EventType;
  /** Plat kendaraan: dipakai resolve tenant bila userId/pelangganId tak diberikan. */
  noPolisi?: string;
  /** Bila sudah diketahui (mis. dari baris SPK/invoice), langsung dipakai. */
  userId?: number;
  pelangganId?: number | null;
}

/**
 * Kirim notifikasi ke customer PEMILIK SAJA (anti-bocor antar akun).
 * Resolusi tenant by plat via /kim3/kendaraan-cari-pemilik bila perlu.
 * Tidak mengirim apa pun bila pemilik tak ditemukan (return false).
 */
export const publishKeCustomer = async (opts: CustomerNotifOpts): Promise<boolean> => {
  const userId = opts.userId;
  const pelangganId = opts.pelangganId ?? null;
  if (userId == null && pelangganId == null) return false;
  realtimeHub.publish({
    type: opts.type || 'SPK_STATUS_CHANGED',
    targetRoles: ['Customer Fleet'],
    targetUserId: userId,
    targetPelangganId: pelangganId,
    title: opts.title,
    message: opts.message,
    linkTab: opts.linkTab,
    urgency: opts.urgency || 'info',
  });
  return true;
};
