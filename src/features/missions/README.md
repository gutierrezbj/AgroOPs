# features/missions

**Épica EP-04 — Mission state machine.**

State machine de operaciones agrarias. En v1 solo tipo `aerial_application`.

## Historias asignadas

- HU-09 Crear misión con cultivo, parcelas, producto, dosis.
- HU-10 State machine: draft → planned → approved → preflight → in_flight → completed → invoiced.
- HU-11 Generación auto-código misión `AGM-YYYY-NNNN`.

## Schemas relacionados

- `src/db/schema/missions.ts`
- `src/db/schema/mission-parcels.ts`
- `src/db/schema/mission-phyto.ts`

## Estructura esperada

```
missions/
  components/       # wizard crear misión, badge estado, timeline
  actions/          # createMission, transitionMission, cancelMission
  schemas.ts        # Zod de creación + transición
  state-machine.ts  # tabla de transiciones permitidas + gates
  services.ts       # cálculo área tratada (ST_Area), validación pre-flight
```

## Reglas de state machine (HU-10)

```
draft → planned → approved → preflight → in_flight → completed → invoiced
(cualquier estado) → cancelled

Gates:
- draft → planned: requiere parcels, drone y pilot asignados
- planned → approved: requiere validación humana (rol admin/operario)
- approved → preflight: requiere ventana AEMET capturada y apta
- preflight → in_flight: marcar startedAt = now()
- in_flight → completed: marcar completedAt, capturar telemetry y areaTreatedHa
- completed → invoiced: requiere albarán firmado + factura Holded emitida
```
