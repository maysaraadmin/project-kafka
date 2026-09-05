import asyncio
import time
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from kafka import KafkaProducer, KafkaConsumer
import json
import os

BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC = os.getenv("KAFKA_TOPIC", "events")

producer = KafkaProducer(
    bootstrap_servers=BOOTSTRAP_SERVERS,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


async def broadcaster(queue: asyncio.Queue):
    while True:
        message = await queue.get()
        await manager.broadcast(json.dumps(message))


def start_consumer(queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
    while True:
        try:
            consumer = KafkaConsumer(
                TOPIC,
                bootstrap_servers=BOOTSTRAP_SERVERS,
                auto_offset_reset='latest',
                enable_auto_commit=True,
                value_deserializer=lambda m: json.loads(m.decode('utf-8'))
            )
            for msg in consumer:
                asyncio.run_coroutine_threadsafe(queue.put(msg.value), loop)
        except Exception as e:
            print(f"Consumer error: {e}, reconnecting in 5s")
            time.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    consumer_thread = threading.Thread(
        target=start_consumer,
        args=(queue, loop),
        daemon=True
    )
    consumer_thread.start()

    broadcaster_task = asyncio.create_task(broadcaster(queue))

    yield

    broadcaster_task.cancel()
    try:
        await broadcaster_task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Event(BaseModel):
    type: str
    payload: dict


@app.post("/events")
async def create_event(event: Event):
    try:
        future = producer.send(TOPIC, value=event.dict())
        await asyncio.to_thread(future.get, timeout=10)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
