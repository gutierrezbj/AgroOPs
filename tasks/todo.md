# tasks/todo.md — AgroOps backlog activo

Derivado de **SDD-05 — Backlog inicial** (Notion). Sincronizar al cerrar cada historia.

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` cerrada · `[!]` bloqueada

---

## Sprint 0 — Setup (1 semana) ✅ CERRADO (11-12 may 2026)

- [x] Redactar SDD-01 a SDD-08 (cerrado 11 may 2026)
- [x] Crear repo `github.com/gutierrezbj/AgroOPs`
- [x] Poblar repo con artefactos obligatorios (este archivo + `DESIGN.md` + `CLAUDE.md` + `lessons.md` + `.env.example` + `README.md`)
- [x] Bootstrap Mac local (Docker Compose + Postgres+PostGIS + Redis verdes en 127.0.0.1:6170 / 6171)
- [x] Scaffold Next.js 16 + Tailwind 4 + TS strict + Drizzle
- [x] Notion: jerarquía completa AgroOps bajo `[SRS] - Técnico` (16 páginas)
- [x] Catálogo Infra SRS actualizado (offset +170 reservado, siguiente +180)
- [x] Manifiesto SDD-SRS actualizado (fila AgroOps, v1.8)
- [x] Cuaderno AgroM actualizado (sección 2.3 AgroOps, v0.3)
- [x] Discrepancias del bundle Sprint 0 documentadas + 5 fixes upstream aplicados
- [ ] Confirmar subdominio producción: `agroops.agrom.es` — pendiente DNS Hostinger
- [ ] CI inicial: lint + typecheck + test (29/29 verde) + build verde — typecheck y tests ya verdes en local, falta GitHub Actions
- [ ] Pre-commit hooks (lint + typecheck) — pendiente
- [x] Identity Sprint **v1 aplicada** (12 may 2026) — paleta deep #1B4332 / terra #E07A3C / papel #F4F0E8, Fraunces + IBM Plex Sans/Mono, logo wordmark + favicon M, dominio rectificado a `agroops.systemrapid.io`. HU-03 (declarar pantalla productiva) desbloqueada.
- [ ] Provisionar servidor de producción + Caddy + DNS — pendiente

---

## Sprint 1 — Bootstrap + Fleet + Parcelas (2 semanas) 🟡 EN CURSO

### EP-01 — Bootstrap single-tenant

- [x] HU-01 Migración schema inicial Drizzle (single-tenant, sin `tenant_id`) ✅ 13 tablas, 1 migración `0000_freezing_juggernaut.sql`
- [x] HU-02 Auth.js v5 + RBAC (4 roles: admin, piloto, operario, viewer) ✅ 12 may 2026, typecheck limpio, 29/29 tests
- [x] HU-03 Seed inicial AgroM (John, Adriana, JuanCho + flota T50/Mavic 3E/D-RTK 2) ✅ cargado con HU-01

### EP-02 — Fleet management

- [x] HU-04 ABM drones (T50, Mavic 3E, D-RTK 2) con MTOM, EASA class, seguros ✅ 12 may 2026
- [x] HU-05 ABM pilotos con licencia AESA, ROPO, seguro, horas vuelo, fechas caducidad ✅ 12 may 2026 — **EP-02 Fleet completa**

### EP-03 — Parcelas y catálogo

- [x] **HU-06 ABM clientes** (cooperativas, ATRIA, agricultores, comunidades de regantes) ✅ 12 may 2026
- [x] **HU-07 ABM parcelas** con geometría SIGPAC (PostGIS Polygon SRID 4326, área autocalculada con ST_Area) ✅ 12 may 2026
- [x] **HU-08 ABM catálogo fitosanitario** manual (producto + materia activa + lote + caducidad + dosis) ✅ 12 may 2026

> **Nota orden HUs en EP-03:** SDD-05 numeraba HU-06=parcelas, HU-07=clientes. En el repo se invirtió porque clientes son prerequisito de parcelas (FK parcels.clientId). En el repo HU-06=clientes, HU-07=parcelas. Reflejado aquí.

**EP-03 Parcelas y catálogo completa.**

---

## Sprint 2 — Mission state machine + Mapa y meteo (2 semanas) ✅ CERRADO 12 may 2026

### EP-04 — Mission state machine ✅ CERRADA 12 may 2026

- [x] HU-09 Crear misión tipo `aerial_application` con cultivo, parcelas, producto, dosis ✅
- [x] HU-10 State machine: draft → planned → approved → preflight → in_flight → completed → invoiced ✅ (29 tests puros, RBAC por transición, gates duros + warnings, side-effects automáticos)
- [x] HU-11 Generación auto-código misión `AGM-YYYY-NNNN` + `ALB-YYYY-NNNN` ✅ (7 tests integración)

### EP-05 — Mapa y meteo

- [x] HU-12 NOTAMs ENAIRE (cache Redis 15 min + stub fallback sin feed) ✅ 12 may 2026
- [x] HU-13 AEMET ventana meteorológica (viento, lluvia, temperatura, humedad, flightSuitable) + captura automática en `approved → preflight` ✅ 12 may 2026
- [x] HU-14 MapLibre con dibujo interactivo + overlay parcelas + NOTAMs en mapa ✅ 12 may 2026 — **EP-05 Mapa y meteo completa**
  - [x] **Fase A** — `/dashboard/map` con MapLibre v5 + react-map-gl v8 (path `/maplibre`), tiles CARTO Voyager (sin API key), overlay parcelas (fill deep + stroke) + NOTAMs (fill danger + stroke dashed), leyenda con toggle on/off + badge source `enaire-live`/`enaire-cache`/`enaire-stub`, popups con paleta AgroOps, filtro por cliente. APIs `/api/parcels/geojson` + `/api/notams/geojson` con auth gate. Auto-fit a bbox de parcelas. 9 tests `features/map/services`.
  - [x] **Fase B** — Dibujo interactivo custom (sin lib externa): hook puro `usePolygonDraw` + `buildClosedRing` con epsilon IEEE 754 (5 tests). Componente `ParcelDrawMap` con 3 layers (fill terra + stroke + vertex dots blancos con borde terra), toolbar (Cerrar/Deshacer/Reset + contador), Esc deshace, parcelas existentes desaturadas como referencia. Integrado en ParcelForm como sección colapsable solo en modo create. Al cerrar polígono popula el textarea GeoJSON con `JSON.stringify(geojson, null, 2)` + dispatch `input` event. 257/257 tests verde.

---

## Sprint 3 — Documentos + Facturación (2 semanas)

### EP-06 — Documentos ✅ CERRADA 12 may 2026

- [x] HU-15 Firma digital canvas del agricultor en finca ✅ (SignaturePad vanilla sin libs, mouse+touch, valida PNG data URL)
- [x] HU-16 PDF albarán de aplicación ✅ (pdf-lib, layout A4 con cliente + operación + parcelas + productos + firma embed + hash SHA-256 + meteo capturado HU-13)
- [x] HU-17 Storage local PDFs + endpoint `/api/albarans/[code]/pdf` ✅ (filesystem `./storage/albarans/{code}.pdf` gitignored, regen invalida PDF anterior)

> Nota orden HUs EP-06: SDD-05 numeraba HU-15=presupuesto, HU-16=albarán, HU-17=firma. En el repo el orden fue firma → PDF → storage (dependencia natural). HU-15 presupuesto AgroM queda para v1.1 (el albarán cumple compliance; el presupuesto es comercial, no operativo).

### EP-07 — Facturación Holded ✅ CERRADA 12 may 2026 · modo `manual` activo en v1.0

**Decisión operativa (12 may 2026):** la integración Holded queda en código + tests pero **NO se activa en v1.0**. AgroM emite facturas en Holded manualmente fuera del sistema. Switch vía env `AGROOPS_INVOICING_MODE=holded` cuando se decida activar (v1.1+). En modo `manual` el gate `completed → invoiced` sólo exige albarán firmado.

- [x] HU-18 Conexión API key con Holded ✅ 12 may 2026 — Cliente HTTP `holdedFetch` con timeout 10s + auth header `key`, errores tipados `HoldedError` (not-configured / unauthorized / rate-limited / server-error / network / bad-response). `pingHolded` para healthcheck. `findOrCreateHoldedContact` con 4 ramas idempotentes (cache → taxId → email → create). Service `syncClientToHolded` persiste `holdedContactId` en DB + audit `client.holded_linked`/`client.holded_created`. Server Action `syncClientToHoldedAction` con RBAC WRITERS. UI `HoldedSyncPanel` en `/dashboard/clients/[id]` con badge estado + form sync + hints por reason. Endpoint diagnóstico `/api/admin/holded/ping` solo admin. 20 tests con `vi.stubGlobal('fetch')` → 277/277 total.
- [x] HU-19 Disparo automático de factura al cerrar albarán ✅ 12 may 2026 — `createHoldedInvoice` real (POST `/documents/invoice`, normaliza respuesta con status/invoiceNum/total/currency, detecta `status=0` con info como `bad-response`). Service `createInvoiceForMission` con `loadInvoiceContext` que valida 8 prerequisitos tipados (`InvoicingError.kind`: mission-not-found, mission-not-completed, albaran-missing, albaran-not-signed, client-not-synced, price-not-configured, area-missing, already-invoiced). Pricing vía env vars `AGROOPS_PRICE_PER_HA_EUR` + `AGROOPS_INVOICE_VAT_PCT` (default 21%, REAGP soportado). Side-effect en `transitionMission(completed→invoiced)` ANTES del gate (mismo patrón que HU-13 meteo). Gate `completed→invoiced` endurecido con errors duros (albaranSigned + clientHoldedSynced + invoiceStatus). Action `dispatchInvoiceAction` con RBAC ADMIN_ONLY + audit `mission.invoice_dispatched`. UI `InvoicePanel` en `/dashboard/missions/[id]` con badge estado (5 variantes), form retry, link a Holded, hints accionables por reason. 25 tests nuevos (6 createHoldedInvoice + 8 gate completed→invoiced + 11 invoicing) → **302/302 total**.
- [x] HU-20 Sincronización estado factura → misión (`invoices_ref`) ✅ 12 may 2026 — **EP-07 Facturación Holded completa**. `syncHoldedInvoiceStatus(invoiceId)` real (GET `/documents/invoice/{id}`) normaliza shape Holded defensivamente: `paid:true|1` OR `status===3|"3"` → `paid`; `status===4|"4"|"cancelled"` → `cancelled`; resto → `issued`. Service `syncInvoiceStatusForMission` actualiza `invoices_ref` solo si cambió status o número factura, devuelve `{ invoiceRef, snapshot, changed }`. Action `syncInvoiceStatusAction` con RBAC ADMIN_ONLY + audit `mission.invoice_status_synced` solo si changed=true. `SyncInvoiceButton` subcomponente con feedback diferenciado: "Estado actualizado" si changed, "Sin cambios — Holded reporta el mismo" si no. Soporta paidAt + amount + invoiceNumber re-sync. 11 tests nuevos cubriendo 4 status maps + edge cases (paidAt null, EUR default, invoiceNum num→string, invoiceId empty, bad-response shape, URL encoding) → **313/313 total**.

---

## Sprint 4 — Cuaderno PAC + Observabilidad (1 semana) ✅ CERRADO 12 may 2026

### EP-08 — Cuaderno de campo + cumplimiento ✅ CERRADA 12 may 2026

- [x] HU-21 Vista derivada cuaderno de campo agregada por fecha/parcela ✅ 12 may 2026 — Service `listFieldNotebookEntries` con SQL raw 8-tabla JOIN (missions × mission_parcels × parcels × clients × mission_phyto × phytosanitary_products × pilots × drones × albarans). Filtra por `dateFrom`/`dateTo`/`clientId`/`parcelId`/`crop`. Sólo incluye misiones `completed` o `invoiced` (no borradores). Devuelve `FieldNotebookEntry[]` con 26 campos exigidos por PAC (RD 1311/2012): fecha, cliente+CIF, parcela SIGPAC, cultivo, área tratada, producto+materia activa+reg MAPA+formulación, lote, dosis con unidad, volumen total, piloto+NIF+ROPO+AESA, dron+SN+registro, NPTA, albarán+SHA-256+signedAt. Helpers `summarizeFieldNotebook` (agregados con conversión ml→L), `formatDose`/`formatTotalAmount`. Página `/dashboard/field-notebook` con tabla responsive (15 columnas) + filtros + resumen + link a albarán PDF.
- [x] HU-22 Export PDF del cuaderno para PAC ✅ 12 may 2026 — Generación pdf-lib A4 landscape con header (título + filtros aplicados + resumen agregado + timestamp), tabla de 14 columnas con paginación automática (computeRowHeight + nueva página si overflow), zebra striping con `--surface` 50/50, banda deep `#1B4332` en header, mono para códigos/lotes/SIGPAC. Truncación inteligente `truncateToWidth` por columna con elipsis. Footer en cada página con timestamp + número página. Endpoint `/api/field-notebook/pdf` reusa schema de filtros (mismos query params que la página). Filename `cuaderno-campo_YYYY-MM-DD_YYYY-MM-DD.pdf`. 14 tests del summarize + formatters (327/327 total).

