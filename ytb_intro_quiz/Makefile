.PHONY: help up down restart logs ps clean db-shell redis-cli

help:
	@echo "Available commands:"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make restart   - Restart all services"
	@echo "  make logs      - View logs"
	@echo "  make ps        - List running containers"
	@echo "  make clean     - Remove containers and volumes"
	@echo "  make db-shell  - Connect to PostgreSQL"
	@echo "  make redis-cli - Connect to Redis"

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