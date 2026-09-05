import React, { useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useSendEvent } from './hooks/useSendEvent';
import { deepClone } from './utils/helpers';
import { ConnectionStatus, ErrorBanner } from './components/Common';
import { EventForm } from './components/EventForm';
import { EventFeed } from './components/EventFeed';

function App() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { sendEvent } = useSendEvent();

  const handleMessage = useCallback((newEvent) => {
    setEvents((prev) => {
      const entry = deepClone(newEvent);
      entry._clientId = `${Date.now()}-${Math.random()}`;
      return [entry, ...prev].slice(0, 50);
    });
  }, []);

  const { connected } = useWebSocket(handleMessage);

  const handleSend = useCallback(() => {
    setError(null);
  }, []);

  const filteredEvents = events
    .filter((ev) => filter === 'all' || ev.type === filter)
    .filter((ev) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        ev.type.toLowerCase().includes(q) ||
        JSON.stringify(ev.payload).toLowerCase().includes(q)
      );
    });

  return (
    <div className="app-container" style={{
      maxWidth: 720,
      margin: '0 auto',
      padding: '24px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div className="header-row" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          Live Activity Feed
        </h1>
        <ConnectionStatus connected={connected} />
      </div>
      <ErrorBanner error={error} />
      <EventForm onSend={handleSend} error={error} setError={setError} />
      <div className="filter-row" style={{
        display: 'flex',
        gap: 8,
        marginTop: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <label style={{ fontSize: 13, color: '#64748b' }}>Filter:</label>
        {['all', 'user_message', 'system', 'order', 'click'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            style={{
              padding: '4px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: 999,
              background: filter === type ? '#2563eb' : '#fff',
              color: filter === type ? '#fff' : '#334155',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {type}
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events..."
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: 999,
            fontSize: 12,
            minWidth: 140,
          }}
        />
      </div>
      <EventFeed events={filteredEvents} />
    </div>
  );
}

export default App;
