# features/fleet

**Épica EP-02 — Fleet management.**

Drones (T50, Mavic 3E, D-RTK 2) y pilotos (John con cualificaciones AESA + ROPO).

## Estado

- ✅ **HU-04 ABM drones** — cerrada 12 may 2026 (typecheck limpio, 35 tests).
- ✅ **HU-05 ABM pilotos** — cerrada 12 may 2026 (typecheck limpio, 35 tests, helper `evaluateCredentials` para badges de caducidad).

**EP-02 Fleet management completa.**

## Schemas relacionados

- `src/db/schema/drones.ts`
- `src/db/schema/pilots.ts`

## Estructura

```
fleet/
  README.md                    # este archivo
  schemas.ts                   # drones Zod
  services.ts                  # drones services
  schemas.test.ts / services.test.ts
  actions/
    create-drone.ts + .types.ts
    update-drone.ts + .types.ts
    archive-drone.ts + .types.ts
  components/
    DronesTable.tsx / DroneForm.tsx / DroneStatusBadge.tsx / ArchiveDroneButton.tsx
  pilots/
    schemas.ts                 # pilots Zod (NIF, AESA, ROPO levels)
    services.ts                # pilots services + evaluateCredentials helper
    schemas.test.ts / services.test.ts
    actions/
      create-pilot.ts + .types.ts
      update-pilot.ts + .types.ts
      archive-pilot.ts + .types.ts
    components/
      PilotsTable.tsx / PilotForm.tsx / PilotStatusBadge.tsx / ArchivePilotButton.tsx
```

Páginas que consumen el feature:

- `src/app/dashboard/fleet/page.tsx` — índice flota.
- `src/app/dashboard/fleet/drones/{page,new/page,[id]/page}.tsx` (HU-04).
- `src/app/dashboard/fleet/pilots/{page,new/page,[id]/page}.tsx` (HU-05).

Páginas que consumen el feature:

- `src/app/dashboard/fleet/page.tsx` — índice de flota.
- `src/app/dashboard/fleet/drones/page.tsx` — lista.
- `src/app/dashboard/fleet/drones/new/page.tsx` — crear (RBAC `WRITERS`).
- `src/app/dashboard/fleet/drones/[id]/page.tsx` — editar + archivar.

## Business rules

### HU-04 (drones)

Aplicadas en `createDroneSchema.superRefine`:

- `applicationCapable=true` ⇒ `payloadLitres > 0` (no tiene sentido aplicador sin tanque).
- `applicationCapable=true` ⇒ `easaClass ∈ {c5, c6}` (categoría específica STS-01/02).
- `easaClass="n_a"` ⇒ `applicationCapable=false` (D-RTK 2 y similares no son UAS).
- `serialNumber` UNIQUE (constraint DB + check explícito antes del insert).
- `mtomGrams` entero positivo ≤ 200 kg.

### HU-05 (pilotos)

Aplicadas en `pilots/schemas.ts.superRefine`:

- `ropoQualified=true` ⇒ requiere `ropoNumber + ropoLevel + ropoExpiresAt` (sin estos datos no podemos demostrar la habilitación frente a auditoría PAC).
- `nif` normalizado a trim + uppercase, validado contra regex `[A-Z0-9]{8,10}` (cubre DNI, NIE y passports UE).
- `nif` UNIQUE (DB + check explícito antes del insert).
- Todas las caducidades en formato YYYY-MM-DD.
- Helper `evaluateCredentials(pilot, today)` clasifica AESA / ROPO / seguro / médico como `expired` / `warning` (≤30 días) / `ok`. Lo consumen `PilotStatusBadge` (badge agregado) y la vista de edición (lista detallada).

## Notas

- **Sin styling final** (Identity Sprint bloquea pantalla "lista" — CLAUDE.md).
- **Sin delete**, sólo archive (`status="retired"`). Las misiones históricas referencian el dron por FK.
- Audit log de toda mutación (HU-23 ya cubierto incrementalmente por cada Server Action).
