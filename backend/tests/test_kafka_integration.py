import asyncio
import json
import os
import sys
import time

import pytest
from testcontainers.kafka import KafkaContainer
from testcontainers.zookeeper import ZookeeperContainer

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app, settings


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
    )

    producer = KafkaProducer(
        bootstrap_servers=bootstrap,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    test_event = {"type": "user_message", "payload": {"text": "integration-test"}}
    producer.send("events", value=test_event)
    producer.flush()

    msg = consumer.poll(timeout_ms=5000)
    assert msg is not None
    consumer.close()
    producer.close()
