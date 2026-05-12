/**
 * AgroOps — integración ENAIRE NOTAM feed
 *
 * STUB. Implementación real entra en HU-12 (Sprint 2).
 *
 * Consume NOTAMs activos de ENAIRE y los expone como GeoJSON FeatureCollection
 * para overlay en MapLibre.
 */
import type { FeatureCollection } from "geojson";

const ENAIRE_NOTAM_FEED =
  process.env.ENAIRE_NOTAM_FEED ?? "https://aip.enaire.es/notam";

/**
 * Devuelve los NOTAMs activos para un bounding box (lat/lng) y ventana temporal.
 * Stub devuelve FeatureCollection vacío hasta HU-12.
 */
export async function fetchActiveNotams(_options: {
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  from?: Date;
  to?: Date;
}): Promise<FeatureCollection> {
  // TODO HU-12: parsear feed XML/REST ENAIRE → FeatureCollection
  // Si está cacheado en Redis y < 15 min, devolver caché.
  console.warn(`[enaire] STUB activo. Feed real: ${ENAIRE_NOTAM_FEED}`);
  return {
    type: "FeatureCollection",
    features: [],
  };
}
