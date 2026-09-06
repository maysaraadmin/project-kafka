import os
from unittest.mock import MagicMock

import pytest

os.environ.setdefault("ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-1234567890")
os.environ.setdefault("ADMIN_PASSWORD", "test-password-123")
os.environ.setdefault("ADMIN_PASSWORD_HASH", "")


@pytest.fixture(autouse=True)
def _mock_kafka(monkeypatch):
    """Unit tests must not open real Kafka connections (no broker in CI-local/dev)."""
    mock_producer = MagicMock()
    monkeypatch.setattr("main.KafkaProducer", lambda **kwargs: mock_producer)
    monkeypatch.setattr("main.start_consumer", lambda *args, **kwargs: None)
    yield {"producer": mock_producer}
