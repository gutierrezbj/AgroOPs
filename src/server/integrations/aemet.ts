/**
 * AgroOps — integración AEMET OpenData
 *
 * STUB. Implementación real entra en HU-13 (Sprint 2).
 *
 * AEMET OpenData API: https://opendata.aemet.es/
 * - Predicción municipal (viento, lluvia, temperatura).
 * - Observación de estaciones (viento real).
 *
 * Devuelve estructura unificada `WeatherSnapshot` que se guarda en
 * `missions.weather_snapshot` al iniciar preflight.
 */
import { z } from "zod";

const AEMET_API_KEY = process.env.AEMET_API_KEY;

export const weatherSnapshotSchema = z.object({
  capturedAt: z.string(),
  stationId: z.string().optional(),
  windSpeedMs: z.number().optional(),
  windDirectionDeg: z.number().optional(),
  precipitationMm: z.number().optional(),
  temperatureC: z.number().optional(),
  humidityPct: z.number().optional(),
  flightSuitable: z.boolean().optional(),
  raw: z.unknown().optional(),
});

export type WeatherSnapshot = z.infer<typeof weatherSnapshotSchema>;

/**
 * Captura ventana meteo para un municipio o coordenada concreta.
 * Stub devuelve null hasta implementar HU-13.
 */
export async function captureWeatherForMunicipio(
  _municipioId: string
): Promise<WeatherSnapshot | null> {
  if (!AEMET_API_KEY) {
    console.warn("[aemet] AEMET_API_KEY no definida. Devolviendo null.");
    return null;
  }
  // TODO HU-13: llamar a https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/{municipioId}
  return null;
}

export async function captureWeatherForCoordinates(
  _lat: number,
  _lng: number
): Promise<WeatherSnapshot | null> {
  if (!AEMET_API_KEY) return null;
  // TODO HU-13: resolver municipio desde lat/lng + delegar en captureWeatherForMunicipio
  return null;
}
