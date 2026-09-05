import React, { useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { deepClone, API_URL } from './utils/helpers';
import { ConnectionStatus, ErrorBanner } from './components/Common';
import { EventForm } from './components/EventForm';
import { EventFeed } from './components/EventFeed';

function App() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null);
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginUser, setLoginUser] = useState('admin');
  const [loginPass, setLoginPass] = useState('');

  const handleMessage = useCallback((newEvent) => {
    setEvents((prev) => {
      const entry = deepClone(newEvent);
      entry._clientId = `${Date.now()}-${Math.random()}`;
      return [entry, ...prev].slice(0, 50);
    });
  }, []);

  const { connected, error: wsError } = useWebSocket(handleMessage, token);

  const handleSend = useCallback(() => {
    setError(null);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setEvents([]);
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

  const containerStyle = {
    maxWidth: 720,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  if (!token) {
    const handleLogin = async (e) => {
      e.preventDefault();
      setLoginLoading(true);
      setLoginError(null);
      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: loginUser, password: loginPass }),
        });
        if (!res.ok) {
          throw new Error(`Invalid credentials (${res.status})`);
        }
        const data = await res.json();
        localStorage.setItem('auth_token', data.access_token);
        setToken(data.access_token);
      } catch (e) {
        setLoginError(e.message || 'Login failed');
      } finally {
        setLoginLoading(false);
      }
    };

    return (
      <div className="app-container" style={containerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Live Activity Feed</h1>
          <ConnectionStatus connected={connected} />
        </div>
        <ErrorBanner error={wsError} />
        <form onSubmit={handleLogin} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            value={loginUser}
            onChange={(e) => setLoginUser(e.target.value)}
            placeholder="Username"
            disabled={loginLoading}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
          />
          <input
            type="password"
            value={loginPass}
            onChange={(e) => setLoginPass(e.target.value)}
            placeholder="Password"
            disabled={loginLoading}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={loginLoading}
            style={{
              padding: '8px 16px',
              background: loginLoading ? '#94a3b8' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              cursor: loginLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {loginLoading ? 'Signing in...' : 'Sign in'}
          </button>
          <ErrorBanner error={loginError} />
        </form>
      </div>
    );
  }

  return (
    <div className="app-container" style={containerStyle}>
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
        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <ConnectionStatus connected={connected} />
          <button
            onClick={handleLogout}
            style={{
              padding: '4px 10px',
              border: '1px solid #e2e8f0',
              borderRadius: 999,
              background: '#fff',
              color: '#334155',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <ErrorBanner error={wsError || error} />
      <EventForm token={token} onSend={handleSend} error={error} setError={setError} />
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
