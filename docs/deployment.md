# Deployment Guide

## Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- 2 CPU cores, 4GB RAM minimum
- A reverse proxy (nginx, Caddy, or cloud LB) for TLS termination

## Production Checklist

1. **Copy and edit environment variables**
   ```bash
   cp .env.example .env
   # Update CORS_ORIGINS, MAX_PAYLOAD_SIZE, etc.
   ```

2. **Use production Compose override**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
   ```

   This binds ports to `127.0.0.1` and enables persistent Kafka volumes.

3. **Enable TLS**
   - For local HTTPS testing, run `bash scripts/generate-certs.sh` and mount `./ssl` into the frontend container.
   - In production, terminate TLS at your reverse proxy (nginx, Caddy, cloud LB).
   - For Kafka, enable `SSL` listener and set `security.inter.broker.protocol=SSL`.
   - Example nginx SSL config: `frontend/nginx.ssl.conf`

4. **Restrict CORS**
   Set `CORS_ORIGINS` to your actual frontend domain(s).

5. **Add authentication**
   - Reverse proxy: require auth before forwarding to `api:8000`.
   - Or integrate JWT/OAuth2 in FastAPI and pass tokens from the frontend.

6. **Configure log shipping**
   - Forward stdout/stderr to your log aggregator (ELK, Loki, Datadog).
   - `structlog` already emits JSON; configure your collector to parse it.

7. **Back up Kafka data**
   - The production override mounts `kafka_data` and `zookeeper_data` volumes.
   - Periodically snapshot these volumes or use Kafka MirrorMaker for cross-cluster replication.

8. **Monitor**
   - Scrape `/metrics` with Prometheus.
   - Set alerts on `events_published` rate drops, `ws_errors` spikes, and consumer lag.

## Kubernetes

For K8s deployment:
- Convert Compose services to Deployments + Services.
- Use `StatefulSet` for Kafka with `volumeClaimTemplates`.
- Mount `ConfigMap` for environment variables.
- Use `Ingress` with TLS for the frontend and API.
