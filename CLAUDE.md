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

## Distinctiveness Audit checklist (Sprint 5)

Antes de declarar una pantalla productiva como "lista", revisar contra
este checklist. Cualquier "no" obliga a refactor antes de liberar.

**Shell + navegación**
- [ ] Está dentro del layout `/dashboard/layout.tsx` (header sticky con logo
      AgroOps + nav primaria + user chip + footer SRS).
- [ ] El link de la nav primaria correspondiente aparece con estado activo
      (`dashboard-nav__link--active` con border-bottom terra).
- [ ] El usuario ve su nombre/email + rol-pill + botón de logout sin
      tener que bajar a la página.

**Marca**
- [ ] Headings (h1/h2/h3) en `var(--font-display)` Fraunces.
- [ ] Body en `var(--font-body)` IBM Plex Sans.
- [ ] Datos técnicos (códigos `AGM-YYYY-XXXX`, lotes, coordenadas, SHA-256)
      en `var(--font-mono, ui-monospace)` IBM Plex Mono.
- [ ] CTAs usan `var(--accent-action)` (deep `#1B4332`).
- [ ] `var(--brand-accent)` (terra `#E07A3C`) **sólo** en logo, dot del
      wordmark, active state de nav, polígono en construcción del mapa.
      Nunca en CTAs operativos.

**Densidad y respiración**
- [ ] Padding mínimo 1.25rem en contenedores principales (cozy density).
- [ ] Botones primarios: `padding: 0.4-0.5rem 0.9-1rem`, `border-radius:
      var(--radius-base)` (4px), font-size ≥ 0.875rem.
- [ ] Cards / paneles: `border-radius: var(--radius-lg)` (6px),
      `box-shadow: var(--shadow-subtle)`, fondo `var(--surface-elevated)`.

**Estados**
- [ ] **Empty state**: componente `EmptyState` con copy específico del
      producto (no "No data"). Acción primaria con next-step obvio.
- [ ] **Loading**: el server component carga datos antes de renderizar;
      los formularios usan `useActionState` con `pending` legible
      ("Creando…", "Guardando…").
- [ ] **Error**: `role="alert"` con texto en español + hint accionable
      (no "Error 500", sino "Holded rate limit, reintenta en 5 min").
- [ ] **Status badges**: pill con `color-mix(var(--accent-X) 18%, transparent)`
      + texto `var(--accent-X)`. ok/info/warn/danger consistentes.

**Voz y microcopy**
- [ ] Botones en imperativo corto: "Crear misión", "Firmar albarán",
      "Sincronizar". No "Submit" ni "Click here".
- [ ] Tooltips y descripciones explican el porqué del campo, no sólo el
      qué (p.ej. "NPTA Drovinci — operación bajo paraguas hasta SORA propia").
- [ ] Mensajes de error citan la acción concreta para arreglar
      ("Define HOLDED_API_KEY en .env.local y reinicia el servidor"),
      no genéricos.

**Distinctiveness**
- [ ] Si una captura de la pantalla podría confundirse con cualquier
      app Shadcn-stock, hay que refactor. Pista: si no se ve el logo o
      la paleta deep/terra en ningún sitio, falla.
- [ ] El primer click útil debería estar a ≤ 1 segundo desde que se
      carga la pantalla. Si hay que scrolear o cazar el CTA, falla.

---

## Identity Sprint v0.2 (13-may-2026 · ecosistema FitoLink)

**Cadena de herencia oficial:** `FitoLink → AgroM → AgroOps`.

**Decisión JuanCho 13-may-2026:** "AgroM es la empresa matriz. FitoLink es una herramienta de AgroM. AgroOps es la herramienta de operaciones. La paleta y tipografía que permanece es la de FitoLink porque es la que lleva más recorrido. AgroM hereda de FitoLink, por consiguiente AgroOps hereda también."

La paleta espeja `apps/web/tailwind.config.js` del repo `gutierrezbj/fitolink` (brand-*/terra-*/earth-*). El **Identity Sprint AgroM v0.1 efímero (mayo)** quedó eliminado del frontend FitoLink el 13-may; **NO usar** los hex antiguos `#1B4332 #E07A3C #0F2A22 #F4F0E8 #E8DDC9 #C9A876 #6B6B5C #B8312F #D49343 #3A7D44 #5B7A8F`.

**Tokens v0.2 vigentes** (consumidos vía `src/app/globals.css`):

| Token AgroOps | Hex | Mapeo FitoLink Tailwind |
|---|---|---|
| `--accent-action` = deep | `#46632e` | `brand-600` topographic olive |
| `--primary-dark` | `#354b23` | `brand-700` hovers + acentos |
| `--text-strong` = ink | `#18230f` | `brand-900` titulares + body fuerte |
| `--brand-accent` = terra | `#d45220` | `terra-500` logo + focos editoriales |
| `--surface` = paper | `#fdf8f0` | `earth-50` body cremoso |
| `--surface-elevated` = parch | `#f5e6cc` | `earth-100` cards / fieldsets |
| `--border` = rule | `#d4a85a` | `earth-300` hairline dorado |
| `--text-soft` = muted | `#6b7280` | `gray-500` Tailwind nativo |
| `--accent-ok` = success | `#15803d` | `green-700` Tailwind nativo |
| `--accent-warn` = warning | `#c49032` | `earth-400` |
| `--accent-danger` = alert | `#b91c1c` | `red-700` Tailwind nativo |
| `--accent-info` = info | `#64748b` | `slate-500` Tailwind nativo |

**Tipografía oficial v0.2:**
- **Display:** Instrument Serif (Google Fonts, `ital@0;1`).
- **Body:** DM Sans (400-700).
- **Mono:** IBM Plex Mono (400-600) — eyebrows técnicos `§ 01 · …`.

**NO** usar Fraunces ni IBM Plex Sans (eran del v0.1 efímero eliminado).

**Assets actualizados:** `/public/agroops-logo.svg` (Instrument Serif `Agro` regular + `Ops` italic, punto terra-500) · `/public/favicon.svg` (monograma M en earth-50 sobre brand-600 con dot terra-500).

**Referencia viva:**
- Sistema visual en producción: https://fitolink.systemrapid.io/
- Tailwind tokens: `apps/web/tailwind.config.js` (gutierrezbj/fitolink)
- Email templates: `apps/api/src/services/emailService.ts` (AGROM_PALETTE)

**Reglas vigentes (no cambian con v0.2):**
- Toda pantalla productiva debe consumir tokens (`var(--accent-action)`, `var(--text-strong)`, etc.), no hex hardcoded.
- `--brand-accent` (terra) solo en logo, dot del wordmark, active state nav, polígono en construcción del mapa. **Nunca en CTAs operativos.**
- Distinctiveness Audit aplica desde aquí: si una pantalla podría ser de Shadcn-stock → reescribir.
- **Los patrones específicos AgroOps** (state badges, tablas densas, map cards, status meters) son del producto, NO del ecosistema visual — no se tocan por este cambio.

---

## Lecciones acumuladas

Ver `tasks/lessons.md`. Actualízalo siempre que un cambio rompa algo no obvio.
