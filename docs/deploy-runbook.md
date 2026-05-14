# AgroOps — Runbook de despliegue a producción

**Última actualización:** 14-may-2026
**Target:** `agroops.agrom.es` en VPS Hostinger (mismo VPS que FitoLink)

---

## Checklist pre-primer-deploy

Esto se hace **UNA VEZ**. Después, deploys subsiguientes son `./scripts/deploy.sh`.

### 0. Prerequisitos

- [ ] Acceso SSH al VPS Hostinger (mismo que FitoLink)
- [ ] Docker + Docker Compose instalados en VPS (ya están si FitoLink corre)
- [ ] nginx instalado en VPS (ya está si FitoLink corre)
- [ ] certbot Let's Encrypt instalado en VPS

### 1. DNS

Apuntar `agroops.agrom.es` (A record) al IP del VPS. Hostinger panel DNS:

```
Tipo  Nombre               Valor              TTL
A     agroops              <IP_VPS>           3600
```

Esperar propagación (5-30 min). Verificar:

```bash
dig +short agroops.agrom.es
# Debe devolver el IP del VPS
```

### 2. Clonar repo en el VPS

```bash
ssh juancho@vps.systemrapid.io
sudo mkdir -p /opt/agroops
sudo chown $USER:$USER /opt/agroops
cd /opt/agroops
git clone https://github.com/gutierrezbj/AgroOPs.git .
```

### 3. Configurar `.env.production`

```bash
cd /opt/agroops
cp .env.production.example .env.production
chmod 600 .env.production   # solo owner lee
```

Rellenar **TODAS** las variables marcadas `__...__`:

| Variable | De dónde sale |
|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -base64 24` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AEMET_API_KEY` | Registrar cuenta en https://opendata.aemet.es/ → API keys |
| `ENAIRE_NOTAM_FEED` | URL del feed AIXM XML (consultar AESA/ENAIRE) |
| `TELEGRAM_BOT_TOKEN` | Crear bot en `@BotFather` → token |
| `TELEGRAM_CHAT_ID` | Mensaje a `@userinfobot` desde el chat target → ID |
| `HOLDED_API_KEY` | **DEJAR VACÍO** — v1.0 va en modo manual |

### 4. nginx server block

Copiar el snippet:

```bash
sudo cp /opt/agroops/docs/nginx-agroops.conf /etc/nginx/sites-available/agroops.agrom.es.conf
sudo ln -s /etc/nginx/sites-available/agroops.agrom.es.conf /etc/nginx/sites-enabled/
sudo nginx -t                # debe pasar sin errores
```

### 5. Let's Encrypt cert

```bash
sudo certbot --nginx -d agroops.agrom.es
# Confirma email + acepta T&C. Certbot añade la config TLS al server block.
sudo nginx -s reload
```

### 6. Primer build + up

Desde tu Mac:

```bash
cd "/Users/juanguti/.../AgroOPs"
export AGROOPS_SSH_HOST=juancho@vps.systemrapid.io
./scripts/deploy.sh
```

El script:
1. Snapshot DB pre-deploy (vacía la primera vez)
2. git pull en VPS (sha actual)
3. Docker build (~3-5 min primera vez)
4. Migrate Drizzle (crea las 13 tablas + PostGIS extensions)
5. Up contenedor web
6. Healthcheck `/api/health` → 200

### 7. Seed inicial AgroM

**Una vez después del primer deploy** — crea los 3 usuarios + 3 drones + 1 cliente seed:

```bash
ssh juancho@vps.systemrapid.io
cd /opt/agroops
docker compose -f docker-compose.prod.yml --env-file .env.production \
  run --rm web pnpm tsx src/db/seed/index.ts
```

Credenciales de los 3 usuarios seed:
- `juancho@systemrapid.io` (admin) — **CAMBIAR PASSWORD ANTES DE OPERAR**
- `john@agrom.es` (piloto) — ídem
- `adriana@agrom.es` (operario) — ídem

