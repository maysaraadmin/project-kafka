.PHONY: help backend-test frontend-test lint backend-lint frontend-lint typecheck format docker-up docker-down

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
