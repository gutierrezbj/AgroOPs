/**
 * AgroOps — auth services tests (integración con DB local)
 *
 * Requiere el seed AgroM cargado: 3 users con password DEV `agroops-dev-2026`.
 * Si `make dev` está abajo, este test falla con `ECONNREFUSED 127.0.0.1:6170`.
 *
 * Usuarios seed (de `src/db/seed/users.ts`):
 * - juancho@systemrapid.io  → admin
 * - john@agrom.es           → piloto
 * - adriana@agrom.es        → operario
 */
import { afterAll, describe, expect, it } from "vitest";
import { verifyCredentials } from "./services";

const SEED_PASSWORD = "agroops-dev-2026";

describe("verifyCredentials (integración Postgres 127.0.0.1:6170)", () => {
  it("autentica al admin JuanCho con password seed", async () => {
    const user = await verifyCredentials(
      "juancho@systemrapid.io",
      SEED_PASSWORD,
    );
    expect(user).not.toBeNull();
    expect(user?.email).toBe("juancho@systemrapid.io");
    expect(user?.role).toBe("admin");
    expect(user?.name).toContain("Juan");
    expect(user?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("autentica al piloto John", async () => {
    const user = await verifyCredentials("john@agrom.es", SEED_PASSWORD);
    expect(user).not.toBeNull();
    expect(user?.role).toBe("piloto");
  });

  it("autentica al operario Adriana", async () => {
    const user = await verifyCredentials("adriana@agrom.es", SEED_PASSWORD);
    expect(user).not.toBeNull();
    expect(user?.role).toBe("operario");
  });

  it("devuelve null con password incorrecto", async () => {
    const user = await verifyCredentials(
      "juancho@systemrapid.io",
      "password-mal",
    );
    expect(user).toBeNull();
  });

  it("devuelve null con email que no existe", async () => {
    const user = await verifyCredentials(
      "no-existe@agroops.test",
      SEED_PASSWORD,
    );
    expect(user).toBeNull();
  });

  it("normaliza la búsqueda: el email seed se busca tal cual (lowercase)", async () => {
    // El service no normaliza; la normalización ocurre en el schema antes.
    // Aquí confirmamos que email lowercase encuentra al seed.
    const user = await verifyCredentials(
      "juancho@systemrapid.io",
      SEED_PASSWORD,
    );
    expect(user).not.toBeNull();
  });

  afterAll(async () => {
    // Drizzle pool: en tests cortos no hace falta cerrar explícitamente.
    // Si vemos hang en CI, importar `pool` y llamar `pool.end()`.
  });
});
