/**
 * AgroOps — Redis cliente singleton
 *
 * Una conexión reutilizada para toda la app server-side. El cliente se
 * conecta lazy en la primera llamada a `getRedis()` y se queda activo
 * para el resto del proceso.
 *
 * Usos previstos:
 * - Cache de NOTAMs ENAIRE (HU-12, TTL 15 min).
 * - Cache de snapshots meteo (HU-13, TTL 30 min por celda).
 * - Sesiones Auth.js (ADR-7) — Redis está reservado, pero v1 usa JWT cookies.
 *
 * Si Redis está caído, las llamadas a `getRedis()` lanzan; los callers
 * deben envolver en try/catch para no romper la request principal.
 */
import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (client?.isReady) return client;
  if (connectPromise) return connectPromise;

  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6171";
  connectPromise = (async () => {
    const c = createClient({ url }) as RedisClientType;
    c.on("error", (err) => {
      console.error("[redis] client error:", err);
    });
    await c.connect();
    client = c;
    return c;
  })();

  return connectPromise;
}

/**
 * Cierra la conexión (útil en tests para evitar hangs en teardown).
 */
export async function closeRedis(): Promise<void> {
  if (client?.isReady) {
    await client.quit();
  }
  client = null;
  connectPromise = null;
}
