#!/usr/bin/env bash
# =============================================================================
# AgroOps — Bootstrap Mac local
# Levanta servicios, instala deps, aplica migraciones y seed.
# Idempotente: se puede correr varias veces sin romper nada.
# =============================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

step() { echo -e "\n${GREEN}▶ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

step "Verificando dependencias del sistema..."
command -v docker >/dev/null 2>&1 || fail "Docker no encontrado. Instala Docker Desktop."
command -v node >/dev/null 2>&1 || fail "Node no encontrado. Instala Node 22 (volta install node@22)."
command -v pnpm >/dev/null 2>&1 || fail "pnpm no encontrado. corepack enable && corepack prepare pnpm@9 --activate"

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 22 ]; then
  fail "Node $NODE_MAJOR detectado. Se requiere Node 22."
fi
echo "  ✓ Docker, Node $(node -v), pnpm $(pnpm -v)"

step "Verificando .env.local..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  warn ".env.local creado desde .env.example. Edítalo si necesitas API keys reales."
else
  echo "  ✓ .env.local existe"
fi

step "Instalando dependencias..."
pnpm install

step "Levantando servicios Docker (Postgres + Redis)..."
docker compose up -d
echo "  Esperando a que Postgres esté listo..."
until docker compose exec -T postgres pg_isready -U agroops -d agroops > /dev/null 2>&1; do
  sleep 1
done
echo "  ✓ Postgres listo"
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
  sleep 1
done
echo "  ✓ Redis listo"

step "Aplicando migraciones Drizzle..."
pnpm drizzle-kit migrate || warn "Sin migraciones aún (primer setup). Se generarán cuando exista el schema."

step "Cargando seed inicial AgroM..."
if [ -f src/db/seed/index.ts ]; then
  pnpm tsx src/db/seed/index.ts
else
  warn "Seed aún no implementado (src/db/seed/index.ts no existe)."
fi

step "Bootstrap completado."
cat <<EOF

╔════════════════════════════════════════════════════════════════════╗
║                      AgroOps listo para dev                        ║
╠════════════════════════════════════════════════════════════════════╣
║  App:        http://localhost:3000   (arranca con: pnpm dev)       ║
║  Postgres:   localhost:5432          (psql: make psql)             ║
║  Redis:      localhost:6379          (cli:  make redis-cli)        ║
║  Studio:     pnpm drizzle-kit studio                               ║
╚════════════════════════════════════════════════════════════════════╝

EOF
