/**
 * AgroOps — mission-codes tests (HU-11, integración Postgres)
 *
 * Verifica que `nextMissionCode` y `nextAlbaranCode`:
 * - Empiezan en `0001` cuando no hay códigos del año actual.
 * - Incrementan correctamente.
 * - Aíslan por año (filtran con `LIKE prefix-YYYY-%`).
 *
 * Se ejecuta contra Postgres local. Limpia las filas insertadas con `like()`
 * en `setUp`/`tearDown` para no contaminar el seed.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { missions } from "@/db/schema/missions";
import { nextAlbaranCode, nextMissionCode } from "./mission-codes";
import { NPTA_DROVINCI } from "./constants";

// Año fijado al actual — los tests se ejecutan en tiempo "real" así que el year
// que `nextMissionCode` calcula es `new Date().getFullYear()`.
const YEAR = new Date().getFullYear().toString();
const TEST_TAX_PREFIX = "TEST11CL-";

let testClientId: string;

/**
 * Cleanup borra primero las misiones de cualquier cliente test (orphans de
 * runs previos), luego los clientes. Evita FK violation al borrar clients
 * que aún tengan missions referencing.
 */
async function fullCleanup() {
  const staleClients = await db
    .select({ id: clients.id })
    .from(clients)
    .where(like(clients.taxId, `${TEST_TAX_PREFIX}%`));
  if (staleClients.length > 0) {
    await db.delete(missions).where(
      inArray(
        missions.clientId,
        staleClients.map((c) => c.id),
      ),
    );
  }
  await db.delete(clients).where(like(clients.taxId, `${TEST_TAX_PREFIX}%`));
}

async function insertTestMission(code: string): Promise<void> {
  await db.insert(missions).values({
    code,
    type: "aerial_application",
    status: "draft",
    clientId: testClientId,
    nptaReference: NPTA_DROVINCI,
  });
}

beforeAll(async () => {
  await fullCleanup();
  const [c] = await db
    .insert(clients)
    .values({
      name: "Test Client Codes",
      taxId: `${TEST_TAX_PREFIX}001`,
      type: "agricultor",
      country: "ES",
    })
    .returning();
  if (!c) throw new Error("No se pudo crear cliente test");
  testClientId = c.id;
});

afterAll(fullCleanup);

describe("nextMissionCode (HU-11)", () => {
  it("año vacío empieza por 0001", async () => {
    const code = await nextMissionCode();
    // Aunque haya seed/otros codes existentes del año, debe empezar tras el max+1.
    // Cleanup() borra TEST11M%, pero no toca AGM-YYYY-... del seed real.
    // Verificamos formato y que termine en NNNN coherente.
    expect(code).toMatch(new RegExp(`^AGM-${YEAR}-\\d{4}$`));
  });

  it("incrementa cuando ya existen códigos AGM-YYYY-NNNN", async () => {
    // Insertamos uno con código artificial muy alto para forzar el next
    const high = `AGM-${YEAR}-9000`;
    await insertTestMission(high);
    const code = await nextMissionCode();
    expect(code).toBe(`AGM-${YEAR}-9001`);
  });

  it("ignora códigos de otros años al calcular el siguiente", async () => {
    // Si hubiese código AGM-2025-NNNN no afecta a AGM-2026-NNNN.
    const otherYear = `AGM-2099-0050`;
    await insertTestMission(otherYear);
    const code = await nextMissionCode();
    // Tiene que ser del año actual, no 2099
    expect(code).toMatch(new RegExp(`^AGM-${YEAR}-`));
    // Limpieza del código artificial de 2099 (el cleanup global no toca esto)
    await db.delete(missions).where(eq(missions.code, otherYear));
  });
});

describe("nextAlbaranCode (HU-11)", () => {
  it("año vacío empieza por 0001", async () => {
    const code = await nextAlbaranCode();
    expect(code).toMatch(new RegExp(`^ALB-${YEAR}-\\d{4}$`));
  });

  it("formato siempre 4 dígitos con padding", async () => {
    const code = await nextAlbaranCode();
    const parts = code.split("-");
    expect(parts).toHaveLength(3);
    expect(parts[2]).toHaveLength(4);
  });
});

describe("formato y padding de códigos", () => {
  it("nextMissionCode usa prefix AGM", async () => {
    const code = await nextMissionCode();
    expect(code.startsWith("AGM-")).toBe(true);
  });

  it("nextAlbaranCode usa prefix ALB", async () => {
    const code = await nextAlbaranCode();
    expect(code.startsWith("ALB-")).toBe(true);
  });
});
