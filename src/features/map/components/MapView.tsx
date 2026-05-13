"use client";

/**
 * AgroOps — MapView (HU-14 Fase A)
 *
 * Cliente MapLibre con react-map-gl v8 (path `/maplibre`). Carga vía fetch
 * el FeatureCollection de parcelas (`/api/parcels/geojson`) y NOTAMs
 * (`/api/notams/geojson`) on mount. Renderiza dos capas overlay con paleta
 * Identity Sprint:
 *
 * - Parcelas: fill deep `#46632e` con opacity 0.25 + stroke deep 2px.
 * - NOTAMs:   fill danger `#b91c1c` con opacity 0.20 + stroke danger dashed.
 *
 * Click en cualquier feature → popup con properties resumidas. Doble click
 * sobre el mapa reservado para HU-14 Fase B (dibujo interactivo).
 *
 * Estilo base: CARTO Voyager (gratis sin API key, attribution OSM + CARTO).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type LngLatBoundsLike,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import type {
  FillLayerSpecification,
  LineLayerSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  SPAIN_DEFAULT_CENTER,
  SPAIN_DEFAULT_ZOOM,
  bboxFromFeatureCollection,
  type ParcelFeatureCollection,
  type ParcelMapProperties,
} from "../services";
import type { NotamCollection, NotamProperties } from "@/server/integrations/enaire";
import { MapLegend } from "./MapLegend";

const CARTO_VOYAGER_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const PARCELS_FILL_LAYER: Omit<FillLayerSpecification, "source"> = {
  id: "parcels-fill",
  type: "fill",
  paint: {
    "fill-color": "#46632e", // --accent-action (brand-600)
    "fill-opacity": 0.25,
  },
};

const PARCELS_STROKE_LAYER: Omit<LineLayerSpecification, "source"> = {
  id: "parcels-stroke",
  type: "line",
  paint: {
    "line-color": "#46632e",
    "line-width": 2,
  },
};

const NOTAMS_FILL_LAYER: Omit<FillLayerSpecification, "source"> = {
  id: "notams-fill",
  type: "fill",
  paint: {
    "fill-color": "#b91c1c", // --accent-danger (red-700)
    "fill-opacity": 0.2,
  },
};

const NOTAMS_STROKE_LAYER: Omit<LineLayerSpecification, "source"> = {
  id: "notams-stroke",
  type: "line",
  paint: {
    "line-color": "#b91c1c",
    "line-width": 2,
    "line-dasharray": [3, 2],
  },
};

interface ClickedFeature {
  longitude: number;
  latitude: number;
  kind: "parcel" | "notam";
  properties: ParcelMapProperties | NotamProperties;
}

interface MapViewProps {
  /** Filtro opcional por cliente. Se pasa como query param a /api/parcels/geojson. */
  clientId?: string;
  /** Render compacto sin leyenda (para previews dentro de formularios). */
  compact?: boolean;
}

