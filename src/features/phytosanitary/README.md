# features/phytosanitary

**Épica EP-03 (parcial) — Catálogo fitosanitario.**

Catálogo manual local (producto + materia activa + lote + caducidad + dosis).
**El producto lo aporta el cliente final** (ADR-4). AgroOps no gestiona stock.

## Historias asignadas

- HU-08 ABM catálogo fitosanitario.

## Schemas relacionados

- `src/db/schema/phytosanitary.ts`.

## Estructura esperada

```
phytosanitary/
  components/       # selector de producto con búsqueda, alerta caducidad
  actions/
  schemas.ts
  services.ts       # validación dosis, alertas caducidad próxima
```
