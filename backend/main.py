import asyncio
import time
import threading
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator, ConfigDict
from pydantic_settings import BaseSettings
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from kafka import KafkaProducer, KafkaConsumer, KafkaError
import structlog
import json
import os
import jwt


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_topic: str = "events"
    cors_origins: str = "*"
    max_queue_size: int = 1000
    ws_reconnect_delay: int = 3
    producer_timeout: int = 10
    consumer_retry_delay: int = 5
    max_payload_size: int = 1024 * 1024
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"

    model_config = ConfigDict(env_prefix="", case_sensitive=False)

    @property
    def cors_origins_list(self) -> list[str]:
        if self.cors_origins == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()

try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    trace.set_tracer_provider(TracerProvider())
    tracer_provider = trace.get_tracer_provider()
    otlp_exporter = OTLPSpanExporter(endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"), insecure=True)
    tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    tracer = trace.get_tracer(__name__)
except ImportError:
    tracer = None
    FastAPIInstrumentor = None


class ThreadSafeMetrics:
    """Thread-safe metrics collector for event counts and errors."""

    def __init__(self):
        self._data = defaultdict(int)
        self._lock = threading.Lock()

    def increment(self, key: str, amount: int = 1):
        with self._lock:
            self._data[key] += amount

    def get(self, key: str, default: int = 0) -> int:
        with self._lock:
            return self._data.get(key, default)

    def snapshot(self) -> dict[str, int]:
        with self._lock:
            return dict(self._data)


metrics = ThreadSafeMetrics()
limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer(auto_error=False)


class TokenData(BaseModel):
    username: str
    exp: datetime


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    exp = datetime.now(timezone.utc).timestamp() + 3600
    to_encode.update({"exp": exp})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = None,
) -> str:
    """Validate JWT token and return username."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload.get("sub", "anonymous")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


class ConnectionManager:
    """Thread-safe manager for active WebSocket connections."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._lock = threading.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        with self._lock:
            self.active_connections.append(websocket)
        logger.info("ws.connected", total=len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info("ws.disconnected", total=len(self.active_connections))

    async def broadcast(self, message: str):
        with self._lock:
            connections = list(self.active_connections)
        for connection in connections:
            try:
                await connection.send_text(message)
            except (WebSocketDisconnect, RuntimeError):
                self.disconnect(connection)


class EventType(str):
    USER_MESSAGE = "user_message"
    SYSTEM = "system"
    ORDER = "order"
    CLICK = "click"


class Event(BaseModel):
    """Validated event model for Kafka messages."""

    type: str = Field(..., min_length=1, max_length=64, examples=["user_message"])
    payload: dict[str, Any] = Field(..., max_length=settings.max_payload_size, examples=[{"text": "hello"}])
    source: str | None = Field(default=None, max_length=128, examples=["web"])

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"user_message", "system", "order", "click"}
        if v not in allowed:
            raise ValueError(f"type must be one of {allowed}")
        return v

    @field_validator("payload")
    @classmethod
    def validate_payload_size(cls, v: dict[str, Any]) -> dict[str, Any]:
        raw = json.dumps(v)
        if len(raw) > settings.max_payload_size:
            raise ValueError(f"payload exceeds {settings.max_payload_size} bytes")
        return v


manager = ConnectionManager()
limiter = Limiter(key_func=get_remote_address)


async def broadcaster(queue: asyncio.Queue):
    """Consume messages from the internal queue and broadcast to all WebSocket clients."""
    while True:
        try:
            message = await queue.get()
            await manager.broadcast(json.dumps(message))
            metrics.increment("events_broadcast")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error("broadcaster.error", error=str(e))
            metrics.increment("ws_errors")


async def safe_put(queue: asyncio.Queue, value):
    """Put a value into the queue, dropping the oldest item if the queue is full."""
    while True:
        try:
            queue.put_nowait(value)
            return
        except asyncio.QueueFull:
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:
                await asyncio.sleep(0.01)


