"use client";

/**
 * AgroOps — MapLegend (HU-14 Fase A)
 *
 * Leyenda flotante sobre el MapView. Permite toggle de capas y comunica el
 * `source` de NOTAMs (live / cache / stub) — relevante porque en v1 el feed
 * real puede no estar conectado y queremos que el operario sepa que está
 * viendo un stub vacío, no un mapa "verdaderamente despejado".
 */
import type { NotamProperties } from "@/server/integrations/enaire";

interface MapLegendProps {
  parcelsCount: number;
  notamsCount: number;
  notamsSource: NotamProperties["source"] | null;
  notamsFetchedAt: string | null;
  showParcels: boolean;
  showNotams: boolean;
  onToggleParcels: () => void;
  onToggleNotams: () => void;
}

export function MapLegend({
  parcelsCount,
  notamsCount,
  notamsSource,
  notamsFetchedAt,
  showParcels,
  showNotams,
  onToggleParcels,
  onToggleNotams,
}: MapLegendProps) {
  return (
    <aside className="map-legend" aria-label="Leyenda del mapa">
      <h2 className="map-legend__title">Capas</h2>
      <ul className="map-legend__list">
        <li>
          <label className="map-legend__row">
            <input
              type="checkbox"
              checked={showParcels}
              onChange={onToggleParcels}
            />
            <span
              className="map-legend__swatch"
              style={{ background: "#46632e" }}
              aria-hidden="true"
            />
            <span className="map-legend__label">
              Parcelas <span className="map-legend__count">({parcelsCount})</span>
            </span>
          </label>
        </li>
        <li>
          <label className="map-legend__row">
            <input
              type="checkbox"
              checked={showNotams}
              onChange={onToggleNotams}
            />
            <span
              className="map-legend__swatch map-legend__swatch--dashed"
              style={{ background: "#b91c1c" }}
              aria-hidden="true"
            />
            <span className="map-legend__label">
              NOTAMs <span className="map-legend__count">({notamsCount})</span>
            </span>
          </label>
        </li>
      </ul>

      {notamsSource && (
        <p className="map-legend__source">
          Fuente NOTAMs:{" "}
          <SourceBadge source={notamsSource} />
          {notamsFetchedAt && (
            <span className="map-legend__timestamp mono">
              {" "}
              · {new Date(notamsFetchedAt).toLocaleTimeString("es-ES")}
            </span>
          )}
        </p>
      )}
    </aside>
  );
}

function SourceBadge({ source }: { source: NotamProperties["source"] }) {
  const labelMap: Record<NotamProperties["source"], string> = {
    "enaire-live": "ENAIRE en vivo",
    "enaire-cache": "Cache 15 min",
    "enaire-stub": "Stub (feed no configurado)",
  };
  const stateMap: Record<NotamProperties["source"], string> = {
    "enaire-live": "ok",
    "enaire-cache": "info",
    "enaire-stub": "warn",
  };
  return (
    <span
      className={`map-legend__badge map-legend__badge--${stateMap[source]}`}
    >
      {labelMap[source]}
    </span>
  );
}
