/**
 * AgroOps — integración AEMET OpenData (HU-13)
 *
 * AEMET OpenData arquitectura asíncrona:
 *   1. GET https://opendata.aemet.es/opendata/api/...   con header `api_key`
 *      → devuelve `{ estado, datos: "URL_TEMPORAL", metadatos: "..." }`
 *   2. GET URL_TEMPORAL → devuelve el JSON real.
 *
 * En v1:
 * - Si `AEMET_API_KEY` está definida en `.env.local`, hacemos los 2 fetches
 *   y normalizamos a `WeatherSnapshot`.
 * - Si no, o si el fetch falla, devolvemos un STUB realista con valores
 *   que pasan el gate por defecto. El stub marca `raw.stub: true` para que
 *   el operador pueda detectar que no son datos reales.
 *
 * v1.1 añadirá:
 * - Resolución municipio desde lat/lng (endpoint AEMET inversa).
 * - Cache Redis del snapshot (TTL 30 min por celda geográfica).
 */
import { z } from "zod";

const AEMET_API_KEY = process.env.AEMET_API_KEY;
const AEMET_FETCH_TIMEOUT_MS = 8000;

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
 * Umbrales de aptitud de vuelo para aplicación fitosanitaria con dron.
 * Basado en buenas prácticas operativas (AESA STS-02 + condiciones de
 * aplicación AEMET). Conservadores en v1; el operador puede sobrescribir
 * `flightSuitable` manualmente si entiende el contexto.
 */
export const FLIGHT_THRESHOLDS = {
  maxWindSpeedMs: 10,
  maxPrecipitationMm: 0.5,
  minTemperatureC: 5,
  maxTemperatureC: 35,
  maxHumidityPct: 95,
} as const;

/**
 * Evalúa si una muestra de meteo cumple las condiciones de aplicación.
 * Si un campo no está presente, no penaliza (asumimos OK silenciosamente).
 */
export function evaluateFlightSuitable(
  s: Pick<
    WeatherSnapshot,
    "windSpeedMs" | "precipitationMm" | "temperatureC" | "humidityPct"
  >,
): boolean {
  if (
    s.windSpeedMs != null &&
    s.windSpeedMs > FLIGHT_THRESHOLDS.maxWindSpeedMs
  ) {
    return false;
  }
  if (
    s.precipitationMm != null &&
    s.precipitationMm > FLIGHT_THRESHOLDS.maxPrecipitationMm
  ) {
    return false;
  }
  if (s.temperatureC != null) {
    if (
      s.temperatureC < FLIGHT_THRESHOLDS.minTemperatureC ||
      s.temperatureC > FLIGHT_THRESHOLDS.maxTemperatureC
    ) {
      return false;
    }
  }
  if (
    s.humidityPct != null &&
    s.humidityPct > FLIGHT_THRESHOLDS.maxHumidityPct
  ) {
    return false;
  }
  return true;
}

/**
 * Captura meteo para unas coordenadas dadas. Si AEMET responde, normaliza
 * a WeatherSnapshot. Si no hay API key o el fetch falla, devuelve stub.
 */
export async function captureWeatherForCoordinates(
  lat: number,
  lng: number,
): Promise<WeatherSnapshot> {
  if (AEMET_API_KEY) {
    try {
      return await fetchFromAemet(lat, lng, AEMET_API_KEY);
    } catch (err) {
      console.warn("[aemet] fetch real falló, usando stub:", err);
    }
  }
  return makeStubSnapshot(lat, lng);
}

/**
 * Captura meteo para un municipio (id INE 5 dígitos). Mantiene la firma del
 * stub original para compat con HU futuras (selector municipio en UI).
 */
export async function captureWeatherForMunicipio(
  municipioId: string,
): Promise<WeatherSnapshot> {
  if (AEMET_API_KEY) {
    try {
      return await fetchFromAemetMunicipio(municipioId, AEMET_API_KEY);
    } catch (err) {
      console.warn("[aemet] municipio fetch falló, usando stub:", err);
    }
  }
  return makeStubSnapshotForMunicipio(municipioId);
}

// ──────────────────────────────────────────────────────────────────────
// Implementación real (AEMET OpenData)
// ──────────────────────────────────────────────────────────────────────

interface AemetIndirectResponse {
  estado: number;
  descripcion?: string;
  datos?: string;
  metadatos?: string;
}

