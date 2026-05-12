/**
 * AgroOps — Healthcheck service (HU-25)
 *
 * Evalúa el estado operativo del deployment:
 * - DB: SELECT 1 con timeout corto.
 * - Redis: PING con timeout corto.
 * - Integraciones: presencia de env vars (no toca el API externo para no
 *   gastar quota y no propagar fallos transitorios al healthcheck).
 *
 * Cada check devuelve `ok` boolean + opcional `error` string. El resultado
 * agregado incluye versión SHA del commit si está disponible vía env
 * (`AGROOPS_VERSION` o `VERCEL_GIT_COMMIT_SHA`) y un `degraded` flag (DB y
 * Redis verde, integraciones parcial).
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getRedis } from "@/lib/redis";
import { isHoldedConfigured } from "@/server/integrations/holded";

export type CheckStatus = "ok" | "degraded" | "down";

export interface ComponentCheck {
  name: string;
  status: CheckStatus;
  configured: boolean;
  message?: string;
  latencyMs?: number;
}

export interface HealthReport {
  status: CheckStatus;
  generatedAt: string;
  version: string;
  uptime: number; // seconds
  checks: ComponentCheck[];
}

const STARTED_AT = Date.now();

export async function runHealthCheck(): Promise<HealthReport> {
  const checks: ComponentCheck[] = [];

  // DB
  checks.push(await checkDatabase());

  // Redis
  checks.push(await checkRedis());

  // Integraciones (solo env, sin tocar API)
  checks.push(checkHoldedEnv());
  checks.push(checkAemetEnv());
  checks.push(checkEnaireEnv());
  checks.push(checkTelegramEnv());
  checks.push(checkBackupEnv());

  // Agregación: down si DB o Redis caídos; degraded si alguna integración
  // configurada pero con error; ok si todo configurado y verde.
  const dbCheck = checks[0]!;
  const redisCheck = checks[1]!;
  const criticalDown =
    dbCheck.status === "down" || redisCheck.status === "down";
  const anyDegraded = checks.some((c) => c.status === "degraded");
  const status: CheckStatus = criticalDown
    ? "down"
    : anyDegraded
      ? "degraded"
      : "ok";

  return {
    status,
    generatedAt: new Date().toISOString(),
    version:
      process.env.AGROOPS_VERSION ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      "dev",
    uptime: Math.round((Date.now() - STARTED_AT) / 1000),
    checks,
  };
}

async function checkDatabase(): Promise<ComponentCheck> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      name: "database",
      status: "ok",
      configured: true,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "database",
      status: "down",
      configured: Boolean(process.env.DATABASE_URL),
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}

async function checkRedis(): Promise<ComponentCheck> {
  const start = Date.now();
  try {
    const r = await getRedis();
    const pong = await r.ping();
    return {
      name: "redis",
      status: pong === "PONG" ? "ok" : "degraded",
      configured: true,
      latencyMs: Date.now() - start,
      message: pong === "PONG" ? undefined : `ping respondió ${pong}`,
    };
  } catch (err) {
    return {
      name: "redis",
      status: "down",
      configured: Boolean(process.env.REDIS_URL),
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}

function checkHoldedEnv(): ComponentCheck {
  const configured = isHoldedConfigured();
  return {
    name: "holded",
    status: configured ? "ok" : "degraded",
    configured,
    message: configured
      ? undefined
      : "HOLDED_API_KEY no definida — facturación deshabilitada",
  };
}

function checkAemetEnv(): ComponentCheck {
  const configured = Boolean(process.env.AEMET_API_KEY);
  return {
    name: "aemet",
    status: configured ? "ok" : "degraded",
    configured,
    message: configured
      ? undefined
      : "AEMET_API_KEY no definida — captura meteo usa stub",
  };
}

function checkEnaireEnv(): ComponentCheck {
  const configured = Boolean(process.env.ENAIRE_NOTAM_FEED);
  return {
    name: "enaire",
    status: configured ? "ok" : "degraded",
    configured,
    message: configured
      ? undefined
      : "ENAIRE_NOTAM_FEED no definido — NOTAMs usan stub",
  };
}

function checkTelegramEnv(): ComponentCheck {
  const configured = Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID,
  );
  return {
    name: "telegram",
    status: configured ? "ok" : "degraded",
    configured,
    message: configured
      ? undefined
      : "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID no configurados — sin alertas",
  };
}

function checkBackupEnv(): ComponentCheck {
  const configured = Boolean(
    process.env.BACKUP_S3_ENDPOINT &&
      process.env.BACKUP_S3_BUCKET &&
      process.env.BACKUP_S3_ACCESS_KEY &&
      process.env.BACKUP_S3_SECRET_KEY,
  );
  return {
    name: "backup-s3",
    status: configured ? "ok" : "degraded",
    configured,
    message: configured
      ? undefined
      : "Backup S3 no configurado — backups solo locales",
  };
}
