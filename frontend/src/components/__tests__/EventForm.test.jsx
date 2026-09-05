import React from 'react';
import { render, screen } from '@testing-library/react';
import { EventForm } from './EventForm';

jest.mock('./useSendEvent', () => ({
  useSendEvent: () => ({
    sendEvent: jest.fn().mockResolvedValue(true),
  }),
}));

describe('EventForm', () => {
  it('renders input and button', () => {
    render(<EventForm onSend={() => {}} error={null} setError={() => {}} />);
    expect(screen.getByPlaceholderText('Type an event...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('submits event', async () => {
    const onSend = jest.fn();
    render(<EventForm onSend={onSend} error={null} setError={() => {}} />);
    const input = screen.getByPlaceholderText('Type an event...');
    const button = screen.getByRole('button', { name: /send/i });

    input.value = 'hello';
    button.click();

    expect(await screen.findByText(/Sending/)).toBeInTheDocument();
  });
});
