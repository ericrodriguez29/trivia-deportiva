// Real-time synchronization layer with Dual-Transport:
// 1. WebSocket with silent graceful fallback
// 2. Server-Sent Events (SSE) + REST API (/api/action)
// 3. Local BroadcastChannel for instant multi-tab sync

export type RealtimeCallback = (data: any) => void;

class RealtimeManager {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private bc: BroadcastChannel | null = null;
  private listeners: Set<RealtimeCallback> = new Set();
  private currentPin: string = '';
  private currentRole: 'host' | 'player' = 'player';
  private currentPlayerId: string = '';
  private pollInterval: number | null = null;

  constructor() {
    this.setupBroadcastChannel();
  }

  private setupBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.bc = new BroadcastChannel('trivia_live_channel');
        this.bc.onmessage = (event) => {
          if (event.data) {
            this.notifyListeners(event.data);
          }
        };
      }
    } catch {
      // ignore
    }
  }

  public subscribe(callback: RealtimeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(data: any) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch {
        // ignore listener error
      }
    });
  }

  public connect(pin: string, playerId: string, role: 'host' | 'player') {
    this.currentPin = pin;
    this.currentPlayerId = playerId;
    this.currentRole = role;

    this.disconnect();

    // 1. Connect SSE (Rock solid over any HTTP proxy/Cloud Run)
    try {
      if (typeof window !== 'undefined' && pin) {
        const sseUrl = `/api/events?pin=${encodeURIComponent(pin)}&playerId=${encodeURIComponent(playerId || 'guest')}`;
        this.sse = new EventSource(sseUrl);

        this.sse.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.notifyListeners(data);
          } catch {
            // ignore parse error
          }
        };

        this.sse.onerror = () => {
          // SSE reconnects automatically
        };
      }
    } catch {
      // ignore
    }

    // 2. Try WebSocket without logging errors to console
    try {
      if (typeof window !== 'undefined' && pin) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        this.ws = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'RECONNECT',
            payload: { pin, playerId, isHost: role === 'host' }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.notifyListeners(data);
          } catch {
            // ignore
          }
        };

        // Suppress top level error reporting
        ws.onerror = () => {
          // silent fallback to SSE and REST
        };
      }
    } catch {
      // silent
    }

    // 3. Fallback Poll every 3 seconds to guarantee fresh state
    if (typeof window !== 'undefined' && pin) {
      this.pollInterval = window.setInterval(async () => {
        try {
          const res = await fetch(`/api/room/${encodeURIComponent(pin)}`);
          if (res.ok) {
            const json = await res.json();
            if (json.room) {
              this.notifyListeners({ type: 'ROOM_STATE', room: json.room });
            }
          }
        } catch {
          // ignore
        }
      }, 3000);
    }
  }

  public async sendAction(type: string, payload: any): Promise<any> {
    // Sync locally across tabs immediately
    if (this.bc) {
      try {
        if (type === 'SEND_REACTION') {
          this.bc.postMessage({
            type: 'FLOATING_REACTION',
            reaction: {
              id: 'rx_bc_' + Date.now(),
              emoji: payload.emoji || '🔥',
              senderName: payload.playerName || 'Participante',
              senderAvatar: payload.playerAvatar || '✨',
              x: 15 + Math.random() * 70
            }
          });
        }
      } catch {
        // ignore
      }
    }

    // 1. If WebSocket is open and ready, send through it
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, payload }));
      } catch {
        // fallback to fetch
      }
    }

    // 2. Always POST to REST API for guaranteed delivery & state update
    try {
      const response = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return { success: false, error: errJson.error || 'Error al procesar la acción' };
      }

      const data = await response.json();
      if (data.data?.room) {
        this.notifyListeners({ type: 'ROOM_STATE', room: data.data.room });
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión' };
    }
  }

  public disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    if (this.sse) {
      try {
        this.sse.close();
      } catch {
        // ignore
      }
      this.sse = null;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

export const realtime = new RealtimeManager();
