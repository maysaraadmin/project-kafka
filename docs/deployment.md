# Deployment Guide

## Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- 8 CPU cores, 16GB RAM minimum (production Kafka cluster)
- A reverse proxy (nginx, Caddy, or cloud LB) for TLS termination

## Production Architecture

The production stack runs a **3-broker Kafka cluster** with:

- **Replication factor**: 3 (data survives 2 broker failures)
- **Min ISR**: 2 (writes require 2 replicas to confirm)
- **Idempotent producer**: Exactly-once semantics, no duplicates
- **Manual consumer commits**: Precise offset control
- **Topic auto-create disabled**: Explicit provisioning required
- **Resource limits**: Each broker limited to 4GB RAM / 1 CPU

## Production Checklist

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
    - Example nginx SSL config: `frontend/nginx.ssl.conf`

6. **Restrict CORS**
    Set `CORS_ORIGINS` to your actual frontend domain(s).

7. **Monitor**
    - Scrape `/metrics` with Prometheus.
    - Set alerts on `events_published` rate drops, `ws_errors` spikes, and consumer lag.
    - Monitor broker health via JMX or Confluent Control Center.

8. **Back up Kafka data**
    - The production override mounts persistent volumes for each broker.
    - Periodically snapshot these volumes or use Kafka MirrorMaker for cross-cluster replication.

## Kubernetes

For K8s deployment:
- Convert Compose services to Deployments + Services.
- Use `StatefulSet` for Kafka with `volumeClaimTemplates`.
- Mount `ConfigMap` for environment variables.
- Use `Ingress` with TLS for the frontend and API.

## Disaster Recovery

If Kafka metadata becomes corrupted:

```bash
# Nuclear option: reset all data
make docker-reset

# Or just reset the events topic
make kafka-reset
```
