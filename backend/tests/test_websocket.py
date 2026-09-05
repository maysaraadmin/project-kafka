import asyncio
import json
import sys
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app, settings, ConnectionManager


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


class TestWebSocketEndpoint:
    def test_websocket_rejects_invalid_origin(self, client):
        with patch("main.settings") as mock_settings:
            mock_settings.cors_origins = "https://example.com"
            with client.websocket_connect("/ws", headers={"origin": "https://evil.com"}) as ws:
                with pytest.raises(Exception):
                    ws.receive_text()

    def test_websocket_accepts_valid_origin(self, client):
        with patch("main.settings") as mock_settings:
            mock_settings.cors_origins = "*"
            with client.websocket_connect("/ws", headers={"origin": "http://localhost:3000"}) as ws:
                ws.send_text("ping")
                ws.close()

    def test_websocket_disconnect_cleanup(self, client):
        with patch("main.settings") as mock_settings:
            mock_settings.cors_origins = "*"
            manager = ConnectionManager()
            with patch("main.app.state.manager", manager):
                with client.websocket_connect("/ws") as ws:
                    ws.close()
                assert len(manager.active_connections) == 0
