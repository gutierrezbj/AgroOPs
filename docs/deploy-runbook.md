# AgroOps — Runbook de despliegue a producción

**Última actualización:** 14-may-2026 (post primer deploy real a Servidor 2)
**Target:** `https://agroops.agrom.es` en VPS Hostinger (Servidor 2 = `187.77.71.102`, compartido con FitoLink)
**Estado tras primer deploy:** stack levantado + healthcheck verde. Pendiente DNS propagación + certbot.

---

## TL;DR — Estado actual y comando único de cierre

El stack ya está corriendo en Servidor 2 (`/opt/apps/agroops/`, containers `agroops-postgres`/`agroops-redis`/`agroops-web` healthy). Falta sólo el certificado TLS cuando Hostinger propague el A record. Comando único:

```bash
# 1. Verificar DNS en NS autoritativo (no en resolver público — bypasses TTL cache)
dig @athena.dns-parking.com agroops.agrom.es +short
# debe devolver 187.77.71.102

# 2. Cuando DNS esté verde, emitir cert + cargar HTTPS en el server block
ssh root@srs-staging \
  "certbot --nginx -d agroops.agrom.es \
   --non-interactive --agree-tos \
   --email gutierrezbj@gmail.com --redirect"

# 3. Verificar
curl -sSI https://agroops.agrom.es/api/health | head -3
```

---

## Checklist pre-primer-deploy (referencia histórica)

Esto se hizo el 14-may-2026. Documentado para que el deploy a un **segundo operador** (clone-and-deploy, ADR-2) sea reproducible.

### 0. Prerequisitos

- [ ] Acceso SSH al VPS (Tailscale recomendado: `root@srs-staging` — bypasses fail2ban del IP público)
- [ ] Docker + Docker Compose v2 en VPS (ya están si FitoLink corre)
- [ ] nginx 1.18+ con sites-available/sites-enabled en VPS
- [ ] certbot 1.21+ Let's Encrypt instalado

### 1. DNS

Apuntar `agroops.<DOMINIO>` (A record) al IP del VPS:

```
Tipo  Nombre               Valor              TTL
A     agroops              <IP_VPS>           3600
```

**⚠️ Hostinger lag**: el panel UI puede tardar **30-60 min** en propagar al NS autoritativo (`athena.dns-parking.com`, `apollo.dns-parking.com`). No es caché de tu cliente — es Hostinger interno. Verificar con:

```bash
dig @athena.dns-parking.com agroops.<DOMINIO> +short
# si responde IP nuevo → DNS verde en autoritativo, ahora sólo falta TTL en resolvers (max 1h)
# si responde IP viejo → Hostinger aún no propagó, espera o vuelve al panel a confirmar
```

**No bloquear el resto del deploy en DNS**: todos los pasos siguientes son agnósticos. Sólo certbot necesita DNS resuelto.

### 2. Clonar repo

```bash
ssh root@srs-staging
mkdir -p /opt/apps
cd /opt/apps
git clone https://github.com/gutierrezbj/AgroOPs.git agroops
cd agroops
git log --oneline -3   # sanity check
```

**Nota path**: `/opt/apps/agroops` (con `apps/` intermedio, convención SRS para multi-tenant VPS). No `/opt/agroops`.

### 3. Configurar `.env.production`

```bash
cd /opt/apps/agroops
cp .env.production.example .env.production
chmod 600 .env.production   # solo root lee
ln -s .env.production .env  # compose auto-discover
```

Rellenar las variables. **Secrets se generan en el propio VPS** (no por la red en claro):

```bash
# AUTH_SECRET — base64 está bien (Auth.js lo usa como cookie key, no en URL)
AUTH_SECRET_VAL=$(openssl rand -base64 32)
sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=${AUTH_SECRET_VAL}|" .env.production

# POSTGRES_PASSWORD — HEX, no base64 (URL-safe obligatorio para DATABASE_URL)
PG_PASS_VAL=$(openssl rand -hex 24)
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASS_VAL}|" .env.production
```

