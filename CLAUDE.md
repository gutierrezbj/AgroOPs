# CLAUDE.md — Contexto operativo AgroOps

Este archivo da contexto a cualquier sesión de IA (Claude, Cursor, etc.) que trabaje sobre el repo. **Léelo antes de tocar nada.**

---

## Producto

**AgroOps** — Sistema de gestión de operaciones UAS especializado en aplicación fitosanitaria aérea con dron. Cierra el ciclo: orden → planificación → vuelo → albarán firmado en finca → factura Holded → registro PAC, todo en una interfaz.

Producto SRS con marca propia. Primer deployment: **AgroM**.

---

## Decisiones arquitectónicas críticas

Resumen de los ADRs (la versión completa vive en Notion → SDD-04).

- **ADR-1.** PostgreSQL 16 + PostGIS + Drizzle (no Mongo). Justificado por naturaleza geoespacial.
- **ADR-2.** Single-tenant per deployment. **Sin `tenant_id`, sin RLS, sin gestión de tenants en UI.** Si aparece segundo operador → clone-and-deploy.
- **ADR-3.** Integración FitoLink vía API limpia (no shared DB). API pública es v1.2.
- **ADR-4.** El producto fitosanitario lo aporta el cliente final. AgroOps no gestiona stock.
- **ADR-5.** Operación bajo paraguas Drovinci (NPTA AESA) hasta SORA propia AgroM.
- **ADR-6.** Facturación delegada a Holded. Holded es fuente de verdad fiscal. **v1.0 opera en modo `manual` por defecto** — AgroM emite las facturas en Holded a mano fuera del sistema. La integración API (HU-18/19/20) queda implementada y testeada esperando activación vía `AGROOPS_INVOICING_MODE=holded`. La decisión de cuándo activar es del operador.
- **ADR-7.** Auth.js v5 con credentials + bcrypt + Redis. Sin adapter multi-tenant.
- **ADR-8.** API pública (v1.2) versionada por path `/api/v1/...`.
- **ADR-9.** Backups encriptados off-site (S3-compatible). Restore probado mensual.
- **ADR-10.** Naming: AgroOps producto vs AgroM operador. Siempre comunicar AgroOps como producto independiente.

---

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind 4 + Design System SRS Agro (ver `DESIGN.md`, **no Shadcn defaults**)
- PostgreSQL 16 + PostGIS 3.4
- Drizzle ORM
- Auth.js v5 + bcrypt + Redis
- MapLibre GL JS + tiles CARTO
- Server Actions + Zod + `useActionState`
- Docker Compose + Caddy + GitHub Actions

---

## Reglas no negociables

1. **TypeScript strict.** Sin `any` salvo justificación documentada inline.
2. **Server Actions tipadas con Zod schema en input.** Sin excepción.
3. **Audit log para toda mutación crítica** (misiones, albaranes, facturas, fito).
4. **RBAC chequeado en server.** Nunca confiar en el cliente.
5. **Queries siempre vía Drizzle.** Raw SQL solo en migraciones.
6. **Componentes sin lógica de negocio.** Separar en `server/services/`.
7. **No hardcodear credenciales, API keys ni secretos.**
8. **No añadir gestión de tenants en UI.** Single-tenant per deployment es ley.

---

## Convenciones

- **Imports:** absolutos con `@/`.
- **Naming archivos:** kebab-case para archivos, PascalCase para componentes React.
- **Tests:** Vitest unitarios para lógica de negocio (cobertura objetivo 80% en `features/`). Playwright para flujos críticos E2E.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`).
- **Branches:** trabajo directo en `main` cuando el cambio es seguro. Branches `feat/<epica>-<historia>` para trabajo de varios días.

---

## Estructura

```text
src/
  app/                # Next.js App Router (rutas + layouts)
  components/         # UI compartida (átomos, moléculas)
  features/           # módulos verticales por épica del backlog
    fleet/            # EP-02
    parcels/          # EP-03 (parcial)
    phytosanitary/    # EP-03 (parcial)
    missions/         # EP-04
    map/              # EP-05
    documents/        # EP-06
    invoicing/        # EP-07
    field-notebook/   # EP-08
  lib/                # utilidades puras, adapters externos
  db/
    schema/           # Drizzle schemas por dominio
    migrations/       # generadas por drizzle-kit
    seed/             # datos seed (AgroM bootstrap)
  server/
    actions/          # Server Actions tipadas
    services/         # lógica de negocio
    integrations/     # AEMET, ENAIRE, DroneHub, Holded
    audit/            # audit log helpers
