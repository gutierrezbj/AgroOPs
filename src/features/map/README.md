# features/map

**Épica EP-05 — Mapa y meteo.**

MapLibre GL JS + tiles CARTO. Overlays: parcelas SIGPAC, NOTAMs ENAIRE, ventana AEMET.

## Historias asignadas

- HU-12 Mapa MapLibre con NOTAMs ENAIRE en tiempo real.
- HU-13 AEMET ventana meteorológica para municipio.
- HU-14 Overlay parcelas SIGPAC sobre el mapa.

## Estructura esperada

```
map/
  components/       # MapView (cliente), Legend, WeatherWindow, NotamLayer
  hooks/            # useMapInstance, useNotamLayer, useWeatherWindow
  styles/           # estilo MapLibre custom (no default CARTO)
  services.ts
```

## Dependencias

- `src/server/integrations/aemet.ts`
- `src/server/integrations/enaire.ts`
