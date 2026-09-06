import React, { useState, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { API_URL } from './utils/helpers';
import { ConnectionStatus, ErrorBanner } from './components/Common';
import { EventForm } from './components/EventForm';
import { EventFeed } from './components/EventFeed';
import { theme } from './styles/theme';

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
      const entry = { ...newEvent, _clientId: `${Date.now()}-${Math.random()}` };
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
    padding: `${theme.spacing.xl} ${theme.spacing.lg}`,
    fontFamily: theme.typography.fontFamily,
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
          <h1 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, margin: 0 }}>Live Activity Feed</h1>
          <ConnectionStatus connected={connected} />
        </div>
        <ErrorBanner error={wsError} />
        <form onSubmit={handleLogin} style={{ marginTop: theme.spacing.lg, display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          <input
            type="text"
            value={loginUser}
            onChange={(e) => setLoginUser(e.target.value)}
            placeholder="Username"
            disabled={loginLoading}
            style={{ padding: `${theme.spacing.sm} ${theme.spacing.md}`, border: `1px solid ${theme.colors.gray[200]}`, borderRadius: theme.radii.sm, fontSize: theme.typography.fontSize.base }}
          />
          <input
            type="password"
            value={loginPass}
            onChange={(e) => setLoginPass(e.target.value)}
            placeholder="Password"
            disabled={loginLoading}
            style={{ padding: `${theme.spacing.sm} ${theme.spacing.md}`, border: `1px solid ${theme.colors.gray[200]}`, borderRadius: theme.radii.sm, fontSize: theme.typography.fontSize.base }}
          />
          <button
            type="submit"
            disabled={loginLoading}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              background: loginLoading ? theme.colors.primaryDisabled : theme.colors.primary,
              color: '#fff',
              border: 'none',
              borderRadius: theme.radii.sm,
              fontSize: theme.typography.fontSize.base,
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
        marginBottom: theme.spacing.sm,
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
      }}>
        <h1 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, margin: 0 }}>
          Live Activity Feed
        </h1>
        <div style={{ display: 'inline-flex', gap: theme.spacing.sm, alignItems: 'center' }}>
          <ConnectionStatus connected={connected} />
          <button
            onClick={handleLogout}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
              border: `1px solid ${theme.colors.gray[200]}`,
              borderRadius: theme.radii.full,
              background: '#fff',
              color: theme.colors.gray[600],
              fontSize: theme.typography.fontSize.sm,
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
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <label style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.gray[500] }}>Filter:</label>
        {['all', 'user_message', 'system', 'order', 'click'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
              border: `1px solid ${theme.colors.gray[200]}`,
              borderRadius: theme.radii.full,
              background: filter === type ? theme.colors.primary : '#fff',
              color: filter === type ? '#fff' : theme.colors.gray[600],
              fontSize: theme.typography.fontSize.sm,
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
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: `1px solid ${theme.colors.gray[200]}`,
            borderRadius: theme.radii.full,
            fontSize: theme.typography.fontSize.sm,
            minWidth: 140,
          }}
        />
      </div>
      <EventFeed events={filteredEvents} />
    </div>
  );
}

export default App;
