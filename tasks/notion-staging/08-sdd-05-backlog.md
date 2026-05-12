# SDD-05 — Backlog Inicial

Mirror del `tasks/todo.md` del repo. 25 historias de usuario organizadas en 9 épicas y 5 sprints, 9 semanas v1.0 (SDD-08).

> **Notación:** ✅ done · 🟡 in-progress · ⬜ pending.
> **Estado actual:** Sprint 0 completo, Sprint 1 abierto.

---

## Sprint 0 — Bootstrap (semana 0, 11 may 2026) ✅

- **HU-00** ✅ Aplicar bundle bootstrap (docker-compose Postgres+PostGIS+Redis, Makefile, .env.example, drizzle.config.ts, CLAUDE.md, DESIGN.md, scripts).
- **HU-01** ✅ Schema Drizzle (13 tablas + PostGIS) + seed inicial AgroM (3 users, 3 drones, 1 piloto, 1 cliente demo).

---

## Sprint 1 — EP-01 + EP-02 + EP-03 (semanas 1-2) 🟡

**EP-01 Bootstrap single-tenant**
- **HU-02** ⬜ Auth.js v5 + RBAC con 4 roles (admin, piloto, operario, viewer). Sesión Redis, bcrypt en `users.passwordHash`.
- **HU-03** ⬜ Layout productivo base (header con usuario+rol, sidebar navegación por épica, footer versión + commit SHA). **Bloqueado por Identity Sprint para finish visual.**

**EP-02 Fleet management**
- **HU-04** ⬜ ABM drones (CRUD con validación Zod, tabla con filtros por estado/clase EASA, modal de edición).
- **HU-05** ⬜ ABM pilotos (CRUD con validación de licencias AESA + ROPO + seguro, alertas de vencimiento).

**EP-03 Parcelas y catálogo (parcial)**
- **HU-06** ⬜ ABM clientes (CRUD con validación CIF/NIF, tipo de cliente, integración Holded contact create on save).
- **HU-07** ⬜ ABM parcelas con SIGPAC (input ref SIGPAC, captura geometría manual o por API, validación PostGIS).
- **HU-08** ⬜ ABM catálogo fitosanitario (CRUD con validación MAPA registration, lote, dosis recomendada, plazo seguridad).

---

## Sprint 2 — EP-04 + EP-05 (semanas 3-4) ⬜

**EP-04 Mission state machine**
- **HU-09** ⬜ Wizard de creación de misión (5 pasos: cliente → parcelas → dron → piloto → resumen).
- **HU-10** ⬜ Máquina de estados 8 fases + gates de transición + audit log de cada cambio de estado.
- **HU-11** ⬜ Generador de códigos `AGM-YYYY-NNNN` (autoincremental por año) + `ALB-YYYY-NNNN` para albaranes.

**EP-05 Mapa y meteo**
- **HU-12** ⬜ Integración ENAIRE — fetch NOTAMs como GeoJSON, cache Redis ≤ 15 min, overlay en mapa.
- **HU-13** ⬜ Integración AEMET — snapshot meteo en preflight, persist en `missions.weatherSnapshot`, gate de transición si meteo fuera de ventana.
- **HU-14** ⬜ Vista mapa con MapLibre GL + tiles CARTO, overlay parcelas + NOTAMs + trayectoria telemetría.

---

## Sprint 3 — EP-06 + EP-07 (semanas 5-6) ⬜

**EP-06 Documentos**
- **HU-15** ⬜ Captura de firma del cliente en finca (canvas → PNG base64, persist en `albarans.signatureImageBase64`).
- **HU-16** ⬜ Generación de PDF de albarán (pdf-lib, template con datos misión + parcelas + fito + firma + hash SHA-256).
- **HU-17** ⬜ Almacenamiento de PDFs (path local + hash, no S3 en v1).

**EP-07 Facturación Holded**
- **HU-18** ⬜ Integración Holded — crear factura post-misión, persist `invoices_ref`.
- **HU-19** ⬜ Sync periódico de estado de factura (cron 30 min, status: pending → issued → paid).
- **HU-20** ⬜ Vista de facturación con link directo a Holded + estado + reintento manual si error.

---

## Sprint 4 — EP-08 (semana 7) ⬜

**EP-08 Cuaderno de campo + cumplimiento PAC**
- **HU-21** ⬜ Vista agregada del audit trail por parcela/temporada (misión → fito → albarán → factura).
- **HU-22** ⬜ Export PAC (formato administración española para cuaderno de campo digital obligatorio).

---

## Sprint 5 — EP-09 + Endgame (semanas 8-9) ⬜

**EP-09 Audit + observabilidad**
- **HU-23** ⬜ Audit log helper aplicado a todas las mutaciones críticas (ya está el helper en `src/server/audit/`, falta plugin en cada Server Action).
- **HU-24** ⬜ Healthcheck Telegram (cron 5 min, alerta si app caída o DB caída).
- **HU-25** ⬜ Registro SA99 InfraService al deploy productivo.

**Endgame**
- Distinctiveness Audit (12 puntos del Design System) sobre todas las pantallas productivas.
- Smoke test E2E Playwright sobre flow "crear misión → preflight → in_flight → completed → albarán firmado → factura".
- Deploy productivo en `agroops.agrom.es`.
- Restore de backup probado.

---

## Notas de priorización

- **Identity Sprint bloquea** declarar cualquier pantalla "lista" desde Sprint 1. Mientras tanto se prototipa funcional.
- **HU-04 a HU-08** se pueden paralelizar entre operario y piloto del equipo (los schemas y types están listos).
- **HU-10** (state machine) es la pieza más delicada del Sprint 2; validar bien los gates antes de UI.
- **HU-18 a HU-20** dependen de cuenta Holded activa con API key (pendiente alta).

---

## Historial

- **v0.1 (11 may 2026):** primer espejo del `tasks/todo.md` en Notion. Sprint 0 cerrado.