| Variable | De dónde sale |
|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` (HEX, ver advertencia abajo) |
| `AUTH_SECRET` | `openssl rand -base64 32` (cookie key, base64 OK) |
| `AEMET_API_KEY` | Registrar cuenta en https://opendata.aemet.es/ → API keys |
| `ENAIRE_NOTAM_FEED` | URL del feed AIXM XML (consultar AESA/ENAIRE) |
| `TELEGRAM_BOT_TOKEN` | Crear bot en `@BotFather` → token |
| `TELEGRAM_CHAT_ID` | Mensaje a `@userinfobot` desde el chat target → ID |
| `HOLDED_API_KEY` | **DEJAR VACÍO** — v1.0 va en modo manual (ADR-6) |

**⚠️ POSTGRES_PASSWORD HEX obligatorio**: el compose interpola en `DATABASE_URL=postgresql://agroops:${POSTGRES_PASSWORD}@postgres:5432/...`. El cliente `pg` parsea con `new URL()`. Caracteres `/` o `+` (frecuentes en base64) rompen el parseo silenciosamente → drizzle reporta `Failed query: CREATE SCHEMA "drizzle"` enmascarando un `ERR_INVALID_URL` en `e.cause`. Ver `tasks/lessons.md` 14-may-2026.

### 4. Verificar puertos libres + levantar Postgres+Redis

```bash
# Verificar puertos SRS AgroOps libres (offset +170)
ss -tlnp | grep -E ":3170|:6170|:6171" || echo "✓ libres"

# Levantar postgres + redis primero (sin web)
docker compose -f docker-compose.prod.yml up -d postgres redis

# Esperar pg_isready (max 40s)
for i in $(seq 1 20); do
  docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_isready -U agroops -d agroops >/dev/null 2>&1 && break
  sleep 2
done

# Verificar PostGIS extensions cargadas por scripts/db-init/01-extensions.sql
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U agroops -d agroops -c "SELECT extname FROM pg_extension;"
# debe listar: postgis, postgis_topology, pg_trgm, unaccent, plpgsql

# Verificar Redis
docker compose -f docker-compose.prod.yml exec -T redis redis-cli ping  # → PONG
```

### 5. Migrate Drizzle + seed AgroM (one-shot containers)

La imagen runtime `agroops-web:latest` es Next standalone — no incluye drizzle-kit ni tsx. Para migrate/seed usar containers efímeros `node:22-alpine` con bind mount del repo. Las dependencias se instalan **en /opt/apps/agroops/node_modules del host** (idempotente, persiste para futuros usos).

**Migrate** — usar la API programática de drizzle-orm (el CLI `drizzle-kit migrate` cuelga el spinner ora en non-TTY, ver lecciones):

```bash
cd /opt/apps/agroops
PG_PASS=$(grep ^POSTGRES_PASSWORD .env.production | cut -d= -f2-)

cat > _migrate.mjs <<'JS'
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await migrate(drizzle(pool), { migrationsFolder: "./src/db/migrations" });
console.log("✓ migraciones aplicadas");
await pool.end();
JS

docker run --rm \
  --network agroops_default \
  -v /opt/apps/agroops:/app \
  -w /app \
  -e DATABASE_URL="postgres://agroops:${PG_PASS}@postgres:5432/agroops" \
  node:22-alpine \
  sh -c 'unset NODE_ENV; corepack enable >/dev/null 2>&1 && corepack prepare pnpm@9 --activate >/dev/null 2>&1 && pnpm install --frozen-lockfile >/dev/null && node _migrate.mjs'

rm _migrate.mjs

# Verificar 13 tablas creadas
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U agroops -d agroops -c "\dt"
```

**Seed AgroM** — crea 3 users + 3 drones + 1 piloto + 1 cliente demo. Generar admin password fuerte:

