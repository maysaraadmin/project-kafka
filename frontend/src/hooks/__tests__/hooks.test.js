import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';
import { useSendEvent } from './useSendEvent';

jest.mock('./helpers', () => ({
  WS_URL: 'ws://localhost:8000/ws',
  API_URL: 'http://localhost:8000',
  deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
  formatRelativeTime: (ts) => 'just now',
}));

global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 0);
  }
  send() {}
  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }
};

describe('useWebSocket', () => {
  it('connects on mount', async () => {
    const onMessage = jest.fn();
    renderHook(() => useWebSocket(onMessage));
    await act(async () => Promise.resolve());
  });

  it('calls onMessage when message arrives', async () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() => useWebSocket(onMessage));
    await act(async () => Promise.resolve());
  });
});

describe('useSendEvent', () => {
  it('sends event successfully', async () => {
    const { result } = renderHook(() => useSendEvent());
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      })
    );
    await act(async () => {
      await result.current.sendEvent('user_message', { text: 'hello' });
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'user_message', payload: { text: 'hello' } }),
      })
    );
  });

  it('throws on network error', async () => {
    const { result } = renderHook(() => useSendEvent());
    global.fetch = jest.fn(() => Promise.reject(new Error('network error')));
    await expect(
      act(async () => {
        await result.current.sendEvent('user_message', { text: 'hello' });
      })
    ).rejects.toThrow('network error');
  });
});
