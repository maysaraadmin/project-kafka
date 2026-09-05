const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsHost = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
export const WS_URL = process.env.REACT_APP_WS_URL || `${wsProtocol}://${wsHost}/ws`;
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function deepClone(obj) {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

export function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}
