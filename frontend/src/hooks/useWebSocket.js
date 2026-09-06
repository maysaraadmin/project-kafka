import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../utils/helpers';

const RECONNECT_BASE_DELAY = 3000;
const RECONNECT_MAX_DELAY = 30000;

function getReconnectDelay(attempt) {
  const exponential = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, attempt), RECONNECT_MAX_DELAY);
  const jitter = Math.random() * 1000;
  return exponential + jitter;
}

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
  const reconnectAttemptRef = useRef(0);

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
      reconnectAttemptRef.current = 0;
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
        const attempt = reconnectAttemptRef.current;
        reconnectAttemptRef.current = attempt + 1;
        const delay = getReconnectDelay(attempt);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
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
