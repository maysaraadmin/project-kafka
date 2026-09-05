import React, { useState } from 'react';
import { formatRelativeTime } from '../utils/helpers';

const TYPE_COLORS = {
  user_message: '#2563eb',
  system: '#dc2626',
  order: '#16a34a',
  click: '#9333ea',
};

export function ConnectionStatus({ connected }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 999,
      background: connected ? '#dcfce7' : '#fee2e2',
      color: connected ? '#166534' : '#991b1b',
      fontSize: 12,
      fontWeight: 500,
    }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: connected ? '#22c55e' : '#ef4444',
      }} />
      {connected ? 'Connected' : 'Disconnected'}
    </div>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div style={{
      padding: '8px 16px',
      margin: '8px 0',
      borderRadius: 6,
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#b91c1c',
      fontSize: 13,
    }}>
      {error}
    </div>
  );
}

export function EventItem({ event }) {
  const [expanded, setExpanded] = useState(false);
  const time = formatRelativeTime(event.timestamp || Date.now());
  const payloadStr = JSON.stringify(event.payload, null, 2);
  const isLong = payloadStr.length > 120;

  return (
    <div style={{
      padding: '10px 12px',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      cursor: isLong ? 'pointer' : 'default',
    }}
      onClick={() => isLong && setExpanded(!expanded)}
      role={isLong ? 'button' : undefined}
      tabIndex={isLong ? 0 : undefined}
      onKeyDown={(e) => isLong && e.key === 'Enter' && setExpanded(!expanded)}
    >
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 4,
        background: TYPE_COLORS[event.type] || '#64748b',
        color: '#fff',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {event.type}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <pre style={{
          margin: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          color: '#334155',
          whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
          overflow: expanded ? 'visible' : 'hidden',
          textOverflow: expanded ? 'clip' : 'ellipsis',
          wordBreak: 'break-word',
        }}>
          {expanded ? payloadStr : JSON.stringify(event.payload)}
        </pre>
        {isLong && (
          <span style={{ fontSize: 11, color: '#2563eb', marginTop: 4, display: 'inline-block' }}>
            {expanded ? 'Click to collapse' : 'Click to expand'}
          </span>
        )}
      </div>
      <span style={{
        fontSize: 11,
        color: '#94a3b8',
        whiteSpace: 'nowrap',
      }}>
        {time}
      </span>
    </div>
  );
}
