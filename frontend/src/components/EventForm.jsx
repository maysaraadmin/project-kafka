import React, { useState } from 'react';
import { useSendEvent } from '../hooks/useSendEvent';
import { ErrorBanner } from './Common';

export function EventForm({ onSend, error, setError }) {
  const { sendEvent } = useSendEvent();
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
        gap: 8,
        marginTop: 12,
      }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type an event..."
          disabled={sending}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={sending}
          style={{
            padding: '8px 16px',
            background: sending ? '#94a3b8' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
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
