import React, { useRef, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { EventItem } from './Common';

const ROW_HEIGHT = 56;

export function EventFeed({ events }) {
  const containerRef = useRef(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const next = Math.max(200, window.innerHeight - rect.top - 40);
        setHeight(prev => next !== prev ? next : prev);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div ref={containerRef} style={{
      marginTop: 16,
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#fff',
      maxHeight: 'calc(100vh - 200px)',
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
          height={height}
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
