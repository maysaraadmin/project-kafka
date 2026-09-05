import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventItem } from './Common';
import { EventFeed } from './EventFeed';
import { ConnectionStatus } from './Common';

jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, height }) => (
    <div data-testid="virtual-list" style={{ height }}>
      {Array.from({ length: itemCount }).map((_, i) => children({ index: i, style: {} }))}
    </div>
  ),
}));

describe('EventItem', () => {
  it('renders event type and payload', () => {
    render(<EventItem event={{ type: 'user_message', payload: { text: 'hello' }, timestamp: Date.now() }} />);
    expect(screen.getByText('user_message')).toBeInTheDocument();
    expect(screen.getByText(/"hello"/)).toBeInTheDocument();
  });

  it('shows expand/collapse for long payloads', () => {
    const longPayload = { text: 'x'.repeat(200) };
    render(<EventItem event={{ type: 'click', payload: longPayload, timestamp: Date.now() }} />);
    expect(screen.getByText('Click to expand')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Click to collapse')).toBeInTheDocument();
  });
});

describe('EventFeed', () => {
  it('shows empty state when no events', () => {
    render(<EventFeed events={[]} />);
    expect(screen.getByText(/No events yet/)).toBeInTheDocument();
  });

  it('renders virtualized list when events exist', () => {
    const events = [{ type: 'order', payload: { id: 1 }, _clientId: '1', timestamp: Date.now() }];
    render(<EventFeed events={events} />);
    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });
});

describe('ConnectionStatus', () => {
  it('shows connected state', () => {
    render(<ConnectionStatus connected={true} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows disconnected state', () => {
    render(<ConnectionStatus connected={false} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });
});
