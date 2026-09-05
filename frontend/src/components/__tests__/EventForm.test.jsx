import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventForm } from '../EventForm';
import { useSendEvent } from '../../hooks/useSendEvent';

jest.mock('../../hooks/useSendEvent', () => ({
  useSendEvent: jest.fn(),
}));

describe('EventForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders input and button', () => {
    useSendEvent.mockReturnValue({ sendEvent: jest.fn() });
    render(<EventForm token="token" onSend={() => {}} error={null} setError={() => {}} />);
    expect(screen.getByPlaceholderText('Type an event...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('submits event', async () => {
    const onSend = jest.fn();
    const sendEvent = jest.fn().mockImplementation(() => new Promise(() => {}));
    useSendEvent.mockReturnValue({ sendEvent });
    render(<EventForm token="token" onSend={onSend} error={null} setError={() => {}} />);
    const input = screen.getByPlaceholderText('Type an event...');
    const button = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(button);

    expect(await screen.findByText(/Sending/)).toBeInTheDocument();
    expect(sendEvent).toHaveBeenCalledWith(
      'user_message',
      expect.objectContaining({ text: 'hello' })
    );
  });
});
