# features/phytosanitary

**Épica EP-03 — Parcelas y catálogo (2/3).**

ABM del catálogo manual de productos fitosanitarios. Cada fila = un LOTE físico identificado (no SKU genérico). El producto lo aporta el cliente final; AgroOps registra el lote usado en cada misión (ADR-4).

## Estado

- ✅ **HU-08 ABM catálogo fitosanitario** — cerrada 12 may 2026.

## Estructura

```
phytosanitary/
  README.md
  schemas.ts                   # Zod + doseUnitLabels + formulationSuggestions
  services.ts                  # CRUD + archive/restore + evaluateExpiry
  schemas.test.ts / services.test.ts
  actions/
    create-phyto-product.ts + .types.ts
    update-phyto-product.ts + .types.ts
    archive-phyto-product.ts + .types.ts   # ADMIN_ONLY
  components/
    PhytoProductsTable.tsx
    PhytoProductForm.tsx
    PhytoExpiryBadge.tsx
    ArchivePhytoProductButton.tsx
```

Páginas: `src/app/dashboard/phytosanitary/{page,new/page,[id]/page}.tsx`.

## Business rules

- `commercialName`, `activeIngredient`, `lotNumber`, `expiresAt` requeridos.
- Cross-field: si hay `recommendedDoseValue` debe haber `recommendedDoseUnit` y viceversa (no tiene sentido "2" sin unidad).
- `formulation` opcional, normalizado a uppercase; UI sugiere SC/EC/WG/WP/OD/EW/SL/CS vía `<datalist>`.
- `expiresAt` formato YYYY-MM-DD.
- Helper `evaluateExpiry(product, today=now)` clasifica como `expired` / `warning` (≤30d) / `ok`. Lo consume `PhytoExpiryBadge`.

## Sin UNIQUE en (commercialName + lotNumber)

En v1 no protegemos contra duplicados de (producto + lote) en DB porque el operador puede legítimamente subir el mismo lote en dos entradas (por error a corregir o por separación contable). Queda en el audit log.

## Roadmap

- **v1.1**: sincronización con Registro Oficial de Productos Fitosanitarios MAPA.
- **v1.1**: detectar duplicados de lote y avisar al operador antes del save.
