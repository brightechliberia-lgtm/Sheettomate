import { useEffect, useRef } from 'react';
import { getAccessToken } from './api';

export function useRealtime(onEvent: (data: { type?: string }) => void) {
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let ws: WebSocket | null = null;
    let poll: number | undefined;
    try {
      ws = new WebSocket(`${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`);
      ws.onmessage = (ev) => {
        try {
          cb.current(JSON.parse(String(ev.data)) as { type?: string });
        } catch {
          /* ignore */
        }
      };
      ws.onerror = () => {
        ws?.close();
      };
    } catch {
      /* polling fallback */
    }
    poll = window.setInterval(() => cb.current({ type: 'poll' }), 20_000);
    return () => {
      ws?.close();
      if (poll) window.clearInterval(poll);
    };
  }, []);
}
