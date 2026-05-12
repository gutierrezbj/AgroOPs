# features/parcels

**Épica EP-03 (parcial) — Parcelas SIGPAC.**

Carga manual desde referencia catastral + import polígono en v1. API FitoLink en v1.2.

## Historias asignadas

- HU-06 ABM parcelas con geometría SIGPAC.
- HU-07 ABM clientes.

## Schemas relacionados

- `src/db/schema/parcels.ts` (geometry PostGIS Polygon SRID 4326).
- `src/db/schema/clients.ts`.

## Estructura esperada

```
parcels/
  components/       # mapa de selección, formulario SIGPAC
  actions/
  schemas.ts        # Zod (sigpacReference, geometry GeoJSON validation)
  services.ts       # cálculo área desde geometry (ST_Area), import KML/SHP
```
