# Real-time Activity Dashboard

React + FastAPI + Kafka app for streaming live events with WebSockets.

## Architecture

```
React UI -> (POST /events) -> FastAPI -> Kafka topic `events`
                                        |
                                        v
FastAPI consumer -> WebSocket -> React UI
```

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (optional, for local frontend dev)
- Python 3.10+ (optional, for local backend dev)

## Quick Start

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs
- Metrics: http://localhost:8000/metrics

## Environment

See `.env.example`. Key variables:

| Variable | Default | Description |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka broker address |
| `KAFKA_TOPIC` | `events` | Kafka topic name |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `MAX_PAYLOAD_SIZE` | `1048576` | Max event payload size (bytes) |
| `REACT_APP_WS_URL` | `ws://localhost:8000/ws` | WebSocket URL |
| `REACT_APP_API_URL` | `http://localhost:8000` | API base URL |

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Testing

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm test
```

## API

| Method | Path | Description |
|---|---|---|
| POST | `/events` | Publish an event |
| GET | `/health` | Health check |
| GET | `/metrics` | Event counters |
| WS | `/ws` | Real-time event stream |

### Event Schema

```json
{
  "type": "user_message",
  "payload": { "text": "hello", "timestamp": 1696512000000 },
  "source": "web"
}
```

Allowed types: `user_message`, `system`, `order`, `click`

## Troubleshooting

**Kafka takes long to start**
- Zookeeper must be healthy before Kafka starts. Check `docker-compose logs kafka`.
- If the healthcheck fails, increase `interval`/`retries` in `docker-compose.yml`.

**WebSocket disconnects immediately**
- Verify `CORS_ORIGINS` includes your frontend origin, or use `*` for local dev.
- Check browser console for CORS errors.

**Port 9092 already in use**
- Stop any local Kafka broker, or change the host port mapping in `docker-compose.yml`.

**Frontend shows blank page**
- Ensure `frontend` built successfully: `docker-compose logs frontend`.
- Check nginx logs for static asset errors.

**Tests fail with connection refused**
- Ensure Docker services are running and healthy before executing tests.
- Backend unit tests mock Kafka; integration tests require a live broker.

## License

MIT
