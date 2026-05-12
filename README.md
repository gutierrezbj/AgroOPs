# AgroOps

Backbone operativo agrario. Sistema de gestión de operaciones UAS especializado en aplicación fitosanitaria aérea con dron.

Producto SRS bajo marca AgroOps. Primer deployment operativo: **AgroM** (autónomo John en fase puente, SL futura).

> **Sin SDD-01 a SDD-08 firmados, no se escribe código.** Ya están firmados (11 may 2026). Adelante.

---

## Stack

- **Runtime:** Node.js 22
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript strict
- **Estilos:** Tailwind 4 + Design System SRS Agro (ver `DESIGN.md`)
- **DB:** PostgreSQL 16 + PostGIS 3.4
- **ORM:** Drizzle
- **Auth:** Auth.js v5 + bcrypt + Redis
- **Mapas:** MapLibre GL JS + tiles CARTO
- **Forms:** Server Actions + Zod + `useActionState`
- **Infra:** Docker Compose + Caddy + GitHub Actions CI/CD

Decisión arquitectónica: **single-tenant per deployment** (ver `ADR-2` en SDD-04). Sin RLS, sin `tenant_id`.

---

## Bootstrap local (Mac)

Requisitos: Docker Desktop, Node 22 (vía Volta o nvm), pnpm 9.

```bash
# 1. Clonar repo
git clone https://github.com/gutierrezbj/AgroOPs.git
cd AgroOPs

# 2. Copiar variables de entorno
cp .env.example .env.local

# 3. Levantar servicios (Postgres+PostGIS, Redis)
make dev

# 4. Aplicar migraciones y seed inicial
make db-reset

# 5. Arrancar la app en modo desarrollo
pnpm dev
```

App disponible en `http://localhost:3000`.

### Comandos make

```text
make dev         # docker compose up -d (postgres + redis)
make down        # docker compose down
make db-reset    # drop + migrate + seed
make db-migrate  # solo aplica migraciones pendientes
make db-seed     # solo carga datos seed
make logs        # logs de los servicios
make psql        # abre psql contra la DB local
```

---

## Estructura del repo

```text
src/
  app/                # Next.js App Router
  components/         # UI compartida
  features/           # módulos verticales por épica
    fleet/
    missions/
    parcels/
    phytosanitary/
    documents/
    invoicing/
  lib/                # utilidades, adapters
  db/                 # Drizzle schema + migrations
  server/             # actions, services, integrations

scripts/              # bootstrap, seed, helpers
tasks/                # todo.md, lessons.md (artefactos obligatorios SRS)
```

---

## Documentación

Toda la doc viva está en Notion bajo `🌾 [AgroM] - Hub Central → AgroOps`:

- SDD-01 — Contexto y motivación
- SDD-02 — Alcance y límites v1
- SDD-03 — Arquitectura técnica
- SDD-04 — Decisiones técnicas (ADRs)
- SDD-05 — Backlog inicial
- SDD-06 — Reglas de desarrollo
- SDD-07 — Plan de pruebas
- SDD-08 — Plan de despliegue

En este repo:

- `DESIGN.md` — Design System SRS Agro aplicado (no Shadcn default).
- `CLAUDE.md` — Contexto operativo para sesiones con IA.
- `tasks/todo.md` — Backlog activo derivado de SDD-05.
- `tasks/lessons.md` — Lecciones aprendidas durante el desarrollo.

---

## Reglas no negociables

- Sin SDD firmados, no se escribe código. (Firmados ✓)
- Identity Sprint antes de cualquier UI productiva.
- Distinctiveness Audit bloquea deploy.
- Healthcheck + SA99 obligatorios post-deploy.
- Single-tenant per deployment. Si aparece segundo operador → clone-and-deploy.
- **Sin staging.** Mac local → main → producción directo. Disciplina pre-merge estricta.

---

## Deploy

Ver `SDD-08 — Plan de despliegue` en Notion.

Resumen: push a `main` con CI verde → deploy automático a servidor de producción único (`agroops.agrom.es`).
