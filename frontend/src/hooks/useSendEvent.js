import { useCallback } from 'react';
import { API_URL } from '../utils/helpers';

export function useSendEvent(token) {
  const sendEvent = useCallback(async (type, payload) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, payload }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return true;
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw e;
    }
  }, [token]);

  return { sendEvent };
}
