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
- API root: http://localhost:8000/
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
- Metrics: http://localhost:8000/metrics

**Default credentials:**
- Username: `admin`
- Password: `dev-password-change-in-production`

## Environment

See `.env.example`. Key variables:

| Variable | Default | Description |
|---|---|---|
| `ENV` | `dev` | Environment mode (`dev` / `production`) |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka broker address(es) |
| `KAFKA_TOPIC` | `events` | Kafka topic name |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `MAX_PAYLOAD_SIZE` | `1048576` | Max event payload size (bytes) |
| `KAFKA_MAX_REQUEST_SIZE` | `5242880` | Max Kafka producer request size (bytes) |
| `KAFKA_FETCH_MAX_BYTES` | `5242880` | Max Kafka consumer fetch size (bytes) |
| `METRICS_TRUSTED_IPS` | `` | Comma-separated IPs allowed to access `/metrics` |
| `REACT_APP_WS_URL` | `ws://localhost:8000/ws` | WebSocket URL |
| `REACT_APP_API_URL` | `http://localhost:8000` | API base URL |

### Production Kafka Settings

| Variable | Default | Description |
|---|---|---|
| `KAFKA_PRODUCER_ACKS` | `all` | Producer acknowledgment level |
| `KAFKA_PRODUCER_RETRIES` | `2147483647` | Producer retry count |
| `KAFKA_PRODUCER_MAX_IN_FLIGHT` | `5` | Max in-flight requests per connection |
| `KAFKA_PRODUCER_ENABLE_IDEMPOTENCE` | `true` | Enable exactly-once semantics |
| `KAFKA_CONSUMER_GROUP_ID` | `activity-dashboard-consumer` | Consumer group ID |
| `KAFKA_CONSUMER_AUTO_OFFSET_RESET` | `latest` | Offset reset policy |
| `KAFKA_CONSUMER_ENABLE_AUTO_COMMIT` | `false` | Disable auto-commit for manual control |
| `KAFKA_CONSUMER_SESSION_TIMEOUT_MS` | `30000` | Consumer session timeout |
| `KAFKA_CONSUMER_HEARTBEAT_INTERVAL_MS` | `10000` | Consumer heartbeat interval |
| `KAFKA_CONSUMER_MAX_POLL_RECORDS` | `100` | Max records per poll |
| `KAFKA_CONSUMER_MAX_POLL_INTERVAL_MS` | `300000` | Max time between polls |

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
| GET | `/` | API info |
| POST | `/auth/login` | Authenticate and get JWT |
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

## Features

- JWT authentication for `/events` and `/ws`
- Timing-safe credential comparison
- Bcrypt password hash support (`ADMIN_PASSWORD_HASH`)
- Rate limiting on event creation (`100/minute`)
- Structured JSON logging with `structlog`
- Optional OpenTelemetry tracing
- Thread-safe WebSocket broadcast with timeout and concurrent delivery
- Exponential backoff with jitter for WebSocket reconnection
- Kafka consumer with exponential backoff on retryable errors
- Manual offset commits for precise consumer control
- Idempotent Kafka producer with exactly-once semantics
- Dropped-message tracking when the internal queue is full
- Configurable Kafka producer/consumer size limits
- IP-restricted `/metrics` endpoint in production
- Responsive virtualized event feed
- Frontend theme tokens and accessibility support

## Production Deployment

### Production Architecture

The production stack runs a **3-broker Kafka cluster** with:

- **Replication factor**: 3 (data survives 2 broker failures)
- **Min ISR**: 2 (writes require 2 replicas to confirm)
- **Idempotent producer**: Exactly-once semantics, no duplicates
- **Manual consumer commits**: Precise offset control
- **Topic auto-create disabled**: Explicit provisioning required
- **Resource limits**: Each broker limited to 4GB RAM / 1 CPU

### Production Checklist

1. **Copy and edit environment variables**
    ```bash
    cp .env.example .env
    # Update JWT_SECRET_KEY, ADMIN_PASSWORD, CORS_ORIGINS, etc.
    ```

2. **Provision Kafka topics before first deploy**
    ```bash
    bash scripts/provision-kafka.sh
    ```

3. **Start the production stack**
    ```bash
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
    ```

4. **Verify cluster health**
    ```bash
    docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
    # All kafka-1, kafka-2, kafka-3 should show "healthy"
    ```

5. **Enable TLS**
    - Terminate TLS at your reverse proxy (nginx, Caddy, cloud LB).
    - For Kafka inter-broker communication, configure `SSL` listener and set `security.inter.broker.protocol=SSL`.

6. **Restrict CORS**
    Set `CORS_ORIGINS` to your actual frontend domain(s).

7. **Monitor**
    - Scrape `/metrics` with Prometheus.
    - Set alerts on `events_published` rate drops, `ws_errors` spikes, and consumer lag.
    - Monitor broker health via JMX or Confluent Control Center.

8. **Back up Kafka data**
    - The production override mounts persistent volumes for each broker.
    - Periodically snapshot these volumes or use Kafka MirrorMaker for cross-cluster replication.

### Kubernetes

For K8s deployment:
- Convert Compose services to Deployments + Services.
- Use `StatefulSet` for Kafka with `volumeClaimTemplates`.
- Mount `ConfigMap` for environment variables.
- Use `Ingress` with TLS for the frontend and API.

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

**Kafka producer timeout / Request timed out**
- If metadata corruption occurs, reset the topic:
  ```bash
  docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --delete --topic events
  # Topic will be auto-created on next produce
  ```
- Or reset all data: `make docker-reset`

**Login shows Invalid credentials (401)**
- The default credentials are `admin` / `dev-password-change-in-production`.
- If you had an old token stored in browser localStorage, clear it and log in again.

## License

MIT
