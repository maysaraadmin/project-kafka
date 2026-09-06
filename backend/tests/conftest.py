import os
from unittest.mock import MagicMock

import pytest

os.environ.setdefault("ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-1234567890")
os.environ.setdefault("ADMIN_PASSWORD", "test-password-123")
os.environ.setdefault("ADMIN_PASSWORD_HASH", "")
os.environ.setdefault("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
os.environ.setdefault("KAFKA_TOPIC", "events")
os.environ.setdefault("KAFKA_PRODUCER_ACKS", "all")
os.environ.setdefault("KAFKA_PRODUCER_RETRIES", "3")
os.environ.setdefault("KAFKA_PRODUCER_MAX_IN_FLIGHT", "5")
os.environ.setdefault("KAFKA_PRODUCER_ENABLE_IDEMPOTENCE", "true")
os.environ.setdefault("KAFKA_CONSUMER_GROUP_ID", "test-consumer-group")
os.environ.setdefault("KAFKA_CONSUMER_AUTO_OFFSET_RESET", "earliest")
os.environ.setdefault("KAFKA_CONSUMER_ENABLE_AUTO_COMMIT", "false")
os.environ.setdefault("KAFKA_CONSUMER_SESSION_TIMEOUT_MS", "30000")
os.environ.setdefault("KAFKA_CONSUMER_HEARTBEAT_INTERVAL_MS", "10000")
os.environ.setdefault("KAFKA_CONSUMER_MAX_POLL_RECORDS", "100")
os.environ.setdefault("KAFKA_CONSUMER_MAX_POLL_INTERVAL_MS", "300000")


@pytest.fixture(autouse=True)
def _mock_kafka(monkeypatch):
    """Unit tests must not open real Kafka connections (no broker in CI-local/dev)."""
    mock_producer = MagicMock()
    monkeypatch.setattr("main.KafkaProducer", lambda **kwargs: mock_producer)
    monkeypatch.setattr("main.start_consumer", lambda *args, **kwargs: None)
    yield {"producer": mock_producer}
