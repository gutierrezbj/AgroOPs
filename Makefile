# =============================================================================
# AgroOps — Makefile de comandos comunes (Mac local + producción)
# =============================================================================

.PHONY: help dev down logs psql redis-cli \
        db-migrate db-generate db-seed db-reset db-studio \
        install typecheck lint test e2e \
        build start \
        backup restore

help: ## Lista comandos disponibles
	@awk 'BEGIN {FS = ":.*##"; printf "\nAgroOps — comandos:\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# -----------------------------------------------------------------------------
# Infra local
# -----------------------------------------------------------------------------

dev: ## Levanta Postgres + Redis en Docker
	docker compose up -d
	@echo "Esperando a que la DB esté lista..."
	@until docker compose exec -T postgres pg_isready -U agroops -d agroops > /dev/null 2>&1; do sleep 1; done
	@echo "✓ Postgres listo en localhost:5432"
	@echo "✓ Redis listo en localhost:6379"

down: ## Para los servicios Docker
	docker compose down

logs: ## Logs de los servicios
	docker compose logs -f

psql: ## Abre psql contra la DB local
	docker compose exec postgres psql -U agroops -d agroops

redis-cli: ## Abre redis-cli local
	docker compose exec redis redis-cli

# -----------------------------------------------------------------------------
# Base de datos (Drizzle)
# -----------------------------------------------------------------------------

db-generate: ## Genera migraciones Drizzle desde el schema
	pnpm drizzle-kit generate

db-migrate: ## Aplica migraciones pendientes
	pnpm drizzle-kit migrate

db-seed: ## Carga datos seed (AgroM bootstrap)
	pnpm tsx src/db/seed/index.ts

db-reset: ## Drop + migrate + seed (¡borra DB local!)
	docker compose exec -T postgres psql -U agroops -d postgres -c "DROP DATABASE IF EXISTS agroops;"
	docker compose exec -T postgres psql -U agroops -d postgres -c "CREATE DATABASE agroops;"
	docker compose exec -T postgres psql -U agroops -d agroops -c "CREATE EXTENSION IF NOT EXISTS postgis;"
	$(MAKE) db-migrate
	$(MAKE) db-seed

db-studio: ## Abre Drizzle Studio
	pnpm drizzle-kit studio

# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------

install: ## Instala dependencias
	pnpm install

typecheck: ## tsc --noEmit
	pnpm tsc --noEmit

lint: ## ESLint
	pnpm eslint . --max-warnings 0

test: ## Vitest
	pnpm vitest run

e2e: ## Playwright críticos
	pnpm playwright test

build: ## Next.js production build
	pnpm build

start: ## Arranca la app productiva (post-build)
	pnpm start

# -----------------------------------------------------------------------------
# Backups (helpers para el servidor productivo)
# -----------------------------------------------------------------------------

backup: ## Dump Postgres + sync a S3-compatible (requiere env vars BACKUP_*)
	./scripts/backup.sh

restore: ## Restore desde el último backup (¡destructivo!)
	./scripts/restore.sh
