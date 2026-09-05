import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

function App() {
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket('ws://localhost:8000/ws');
    wsRef.current = ws;
    setConnected(false);

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const newEvent = JSON.parse(event.data);
        setEvents(prev => {
          const entry = { ...newEvent, _clientId: `${Date.now()}-${Math.random()}` };
          return [entry, ...prev].slice(0, 50);
        });
      } catch (e) {
        setError('Received invalid event data');
      }
    };

    ws.onerror = () => {
      setError('WebSocket error');
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    };
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const sendEvent = async (type, payload) => {
    try {
      const response = await fetch('http://localhost:8000/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
    } catch (e) {
      setError('Failed to send event');
      console.error(e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed) {
      sendEvent('user_message', { text: trimmed, timestamp: Date.now() });
      setMessage('');
      setError(null);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Live Activity Feed</h1>
      <div>Status: {connected ? 'Connected' : 'Disconnected'}</div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type an event..."
        />
        <button type="submit">Send</button>
      </form>
      <div style={{ marginTop: 20 }}>
        {events.map((ev) => (
          <div key={ev._clientId} style={{ borderBottom: '1px solid #ccc', padding: 8 }}>
            <strong>{ev.type}</strong> {JSON.stringify(ev.payload)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
