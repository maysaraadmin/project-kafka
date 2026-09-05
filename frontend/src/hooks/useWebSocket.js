import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../utils/helpers';

const RECONNECT_DELAY = 3000;

function buildUrl(token) {
  const sep = WS_URL.includes('?') ? '&' : '?';
  return token ? `${WS_URL}${sep}token=${encodeURIComponent(token)}` : WS_URL;
}

export function useWebSocket(onMessage, token) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!token) {
      setConnected(false);
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
      wsRef.current.close();
    }

    const ws = new WebSocket(buildUrl(token));
    wsRef.current = ws;
    setConnected(false);

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        setError('Received invalid event data');
      }
    };

    ws.onerror = () => {
      setError('WebSocket error');
    };

    ws.onclose = () => {
      setConnected(false);
      if (mountedRef.current && token) {
        reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };
  }, [onMessage, token]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connected, error, wsRef };
}