```

---

## Backlog activo

Ver `tasks/todo.md` (derivado de SDD-05). Épicas v1.0:

- EP-01 — Bootstrap single-tenant
- EP-02 — Fleet management
- EP-03 — Parcelas y catálogo
- EP-04 — Mission state machine
- EP-05 — Mapa y meteo
- EP-06 — Documentos
- EP-07 — Facturación Holded
- EP-08 — Cuaderno de campo + cumplimiento
- EP-09 — Audit + observabilidad

Cronograma SDD-08: **9 semanas v1.0** (Sprint 0 + 5 sprints).

---

## Despliegue

- **Sin staging.** Mac local → push a `main` → CI verde → deploy automático a producción.
- **Dominio:** `agroops.systemrapid.io` (staging + operación interna AgroM). `app.agroops.es` queda reservado para producción comercial futura (ADR-10 naming AgroOps producto independiente).

---

## Backup & Restore (HU-24)

**Backup:** `scripts/backup.sh` ejecuta `pg_dump` → gzip → opcional GPG → opcional S3-compatible. Se programa vía `.github/workflows/backup-daily.yml` (cron `30 3 * * *` UTC). Conserva 7 días local (`BACKUP_RETAIN_DAYS`).

**Restore (probado mensualmente):**

```bash
# 1. Descargar el backup desde S3 (último OK)
aws --endpoint-url $BACKUP_S3_ENDPOINT \
    s3 cp s3://$BACKUP_S3_BUCKET/agroops/2026/05/agroops_20260512_033012.sql.gz ./

# 2. (opcional) Descifrar si tiene .gpg
gpg --decrypt agroops_20260512_033012.sql.gz.gpg > agroops_20260512_033012.sql.gz

# 3. Restaurar a un DB de prueba (NO sobreescribir productivo sin disaster)
createdb agroops_restore_test
gunzip -c agroops_20260512_033012.sql.gz | psql -d agroops_restore_test

# 4. Verificar
psql -d agroops_restore_test -c "SELECT COUNT(*) FROM missions;"
psql -d agroops_restore_test -c "SELECT PostGIS_Version();"