**EP-08 cerrada.**

### EP-09 — Audit + observabilidad ✅ CERRADA 12 may 2026

- [x] HU-23 Audit log de mutaciones críticas ✅ 12 may 2026 — Service `listAuditLog` con filtros tipados (Zod superRefine: dateFrom ≤ dateTo, action xor actionPrefix). Schema `auditLogFiltersSchema` con `z.coerce.number` para query params, UUID v4 estricto (Zod v3.25+). Página `/dashboard/audit-log` solo admin con tabla 8 columnas (fecha, usuario, rol-pill, acción humana + raw, entidad-pill, ID, IP, JSON colapsable before/after/metadata). Helper `formatAuditAction` mapea 24 acciones conocidas a labels humanos. `KNOWN_AUDIT_ACTIONS` + `KNOWN_ENTITY_TYPES` para dropdowns del filtro. 14 tests del schema + helper.
- [x] HU-24 Backup automático Postgres diario + sync S3-compatible ✅ 12 may 2026 — Script `scripts/backup.sh` (bash, idempotente, exit codes tipados 1-4) con pg_dump + gzip -9 + GPG opcional + AWS CLI S3-compatible upload. Rotación local `BACKUP_RETAIN_DAYS` default 7. GitHub Action `.github/workflows/backup-daily.yml` cron `30 3 * * *` UTC con notificación Telegram success/fail. Documentado en `CLAUDE.md` con procedimiento restore probado mensualmente.
- [x] HU-25 Healthcheck endpoint `/health` + alerta Telegram ✅ 12 may 2026 — `GET /api/health` público (sin auth, healthcheckers externos lo necesitan). `runHealthCheck()` evalúa 7 componentes: database (SELECT 1 con latency), redis (PING), holded/aemet/enaire/telegram/backup-s3 (env vars only, no toca API). Estado agregado `down|degraded|ok` → HTTP 503 si DB o Redis caídos, 200 resto. `notifyTelegram(text)` con Markdown, timeout 5s, no-op si no configurado. Versión SHA desde `AGROOPS_VERSION` o `VERCEL_GIT_COMMIT_SHA`.

