# Alerting Rules

## Metrics to Monitor

| Metric | Alert Condition | Severity |
|---|---|---|
| `events_published` rate drop | < 1 event/min for 5m | Warning |
| `events_broadcast` rate drop | < 1 event/min for 5m | Warning |
| `ws_errors` spike | > 10 in 1m | Critical |
| `queue` depth | > 800 for 2m | Warning |
| API health | `/health` returns non-ok for 1m | Critical |
| Kafka consumer lag | > 1000 messages for 5m | Warning |

## Example Prometheus Rules

```yaml
groups:
  - name: kafka_dashboard
    rules:
      - alert: HighWSErrors
        expr: rate(ws_errors[1m]) > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "WebSocket errors spiking"
      - alert: QueueNearCapacity
        expr: queue_depth > 800
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Event queue near capacity"
```

## Notification Channels

- PagerDuty / OpsGenie for critical alerts
- Slack #alerts for warnings
- Email digest for daily summaries
