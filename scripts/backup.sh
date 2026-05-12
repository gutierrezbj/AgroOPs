#!/usr/bin/env bash
#
# AgroOps — Backup automático de PostgreSQL (HU-24)
#
# Hace `pg_dump` de la base de datos AgroOps, lo comprime con gzip, opcionalmente
# lo cifra con GPG y lo sube a un bucket S3-compatible. Está pensado para
# ejecutarse desde:
#  - Cron diario en el servidor productivo, o
#  - GitHub Action programada (.github/workflows/backup-daily.yml).
#
# Requisitos: pg_dump, gzip, aws-cli o rclone, opcional gpg.
#
# Variables esperadas en el entorno:
#   DATABASE_URL              postgresql://user:pass@host:port/db (obligatorio)
#   BACKUP_S3_ENDPOINT        URL S3-compatible (opcional, p.ej. Backblaze)
#   BACKUP_S3_BUCKET          nombre bucket (obligatorio si S3 activo)
#   BACKUP_S3_ACCESS_KEY      AWS_ACCESS_KEY_ID equivalente
#   BACKUP_S3_SECRET_KEY      AWS_SECRET_ACCESS_KEY equivalente
#   BACKUP_GPG_RECIPIENT      email/uid GPG (opcional — si no, no cifra)
#   BACKUP_LOCAL_DIR          dir local para backups (default ./storage/backups)
#   BACKUP_RETAIN_DAYS        días a conservar localmente (default 7)
#
# Salida:
#   - storage/backups/agroops_YYYYMMDD_HHMMSS.sql.gz[.gpg]
#   - s3://<bucket>/agroops/YYYY/MM/agroops_YYYYMMDD_HHMMSS.sql.gz[.gpg]
#
# Exit codes:
#   0 OK
#   1 prerequisito faltante (variable, comando)
#   2 pg_dump falló
#   3 cifrado GPG falló
#   4 upload S3 falló

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Funciones auxiliares
# ─────────────────────────────────────────────────────────────────────────────

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

die() {
  log "ERROR: $*"
  exit "${2:-1}"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Comando '$1' no encontrado en PATH" 1
}

require_env() {
  if [ -z "${!1:-}" ]; then
    die "Variable de entorno '$1' requerida" 1
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Validaciones
# ─────────────────────────────────────────────────────────────────────────────

require_cmd pg_dump
require_cmd gzip
require_env DATABASE_URL

BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-./storage/backups}"
BACKUP_RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"

mkdir -p "$BACKUP_LOCAL_DIR"

TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
BASENAME="agroops_${TIMESTAMP}.sql.gz"
LOCAL_PATH="${BACKUP_LOCAL_DIR}/${BASENAME}"

# ─────────────────────────────────────────────────────────────────────────────
# pg_dump + gzip
# ─────────────────────────────────────────────────────────────────────────────

log "Iniciando pg_dump → ${LOCAL_PATH}"
if ! pg_dump --no-owner --no-acl --format=plain "$DATABASE_URL" | gzip -9 > "$LOCAL_PATH"; then
  rm -f "$LOCAL_PATH"
  die "pg_dump falló" 2
fi
SIZE=$(stat -f%z "$LOCAL_PATH" 2>/dev/null || stat -c%s "$LOCAL_PATH")
log "Backup local OK (${SIZE} bytes)"

# ─────────────────────────────────────────────────────────────────────────────
# Cifrado GPG opcional
# ─────────────────────────────────────────────────────────────────────────────

UPLOAD_PATH="$LOCAL_PATH"
UPLOAD_NAME="$BASENAME"

if [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
  require_cmd gpg
  log "Cifrando con GPG (recipient: $BACKUP_GPG_RECIPIENT)"
  if ! gpg --batch --yes --trust-model always \
       --encrypt --recipient "$BACKUP_GPG_RECIPIENT" \
       --output "${LOCAL_PATH}.gpg" "$LOCAL_PATH"; then
    die "gpg --encrypt falló" 3
  fi
  UPLOAD_PATH="${LOCAL_PATH}.gpg"
  UPLOAD_NAME="${BASENAME}.gpg"
  # Borramos la versión sin cifrar para no dejarla en disco
  rm -f "$LOCAL_PATH"
  log "Backup cifrado: $UPLOAD_PATH"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Upload S3-compatible opcional
# ─────────────────────────────────────────────────────────────────────────────

if [ -n "${BACKUP_S3_BUCKET:-}" ] && [ -n "${BACKUP_S3_ACCESS_KEY:-}" ]; then
  require_cmd aws
  YEAR_MONTH="$(date '+%Y/%m')"
  S3_KEY="agroops/${YEAR_MONTH}/${UPLOAD_NAME}"

  log "Subiendo a S3-compatible bucket=$BACKUP_S3_BUCKET key=$S3_KEY"

  AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY" \
  AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY" \
  aws --endpoint-url "${BACKUP_S3_ENDPOINT:-https://s3.amazonaws.com}" \
      s3 cp "$UPLOAD_PATH" "s3://${BACKUP_S3_BUCKET}/${S3_KEY}" \
      --no-progress \
    || die "Upload S3 falló" 4

  log "Upload OK"
else
  log "S3 no configurado — backup solo local"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Rotación local
# ─────────────────────────────────────────────────────────────────────────────

log "Rotando backups locales (>$BACKUP_RETAIN_DAYS días)"
find "$BACKUP_LOCAL_DIR" -type f -name 'agroops_*.sql.gz*' \
  -mtime "+$BACKUP_RETAIN_DAYS" -print -delete || true

log "Backup completado: $UPLOAD_NAME"
