# AgroOps

> Icon sugerido: 🚁 · Padre Notion sugerido: `[SRS] - Técnico` (`2fe7981f08ef81e49ca6cc1522568850`)

**AgroOps** — Sistema de gestión de operaciones UAS especializado en aplicación fitosanitaria aérea con dron. Cierra el ciclo: orden → planificación → vuelo → albarán firmado en finca → factura Holded → registro PAC, todo en una interfaz.

Producto SRS con marca propia. **Primer deployment: AgroM** (vertical agro liderado por Adriana, JuanCho, John).

---

## Estado actual

**Sprint 0 cerrado · HU-01 (schema + seed) cerrada localmente · 11 mayo 2026**

- Repo `https://github.com/gutierrezbj/AgroOPs.git` clonado en Mac Mini (bleu).
- Scaffold Next.js 16.2.6 + React 19.2.4 + Tailwind 4.3.0 + TypeScript 5.9.3 aplicado.
- Bundles `agroops-bootstrap` y `agroops-schema` overlayed.
- Postgres 16 + PostGIS 3.4 y Redis 7 corriendo en `127.0.0.1:6170` y `127.0.0.1:6171` (offset SRS +170).
- 13 tablas Drizzle migradas, seed AgroM cargado (3 users, 3 drones, 1 piloto, 1 cliente demo).
- `pnpm tsc --noEmit` limpio.

**Pendientes inmediatos (Sprint 1):**

- HU-02 Auth.js v5 + RBAC (4 roles: admin, piloto, operario, viewer).
- HU-03..HU-08 ABM básicos (fleet, parcels, phytosanitary, clients).
- **Identity Sprint** (bloquea UI productiva — ver DESIGN.md del repo).

---

## Concepto y visión

AgroOps materializa lo que el resto del vertical agro (FitoLink, AgroLink) requiere para operar legalmente y con trazabilidad: una interfaz única para el operador (AgroM en v1) que orquesta la operación dron de aplicación fitosanitaria desde la orden hasta la factura y el registro PAC.

**Diferenciador**: cierre del ciclo punta-a-punta, con audit log inmutable, firma de albarán en finca, integración Holded para facturación oficial, y compatibilidad con cuaderno de campo digital obligatorio en España.

---

## Arquitectura — resumen

- **Stack:** Next.js 16 App Router + React 19 + TypeScript strict + Tailwind 4 + Drizzle ORM + PostgreSQL 16 + PostGIS 3.4 + Redis 7 + Auth.js v5 + MapLibre GL JS + tiles CARTO + pdf-lib.
- **Tenancy:** Single-tenant per deployment (ADR-2). Sin `tenant_id`, sin RLS, sin gestión de tenants en UI. Si aparece segundo operador → clone-and-deploy.
- **Integraciones:** AEMET OpenData (meteo), ENAIRE (NOTAMs), Holded (facturación), DroneHub (telemetría), FitoLink (API v1.2).
- **Despliegue:** Mac local → push a `main` → CI verde → producción. Sin staging. Dominio propuesto `agroops.agrom.es`.
- **Infra SRS:** offset **+170** (frontend `3170`, API `4170`, internal `5170`, PostgreSQL `6170`, Redis `6171`).

---

## Índice SDD

Las 8 secciones del SDD viven como sub-páginas de este documento. La versión técnica detallada está en el repo (CLAUDE.md + DESIGN.md + tasks/todo.md + tasks/lessons.md).

- **SDD-01** Definición del Problema
- **SDD-02** Alcance y Límites
- **SDD-03** Arquitectura Técnica
- **SDD-04** Decisiones Técnicas (ADRs ADR-1 a ADR-10)
- **SDD-05** Backlog Inicial (EP-01 a EP-09, 25 historias)
- **SDD-06** Reglas de Desarrollo
- **SDD-07** Plan de Testing
- **SDD-08** Plan de Despliegue

---

## Subcarpetas estándar

- **Documentación** — specs funcionales, flujos, integraciones externas.
- **Diseño** — Identity Sprint pendiente, tema vertical AgroM bajo SRS Design System.
- **Desarrollo** — notas técnicas, snippets, bugs resueltos, guía de setup local.
- **Recursos** — repo GitHub, dominios, credenciales referenciadas.

---

## Recursos rápidos

- **Repo GitHub:** [github.com/gutierrezbj/AgroOPs](https://github.com/gutierrezbj/AgroOPs)
- **Workdir local:** `~/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS - AGRO/AgroOPs/`
- **CLAUDE.md del repo:** contexto operativo para sesiones de IA.
- **DESIGN.md del repo:** placeholder hasta cierre Identity Sprint.
- **Catálogo de Infraestructura SRS:** [Catalogo de Infraestructura SRS - Marzo 2026](https://www.notion.so/3217981f08ef81828e31edfcc9b78414) (entrada AgroOps +170 registrada).
- **Cuaderno de Protocolos AgroM:** [Cuaderno de Protocolos AgroM](https://www.notion.so/35d7981f08ef81329a43f0daea4447c1) — AgroOps va listado en sección 2 (Cartera vertical) como tercer producto.
- **Cuaderno maestro SRS:** [Base de Proyectos SRS — De Idea a Produccion](https://www.notion.so/3407981f08ef816d9704db6dbff2299b).
- **Protocolo de Coding Session SRS:** [Protocolo de Coding Session SRS](https://www.notion.so/3577981f08ef81049a35fc3ec8e24a6b) (referencia viva, no se duplica).
- **SRS Design System:** [SRS Design System](https://www.notion.so/3397981f08ef81d7bd6cf83da8dba729) (referencia viva, no se duplica).

---

## Historial de cambios

- **v0.1 (11 mayo 2026):** apertura formal de la página de AgroOps en Notion. Sprint 0 cerrado, HU-01 (schema + seed) cerrada localmente. Página creada retroactivamente: cowork generó los bundles `agroops-bootstrap` y `agroops-schema` sin pasar por el Cuaderno maestro SRS, este registro corrige ese gap. Discrepancias del bundle vs convención SRS documentadas en sub-página dedicada.