export function MapView({ clientId, compact = false }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);

  const [parcelsFc, setParcelsFc] = useState<ParcelFeatureCollection | null>(
    null,
  );
  const [notamsFc, setNotamsFc] = useState<NotamCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showParcels, setShowParcels] = useState(true);
  const [showNotams, setShowNotams] = useState(true);
  const [popup, setPopup] = useState<ClickedFeature | null>(null);

  // Fetch inicial — parcelas + notams en paralelo
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const parcelsUrl = clientId
          ? `/api/parcels/geojson?clientId=${encodeURIComponent(clientId)}`
          : "/api/parcels/geojson";

        const [parcelsRes, notamsRes] = await Promise.all([
          fetch(parcelsUrl, { credentials: "same-origin" }),
          fetch("/api/notams/geojson", { credentials: "same-origin" }),
        ]);
        if (!parcelsRes.ok) throw new Error(`parcels ${parcelsRes.status}`);
        if (!notamsRes.ok) throw new Error(`notams ${notamsRes.status}`);

        const parcels = (await parcelsRes.json()) as ParcelFeatureCollection;
        const notams = (await notamsRes.json()) as NotamCollection;

        if (cancelled) return;
        setParcelsFc(parcels);
        setNotamsFc(notams);
      } catch (err) {
        if (cancelled) return;
        console.error("[MapView] fetch error", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // Auto-fit a las parcelas cuando se cargan (si hay alguna)
  useEffect(() => {
    if (!parcelsFc || !mapRef.current) return;
    const bbox = bboxFromFeatureCollection(parcelsFc);
    if (!bbox) return;
    const [minLng, minLat, maxLng, maxLat] = bbox;
    // Padding generoso para que las parcelas no toquen los bordes
    const bounds: LngLatBoundsLike = [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
    try {
      mapRef.current.fitBounds(bounds, {
        padding: 64,
        duration: 600,
        maxZoom: 16,
      });
    } catch (err) {
      // Si bbox es degenerado (un solo punto) fitBounds puede fallar — fallback al centro
      console.warn("[MapView] fitBounds falló, usando centro default:", err);
    }
  }, [parcelsFc]);

  const interactiveLayerIds = useMemo(
    () => ["parcels-fill", "notams-fill"],
    [],
  );

  const handleClick = useCallback((evt: MapMouseEvent) => {
    const feature = evt.features?.[0];
    if (!feature) {
      setPopup(null);
      return;
    }
    const isParcel = feature.layer?.id === "parcels-fill";
    setPopup({
      longitude: evt.lngLat.lng,
      latitude: evt.lngLat.lat,
      kind: isParcel ? "parcel" : "notam",
      properties: feature.properties as
        | ParcelMapProperties
        | NotamProperties,
    });
  }, []);

  return (
    <div className={`map-view ${compact ? "map-view--compact" : ""}`}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: SPAIN_DEFAULT_CENTER[0],
          latitude: SPAIN_DEFAULT_CENTER[1],
          zoom: SPAIN_DEFAULT_ZOOM,
        }}
        mapStyle={CARTO_VOYAGER_STYLE}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleClick}
        cursor={popup ? "pointer" : "grab"}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-left" maxWidth={120} unit="metric" />

        {parcelsFc && showParcels && (
          <Source id="parcels-src" type="geojson" data={parcelsFc}>
            <Layer {...PARCELS_FILL_LAYER} source="parcels-src" />
            <Layer {...PARCELS_STROKE_LAYER} source="parcels-src" />
          </Source>
        )}

        {notamsFc && showNotams && notamsFc.features.length > 0 && (
          <Source id="notams-src" type="geojson" data={notamsFc}>
            <Layer {...NOTAMS_FILL_LAYER} source="notams-src" />
            <Layer {...NOTAMS_STROKE_LAYER} source="notams-src" />
          </Source>
        )}

        {popup && (
          <Popup
            longitude={popup.longitude}
            latitude={popup.latitude}
            onClose={() => setPopup(null)}
            closeOnClick={false}
            anchor="bottom"
            className="map-view__popup"
          >
            {popup.kind === "parcel" ? (
              <ParcelPopupContent props={popup.properties as ParcelMapProperties} />
            ) : (
              <NotamPopupContent props={popup.properties as NotamProperties} />
            )}
          </Popup>
        )}
      </Map>

      {loading && (
        <div className="map-view__overlay" role="status" aria-live="polite">
          Cargando parcelas y NOTAMs…
        </div>
      )}
      {error && !loading && (
        <div className="map-view__overlay map-view__overlay--error" role="alert">
          Error: {error}
        </div>
      )}

      {!compact && (
        <MapLegend
          parcelsCount={parcelsFc?.features.length ?? 0}
          notamsCount={notamsFc?.features.length ?? 0}
          notamsSource={notamsFc?.source ?? null}
          notamsFetchedAt={notamsFc?.fetchedAt ?? null}
          showParcels={showParcels}
          showNotams={showNotams}
          onToggleParcels={() => setShowParcels((v) => !v)}
          onToggleNotams={() => setShowNotams((v) => !v)}
        />
      )}
    </div>
  );
}

function ParcelPopupContent({ props }: { props: ParcelMapProperties }) {
  return (
    <div className="map-popup">
      <strong className="map-popup__title">{props.name}</strong>
      <dl className="map-popup__meta">
        <div>
          <dt>SIGPAC</dt>
          <dd className="mono">{props.sigpacReference}</dd>
        </div>
        <div>
          <dt>Cultivo</dt>
          <dd>
            {props.crop ?? "—"}
            {props.cropVariety ? ` · ${props.cropVariety}` : ""}
          </dd>
        </div>
        <div>
          <dt>Área</dt>
          <dd className="mono">{props.areaHectares.toFixed(4)} ha</dd>
        </div>
      </dl>
    </div>
  );
}

function NotamPopupContent({ props }: { props: NotamProperties }) {
  return (
    <div className="map-popup">
      <strong className="map-popup__title">
        NOTAM {props.notamId}
      </strong>
      <p className="map-popup__title">{props.title}</p>
      <dl className="map-popup__meta">
        <div>
          <dt>Severidad</dt>
          <dd>{props.severity ?? "info"}</dd>
        </div>
        <div>
          <dt>Activo desde</dt>
          <dd className="mono">{props.startsAt}</dd>
        </div>
        <div>
          <dt>Hasta</dt>
          <dd className="mono">{props.endsAt}</dd>
        </div>
      </dl>
    </div>
  );
}
