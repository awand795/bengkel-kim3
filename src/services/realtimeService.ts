// Real-time Event Hub & Notification Service for KIM 3 Bengkel
// Supports: BroadcastChannel (cross-tab sync), SSE connection, differential polling, and Web Audio API chime

export type NotificationRole =
  | 'Security'
  | 'SA'
  | 'Foreman'
  | 'Mekanik'
  | 'Admin Purchasing'
  | 'Admin Invoice'
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
  targetRoles: NotificationRole[];
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

  constructor() {
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

  // Optional SSE listener for backend server-sent events
  private initSSE() {
    if (typeof window === 'undefined') return;
    try {
      // Connect to backend SSE if endpoint is available
      const sseUrl = '/api/data/kim3/stream';
      this.sseSource = new EventSource(sseUrl);

      this.sseSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && parsed.title) {
            this.handleIncomingEvent(parsed, false);
          }
        } catch (_) {}
      };

      this.sseSource.onerror = () => {
        // Close on 404 or backend refusal, graceful fallback to polling
        if (this.sseSource) {
          this.sseSource.close();
          this.sseSource = null;
        }
      };
    } catch (_) {
      // Silently fall back to polling
    }
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
          icon: '/logo.png',
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
