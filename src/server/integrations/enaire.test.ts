/**
 * AgroOps — ENAIRE tests (HU-12)
 *
 * Sin `ENAIRE_NOTAM_FEED` configurado en `.env.local`, todas las llamadas
 * devuelven el stub. Si está configurado, los tests siguen funcionando
 * porque la implementación cae a stub ante cualquier error de red.
 *
 * Nota: estos tests interactúan con Redis (cache). El cliente Redis se
 * conecta lazy; si Redis está abajo, los tests aún pasan (las funciones
 * `tryReadCache`/`tryWriteCache` capturan los errores).
 */
import { afterAll, describe, expect, it } from "vitest";
import { closeRedis } from "@/lib/redis";
import { fetchActiveNotams } from "./enaire";

afterAll(async () => {
  await closeRedis();
});

describe("fetchActiveNotams", () => {
  it("devuelve FeatureCollection válida", async () => {
    const result = await fetchActiveNotams();
    expect(result.type).toBe("FeatureCollection");
    expect(Array.isArray(result.features)).toBe(true);
    expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("source válido (live / cache / stub)", async () => {
    const result = await fetchActiveNotams();
    expect(["enaire-live", "enaire-cache", "enaire-stub"]).toContain(
      result.source,
    );
  });

  it("acepta opciones bbox/from/to (las ignora en v1)", async () => {
    const result = await fetchActiveNotams({
      bbox: [-3.8, 40.3, -3.6, 40.5],
      from: new Date(),
      to: new Date(Date.now() + 86_400_000),
    });
    expect(result.type).toBe("FeatureCollection");
  });
});
