# features/missions

**Épica EP-04 — Mission state machine.**

Operaciones con state machine de 8 estados. Pieza central del producto: cierra el ciclo "orden → planificación → vuelo → albarán → factura" que diferencia AgroOps de Excel + WhatsApp.

## Estado

- ✅ **HU-09 wizard de misión** — cerrada 12 may 2026 (form en una página con secciones; multi-step UI llega en v1.1).
- ✅ **HU-10 state machine + gates** — cerrada 12 may 2026 (29 tests puros, 8 estados, gates duros + warnings, side-effects automáticos).
- ✅ **HU-11 generadores `AGM-YYYY-NNNN` y `ALB-YYYY-NNNN`** — cerrada 12 may 2026 (7 tests integración; el bundle traía la implementación, sólo añadimos tests).

## Estructura

```
missions/
  README.md
  state-machine.ts             # MISSION_TRANSITIONS + canTransition + rolesForTransition
                               # + evaluateGate (HU-10) + MISSION_STATUS_LABELS
  state-machine.test.ts        # 29 tests puros
  schemas.ts                   # Zod create/update/setParcels/transition/complete
  services.ts                  # listMissions (joins), getMission (con parcels),
                               # createMission (autocode), setMissionParcels,
                               # transitionMission (gate + side-effects),
                               # completeMissionManually (in_flight → completed)
  actions/
    create-mission.ts + .types.ts          # RBAC WRITERS
    update-mission.ts + .types.ts          # RBAC WRITERS
    set-mission-parcels.ts + .types.ts     # RBAC WRITERS
    transition-mission.ts + .types.ts      # RBAC por rolesForTransition()
    complete-mission.ts + .types.ts        # Form de cierre con area_treated_ha
  components/
    MissionsTable.tsx
    MissionForm.tsx                        # crear/editar datos generales
    MissionParcelsSelector.tsx             # multi-select checkboxes filtrado por cliente
    MissionStatusBadge.tsx
    TransitionActions.tsx                  # botones de transición disponibles
    CompleteMissionForm.tsx                # form con area_treated_ha + notas
```

Páginas: `src/app/dashboard/missions/{page,new/page,[id]/page}.tsx`.

## State machine (HU-10)

```
draft → planned → approved → preflight → in_flight → completed → invoiced
  ↓        ↓         ↓           ↓            ↓             ↓
   ─────────────── cancelled ───────────────────────
```

### Gates por transición

| De → A | Gate duro | Warnings |
|---|---|---|
| draft → planned | ≥1 parcela, dron asignado y `applicationCapable`, dron no retirado, piloto asignado, piloto activo, piloto ROPO+ | Dron en mantenimiento |
| planned → approved | (decisión humana — sólo rol) | — |
| approved → preflight | Si hay `weatherSnapshot.flightSuitable === false`, bloquea | Si no hay snapshot (lo capturará HU-13), avisa |
| preflight → in_flight | (side-effect: `startedAt = now()`) | — |
| in_flight → completed | `telemetry` + `areaTreatedHa` requeridos (se capturan en `CompleteMissionForm`) | — |
| completed → invoiced | (decisión humana — sólo rol) | "Verifica albarán firmado + invoice_ref (HU-15..20)" |
| * → cancelled | siempre permitido | — |

### Roles por transición

| Transición | Roles permitidos |
|---|---|
| `draft → planned`, `* → cancelled` | WRITERS (admin, operario) |
| `planned → approved`, `completed → invoiced` | ADMIN_ONLY |
| `approved → preflight` | FIELD_OPERATIONS (admin, piloto, operario) |
| `preflight → in_flight`, `in_flight → completed` | PILOT_OPERATIONS (admin, piloto) |

### Side-effects automáticos

- `preflight → in_flight` setea `mission.startedAt = now()` si era null.
- `in_flight → completed` setea `mission.completedAt = now()` si era null.
- `completeMissionManually` adicionalmente persiste `areaTreatedHa` y un stub mínimo en `telemetry.raw` (HU-14 traerá telemetría real).

## Notas de implementación

- **HU-11 race conditions**: `nextMissionCode` hace `MAX + 1` sobre la tabla `missions`. Si dos altas concurrentes obtienen el mismo `lastN`, la segunda inserción falla por `UNIQUE(code)` y el cliente debería reintentar. En v1 con volumen bajo no es un problema; v1.1 puede migrar a `SERIAL` Postgres o transacción con `SELECT FOR UPDATE`.
- **HU-09 wizard "5 pasos"**: el SDD-05 describe wizard multi-step. En v1 está implementado como **dos páginas**: alta (`/new`) crea borrador con cliente+dron+piloto+scheduledAt, luego edición (`/[id]`) gestiona parcelas y transiciones. Funcionalmente equivalente al wizard; el UX multi-step puede añadirse después como wrapper de cliente.
- **`completed → invoiced`** queda como gate humano sin chequeo de albarán físico hasta HU-15..20.
- **`approved → preflight`** captura de meteo automática llega en HU-13.

## Tests

- `state-machine.test.ts`: 29 tests puros sobre transiciones, roles, gates con mocks de Mission/Drone/Pilot.
- `mission-codes.test.ts`: 7 tests integración con Postgres validando formato, incremento, aislamiento por año.
- `services.test.ts` y `schemas.test.ts` pendientes (HU-09 stack es lo bastante grande para tests E2E con Playwright en Sprint 5).
