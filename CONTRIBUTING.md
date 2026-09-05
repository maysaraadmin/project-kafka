# Contributing

Thanks for your interest in improving this project.

## Development Setup

```bash
git clone <repo-url>
cd project-kafka
cp .env.example .env
docker-compose up --build
```

## Branching Model

- `main` — production-ready code
- `feat/<name>` — new features
- `fix/<name>` — bug fixes
- `chore/<name>` — tooling, dependencies, docs

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add event filtering`
- `fix: handle WebSocket reconnect on unmount`
- `chore: update kafka-python to 2.0.2`

## Code Review

- All changes require a PR with at least one approval.
- CI must pass (lint, typecheck, tests).
- Keep PRs small and focused.

## Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## Reporting Issues

Please include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (`docker-compose.yml` version, OS, Docker version)
