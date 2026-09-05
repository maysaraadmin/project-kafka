# ADR 0002: Use WebSockets for real-time UI updates

## Status
Accepted

## Context
The frontend needs to display events as they are produced, without polling.

## Decision
Use FastAPI WebSocket endpoint (`/ws`) to push events to connected clients.

## Consequences
- Pros: Low latency, bidirectional, no polling overhead.
- Cons: Requires connection management, reconnect logic, and scaling considerations (sticky sessions or shared state).

## Alternatives considered
- Server-Sent Events: simpler but unidirectional.
- Polling: easy but wasteful and higher latency.