**EP-09 cerrada. Sprint 4 cerrado.**

---

## Sprint 5 — Hardening + primera operación real (1 semana) 🟡 EN CURSO

- [x] Identity Sprint **cerrado** (tokens reales en `globals.css` + `CLAUDE.md` actualizado, v1 12 may 2026)
- [ ] Distinctiveness Audit pasada en todas las pantallas productivas — siguiente sesión
- [~] E2E críticos Playwright — **Fase A 13 may 2026** ✅: `playwright.config.ts` con webServer auto, 4 suites (auth + health + field-notebook + dashboard-shell smoke de 11 pantallas), GitHub Action `.github/workflows/e2e.yml` con services PostGIS+Redis, scripts `pnpm e2e` / `pnpm e2e:ui` / `pnpm e2e:install`. Falta Fase B con flow completo crear→completar misión + firma albarán (requiere fixtures de DB).
- [~] Lighthouse > 90 en pantallas principales — **Fase A 13 may 2026** ✅: `scripts/lighthouse-audit.sh` con umbral configurable, audita `/login` público en v1, reportes HTML+JSON timestamped en `storage/lighthouse/`. Falta Fase B con login script para auditar pantallas autenticadas + integración en CI.
- [ ] Pruebas de carga simuladas (50 misiones simultáneas) — siguiente sesión
- [ ] **Primera operación real ejecutada por John con AgroOps de principio a fin** — validación humana offline
- [ ] Validar KPI cierre v1.0: tiempo administrativo post-vuelo < 15 minutos — medición durante operación real

---

## Post v1.0 (no en este backlog activo)

Ver SDD-02 sección "Hitos v1.1 / v1.2".

- v1.1 (+6 sem): Mission Check DroneHub, wind multi-level, cuaderno PAC completo, sincronización Registro MAPA
- v1.2 (+12 sem): API pública FitoLink (Action + Evidence), mantenimiento aeronaves con horas/ciclos
