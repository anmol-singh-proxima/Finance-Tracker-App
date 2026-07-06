.PHONY: help dev down migrate test-backend test-frontend test-infra test lint synth clean

help:
	@echo "Finance Tracker — common commands (see each component's README for detail)"
	@echo ""
	@echo "  make dev            - Start Postgres + FastAPI backend (docker compose)"
	@echo "  make down           - Stop the local stack"
	@echo "  make migrate        - Run Alembic migrations in the backend container"
	@echo "  make test           - Run backend + frontend + infrastructure tests"
	@echo "  make lint           - Lint/type-check all three components"
	@echo "  make synth          - cdk synth the infrastructure"
	@echo "  make clean          - Remove local build artefacts"
	@echo ""
	@echo "  Frontend dev server:  cd frontend && npm run dev"
	@echo "  Cognito setup:        see backend/README.md"

# --- Local dev ---
dev:
	docker compose up --build postgres backend

down:
	docker compose down

migrate:
	docker compose run --rm backend alembic upgrade head

# --- Tests ---
test-backend:
	cd backend && pytest

test-frontend:
	cd frontend && npm test

test-infra:
	cd infrastructure && npm test

test: test-backend test-frontend test-infra

# --- Lint / type-check ---
lint:
	cd backend && ruff check . && ruff format --check . && mypy .
	cd frontend && npm run lint && npm run format:check && npm run typecheck
	cd infrastructure && npm run lint && npm run format:check && npm run typecheck

# --- Infrastructure ---
synth:
	cd infrastructure && npx cdk synth

clean:
	rm -rf frontend/dist frontend/node_modules
	rm -rf infrastructure/cdk.out infrastructure/node_modules
	find backend -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true

.DEFAULT_GOAL := help
