import os
import sys
from unittest.mock import patch

import pytest
from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import ConnectionManager, app, create_access_token


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def token():
    return create_access_token({"sub": "test"})


class TestWebSocketEndpoint:
    def test_websocket_rejects_missing_token(self, client):
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/ws"):
                pass

    def test_websocket_rejects_invalid_origin(self, client, token, monkeypatch):
        monkeypatch.setattr("main.settings.cors_origins", "https://example.com")
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(
                f"/ws?token={token}", headers={"origin": "https://evil.com"}
            ):
                pass

    def test_websocket_accepts_valid_origin(self, client, token, monkeypatch):
        monkeypatch.setattr("main.settings.cors_origins", "*")
        with client.websocket_connect(
            f"/ws?token={token}", headers={"origin": "http://localhost:3000"}
        ) as ws:
            ws.send_text("ping")
            ws.close()

    def test_websocket_disconnect_cleanup(self, client, token):
        manager = ConnectionManager()
        with patch("main.app.state.manager", manager):
            with client.websocket_connect(f"/ws?token={token}") as ws:
                ws.close()
            assert len(manager.active_connections) == 0
