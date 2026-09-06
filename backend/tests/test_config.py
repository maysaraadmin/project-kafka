import os
import sys

import pytest
from pydantic import ValidationError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import Settings


def test_settings_defaults():
    with pytest.raises(ValidationError):
        Settings(kafka_bootstrap_servers="")

def test_settings_valid():
    s = Settings(
        kafka_bootstrap_servers="kafka:9092",
        cors_origins="http://example.com",
        jwt_secret_key="test-secret-key-1234567890",
        admin_password="test-password-123",
    )
    assert s.kafka_bootstrap_servers == "kafka:9092"
    assert s.cors_origins == "http://example.com"
