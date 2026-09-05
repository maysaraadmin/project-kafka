from kafka import KafkaConsumer
import json
import os
import time

BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC = os.getenv("KAFKA_TOPIC", "events")

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
            print(f"Received: {msg.value}")
    except Exception as e:
        print(f"Consumer error: {e}, reconnecting in 5s")
        time.sleep(5)