# 5. Limpiar
dropdb agroops_restore_test
```

Hito Sprint 5: registrar restore manual en `tasks/lessons.md` cada mes.

---

## Facturación: modo manual vs Holded

Controlado por la env `AGROOPS_INVOICING_MODE`:

- **`manual` (default v1.0)** — AgroOps NO toca Holded API. La transición `completed → invoiced` sólo exige albarán firmado; aparece un warning recordando facturar a mano. El `InvoicePanel` muestra explicación del modo y oculta los botones de disparo Holded. La integración (`createHoldedInvoice`, `syncHoldedInvoiceStatus`, sincronización de contactos, panel UI) queda completa en código + 349 tests y se activa con un cambio de env.
- **`holded`** — Disparo automático activo. Requiere:
  - `HOLDED_API_KEY` configurada
  - `AGROOPS_PRICE_PER_HA_EUR > 0`
  - Cada cliente con `holdedContactId` sincronizado (botón en `/dashboard/clients/[id]`)
  - El gate `completed → invoiced` exige factura emitida en Holded; el side-effect en `transitionMission` la dispara automáticamente si no existe.

**Switch operativo:** cambiar la env, reiniciar el servicio. Sin migración de DB. Las misiones ya marcadas como `invoiced` en modo manual mantienen su estado; las nuevas pasarán por el gate estricto.

---

## E2E Playwright (Sprint 5)

**Suite E2E** en `/e2e/*.spec.ts` cubre los flows críticos:
- `auth.spec.ts` — login admin + dashboard + logout + credenciales inválidas
- `health.spec.ts` — `/api/health` público con DB+Redis ok
- `field-notebook.spec.ts` — cuaderno PAC + export PDF con filtros
- `dashboard-shell.spec.ts` — smoke de las 11 pantallas principales

**Setup local (1ª vez):**
```bash
pnpm e2e:install              # descarga Chromium (~150MB)
make dev                      # arranca Postgres + Redis docker
pnpm db-migrate && pnpm db-seed   # schema + seed AgroM
pnpm e2e                      # corre toda la suite (Playwright levanta Next.js solo)
```

**Iteración:** `pnpm e2e:ui` abre el UI mode de Playwright para depurar.

**CI:** `.github/workflows/e2e.yml` arranca Postgres+Redis services, aplica migraciones, seed, build y corre los tests. Sube `playwright-report/` + screenshots/videos como artifact si algún test falla.

---

## Lighthouse audit (Sprint 5)

`scripts/lighthouse-audit.sh` ejecuta Lighthouse sobre las pantallas públicas (`/login` en v1.0) y guarda reportes HTML+JSON timestamped en `storage/lighthouse/<timestamp>/`. Umbral performance configurable vía `LH_THRESHOLD_PERF` (default 90).

```bash
pnpm dev                     # arrancar server
pnpm lighthouse:audit        # auditar baseline
open storage/lighthouse/<timestamp>/summary.md
```

En v1.1: extender para auditar pantallas autenticadas con puppeteer login script previo.

---

## Observabilidad (HU-25)

- `GET /api/health` — endpoint público sin auth. Retorna `{ status, version, uptime, checks }`. HTTP 503 si DB o Redis caídos, 200 en cualquier otro caso (status puede ser `degraded` cuando integraciones opcionales no configuradas).
- Telegram alerts vía `notifyTelegram()` en `src/server/observability/telegram.ts`. No-op si `TELEGRAM_BOT_TOKEN` no configurado.
- Audit log UI en `/dashboard/audit-log` (solo admin). Filtros por fecha, usuario, entidad, acción.
- **Disciplina pre-merge:** 0 errores TS, 0 ESLint errors, e2e críticos verdes, migraciones reversibles.
- **Pre-deploy:** snapshot DB automático.
- **Post-deploy:** healthcheck Telegram + registro SA99.

---

## Identity Sprint

**v1 aplicada (Notion → Identity Tokens v1 — Para aplicar en código (Sprint 1)).** Tokens consumidos vía `src/app/globals.css`:

- **Paleta SaaS** — 9 slots (`--bg`, `--surface`, `--surface-elevated`, `--text`, `--text-muted`, `--border`, `--accent-action` = `--brand-primary` = `#1B4332`, `--accent-info` = `#2563EB`, `--accent-ok`, `--accent-warn`, `--accent-danger`).
- **Marca AgroOps** — `--brand-primary` deep `#1B4332` (forest emergente), `--brand-accent` terra `#E07A3C` (solo logo/elementos de marca, nunca CTAs), papel `#F4F0E8`, pergamino `#E8DDC9`.
- **Tipografía** — Fraunces variable (display, opsz 9-144 + wght 300-900) para `h1/h2/h3`, IBM Plex Sans (body 300-700), IBM Plex Mono (datos técnicos, lotes, coordenadas).
- **Density:** cozy. **Shadows:** subtle. **No dark mode en v1.**
- **Assets:** `/public/agroops-logo.svg` (wordmark 360×100) + `/public/favicon.svg` (monograma M sobre deep).

**Reglas vigentes:**
- Toda pantalla productiva debe consumir tokens (`var(--accent-action)`, `var(--text)`, etc.), no hex hardcoded.
- `--brand-accent` (terra) solo en logo / acentos de marca. Las acciones (CTAs, links activos) usan `--accent-action` (deep).
- Distinctiveness Audit aplica desde aquí: si una pantalla podría ser de Shadcn-stock → reescribir.

---

## Lecciones acumuladas

Ver `tasks/lessons.md`. Actualízalo siempre que un cambio rompa algo no obvio.
