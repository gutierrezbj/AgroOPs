/**
 * AgroOps — map services (HU-14 Fase A)
 *
 * Lógica pura para preparar datos GeoJSON consumidos por MapLibre.
 * No toca DB (eso lo hace `features/parcels/services.ts`) ni red (NOTAMs van
 * por `server/integrations/enaire.ts`). Aquí solo transformamos shapes y
 * calculamos extents.
 */
import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { ParcelWithGeoJSON } from "@/features/parcels/services";

/**
 * Propiedades expuestas por cada parcela en el mapa. Subset de `ParcelWithGeoJSON`
 * (no incluye notas internas ni updatedAt). MapLibre las recibe como
 * `feature.properties` y las muestra en popup.
 */
export interface ParcelMapProperties {
  id: string;
  name: string;
  clientId: string;
  sigpacReference: string;
  crop: string | null;
  cropVariety: string | null;
  areaHectares: number;
}

export type ParcelFeature = Feature<Polygon, ParcelMapProperties>;
export type ParcelFeatureCollection = FeatureCollection<
  Polygon,
  ParcelMapProperties
>;

/**
 * Convierte el resultado de `listParcels()` en un `FeatureCollection`
 * consumible por MapLibre. El `areaHectares` viene de Drizzle como string
 * (NUMERIC precision); aquí lo parseamos a number para el mapa.
 *
 * Filtra parcelas con geometría inválida (defensivo — no debería ocurrir si
 * pasaron por `polygonGeoJSONSchema`).
 */
export function parcelsToFeatureCollection(
  parcels: ParcelWithGeoJSON[],
): ParcelFeatureCollection {
  const features: ParcelFeature[] = parcels
    .filter(
      (p): p is ParcelWithGeoJSON =>
        p.geometry?.type === "Polygon" &&
        Array.isArray(p.geometry.coordinates) &&
        p.geometry.coordinates.length > 0,
    )
    .map((p) => ({
      type: "Feature" as const,
      geometry: p.geometry,
      properties: {
        id: p.id,
        name: p.name,
        clientId: p.clientId,
        sigpacReference: p.sigpacReference,
        crop: p.crop,
        cropVariety: p.cropVariety,
        areaHectares: parseFloat(p.areaHectares),
      },
    }));

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Calcula bbox `[minLng, minLat, maxLng, maxLat]` de una FeatureCollection
 * de polígonos. Si la colección está vacía devuelve `null` (el cliente debe
 * caer en un center default — España p.ej. [-3.7, 40.4]).
 */
export function bboxFromFeatureCollection(
  fc: FeatureCollection<Polygon>,
): [number, number, number, number] | null {
  if (fc.features.length === 0) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const feat of fc.features) {
    for (const ring of feat.geometry.coordinates) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  // Sanity: si por alguna razón quedan Infinity (FC con features pero rings vacíos)
  if (
    !Number.isFinite(minLng) ||
    !Number.isFinite(maxLng) ||
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLat)
  ) {
    return null;
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Centro geográfico aproximado de España, fallback cuando no hay parcelas
 * cargadas. Lng/Lat WGS84.
 */
export const SPAIN_DEFAULT_CENTER: [number, number] = [-3.7038, 40.4168];
export const SPAIN_DEFAULT_ZOOM = 5.5;
