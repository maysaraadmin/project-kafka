#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BOOTSTRAP="${KAFKA_BOOTSTRAP_SERVERS:-localhost:9092}"
TOPIC="${KAFKA_TOPIC:-events}"
PARTITIONS="${KAFKA_TOPIC_PARTITIONS:-6}"
REPLICATION="${KAFKA_TOPIC_REPLICATION_FACTOR:-3}"
RETENTION_MS="${KAFKA_TOPIC_RETENTION_MS:-604800000}"
SEGMENT_BYTES="${KAFKA_TOPIC_SEGMENT_BYTES:-1073741824}"

echo "Provisioning Kafka topic: ${TOPIC}"
echo "  Partitions:       ${PARTITIONS}"
echo "  Replication:      ${REPLICATION}"
echo "  Retention (ms):   ${RETENTION_MS}"
echo "  Segment bytes:    ${SEGMENT_BYTES}"
echo "  Bootstrap:        ${BOOTSTRAP}"
echo ""

docker compose -f "${COMPOSE_FILE}" exec -T kafka-1 kafka-topics \
  --bootstrap-server "${BOOTSTRAP}" \
  --create \
  --if-not-exists \
  --topic "${TOPIC}" \
  --partitions "${PARTITIONS}" \
  --replication-factor "${REPLICATION}" \
  --config retention.ms="${RETENTION_MS}" \
  --config segment.bytes="${SEGMENT_BYTES}" \
  --config min.insync.replicas=2 \
  --config cleanup.policy=delete

echo ""
echo "Topic details:"
docker compose -f "${COMPOSE_FILE}" exec -T kafka-1 kafka-topics \
  --bootstrap-server "${BOOTSTRAP}" \
  --describe \
  --topic "${TOPIC}"

echo ""
echo "All topics:"
docker compose -f "${COMPOSE_FILE}" exec -T kafka-1 kafka-topics \
  --bootstrap-server "${BOOTSTRAP}" \
  --list
