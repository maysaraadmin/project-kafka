import React, { useState } from 'react';
import { useSendEvent } from '../hooks/useSendEvent';
import { ErrorBanner } from './Common';
import { theme } from '../styles/theme';

export function EventForm({ onSend, error, setError, token }) {
  const { sendEvent } = useSendEvent(token);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    try {
      const payload = { text: trimmed, timestamp: Date.now() };
      await sendEvent('user_message', payload);
      setMessage('');
      onSend?.();
    } catch (e) {
      setError(e.message || 'Failed to send event');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        display: 'flex',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
      }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type an event..."
          disabled={sending}
          style={{
            flex: 1,
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: `1px solid ${theme.colors.gray[200]}`,
            borderRadius: theme.radii.sm,
            fontSize: theme.typography.fontSize.base,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={sending}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            background: sending ? theme.colors.primaryDisabled : theme.colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: theme.radii.sm,
            fontSize: theme.typography.fontSize.base,
            cursor: sending ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
      <ErrorBanner error={error} />
    </form>
  );
}
