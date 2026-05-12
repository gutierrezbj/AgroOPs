# features/fleet

**Épica EP-02 — Fleet management.**

Drones (T50, Mavic 3E, D-RTK 2) y pilotos (John con cualificaciones AESA + ROPO).

## Estado

- ✅ **HU-04 ABM drones** — cerrada 12 may 2026 (typecheck limpio, 35 tests verde).
- ⬜ **HU-05 ABM pilotos** — pendiente (mismo patrón aplicado a `src/db/schema/pilots.ts`).

## Schemas relacionados

- `src/db/schema/drones.ts`
- `src/db/schema/pilots.ts`

## Estructura

```
fleet/
  README.md                    # este archivo
  schemas.ts                   # Zod createDroneSchema, updateDroneSchema, droneIdSchema, listDroneFiltersSchema
  services.ts                  # listDrones, getDrone, getDroneBySerial, createDrone, updateDrone, archiveDrone, restoreDrone
  schemas.test.ts              # 20 tests (happy paths + business rules + edge cases)
  services.test.ts             # 12 tests integración Postgres local
  actions/
    create-drone.ts            # createDroneAction — RBAC WRITERS + audit drone.created
    update-drone.ts            # updateDroneAction — RBAC WRITERS + audit drone.updated
    archive-drone.ts           # archiveDroneAction — RBAC ADMIN_ONLY + audit drone.archived
  components/
    DronesTable.tsx            # Server Component, recibe Drone[]
    DroneForm.tsx              # Client, useActionState, modo create/edit
    DroneStatusBadge.tsx       # Server Component pequeño
    ArchiveDroneButton.tsx     # Client, sólo visible para admins
```

Páginas que consumen el feature:

- `src/app/dashboard/fleet/page.tsx` — índice de flota.
- `src/app/dashboard/fleet/drones/page.tsx` — lista.
- `src/app/dashboard/fleet/drones/new/page.tsx` — crear (RBAC `WRITERS`).
- `src/app/dashboard/fleet/drones/[id]/page.tsx` — editar + archivar.

## Business rules (HU-04)

Aplicadas en `createDroneSchema.superRefine`:

- `applicationCapable=true` ⇒ `payloadLitres > 0` (no tiene sentido aplicador sin tanque).
- `applicationCapable=true` ⇒ `easaClass ∈ {c5, c6}` (categoría específica STS-01/02).
- `easaClass="n_a"` ⇒ `applicationCapable=false` (D-RTK 2 y similares no son UAS).
- `serialNumber` UNIQUE (constraint DB + check explícito antes del insert).
- `mtomGrams` entero positivo ≤ 200 kg.

## Notas

- **Sin styling final** (Identity Sprint bloquea pantalla "lista" — CLAUDE.md).
- **Sin delete**, sólo archive (`status="retired"`). Las misiones históricas referencian el dron por FK.
- Audit log de toda mutación (HU-23 ya cubierto incrementalmente por cada Server Action).
