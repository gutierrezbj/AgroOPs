# tasks/todo.md — AgroOps backlog activo

Derivado de **SDD-05 — Backlog inicial** (Notion). Sincronizar al cerrar cada historia.

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` cerrada · `[!]` bloqueada

---

## Sprint 0 — Setup (1 semana)

- [x] Redactar SDD-01 a SDD-08 (cerrado 11 may 2026)
- [x] Crear repo `github.com/gutierrezbj/AgroOPs`
- [ ] Confirmar subdominio producción: `agroops.agrom.es`
- [ ] Poblar repo con artefactos obligatorios (este archivo + `DESIGN.md` + `CLAUDE.md` + `lessons.md` + `.env.example` + `README.md`)
- [ ] Bootstrap Mac local (Docker Compose + Postgres+PostGIS + Redis verdes)
- [ ] Scaffold Next.js 16 + Tailwind 4 + TS strict + Drizzle
- [ ] CI inicial: lint + typecheck + test (vacío) + build verde
- [ ] Pre-commit hooks (lint + typecheck)
- [ ] Identity Sprint **kickoff** (programar sesión)
- [ ] Provisionar servidor de producción + Caddy + DNS

---

## Sprint 1 — Bootstrap + Fleet + Parcelas (2 semanas)

### EP-01 — Bootstrap single-tenant

- [ ] HU-01 Migración schema inicial Drizzle (single-tenant, sin `tenant_id`)
- [ ] HU-02 Auth.js v5 + RBAC (4 roles: admin, piloto, operario, viewer)
- [ ] HU-03 Seed inicial AgroM (John, Adriana, JuanCho + flota T50/Mavic 3E/D-RTK 2)

### EP-02 — Fleet management

- [ ] HU-04 ABM drones (T50, Mavic 3E, D-RTK 2) con MTOM, EASA class, seguros
- [ ] HU-05 ABM pilotos con licencia AESA, ROPO, seguro, horas vuelo, fechas caducidad

### EP-03 — Parcelas y catálogo

- [ ] HU-06 ABM parcelas con geometría SIGPAC (carga manual desde ref. catastral + import polígono)
- [ ] HU-07 ABM clientes (cooperativas, ATRIA, agricultores, comunidades de regantes)
- [ ] HU-08 ABM catálogo fitosanitario manual (producto + materia activa + lote + caducidad + dosis)

---

## Sprint 2 — Mission state machine + Mapa y meteo (2 semanas)

### EP-04 — Mission state machine

- [ ] HU-09 Crear misión tipo `aerial_application` con cultivo, parcelas, producto, dosis
- [ ] HU-10 State machine: draft → planned → approved → preflight → in_flight → completed → invoiced
- [ ] HU-11 Generación auto-código misión `AGM-YYYY-NNN`

### EP-05 — Mapa y meteo

- [ ] HU-12 Mapa MapLibre con NOTAMs ENAIRE en tiempo real
- [ ] HU-13 AEMET ventana meteorológica para municipio (viento, lluvia, apto-vuelo)
- [ ] HU-14 Overlay parcelas SIGPAC sobre el mapa

---

## Sprint 3 — Documentos + Facturación (2 semanas)

### EP-06 — Documentos

- [ ] HU-15 PDF presupuesto AgroM (motor pdf-lib + plantilla)
- [ ] HU-16 PDF albarán de aplicación (motor + plantilla con firma + telemetría + AEMET cruzado)
- [ ] HU-17 Firma digital canvas del agricultor en finca (tablet)

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

- [ ] Identity Sprint **cerrado** (tokens reales en `DESIGN.md`)
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
