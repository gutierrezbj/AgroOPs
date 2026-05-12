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
- **ADR-6.** Facturación delegada a Holded vía API. Holded es fuente de verdad fiscal.
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
