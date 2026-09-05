from unittest.mock import MagicMock

import pytest


@pytest.fixture(autouse=True)
def _mock_kafka(monkeypatch):
    """Unit tests must not open real Kafka connections (no broker in CI-local/dev)."""
    mock_producer = MagicMock()
    monkeypatch.setattr("main.KafkaProducer", lambda **kwargs: mock_producer)
    monkeypatch.setattr("main.start_consumer", lambda *args, **kwargs: None)
    monkeypatch.setattr("main.settings.jwt_secret_key", "x" * 32)
    yield {"producer": mock_producer}
