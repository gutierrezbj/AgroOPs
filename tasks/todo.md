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

## Sprint 2 — Mission state machine + Mapa y meteo (2 semanas)

### EP-04 — Mission state machine ✅ CERRADA 12 may 2026

- [x] HU-09 Crear misión tipo `aerial_application` con cultivo, parcelas, producto, dosis ✅
- [x] HU-10 State machine: draft → planned → approved → preflight → in_flight → completed → invoiced ✅ (29 tests puros, RBAC por transición, gates duros + warnings, side-effects automáticos)
- [x] HU-11 Generación auto-código misión `AGM-YYYY-NNNN` + `ALB-YYYY-NNNN` ✅ (7 tests integración)

### EP-05 — Mapa y meteo

- [x] HU-12 NOTAMs ENAIRE (cache Redis 15 min + stub fallback sin feed) ✅ 12 may 2026
- [x] HU-13 AEMET ventana meteorológica (viento, lluvia, temperatura, humedad, flightSuitable) + captura automática en `approved → preflight` ✅ 12 may 2026
- [~] HU-14 MapLibre con dibujo interactivo + overlay parcelas + NOTAMs en mapa
  - [x] **Fase A (12 may 2026)** — `/dashboard/map` con MapLibre v5 + react-map-gl v8 (path `/maplibre`), tiles CARTO Voyager (sin API key), overlay parcelas (fill deep + stroke) + NOTAMs (fill danger + stroke dashed), leyenda con toggle on/off + badge source `enaire-live`/`enaire-cache`/`enaire-stub`, popups con paleta AgroOps, filtro por cliente. APIs `/api/parcels/geojson` + `/api/notams/geojson` con auth gate. Auto-fit a bbox de parcelas. 9 tests `features/map/services` (252/252 total).
  - [ ] **Fase B** — Dibujo interactivo de polígonos custom (sin maplibre-gl-draw) integrado en `/dashboard/parcels/new` reemplazando textarea GeoJSON.

---

## Sprint 3 — Documentos + Facturación (2 semanas)

### EP-06 — Documentos ✅ CERRADA 12 may 2026

- [x] HU-15 Firma digital canvas del agricultor en finca ✅ (SignaturePad vanilla sin libs, mouse+touch, valida PNG data URL)
- [x] HU-16 PDF albarán de aplicación ✅ (pdf-lib, layout A4 con cliente + operación + parcelas + productos + firma embed + hash SHA-256 + meteo capturado HU-13)
- [x] HU-17 Storage local PDFs + endpoint `/api/albarans/[code]/pdf` ✅ (filesystem `./storage/albarans/{code}.pdf` gitignored, regen invalida PDF anterior)

> Nota orden HUs EP-06: SDD-05 numeraba HU-15=presupuesto, HU-16=albarán, HU-17=firma. En el repo el orden fue firma → PDF → storage (dependencia natural). HU-15 presupuesto AgroM queda para v1.1 (el albarán cumple compliance; el presupuesto es comercial, no operativo).

### EP-07 — Facturación Holded

- [ ] HU-18 Conexión API key con Holded
- [ ] HU-19 Disparo automático de factura al cerrar albarán
- [ ] HU-20 Sincronización estado factura → misión (`invoices_ref`)

---

## Sprint 4 — Cuaderno PAC + Observabilidad (1 semana)

### EP-08 — Cuaderno de campo + cumplimiento

- [ ] HU-21 Vista derivada cuaderno de campo agregada por fecha/parcela
- [ ] HU-22 Export PDF del cuaderno para PAC (formato agregado simple en v1; completo en v1.1)

### EP-09 — Audit + observabilidad

- [ ] HU-23 Audit log de mutaciones críticas
- [ ] HU-24 Backup automático Postgres diario + sync S3-compatible
- [ ] HU-25 Healthcheck endpoint `/health` + alerta Telegram

---

## Sprint 5 — Hardening + primera operación real (1 semana)

- [x] Identity Sprint **cerrado** (tokens reales en `globals.css` + `CLAUDE.md` actualizado, v1 12 may 2026)
- [ ] Distinctiveness Audit pasada en todas las pantallas productivas
- [ ] E2E críticos verdes (crear misión, cerrar albarán, dispara factura)
- [ ] Lighthouse > 90 en pantallas principales
- [ ] Pruebas de carga simuladas (50 misiones simultáneas)
- [ ] **Primera operación real ejecutada por John con AgroOps de principio a fin**
- [ ] Validar KPI cierre v1.0: tiempo administrativo post-vuelo < 15 minutos

---

## Post v1.0 (no en este backlog activo)

Ver SDD-02 sección "Hitos v1.1 / v1.2".

- v1.1 (+6 sem): Mission Check DroneHub, wind multi-level, cuaderno PAC completo, sincronización Registro MAPA
- v1.2 (+12 sem): API pública FitoLink (Action + Evidence), mantenimiento aeronaves con horas/ciclos