```bash
ADMIN_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)

docker run --rm \
  --network agroops_default \
  -v /opt/apps/agroops:/app \
  -w /app \
  -e DATABASE_URL="postgres://agroops:${PG_PASS}@postgres:5432/agroops" \
  -e SEED_ADMIN_PASSWORD="${ADMIN_PASS}" \
  node:22-alpine \
  sh -c 'unset NODE_ENV; corepack enable >/dev/null 2>&1 && corepack prepare pnpm@9 --activate >/dev/null 2>&1 && pnpm exec tsx src/db/seed/index.ts'

echo ""
echo "🔐 ADMIN PASSWORD (apuntá YA): ${ADMIN_PASS}"
echo "   Email: juancho@systemrapid.io"
```

Pilotos/operarios seed quedan con la default `agroops-dev-2026` — pueden cambiarse luego vía UI o re-seed.

### 6. Docker build + web up

```bash
cd /opt/apps/agroops

# Build (~3-5 min primera vez, ~30s subsiguientes con cache)
docker compose -f docker-compose.prod.yml build web

# Up
docker compose -f docker-compose.prod.yml up -d web
sleep 8

# Healthcheck Docker (30s start-period)
docker inspect agroops-web --format '{{.State.Health.Status}}'
# debe ser "healthy" tras ~30-60s

# Healthcheck interno (sin nginx)
curl -sS http://127.0.0.1:3170/api/health
# debe responder JSON con status=ok|degraded (degraded esperado si integraciones vacías)
```

### 7. nginx server block

```bash
sudo cp /opt/apps/agroops/docs/nginx-agroops.conf \
  /etc/nginx/sites-available/agroops.agrom.es

# Inicial: HTTP-only (certbot añadirá 443 + redirect después)
# Si el conf del repo tiene 443 ya, instala una versión HTTP-only ahora.
# El conf "real" (con cert) se materializa tras certbot --nginx.

sudo ln -sf /etc/nginx/sites-available/agroops.agrom.es \
  /etc/nginx/sites-enabled/agroops.agrom.es

sudo nginx -t && sudo systemctl reload nginx

# Verificar proxy end-to-end (vía Host header, sin esperar DNS)
curl -sSi -H "Host: agroops.agrom.es" http://127.0.0.1/api/health | head -5
# debe responder 200 OK + JSON
```

### 8. Let's Encrypt cert (último paso, DEPENDE de DNS resuelto)

```bash
# Verificar primero que DNS está propagado al NS autoritativo
dig @athena.dns-parking.com agroops.agrom.es +short
# debe responder IP del VPS

# Si verde, emitir cert (certbot --nginx patcheará el server block para añadir 443 + redirect)
sudo certbot --nginx -d agroops.agrom.es \
  --non-interactive --agree-tos \
  --email gutierrezbj@gmail.com --redirect

# Verificar HTTPS
curl -sSI https://agroops.agrom.es/api/health | head -3
```

### 9. Verificación end-to-end usuario final

1. Browser → `https://agroops.agrom.es/login`
2. Login con `juancho@systemrapid.io` / `<ADMIN_PASS del paso 5>`
3. `/dashboard/map` → verificar que tiles CARTO Voyager cargan
4. Si AEMET key configurada: crear misión draft con parcela → transitar `approved → preflight` → ver `weatherSnapshot` real (no stub)
5. Si ENAIRE feed configurado: `/dashboard/map` → leyenda "NOTAMs (N)" con N > 0

### 10. Backup diario

GitHub Action `backup-daily.yml` (cron 03:30 UTC) ya commiteado. Configurar secrets en repo GitHub:

- `DATABASE_URL` — túnel SSH a Postgres del VPS, o tail manual
- `BACKUP_S3_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY` — Backblaze B2 o Hetzner Storage Box
- `BACKUP_GPG_PUBLIC_KEY` (opcional) — clave pública GPG
- `TELEGRAM_BOT_TOKEN/CHAT_ID` (opcional) — alertas backup

Alternativa: cron en VPS con `scripts/backup.sh`.

---

## Deploys subsiguientes

Una vez todo esto está hecho una vez:

