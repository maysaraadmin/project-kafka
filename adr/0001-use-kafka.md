# ADR 0001: Use Kafka as the message broker

## Status
Accepted

## Context
We need a decoupled, scalable way to stream events from producers to consumers in real time. Options included Redis Pub/Sub, RabbitMQ, and Kafka.

## Decision
Use Apache Kafka as the message broker.

## Consequences
- Pros: High throughput, durable log, replayability, consumer groups for scaling.
- Cons: Operational complexity (Zookeeper/KRaft), higher memory footprint, steeper learning curve.

## Alternatives considered
- Redis Pub/Sub: simpler but no durability or replay.
- RabbitMQ: good for task queues, less ideal for high-volume event streaming.
