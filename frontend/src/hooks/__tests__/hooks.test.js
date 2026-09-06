import { renderHook, act, fireEvent } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { useSendEvent } from '../useSendEvent';

jest.mock('../../utils/helpers', () => ({
  WS_URL: 'ws://localhost:8000/ws',
  API_URL: 'http://localhost:8000',
  deepClone: (obj) => {
    if (typeof structuredClone === 'function') {
      return structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
  },
  formatRelativeTime: (ts) => 'just now',
}));

global.WebSocket = class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
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
  it('does not connect without a token', async () => {
    const onMessage = jest.fn();
    renderHook(() => useWebSocket(onMessage, null));
    await act(async () => Promise.resolve());
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('connects on mount when a token is present', async () => {
    const onMessage = jest.fn();
    renderHook(() => useWebSocket(onMessage, 'token'));
    await act(async () => Promise.resolve());
  });

  it('calls onMessage when a message arrives', async () => {
    const onMessage = jest.fn();
    const { result } = renderHook(() => useWebSocket(onMessage, 'token'));
    await act(async () => Promise.resolve());
    const ws = result.current.wsRef.current;
    act(() => {
      ws.onmessage({ data: JSON.stringify({ type: 'user_message', payload: { text: 'hi' } }) });
    });
    expect(onMessage).toHaveBeenCalledWith({ type: 'user_message', payload: { text: 'hi' } });
  });
});

describe('useSendEvent', () => {
  it('sends event with auth header successfully', async () => {
    const { result } = renderHook(() => useSendEvent('my-token'));
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
        headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
      })
    );
  });

  it('throws on network error', async () => {
    const { result } = renderHook(() => useSendEvent('my-token'));
    global.fetch = jest.fn(() => Promise.reject(new Error('network error')));
    await expect(
      act(async () => {
        await result.current.sendEvent('user_message', { text: 'hello' });
      })
    ).rejects.toThrow('network error');
  });

  it('sends no auth header when token is missing', async () => {
    const { result } = renderHook(() => useSendEvent(null));
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
    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });
});