Password seed default: `agroops-dev-2026` (configurable via `SEED_ADMIN_PASSWORD` etc).

### 8. Verificación end-to-end

1. Abrir `https://agroops.agrom.es/login` desde browser
2. Login con `juancho@systemrapid.io` / password seed
3. Ir a `/dashboard/map` → verificar que los tiles CARTO Voyager cargan
4. Si AEMET key está configurada: crear misión draft con parcela, transitar a `approved → preflight` → verificar que `weatherSnapshot` se captura con `flightSuitable` real (no stub)
5. Si ENAIRE feed está configurado: ir a `/dashboard/map` → verificar leyenda "NOTAMs (N)" con N > 0

### 9. Activar backup diario

GitHub Action `backup-daily.yml` (cron 03:30 UTC) ya está configurado. Necesita estos **secrets** en GitHub repo settings → Secrets → Actions:

- `DATABASE_URL` — string de conexión al Postgres del VPS (vía túnel SSH o tail manual el primer mes)
- `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY`, `BACKUP_S3_SECRET_KEY` — Backblaze B2 o Hetzner Storage Box
- `BACKUP_GPG_PUBLIC_KEY` (opcional) — clave pública GPG para cifrar
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (opcional) — alertas backup

Alternativa: cron en el VPS directamente con `scripts/backup.sh` (sin GitHub Actions).

---

## Deploys subsiguientes

```bash
# En tu Mac, tras hacer git push origin main:
export AGROOPS_SSH_HOST=juancho@vps.systemrapid.io
./scripts/deploy.sh
```

El script es idempotente y maneja:
- Snapshot DB pre-deploy
- Pull código + build Docker
- Migraciones Drizzle
- Recreate contenedor web
- Healthcheck post-deploy (rollback manual si falla)
- Notificación Telegram

---

## Rollback

Si el deploy rompe:

```bash
ssh juancho@vps.systemrapid.io
cd /opt/agroops

# 1. Volver al commit anterior
git log --oneline -10                # ver commits recientes
git checkout <sha_anterior>

# 2. Rebuild + up
docker compose -f docker-compose.prod.yml --env-file .env.production build web
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate web

# 3. Restore DB si la migración rompió datos
ls storage/backups/                  # buscar agroops_YYYYMMDD_HHMMSS.sql.gz
gunzip -c storage/backups/agroops_*.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U agroops -d agroops
```

---

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `502 Bad Gateway` | Contenedor web caído o no responde | `docker compose -f docker-compose.prod.yml logs web` |
| `/api/health` → 503 | DB o Redis caído | `docker compose ps` ver health, `docker compose restart postgres redis` |
| Login no funciona | `AUTH_SECRET` distinto entre deploys | Verificar que `.env.production` NO se regeneró |
| Mapa vacío (sin parcelas) | Sesión sin permisos o filtro clientId raro | Inspeccionar `/api/parcels/geojson?clientId=...` con cookies |
| NOTAMs siempre 0 | `ENAIRE_NOTAM_FEED` no configurado | Ver `/api/health` → check enaire status |
| Meteo es stub | `AEMET_API_KEY` no configurado | Ver `/api/health` → check aemet status |

---

## Ports y convención SRS

| Servicio | Puerto host | Puerto contenedor | Convención SRS |
|---|---|---|---|
| Postgres | `127.0.0.1:6170` | `5432` | offset +170 |
| Redis | `127.0.0.1:6171` | `6379` | offset +170 |
| Next.js standalone | `127.0.0.1:3170` | `3000` | offset +170 |

Todos bindeados a localhost. nginx termina TLS y reenvía. **NO** abrir Postgres/Redis al exterior.

---

## Memoria del proyecto

Cualquier sesión futura sobre AgroOps debe leer:
- `/Users/juanguti/.claude/projects/...SRS---AGRO/memory/CRITICAL_no_inventar.md` — regla #1
- Esta runbook + `CLAUDE.md` sección "Despliegue"

Si algo no está documentado aquí o en código verificable: **PREGUNTAR**, no inventar.
