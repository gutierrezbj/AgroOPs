/**
 * AgroOps — E2E healthcheck (Sprint 5 / HU-25)
 *
 * /api/health es público y reporta estado de DB + Redis + integraciones.
 * Verifica:
 * - HTTP 200 (deployment operativo)
 * - DB y Redis con status="ok"
 * - Estructura del payload coincide con HealthReport
 */
import { expect, test } from "@playwright/test";

test.describe("healthcheck", () => {
  test("/api/health responde 200 con DB y Redis ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("uptime");
    expect(body).toHaveProperty("checks");
    expect(Array.isArray(body.checks)).toBe(true);

    // DB y Redis son los críticos — deben estar ok en un entorno funcional
    const db = body.checks.find((c: { name: string }) => c.name === "database");
    const redis = body.checks.find((c: { name: string }) => c.name === "redis");

    expect(db).toBeDefined();
    expect(db.status).toBe("ok");
    expect(typeof db.latencyMs).toBe("number");

    expect(redis).toBeDefined();
    expect(redis.status).toBe("ok");

    // El estado agregado nunca debe ser "down" si DB+Redis están ok
    expect(body.status).not.toBe("down");
  });

  test("/api/health expone componentes esperados", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    const names = body.checks.map((c: { name: string }) => c.name).sort();
    expect(names).toEqual(
      ["aemet", "backup-s3", "database", "enaire", "holded", "redis", "telegram"].sort(),
    );
  });
});
