# features/fleet

**Épica EP-02 — Fleet management.**

Drones (T50, Mavic 3E, D-RTK 2) y pilotos (John con cualificaciones AESA + ROPO).

## Historias asignadas

- HU-04 ABM drones (MTOM, EASA class, seguro, horas vuelo).
- HU-05 ABM pilotos (licencia, ROPO, seguro, horas vuelo, fechas caducidad).

## Schemas relacionados

- `src/db/schema/drones.ts`
- `src/db/schema/pilots.ts`

## Estructura esperada

```
fleet/
  components/       # UI específica (badges de estado, cards de aeronave)
  actions/          # Server Actions ABM
  schemas.ts        # Zod schemas para forms
  services.ts       # lógica de negocio (cálculo horas vuelo, validación caducidades)
```
