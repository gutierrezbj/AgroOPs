# SDD-06 — Reglas de Desarrollo

Mirror de las "Reglas no negociables" + "Convenciones" del `CLAUDE.md` del repo. Esta sub-página es el contrato técnico para cualquier sesión de coding (humano o agente IA).

---

## Reglas no negociables

1. **TypeScript strict.** Sin `any` salvo justificación documentada inline (`// eslint-disable-next-line @typescript-eslint/no-explicit-any -- razón`).
2. **Server Actions tipadas con Zod schema en input.** Sin excepción. Schemas viven en `src/features/<feature>/schemas.ts`.
3. **Audit log para toda mutación crítica** (misiones, albaranes, facturas, fitosanitario). Usar `logAudit()` de `src/server/audit/`.
4. **RBAC chequeado en server.** Nunca confiar en el cliente. Helper `requireRole(session, ["admin", "operario"])` en cada Server Action sensible.
5. **Queries siempre vía Drizzle.** Raw SQL sólo en migraciones generadas por `drizzle-kit`.
6. **Componentes sin lógica de negocio.** UI dumb, lógica en `src/server/services/`. Patrón Component / Action / Schema / Service por feature.
7. **No hardcodear credenciales, API keys ni secretos.** Todo vía `.env.local` (gitignored). En producción, env vars del contenedor.
8. **No añadir gestión de tenants en UI.** Single-tenant per deployment es ley (ADR-2). Si se ve "select tenant" en algún lugar, está mal.

---

## Convenciones de código

- **Imports absolutos con `@/`** alias (configurado en tsconfig.json + import-alias del scaffold Next).
- **Naming de archivos:**
  - kebab-case para archivos en general (`mission-codes.ts`).
  - PascalCase para componentes React (`MissionWizard.tsx`).
  - kebab-case para directorios (`src/features/field-notebook/`).
- **Naming de tablas/columnas:**
  - snake_case en SQL (`mission_parcels`, `area_treated_ha`).
  - camelCase en código TS (Drizzle convierte automáticamente).
- **Convenciones de commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`). Branch `main` directo cuando el cambio es seguro y revisable en un PR; branches `feat/<epica>-<historia>` para trabajos de varios días.
- **Estructura de carpetas:** ver SDD-03 y el `tasks/todo.md` del repo.

---

## Estructura de proyecto (estándar SDD-03)

```
src/
  app/                # Next.js App Router (rutas + layouts)
  components/         # UI compartida (átomos, moléculas) — sin lógica de negocio
  features/           # módulos verticales por épica del backlog
    <feature>/
      README.md       # requisitos de la feature
      components/     # UI específica de la feature
      actions/        # Server Actions tipadas (con Zod)
      schemas.ts      # Zod schemas de input/output
      services.ts     # Lógica de negocio (puro, testeable)
      hooks/          # React hooks si hay estado cliente
      templates/      # PDF templates (sólo en feature 'documents')
  lib/                # utilidades puras, adapters externos
  db/
    schema/           # Drizzle schemas por dominio (un archivo por tabla)
    migrations/       # generadas por drizzle-kit
    seed/             # datos seed (AgroM bootstrap)
  server/
    actions/          # Server Actions cross-feature (raras)
    services/         # Lógica de negocio cross-feature
    integrations/     # AEMET, ENAIRE, DroneHub, Holded
    audit/            # audit log helpers
```

---

## Patrón Component / Action / Schema / Service por feature

Para cada Server Action:

1. **Schema (Zod)** define input y output.
2. **Action** (Server Action) recibe input validado, llama service.
3. **Service** ejecuta lógica de negocio, llama Drizzle.
4. **Component** invoca action vía `useActionState`.

Ejemplo:

```ts
// src/features/fleet/schemas.ts
export const createDroneSchema = z.object({ model: z.string(), serialNumber: z.string(), ... });

// src/features/fleet/actions/create-drone.ts
"use server";
export async function createDroneAction(prevState, formData) {
  const session = await auth();
  requireRole(session, ["admin"]);
  const parsed = createDroneSchema.parse(formDataToObject(formData));
  const drone = await createDrone(parsed);
  await logAudit({ userId: session.user.id, action: "drone.created", entityType: "drone", entityId: drone.id, after: drone });
  return { success: true, drone };
}

// src/features/fleet/services.ts
export async function createDrone(input: CreateDroneInput) {
  return db.insert(drones).values(input).returning().then((r) => r[0]);
}

// src/features/fleet/components/DroneForm.tsx
const [state, formAction] = useActionState(createDroneAction, initialState);
```

---

## Reglas de tests (ver SDD-07)

- **Cobertura mínima 80%** en `src/features/<feature>/services.ts` y `src/features/<feature>/schemas.ts`.
- **Tests E2E Playwright** sólo para flujos críticos (login, crear misión, firmar albarán).
- **No mocks en services.ts del propio feature**, mockear sólo integraciones externas.

---

## Reglas de docs

- **README.md por feature** en `src/features/<feature>/` describe el alcance y links a las HUs del backlog.
- **JSDoc en services públicos** (no en componentes).
- **CLAUDE.md** se actualiza cada sprint o cuando cambia algo no obvio.
- **tasks/lessons.md** se actualiza cada vez que un cambio rompe algo no obvio o cuando se descubre un patrón nuevo. Ya está activo.

---

## Anti-patterns prohibidos

- **`any` sin justificación inline** — rompe Regla 1.
- **Cliente formateando datos críticos** — lógica en server.
- **Sin Zod en input de Server Action** — rompe Regla 2.
- **Raw SQL en services** — rompe Regla 5.
- **Componentes con `useState` para datos del server** — usar `useActionState` o RSC.
- **Crear tabla nueva sin migración Drizzle** — siempre `pnpm drizzle-kit generate`.
- **Hardcodear puerto 5432/6379 en config** — usa env vars, respeta offset SRS +170 (Postgres en 6170, Redis en 6171).
- **Mock de Drizzle** — usar DB de testing real (containers en CI).

---

## Historial

- **v0.1 (11 may 2026):** primer espejo del CLAUDE.md del repo en Notion. Anti-pattern del puerto 6170 añadido tras la lección del bundle bootstrap (ver Discrepancias del bundle Sprint 0).
