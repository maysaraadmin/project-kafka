import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../utils/helpers';

export function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
      wsRef.current.close();
    }

    const ws = new WebSocket(WS_URL);
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
      if (mountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };
  }, [onMessage]);

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
