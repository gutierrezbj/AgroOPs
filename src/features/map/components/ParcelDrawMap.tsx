"use client";

/**
 * AgroOps — ParcelDrawMap (HU-14 Fase B)
 *
 * MapLibre cliente con modo dibujo: cada click añade un vértice; cuando
 * hay ≥3 puntos el botón "Cerrar polígono" emite el `PolygonGeoJSON`
 * resultante al callback `onPolygonComplete`. Además renderiza las
 * parcelas existentes en gris como referencia para evitar dobles dibujos.
 *
 * Estilo de capas de dibujo: terra `#E07A3C` (--brand-accent). Es la
 * única excepción al "terra solo para marca" del Identity Sprint, pero
 * está justificado: marca el polígono "en construcción", literal acción
 * de marca del operador sobre el lienzo. Las parcelas existentes
 * mantienen el deep `#1B4332` desaturado.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  NavigationControl,
  ScaleControl,
  Source,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Feature,
  FeatureCollection,
  Point,
  Polygon,
} from "geojson";
import type { PolygonGeoJSON } from "@/features/parcels/schemas";
import {
  SPAIN_DEFAULT_CENTER,
  SPAIN_DEFAULT_ZOOM,
  bboxFromFeatureCollection,
  type ParcelFeatureCollection,
} from "../services";
import { buildClosedRing, type Vertex } from "../hooks/usePolygonDraw";

const CARTO_VOYAGER_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// ---- Layers de referencia (parcelas existentes, desaturadas) ----
const EXISTING_FILL: Omit<FillLayerSpecification, "source"> = {
  id: "existing-fill",
  type: "fill",
  paint: { "fill-color": "#1B4332", "fill-opacity": 0.12 },
};
const EXISTING_STROKE: Omit<LineLayerSpecification, "source"> = {
  id: "existing-stroke",
  type: "line",
  paint: { "line-color": "#1B4332", "line-width": 1, "line-opacity": 0.6 },
};

// ---- Layers del polígono en construcción (terra) ----
const DRAW_FILL: Omit<FillLayerSpecification, "source"> = {
  id: "draw-fill",
  type: "fill",
  paint: { "fill-color": "#E07A3C", "fill-opacity": 0.18 },
};
const DRAW_STROKE: Omit<LineLayerSpecification, "source"> = {
  id: "draw-stroke",
  type: "line",
  paint: { "line-color": "#E07A3C", "line-width": 2 },
};

// ---- Vertices visibles (círculos blancos con borde terra) ----
const DRAW_VERTEX: Omit<CircleLayerSpecification, "source"> = {
  id: "draw-vertex",
  type: "circle",
  paint: {
    "circle-radius": 5,
    "circle-color": "#FFFFFF",
    "circle-stroke-color": "#E07A3C",
    "circle-stroke-width": 2,
  },
};

interface ParcelDrawMapProps {
  /** Callback cuando se cierra el polígono. Recibe GeoJSON Polygon válido. */
  onPolygonComplete: (geojson: PolygonGeoJSON) => void;
  /** Filtrar parcelas existentes mostradas como referencia. */
  clientId?: string;
}

