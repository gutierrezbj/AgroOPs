#!/usr/bin/env bash
#
# AgroOps — Deploy a VPS Hostinger
#
# Flujo idempotente vía SSH. Asume:
#  - El repo está clonado en /opt/agroops en el VPS
#  - El VPS tiene Docker + Docker Compose instalados
#  - El VPS tiene nginx con server block para agroops.systemrapid.io
#    apuntando a 127.0.0.1:3170 (ver docs/nginx-agroops.conf)
#  - El VPS tiene /opt/agroops/.env.production con todas las env vars
#    (AUTH_SECRET, POSTGRES_PASSWORD, AEMET_API_KEY, etc.)
#
# Variables esperadas en local:
#  AGROOPS_SSH_HOST     usuario@host del VPS (ej. juancho@vps.systemrapid.io)
#  AGROOPS_SSH_PORT     default 22
#  AGROOPS_REMOTE_PATH  default /opt/agroops
#
# Uso:
#  AGROOPS_SSH_HOST=juancho@vps.systemrapid.io ./scripts/deploy.sh
#
# Exit codes:
#  0 OK
#  1 prerequisito faltante (variable, comando, conectividad)
#  2 git pull falló en remoto
#  3 docker build falló
#  4 docker compose up falló
#  5 healthcheck post-deploy falló (rollback manual requerido)
#
# Filosofía:
#  - Build SE HACE EN EL VPS (no push registry) → 1 servidor único, sin registry.
#  - Snapshot DB antes del deploy → restore en 1 paso si rompe.
#  - Healthcheck post-deploy verifica /api/health responde 200/degraded.
#  - Notificación Telegram si está configurada (success + failure).

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
die()  { log "✗ ERROR: $*"; exit "${2:-1}"; }
require_env() {
  if [ -z "${!1:-}" ]; then die "Variable de entorno '$1' requerida" 1; fi
}

require_env AGROOPS_SSH_HOST
SSH_PORT="${AGROOPS_SSH_PORT:-22}"
REMOTE_PATH="${AGROOPS_REMOTE_PATH:-/opt/agroops}"
SSH="ssh -p ${SSH_PORT} -o ConnectTimeout=10 ${AGROOPS_SSH_HOST}"

LOCAL_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"
LOCAL_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
log "Local: branch=${LOCAL_BRANCH} sha=${LOCAL_SHA}"

# ─────────────────────────────────────────────────────────────────────────────
# Pre-deploy checks
# ─────────────────────────────────────────────────────────────────────────────

if [ "${LOCAL_BRANCH}" != "main" ]; then
  log "⚠  Estás en branch '${LOCAL_BRANCH}', no 'main'. Continuar? [y/N]"
  read -r ans
  [ "$ans" = "y" ] || die "Cancelado por usuario" 1
fi

log "Conectando a ${AGROOPS_SSH_HOST}:${SSH_PORT}..."
$SSH "echo connected OK" >/dev/null || die "No se puede SSH a ${AGROOPS_SSH_HOST}" 1

log "Verificando que ${REMOTE_PATH}/.env.production existe..."
$SSH "test -f ${REMOTE_PATH}/.env.production" \
  || die ".env.production NO existe en ${REMOTE_PATH}. Copia .env.production.example y rellena." 1

# ─────────────────────────────────────────────────────────────────────────────
# Pre-deploy snapshot DB
# ─────────────────────────────────────────────────────────────────────────────

log "→ Snapshot DB pre-deploy (por si hay que rollback)..."
$SSH "cd ${REMOTE_PATH} && bash scripts/backup.sh" \
  || log "⚠  Snapshot falló (no bloqueante, continuamos pero CUIDADO con rollback)"

# ─────────────────────────────────────────────────────────────────────────────
# Pull código + build
# ─────────────────────────────────────────────────────────────────────────────

log "→ Pull código en VPS..."
$SSH "cd ${REMOTE_PATH} && git fetch --all && git checkout ${LOCAL_SHA}" \
  || die "git pull/checkout falló en remoto" 2

log "→ Docker build (Next 16 standalone)..."
$SSH "cd ${REMOTE_PATH} && docker compose -f docker-compose.prod.yml --env-file .env.production build web" \
  || die "docker build falló" 3

# ─────────────────────────────────────────────────────────────────────────────
# Migraciones Drizzle
# ─────────────────────────────────────────────────────────────────────────────

log "→ Aplicar migraciones Drizzle..."
$SSH "cd ${REMOTE_PATH} && docker compose -f docker-compose.prod.yml --env-file .env.production run --rm web pnpm drizzle-kit migrate" \
  || die "Migración Drizzle falló — revisa logs y considera rollback" 4

# ─────────────────────────────────────────────────────────────────────────────
# Up (recreate web container)
# ─────────────────────────────────────────────────────────────────────────────

log "→ Recreando contenedor web..."
$SSH "cd ${REMOTE_PATH} && AGROOPS_VERSION=${LOCAL_SHA} docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate web" \
  || die "docker compose up falló" 4

# ─────────────────────────────────────────────────────────────────────────────
# Healthcheck post-deploy
# ─────────────────────────────────────────────────────────────────────────────

log "→ Esperando que /api/health responda..."
HEALTH_OK=0
for i in $(seq 1 20); do
  HEALTH_HTTP="$($SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost:3170/api/health" 2>/dev/null || echo 000)"
  if [ "${HEALTH_HTTP}" = "200" ]; then
    HEALTH_OK=1
    log "✓ /api/health 200 OK tras ${i}s"
    break
  fi
  if [ "${HEALTH_HTTP}" = "503" ]; then
    log "⚠  /api/health 503 — DB o Redis caídos. Revisar."
    break
  fi
  sleep 2
done

if [ "${HEALTH_OK}" = "0" ]; then
  $SSH "cd ${REMOTE_PATH} && docker compose -f docker-compose.prod.yml logs --tail 50 web"
  die "Healthcheck FAIL post-deploy. Revisa logs y considera rollback." 5
fi

# ─────────────────────────────────────────────────────────────────────────────
# Notificación Telegram (opcional)
# ─────────────────────────────────────────────────────────────────────────────

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  log "→ Notificando Telegram..."
  curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "content-type: application/json" \
    -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"✓ AgroOps deploy OK · sha ${LOCAL_SHA} · $(date -u '+%Y-%m-%d %H:%M UTC')\"}" >/dev/null
fi

log "✓ Deploy completado: https://agroops.systemrapid.io (sha ${LOCAL_SHA})"