def start_consumer(
    queue: asyncio.Queue,
    loop: asyncio.AbstractEventLoop,
    stop_event: threading.Event,
):
    """Background thread that consumes Kafka messages and forwards them to the async queue."""
    while not stop_event.is_set():
        consumer = None
        try:
            consumer = KafkaConsumer(
                settings.kafka_topic,
                bootstrap_servers=settings.kafka_bootstrap_servers,
                auto_offset_reset="latest",
                enable_auto_commit=True,
                max_poll_records=50,
                fetch_max_bytes=5242880,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            )
            for msg in consumer:
                if stop_event.is_set():
                    break
                asyncio.run_coroutine_threadsafe(safe_put(queue, msg.value), loop)
        except (KafkaError, ConnectionError, OSError) as e:
            logger.warning("consumer.retryable_error", error=str(e))
            time.sleep(settings.consumer_retry_delay)
        except Exception as e:
            logger.error("consumer.fatal_error", error=str(e))
            time.sleep(settings.consumer_retry_delay)
        finally:
            if consumer is not None:
                try:
                    consumer.close()
                except Exception:
                    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle."""
    queue: asyncio.Queue = asyncio.Queue(maxsize=settings.max_queue_size)
    loop = asyncio.get_running_loop()
    stop_event = threading.Event()

    producer = KafkaProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        max_request_size=settings.max_payload_size,
    )

    consumer_thread = threading.Thread(
        target=start_consumer,
        args=(queue, loop, stop_event),
        daemon=True,
    )
    consumer_thread.start()

    broadcaster_task = asyncio.create_task(broadcaster(queue))

    app.state.manager = manager
    app.state.producer = producer
    app.state.queue = queue

    logger.info("app.startup")

    yield

    logger.info("app.shutdown")
    stop_event.set()
    broadcaster_task.cancel()
    try:
        await broadcaster_task
    except asyncio.CancelledError:
        pass
    producer.flush(timeout=5)
    producer.close()
    consumer_thread.join(timeout=5)


app = FastAPI(lifespan=lifespan, title="Real-time Activity Dashboard API")
app.state.limiter = limiter
app.state.metrics = metrics
if FastAPIInstrumentor is not None:
    FastAPIInstrumentor.instrument_app(app)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/auth/login")
async def login(request: LoginRequest):
    """Authenticate and return a JWT access token."""
    if request.username != "admin" or request.password != "admin":
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": request.username})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/health", response_model=dict, responses={200: {"content": {"application/json": {"example": {"status": "ok"}}}}})
async def health():
    """Health check endpoint for Docker and load balancers."""
    return {"status": "ok"}


@app.get("/metrics", response_model=dict, responses={200: {"content": {"application/json": {"example": {"events_published": 10, "events_broadcast": 10, "ws_errors": 0}}}}})
async def metrics_endpoint():
    """Expose application metrics such as event counts and WebSocket errors."""
    return metrics.snapshot()


@app.post("/events", response_model=dict, responses={
    200: {"content": {"application/json": {"example": {"status": "ok"}}}},
    401: {"description": "Missing or invalid JWT token"},
    422: {"description": "Validation error"},
    500: {"description": "Failed to publish event"},
})
@limiter.limit("100/minute")
async def create_event(event: Event, username: str = Depends(get_current_user)):
    """Publish an event to Kafka and track it in metrics."""
    try:
        future = app.state.producer.send(
            settings.kafka_topic,
            value=event.model_dump(),
        )
        await asyncio.to_thread(future.get, timeout=settings.producer_timeout)
        metrics.increment("events_published")
        logger.info("event.published", type=event.type, source=event.source)
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("event.publish_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to publish event")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Accept WebSocket connections and stream events to connected clients."""
    origin = websocket.headers.get("origin", "")
    if "*" not in settings.cors_origins_list and origin not in settings.cors_origins_list:
        logger.warning("ws.rejected", origin=origin)
        await websocket.close(code=4003)
        return

    await app.state.manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        app.state.manager.disconnect(websocket)
    except Exception:
        app.state.manager.disconnect(websocket)
        raise
