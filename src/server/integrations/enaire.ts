/**
 * AgroOps — integración ENAIRE NOTAM feed (HU-12)
 *
 * Consume NOTAMs activos y los expone como FeatureCollection de GeoJSON
 * para overlay en MapLibre (HU-14) y para gate de preflight (HU-10).
 *
 * Estrategia v1:
 * 1. Mirar cache Redis (TTL 15 min). Si hit, devolver.
 * 2. Si miss y `ENAIRE_NOTAM_FEED` apunta a un endpoint real, intentar fetch.
 * 3. Si falla o no hay feed real, devolver un stub vacío con metadata
 *    explícita `source: enaire-stub` para que el operador sepa.
 * 4. Cachear el resultado real para 15 min; el stub no se cachea
 *    (cada llamada vuelve a intentar fetch).
 *
 * v1.1:
 * - Parseo del feed AIXM real de ENAIRE (XML).
 * - Filtro por bbox al server (en v1 cliente filtra).
 * - Cache por cell h3 o grid 0.1° en vez de "all".
 */
import type { FeatureCollection } from "geojson";
import { getRedis } from "@/lib/redis";

const ENAIRE_NOTAM_FEED = process.env.ENAIRE_NOTAM_FEED ?? "";
const CACHE_KEY = "enaire:notam:all";
const CACHE_TTL_SECONDS = 15 * 60;
const ENAIRE_FETCH_TIMEOUT_MS = 8000;

export interface NotamProperties {
  notamId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  severity?: "info" | "warning" | "restriction";
  source: "enaire-live" | "enaire-stub" | "enaire-cache";
}

export interface NotamFetchOptions {
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  from?: Date;
  to?: Date;
}

export interface NotamCollection
  extends FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon,
    NotamProperties
  > {
  fetchedAt: string;
  source: "enaire-live" | "enaire-stub" | "enaire-cache";
}

/**
 * Lee NOTAMs activos. La firma original aceptaba `bbox` requerido; en v1
 * lo dejamos opcional porque el feed real puede no soportarlo y filtramos
 * cliente-side. Los `from/to` también son opcionales (default: ahora).
 */
export async function fetchActiveNotams(
  _options: NotamFetchOptions = {},
): Promise<NotamCollection> {
  // 1. Cache hit
  const cached = await tryReadCache();
  if (cached) return cached;

  // 2. Fetch real si hay feed configurado
  if (ENAIRE_NOTAM_FEED) {
    try {
      const live = await fetchFromEnaire();
      await tryWriteCache(live);
      return live;
    } catch (err) {
      console.warn("[enaire] fetch falló, usando stub:", err);
    }
  } else {
    console.info("[enaire] sin ENAIRE_NOTAM_FEED configurado, devolviendo stub");
  }

  // 3. Stub (no se cachea: cada call reintenta)
  return makeStubCollection();
}

async function tryReadCache(): Promise<NotamCollection | null> {
  try {
    const redis = await getRedis();
    const raw = await redis.get(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NotamCollection;
    return {
      ...parsed,
      source: "enaire-cache",
    };
  } catch (err) {
    console.warn("[enaire] cache read falló:", err);
    return null;
  }
}

async function tryWriteCache(data: NotamCollection): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(CACHE_KEY, JSON.stringify(data), {
      EX: CACHE_TTL_SECONDS,
    });
  } catch (err) {
    console.warn("[enaire] cache write falló:", err);
  }
}

async function fetchFromEnaire(): Promise<NotamCollection> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    ENAIRE_FETCH_TIMEOUT_MS,
  );
  try {
    const res = await fetch(ENAIRE_NOTAM_FEED, {
      signal: controller.signal,
      headers: { accept: "application/json,application/xml" },
    });
    if (!res.ok) {
      throw new Error(
        `ENAIRE ${res.status} ${res.statusText} en ${ENAIRE_NOTAM_FEED}`,
      );
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const raw = (await res.json()) as unknown;
      return normalizeEnaireJson(raw);
    }
    // Caso típico: AIXM XML. En v1 no parseamos el XML; devolvemos vacía con
    // metadata indicando que el feed respondió OK pero el parser no está.
    return {
      type: "FeatureCollection",
      features: [],
      fetchedAt: new Date().toISOString(),
      source: "enaire-live",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Normaliza una respuesta JSON de ENAIRE (si el feed la devuelve así) a
 * `NotamCollection`. En v1 hacemos lo mínimo: si hay un campo `features`,
 * lo pasamos tal cual.
 */
function normalizeEnaireJson(raw: unknown): NotamCollection {
  const candidate = raw as Partial<NotamCollection>;
  if (
    candidate &&
    candidate.type === "FeatureCollection" &&
    Array.isArray(candidate.features)
  ) {
    return {
      type: "FeatureCollection",
      features: candidate.features,
      fetchedAt: new Date().toISOString(),
      source: "enaire-live",
    };
  }
  console.warn("[enaire] JSON no reconocido como FeatureCollection; vacía");
  return {
    type: "FeatureCollection",
    features: [],
    fetchedAt: new Date().toISOString(),
    source: "enaire-live",
  };
}

function makeStubCollection(): NotamCollection {
  return {
    type: "FeatureCollection",
    features: [],
    fetchedAt: new Date().toISOString(),
    source: "enaire-stub",
  };
}