```bash
# En tu Mac, tras git push origin main:
export AGROOPS_SSH_HOST=root@srs-staging
./scripts/deploy.sh
```

`scripts/deploy.sh` es idempotente:
1. Snapshot DB pre-deploy
2. Pull código en VPS
3. Docker build (cache hit en deps si no tocaste package.json)
4. Migrate Drizzle (si hay migración nueva)
5. Recreate web con cero downtime (compose detecta cambio)
6. Healthcheck post-deploy (rollback manual si falla)
7. Notificación Telegram

---

## Rollback

```bash
ssh root@srs-staging
cd /opt/apps/agroops

# 1. Volver al commit anterior
git log --oneline -10
git checkout <sha_anterior>

# 2. Rebuild + up
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d --force-recreate web

# 3. Restore DB si migración rompió datos
ls storage/backups/
gunzip -c storage/backups/agroops_YYYYMMDD_HHMMSS.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T postgres psql -U agroops -d agroops
```

---

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `502 Bad Gateway` | Web caído | `docker compose -f docker-compose.prod.yml logs web` |
| `/api/health` → 307 redirect a `/login` | matcher de middleware no excluye `api/health` | ver lessons 14-may-2026; fix en `src/middleware.ts` ya aplicado en repo |
| `/api/health` → 503 | DB o Redis caído | `docker compose ps`, restart si hace falta |
| Docker build falla con `DATABASE_URL no definida` | `src/db/index.ts` con init top-level | ya fixed en repo (lazy init via Proxy, `b149b3e`) |
| `Failed query: CREATE SCHEMA "drizzle"` durante migrate | `POSTGRES_PASSWORD` base64 con `/` o `+` | regenerar con `openssl rand -hex 24`, recrear volumen postgres |
| drizzle-kit migrate cuelga spinner | non-TTY (docker run, CI) | usar API programática `migrate()` de `drizzle-orm/node-postgres/migrator` |
| `dig` devuelve IP viejo después de cambiar DNS | Hostinger panel → auth NS lag | esperar 30-60min, o verificar que el cambio se guardó en el panel |
| Login no funciona | `AUTH_SECRET` distinto entre deploys | `.env.production` NO se regenera entre deploys |
| Mapa vacío | Sesión sin permisos o filtro raro | Inspeccionar `/api/parcels/geojson?clientId=...` con cookies |
| NOTAMs siempre 0 | `ENAIRE_NOTAM_FEED` no configurado | `/api/health` → check enaire |
| Meteo es stub | `AEMET_API_KEY` no configurado | `/api/health` → check aemet |

---

## Ports y convención SRS

| Servicio | Puerto host | Puerto contenedor | Convención SRS |
|---|---|---|---|
| Postgres | `127.0.0.1:6170` | `5432` | offset +170 |
| Redis | `127.0.0.1:6171` | `6379` | offset +170 |
| Next.js standalone | `127.0.0.1:3170` | `3000` | offset +170 |

Todos bindeados a localhost. nginx termina TLS y reenvía. **NO** abrir Postgres/Redis al exterior.

---

## SSH y Tailscale

El VPS (Servidor 2 = 187.77.71.102) tiene fail2ban activo en SSH público. Para evitar bans accidentales:

- **Recomendado**: Tailscale (`ssh root@srs-staging` → `100.110.52.22`). Bypassa el firewall público, sin riesgo de ban.
- IP pública sólo para deploys script-driven con keys correctas.

Si te baneas accidentalmente:
```bash
# desde Tailscale (donde no estás baneado)
ssh root@srs-staging "fail2ban-client unban <tu-IP-pública>"
```

---

## Memoria del proyecto

Cualquier sesión futura sobre AgroOps debe leer:
- `~/.claude/projects/...SRS---AGRO/memory/CRITICAL_no_inventar.md` — regla #1
- Esta runbook + `CLAUDE.md` sección "Despliegue"
- `tasks/lessons.md` — todas las lecciones aprendidas, en orden cronológico

Si algo no está documentado aquí o en código verificable: **PREGUNTAR**, no inventar.
