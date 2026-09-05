import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import ConnectionManager, Event, app, create_access_token


@pytest.fixture
def auth_headers():
    token = create_access_token({"sub": "test"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


class TestEventModel:
    def test_valid_event(self):
        event = Event(type="user_message", payload={"text": "hello"})
        assert event.type == "user_message"
        assert event.payload == {"text": "hello"}

    def test_invalid_type(self):
        with pytest.raises(Exception):
            Event(type="invalid_type", payload={"text": "hello"})

    def test_empty_type(self):
        with pytest.raises(Exception):
            Event(type="", payload={"text": "hello"})

    def test_payload_size_limit(self, monkeypatch):
        monkeypatch.setattr("main.settings.max_payload_size", 10)
        with pytest.raises(Exception):
            Event(type="user_message", payload={"text": "this is too long"})


class TestConnectionManager:
    async def test_connect_disconnect(self):
        manager = ConnectionManager()
        ws = AsyncMock()
        await manager.connect(ws)
        assert ws in manager.active_connections
        manager.disconnect(ws)
        assert ws not in manager.active_connections

    async def test_double_disconnect(self):
        manager = ConnectionManager()
        ws = AsyncMock()
        await manager.connect(ws)
        manager.disconnect(ws)
        manager.disconnect(ws)  # should not raise

    async def test_broadcast(self):
        manager = ConnectionManager()
        ws = AsyncMock()
        await manager.connect(ws)
        await manager.broadcast("test")
        ws.send_text.assert_called_once_with("test")


class TestHealthEndpoint:
    def test_health(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestMetricsEndpoint:
    def test_metrics(self, client):
        response = client.get("/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "events_published" in data
        assert "events_broadcast" in data
        assert "ws_errors" in data


class TestEventsEndpoint:
    def test_create_event(self, client, auth_headers):
        with patch("main.app.state.producer") as mock_producer:
            mock_future = MagicMock()
            mock_producer.send.return_value = mock_future

            def fake_get(timeout):
                return None

            mock_future.get.side_effect = fake_get

            response = client.post(
                "/events",
                json={"type": "user_message", "payload": {"text": "hello"}},
                headers=auth_headers,
            )
            assert response.status_code == 200
            assert response.json() == {"status": "ok"}

    def test_create_event_invalid_type(self, client, auth_headers):
        response = client.post(
            "/events",
            json={"type": "invalid", "payload": {"text": "hello"}},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_create_event_payload_too_large(self, client, auth_headers, monkeypatch):
        monkeypatch.setattr("main.settings.max_payload_size", 10)
        big_payload = {"text": "x" * 10000}
        with patch("main.app.state.producer") as mock_producer:
            mock_future = MagicMock()
            mock_producer.send.return_value = mock_future
            mock_future.get.side_effect = lambda timeout: None

            response = client.post(
                "/events",
                json={"type": "user_message", "payload": big_payload},
                headers=auth_headers,
            )
            assert response.status_code == 422