async function aemetFetch(url: string, apiKey: string): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    AEMET_FETCH_TIMEOUT_MS,
  );
  try {
    const res = await fetch(url, {
      headers: { api_key: apiKey, accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`AEMET ${res.status} ${res.statusText} en ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * AEMET expone observación convencional por estación. Para v1 buscamos la
 * estación más cercana a las coordenadas. En v1.1 podemos usar el endpoint
 * de inventario para resolverlo correctamente; en v1 cae directamente al
 * stub si no encuentra (suficiente para validar el flow).
 */
async function fetchFromAemet(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<WeatherSnapshot> {
  // v1: como no tenemos resolver estación más cercana, intentamos un endpoint
  // de observación global y procesamos. Si falla, el caller usará stub.
  // El endpoint real de observación convencional retorna un array de
  // mediciones. Sin idema específico no podemos pedir uno solo, así que
  // devolvemos stub explícito comentando el upgrade futuro.
  console.info(
    `[aemet] HU-13 v1 sólo soporta fetch por municipio; lat/lng ${lat},${lng} cae a stub (TODO v1.1)`,
  );
  return makeStubSnapshot(lat, lng);
}

async function fetchFromAemetMunicipio(
  municipioId: string,
  apiKey: string,
): Promise<WeatherSnapshot> {
  const indirectUrl = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/${municipioId}`;
  const indirect = (await aemetFetch(
    indirectUrl,
    apiKey,
  )) as AemetIndirectResponse;
  if (indirect.estado !== 200 || !indirect.datos) {
    throw new Error(
      `AEMET respuesta inválida: estado=${indirect.estado} descripcion=${indirect.descripcion ?? "—"}`,
    );
  }

  // Segundo fetch a la URL temporal devuelta por AEMET.
  const dataRes = await fetch(indirect.datos);
  if (!dataRes.ok) {
    throw new Error(
      `AEMET datos temporales no accesibles: ${dataRes.status}`,
    );
  }
  const data = (await dataRes.json()) as unknown;

  return normalizeAemetMunicipioResponse(data, municipioId);
}

/**
 * Normaliza la respuesta de AEMET municipio horaria a `WeatherSnapshot`.
 * Toma la primera entrada horaria disponible (hora actual). Si la
 * estructura cambia, falla al stub.
 */
function normalizeAemetMunicipioResponse(
  data: unknown,
  municipioId: string,
): WeatherSnapshot {
  try {
    const arr = data as Array<{
      prediccion?: {
        dia?: Array<{
          fecha: string;
          viento?: Array<{ periodo: string; velocidad: string; direccion: string }>;
          precipitacion?: Array<{ periodo: string; value: string }>;
          temperatura?: Array<{ periodo: string; value: string }>;
          humedadRelativa?: Array<{ periodo: string; value: string }>;
        }>;
      };
    }>;
    const first = arr[0]?.prediccion?.dia?.[0];
    const wind = first?.viento?.[0];
    const rain = first?.precipitacion?.[0];
    const temp = first?.temperatura?.[0];
    const hum = first?.humedadRelativa?.[0];

    const snapshot: WeatherSnapshot = {
      capturedAt: new Date().toISOString(),
      stationId: `municipio:${municipioId}`,
      windSpeedMs: wind ? parseFloat(wind.velocidad) / 3.6 : undefined, // km/h → m/s
      precipitationMm: rain ? parseFloat(rain.value) : undefined,
      temperatureC: temp ? parseFloat(temp.value) : undefined,
      humidityPct: hum ? parseFloat(hum.value) : undefined,
      raw: data,
    };
    snapshot.flightSuitable = evaluateFlightSuitable(snapshot);
    return snapshot;
  } catch (err) {
    console.warn("[aemet] normalize falló:", err);
    return makeStubSnapshotForMunicipio(municipioId);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Stubs realistas (modo dev / fallback)
// ──────────────────────────────────────────────────────────────────────

function makeStubSnapshot(lat: number, lng: number): WeatherSnapshot {
  const snapshot: WeatherSnapshot = {
    capturedAt: new Date().toISOString(),
    stationId: `stub:${lat.toFixed(2)},${lng.toFixed(2)}`,
    windSpeedMs: 3.2,
    windDirectionDeg: 220,
    precipitationMm: 0,
    temperatureC: 20,
    humidityPct: 55,
    raw: { stub: true, lat, lng, source: "aemet-stub" },
  };
  snapshot.flightSuitable = evaluateFlightSuitable(snapshot);
  return snapshot;
}

function makeStubSnapshotForMunicipio(municipioId: string): WeatherSnapshot {
  const snapshot: WeatherSnapshot = {
    capturedAt: new Date().toISOString(),
    stationId: `stub:municipio:${municipioId}`,
    windSpeedMs: 3.5,
    windDirectionDeg: 210,
    precipitationMm: 0,
    temperatureC: 19,
    humidityPct: 58,
    raw: { stub: true, municipioId, source: "aemet-stub" },
  };
  snapshot.flightSuitable = evaluateFlightSuitable(snapshot);
  return snapshot;
}
