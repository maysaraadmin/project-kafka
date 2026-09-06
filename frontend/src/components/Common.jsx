import React, { useState } from 'react';
import { formatRelativeTime } from '../utils/helpers';
import { theme } from '../styles/theme';

const TYPE_COLORS = {
  user_message: theme.colors.primary,
  system: theme.colors.danger,
  order: theme.colors.success,
  click: theme.colors.purple,
};

export function ConnectionStatus({ connected }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: `${theme.spacing.xs} ${theme.spacing.md}`,
      borderRadius: theme.radii.full,
      background: connected ? theme.colors.green[50] : theme.colors.red[100],
      color: connected ? theme.colors.green[800] : theme.colors.red[800],
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: connected ? theme.colors.green[500] : theme.colors.red[500],
      }} />
      {connected ? 'Connected' : 'Disconnected'}
    </div>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div style={{
      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
      margin: `${theme.spacing.sm} 0`,
      borderRadius: theme.radii.sm,
      background: theme.colors.red[50],
      border: `1px solid ${theme.colors.red[200]}`,
      color: theme.colors.red[700],
      fontSize: theme.typography.fontSize.md,
    }}>
      {error}
    </div>
  );
}

export function EventItem({ event }) {
  const [expanded, setExpanded] = useState(false);
  const time = formatRelativeTime(event.timestamp || Date.now());
  const payload = event.payload || {};
  const payloadStr = JSON.stringify(payload, null, 2);
  const isLong = payloadStr.length > 120;

  return (
    <div style={{
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      borderBottom: `1px solid ${theme.colors.gray[100]}`,
      display: 'flex',
      gap: theme.spacing.md,
      alignItems: 'flex-start',
      cursor: isLong ? 'pointer' : 'default',
    }}
      onClick={() => isLong && setExpanded(!expanded)}
      role={isLong ? 'button' : undefined}
      tabIndex={isLong ? 0 : undefined}
      onKeyDown={(e) => isLong && e.key === 'Enter' && setExpanded(!expanded)}
    >
      <span style={{
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.semibold,
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        borderRadius: theme.radii.sm,
        background: TYPE_COLORS[event.type] || theme.colors.gray[500],
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
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.gray[600],
          whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
          overflow: expanded ? 'visible' : 'hidden',
          textOverflow: expanded ? 'clip' : 'ellipsis',
          wordBreak: 'break-word',
        }}>
          {expanded ? payloadStr : JSON.stringify(payload)}
        </pre>
        {isLong && (
          <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.primary, marginTop: theme.spacing.sm, display: 'inline-block' }}>
            {expanded ? 'Click to collapse' : 'Click to expand'}
          </span>
        )}
      </div>
      <span style={{
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.gray[400],
        whiteSpace: 'nowrap',
      }}>
        {time}
      </span>
    </div>
  );
}
