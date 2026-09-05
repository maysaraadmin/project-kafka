import json
import os
import sys

import pytest

pytest.importorskip("testcontainers")

from kafka import KafkaConsumer, KafkaProducer
from testcontainers.kafka import KafkaContainer
from testcontainers.zookeeper import ZookeeperContainer

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))



@pytest.fixture(scope="module")
def kafka_broker():
    zookeeper = ZookeeperContainer()
    kafka = KafkaContainer()
    zookeeper.start()
    kafka.with_network(zookeeper.get_network())
    kafka.with_env("KAFKA_ZOOKEEPER_CONNECT", zookeeper.get_zookeeper_connect())
    kafka.start()
    yield kafka
    kafka.stop()
    zookeeper.stop()


@pytest.mark.integration
def test_kafka_produce_consume(kafka_broker):
    bootstrap = kafka_broker.get_bootstrap_server()
    consumer = KafkaConsumer(
        "events",
        bootstrap_servers=bootstrap,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        consumer_timeout_ms=10000,
    )

    producer = KafkaProducer(
        bootstrap_servers=bootstrap,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    test_event = {"type": "user_message", "payload": {"text": "integration-test"}}
    producer.send("events", value=test_event)
    producer.flush()

    try:
        msg = consumer.poll(timeout_ms=5000)
        assert msg, "Expected at least one message from Kafka"
        received = list(msg.values())[0][0].value
        assert received == test_event
    finally:
        consumer.close()
        producer.close()
