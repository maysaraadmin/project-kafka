.PHONY: help backend-test frontend-test lint backend-lint frontend-lint typecheck format docker-up docker-down docker-reset kafka-reset

help:
	@echo "Available targets:"
	@echo "  backend-test   - Run backend tests with coverage"
	@echo "  frontend-test  - Run frontend tests with coverage"
	@echo "  lint           - Run all linters"
	@echo "  backend-lint   - Run ruff on backend"
	@echo "  frontend-lint  - Run eslint on frontend"
	@echo "  typecheck      - Run mypy on backend"
	@echo "  format         - Format code with ruff and prettier"
	@echo "  docker-up      - Start all services"
	@echo "  docker-down    - Stop all services"
	@echo "  docker-reset   - Stop services and remove volumes (Kafka/ZK data)"
	@echo "  kafka-reset    - Recreate Kafka topic if metadata is corrupted"

backend-test:
	cd backend && pytest --cov=main --cov-report=term-missing

frontend-test:
	cd frontend && npm test -- --coverage --watchAll=false

lint: backend-lint frontend-lint

backend-lint:
	cd backend && ruff check .

frontend-lint:
	cd frontend && npx eslint src/

typecheck:
	cd backend && mypy .

format:
	cd backend && ruff format .
	cd frontend && npx prettier --write src/

docker-up:
	docker-compose up --build

docker-down:
	docker-compose down -v

docker-reset:
	docker-compose down
	docker volume rm project-kafka_kafka_data project-kafka_zookeeper_data || true
	docker-compose up -d

kafka-reset:
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --delete --topic events || true
	sleep 2
	docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic events --partitions 1 --replication-factor 1 || true
