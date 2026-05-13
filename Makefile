# SailingLoc Docker Development Commands

.PHONY: help build up down restart logs clean dev prod

# Default target
help: ## Show this help message
	@echo "SailingLoc Docker Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Development commands
dev: ## Start development environment with hot reload
	docker-compose -f docker-compose.dev.yml up --build

dev-d: ## Start development environment in background
	docker-compose -f docker-compose.dev.yml up --build -d

dev-down: ## Stop development environment
	docker-compose -f docker-compose.dev.yml down

# Production commands
prod: ## Start production environment
	docker-compose up --build

prod-d: ## Start production environment in background
	docker-compose up --build -d

prod-down: ## Stop production environment
	docker-compose down

# Database commands
db-migrate: ## Run Prisma migrations in development
	docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev

db-generate: ## Generate Prisma client
	docker-compose -f docker-compose.dev.yml exec backend npx prisma generate

db-seed: ## Seed the database
	docker-compose -f docker-compose.dev.yml exec backend npx prisma db seed

db-studio: ## Open Prisma Studio
	docker-compose -f docker-compose.dev.yml exec backend npx prisma studio

# Utility commands
logs: ## Show logs from all services
	docker-compose -f docker-compose.dev.yml logs -f

logs-backend: ## Show backend logs
	docker-compose -f docker-compose.dev.yml logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose -f docker-compose.dev.yml logs -f frontend

logs-db: ## Show database logs
	docker-compose -f docker-compose.dev.yml logs -f postgres

build: ## Build all services
	docker-compose -f docker-compose.dev.yml build

restart: ## Restart all services
	docker-compose -f docker-compose.dev.yml restart

clean: ## Remove all containers, volumes, and images
	docker-compose -f docker-compose.dev.yml down -v --rmi all

shell-backend: ## Open shell in backend container
	docker-compose -f docker-compose.dev.yml exec backend sh

shell-frontend: ## Open shell in frontend container
	docker-compose -f docker-compose.dev.yml exec frontend sh

shell-db: ## Open shell in database container
	docker-compose -f docker-compose.dev.yml exec postgres psql -U sailingloc_user -d sailingloc_dev