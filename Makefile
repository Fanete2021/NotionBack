NPM := npm

.PHONY: help install build start start-dev start-debug start-prod \
        dev-up dev-logs dev-down db-up db-down env-init docker-clean-test \
        prisma-generate prisma-migrate prisma-seed prisma-studio \
        lint format test test-watch test-cov test-debug test-e2e

help: ## Show this help
	@echo "Available targets:"
	@echo "  dev-up            - bring up the full dev stack (auto-creates .env)"
	@echo "  dev-logs          - follow app logs"
	@echo "  dev-down          - tear down the dev stack"
	@echo "  db-up             - start only postgres"
	@echo "  db-down           - stop databases"
	@echo "  env-init          - create .env from .env.example if missing"
	@echo "  install           - install dependencies"
	@echo "  build             - build the project"
	@echo "  start             - start the app"
	@echo "  start-dev         - start in dev mode (watch)"
	@echo "  start-debug       - start in debug mode"
	@echo "  start-prod        - start the compiled app"
	@echo "  prisma-generate   - generate Prisma client"
	@echo "  prisma-migrate    - run Prisma migrations (dev)"
	@echo "  prisma-seed       - seed the database"
	@echo "  prisma-studio     - open Prisma Studio"
	@echo "  lint              - lint and autofix"
	@echo "  format            - format code with Prettier"
	@echo "  test              - run unit tests"
	@echo "  test-watch        - run tests in watch mode"
	@echo "  test-cov          - run tests with coverage"
	@echo "  test-debug        - run tests in debug mode"
	@echo "  test-e2e          - run e2e tests"
	@echo "  docker-clean-test - full rebuild from scratch (dangerous: wipes data)"
	@echo ""
	@echo "Each target is a thin wrapper over the matching npm script."

install: ## Install dependencies
	$(NPM) install

build: ## Build the project
	$(NPM) run build

start: ## Start the app
	$(NPM) run start

start-dev: ## Start in dev mode (watch)
	$(NPM) run start:dev

start-debug: ## Start in debug mode
	$(NPM) run start:debug

start-prod: ## Start compiled app
	$(NPM) run start:prod

dev-up: ## Bring up the full dev stack (auto-creates .env)
	$(NPM) run dev:up

dev-logs: ## Tail app logs
	$(NPM) run dev:logs

dev-down: ## Tear down the dev stack
	$(NPM) run dev:down

db-up: ## Start only postgres
	$(NPM) run db:up

db-down: ## Stop databases
	$(NPM) run db:down

env-init: ## Create .env from .env.example if missing
	$(NPM) run env:init

docker-clean-test: ## Full rebuild from scratch (dangerous: wipes data)
	$(NPM) run docker:clean-test

prisma-generate: ## Generate Prisma client
	$(NPM) run prisma:generate

prisma-migrate: ## Run Prisma migrations (dev)
	$(NPM) run prisma:migrate

prisma-seed: ## Seed the database
	$(NPM) run prisma:seed

prisma-studio: ## Open Prisma Studio
	$(NPM) run prisma:studio

lint: ## Lint and autofix
	$(NPM) run lint

format: ## Format code with Prettier
	$(NPM) run format

test: ## Run unit tests
	$(NPM) test

test-watch: ## Run tests in watch mode
	$(NPM) run test:watch

test-cov: ## Run tests with coverage
	$(NPM) run test:cov

test-debug: ## Run tests in debug mode
	$(NPM) run test:debug

test-e2e: ## Run e2e tests
	$(NPM) run test:e2e