export function ParcelDrawMap({
  onPolygonComplete,
  clientId,
}: ParcelDrawMapProps) {
  const mapRef = useRef<MapRef>(null);

  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [existing, setExisting] = useState<ParcelFeatureCollection | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const canClose = vertices.length >= 3;

  // ---- Fetch parcelas existentes (referencia gris) ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const url = clientId
          ? `/api/parcels/geojson?clientId=${encodeURIComponent(clientId)}`
          : "/api/parcels/geojson";
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`parcels ${res.status}`);
        const data = (await res.json()) as ParcelFeatureCollection;
        if (!cancelled) setExisting(data);
      } catch (err) {
        console.warn("[ParcelDrawMap] referencia no cargada:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // ---- Auto-fit a parcelas existentes una sola vez ----
  useEffect(() => {
    if (!existing || !mapRef.current) return;
    const bbox = bboxFromFeatureCollection(existing);
    if (!bbox) return;
    const [minLng, minLat, maxLng, maxLat] = bbox;
    try {
      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 64, duration: 400, maxZoom: 15 },
      );
    } catch (err) {
      console.warn("[ParcelDrawMap] fitBounds falló:", err);
    }
  }, [existing]);

  // ---- Click → addVertex ----
  const handleClick = useCallback((evt: MapMouseEvent) => {
    setVertices((prev) => [...prev, [evt.lngLat.lng, evt.lngLat.lat]]);
  }, []);

  // ---- Esc → deshacer último ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setVertices((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- Build GeoJSON sources reactivos ----
  const draftFc = useMemo<FeatureCollection<Polygon> | null>(() => {
    const ring = buildClosedRing(vertices);
    if (!ring) return null;
    const feat: Feature<Polygon> = {
      type: "Feature",
      geometry: ring,
      properties: {},
    };
    return { type: "FeatureCollection", features: [feat] };
  }, [vertices]);

  const vertexFc = useMemo<FeatureCollection<Point>>(() => {
    return {
      type: "FeatureCollection",
      features: vertices.map(
        (v, i): Feature<Point> => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: v },
          properties: { index: i },
        }),
      ),
    };
  }, [vertices]);

  // ---- Acciones toolbar ----
  function handleClose() {
    const ring = buildClosedRing(vertices);
    if (!ring) return;
    onPolygonComplete(ring);
    setVertices([]);
  }

  return (
    <div className="parcel-draw">
      <div className="parcel-draw__map">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: SPAIN_DEFAULT_CENTER[0],
            latitude: SPAIN_DEFAULT_CENTER[1],
            zoom: SPAIN_DEFAULT_ZOOM,
          }}
          mapStyle={CARTO_VOYAGER_STYLE}
          onClick={handleClick}
          cursor="crosshair"
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <ScaleControl position="bottom-left" maxWidth={120} unit="metric" />

          {existing && existing.features.length > 0 && (
            <Source id="existing-src" type="geojson" data={existing}>
              <Layer {...EXISTING_FILL} source="existing-src" />
              <Layer {...EXISTING_STROKE} source="existing-src" />
            </Source>
          )}

          {draftFc && (
            <Source id="draw-src" type="geojson" data={draftFc}>
              <Layer {...DRAW_FILL} source="draw-src" />
              <Layer {...DRAW_STROKE} source="draw-src" />
            </Source>
          )}

          {vertices.length > 0 && (
            <Source id="vertex-src" type="geojson" data={vertexFc}>
              <Layer {...DRAW_VERTEX} source="vertex-src" />
            </Source>
          )}
        </Map>

        {loading && (
          <div className="map-view__overlay" role="status">
            Cargando referencia…
          </div>
        )}
      </div>

      <div className="parcel-draw__toolbar" role="toolbar" aria-label="Herramientas de dibujo">
        <span className="parcel-draw__counter">
          <strong className="mono">{vertices.length}</strong> punto{vertices.length === 1 ? "" : "s"}
          {vertices.length > 0 && vertices.length < 3 && (
            <em className="parcel-draw__hint"> · faltan {3 - vertices.length} para cerrar</em>
          )}
        </span>

        <div className="parcel-draw__actions">
          <button
            type="button"
            onClick={() =>
              setVertices((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev))
            }
            disabled={vertices.length === 0}
            className="parcel-draw__btn parcel-draw__btn--ghost"
          >
            ↶ Deshacer
          </button>
          <button
            type="button"
            onClick={() => setVertices([])}
            disabled={vertices.length === 0}
            className="parcel-draw__btn parcel-draw__btn--ghost"
          >
            Reiniciar
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={!canClose}
            className="parcel-draw__btn parcel-draw__btn--primary"
          >
            Cerrar polígono ({vertices.length}/3+)
          </button>
        </div>
      </div>

      <p className="parcel-draw__instructions">
        <strong>Click</strong> en el mapa para añadir puntos. <strong>Esc</strong>{" "}
        deshace el último. Mínimo <strong>3 puntos</strong> para cerrar. El
        polígono se cierra automáticamente repitiendo el primer punto al final.
      </p>
    </div>
  );
}
