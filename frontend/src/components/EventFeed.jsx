import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { EventItem } from './Common';

const ROW_HEIGHT = 56;

export function EventFeed({ events }) {
  return (
    <div style={{
      marginTop: 16,
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#fff',
    }}>
      {events.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: 13,
        }}>
          No events yet. Send one above to see it here.
        </div>
      ) : (
        <List
          height={400}
          itemCount={events.length}
          itemSize={ROW_HEIGHT}
          width="100%"
          overscanCount={5}
          itemKey={(index) => events[index]._clientId}
        >
          {({ index, style }) => {
            const ev = events[index];
            return (
              <div style={style}>
                <EventItem event={ev} />
              </div>
            );
          }}
        </List>
      )}
    </div>
  );
}
