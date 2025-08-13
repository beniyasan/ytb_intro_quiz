.PHONY: help up down restart logs ps clean db-shell redis-cli test test-ui test-headed test-report

help:
	@echo "Available commands:"
	@echo "  make up          - Start all services"
	@echo "  make down        - Stop all services"
	@echo "  make restart     - Restart all services"
	@echo "  make logs        - View logs"
	@echo "  make ps          - List running containers"
	@echo "  make clean       - Remove containers and volumes"
	@echo "  make db-shell    - Connect to PostgreSQL"
	@echo "  make redis-cli   - Connect to Redis"
	@echo "  make test        - Run Playwright tests in Docker"
	@echo "  make test-ui     - Run Playwright tests with UI"
	@echo "  make test-headed - Run Playwright tests in headed mode"
	@echo "  make test-report - Show Playwright test report"

up:
	docker-compose up -d
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@docker-compose ps

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

ps:
	docker-compose ps

clean:
	docker-compose down -v
	@echo "Removed containers and volumes"

db-shell:
	docker-compose exec postgres psql -U ytb_quiz_user -d ytb_quiz_db

redis-cli:
	docker-compose exec redis redis-cli

test:
	@echo "Building Playwright Docker image..."
	docker-compose --profile test build playwright
	@echo "Running Playwright tests..."
	docker-compose --profile test run --rm playwright npm test

test-ui:
	npm run test:ui

test-headed:
	npm run test:headed

test-report:
	npm run test:report