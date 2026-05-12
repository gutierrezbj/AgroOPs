# features/parcels

**Épica EP-03 — Parcelas y catálogo (3/3).**

ABM de parcelas SIGPAC con geometría PostGIS (Polygon SRID 4326). En v1 el operador pega GeoJSON exportado de SIGPAC / Google Earth / QGIS; HU-14 (Sprint 2) añade dibujo interactivo con MapLibre.

## Estado

- ✅ **HU-07 ABM parcelas SIGPAC** — cerrada 12 may 2026 (typecheck limpio, 25 tests, área autocalculada con PostGIS).

## Estructura

```
parcels/
  README.md
  schemas.ts                   # Zod incluye polygonGeoJSONSchema + sigpacRegex
  services.ts                  # SQL templates con ST_AsGeoJSON / ST_GeomFromGeoJSON / ST_Area
  schemas.test.ts / services.test.ts
  actions/
    create-parcel.ts + .types.ts
    update-parcel.ts + .types.ts
  components/
    ParcelsTable.tsx
    ParcelForm.tsx             # textarea con GeoJSON pegado (v1)
```

Páginas: `src/app/dashboard/parcels/{page,new/page,[id]/page}.tsx`.

## PostGIS deep-dive

El customType `geometry(Polygon, 4326)` de Drizzle expone la columna como string opaco (EWKB hex). Para leer/escribir GeoJSON usamos `db.execute(sql\`...\`)` con queries explícitas:

- **INSERT**: `ST_GeomFromGeoJSON(${JSON.stringify(input.geometry)})` convierte el GeoJSON validado en geometry PostGIS.
- **SELECT**: `ST_AsGeoJSON(geometry) AS geometry` devuelve la geometría como string JSON que parseamos con `JSON.parse`.
- **Área**: `ST_Area(geometry::geography) / 10000.0 AS area` — el cast a `geography` fuerza cálculo esférico exacto (en metros²), divididos entre 10 000 para obtener hectáreas.

Si el operador no proporciona `areaHectares` en el form, el service lo calcula automáticamente y lo persiste con 4 decimales.

## Business rules

- `sigpacReference` validado con regex `^\d{1,3}(-\d{1,4}){6}$` (provincia-municipio-agregado-zona-polígono-parcela-recinto).
- `clientId` FK a `clients` (cardinalidad: una parcela pertenece a un cliente; un cliente puede tener N parcelas).
- `geometry` validado como `Polygon` GeoJSON con coordenadas `[lng, lat]` dentro de los rangos válidos WGS84.
- Sin borrado: FK ON DELETE RESTRICT desde `mission_parcels`. Si una parcela quedó obsoleta, dejar las misiones históricas la referencian.

## Roadmap

- **HU-14 (Sprint 2)**: MapLibre con `mapbox-gl-draw` o similar — dibujo de polígono directo sobre el mapa, sin pegar JSON.
- **v1.1**: import/export KML, SHP.
- **v1.2**: integración FitoLink — sync de parcelas vía API limpia (ADR-3).
