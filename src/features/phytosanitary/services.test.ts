/**
 * AgroOps — phytosanitary services tests (HU-08, integración Postgres)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { like } from "drizzle-orm";
import { db } from "@/db";
import {
  phytosanitaryProducts,
  type PhytosanitaryProduct,
} from "@/db/schema/phytosanitary";
import {
  archivePhytoProduct,
  createPhytoProduct,
  evaluateExpiry,
  getPhytoProduct,
  listPhytoProducts,
  restorePhytoProduct,
  updatePhytoProduct,
} from "./services";

const TEST_PREFIX = "TEST08PHY-";

async function cleanup() {
  await db
    .delete(phytosanitaryProducts)
    .where(like(phytosanitaryProducts.lotNumber, `${TEST_PREFIX}%`));
}

beforeAll(cleanup);
afterAll(cleanup);

describe("phyto services", () => {
  it("createPhytoProduct inserta y devuelve fila", async () => {
    const created = await createPhytoProduct({
      commercialName: "Karate Test",
      activeIngredient: "Lambda-cihalotrina 10%",
      mapaRegistration: null,
      formulation: "CS",
      lotNumber: `${TEST_PREFIX}A`,
      expiresAt: "2027-06-30",
      recommendedDoseValue: 0.15,
      recommendedDoseUnit: "l_per_ha",
      safetyPeriodDays: 14,
      active: true,
      notes: null,
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.recommendedDoseValue).toBe("0.150");
    expect(created.safetyPeriodDays).toBe("14.0");
  });

  it("listPhytoProducts ordena por commercialName + lotNumber", async () => {
    const result = await listPhytoProducts();
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1];
      const curr = result[i];
      if (!prev || !curr) continue;
      if (prev.commercialName === curr.commercialName) {
        expect(curr.lotNumber >= prev.lotNumber).toBe(true);
      } else {
        expect(curr.commercialName >= prev.commercialName).toBe(true);
      }
    }
  });

  it("updatePhytoProduct cambia parciales y mantiene resto", async () => {
    const created = await createPhytoProduct({
      commercialName: "Update Test",
      activeIngredient: "Captan",
      mapaRegistration: null,
      formulation: null,
      lotNumber: `${TEST_PREFIX}UP`,
      expiresAt: "2027-01-01",
      recommendedDoseValue: null,
      recommendedDoseUnit: null,
      safetyPeriodDays: null,
      active: true,
      notes: null,
    });
    const updated = await updatePhytoProduct(created.id, {
      safetyPeriodDays: 21,
      notes: "Tras consultar técnico",
    });
    expect(updated?.safetyPeriodDays).toBe("21.0");
    expect(updated?.notes).toBe("Tras consultar técnico");
    expect(updated?.commercialName).toBe("Update Test");
  });

  it("archivePhytoProduct y restorePhytoProduct", async () => {
    const created = await createPhytoProduct({
      commercialName: "Archive Test",
      activeIngredient: "Cobre",
      mapaRegistration: null,
      formulation: null,
      lotNumber: `${TEST_PREFIX}AR`,
      expiresAt: "2027-01-01",
      recommendedDoseValue: null,
      recommendedDoseUnit: null,
      safetyPeriodDays: null,
      active: true,
      notes: null,
    });
    const archived = await archivePhytoProduct(created.id);
    expect(archived?.active).toBe(false);
    const restored = await restorePhytoProduct(created.id);
    expect(restored?.active).toBe(true);
  });

  it("getPhytoProduct con id no existente devuelve null", async () => {
    expect(
      await getPhytoProduct("00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });
});

describe("evaluateExpiry", () => {
  const today = new Date("2026-05-12T10:00:00Z");

  function makeProduct(expiresAt: string): PhytosanitaryProduct {
    return {
      id: "00000000-0000-0000-0000-000000000001",
      commercialName: "Test",
      activeIngredient: "Test",
      mapaRegistration: null,
      formulation: null,
      lotNumber: "TEST",
      expiresAt,
      recommendedDoseValue: null,
      recommendedDoseUnit: null,
      safetyPeriodDays: null,
      active: true,
      notes: null,
      createdAt: today,
      updatedAt: today,
    };
  }

  it("clasifica caducidad vencida hace 10 días como expired", () => {
    const r = evaluateExpiry(makeProduct("2026-05-02"), today);
    expect(r.severity).toBe("expired");
    expect(r.daysToExpiry).toBe(-10);
  });

  it("clasifica caducidad a 7 días como warning", () => {
    const r = evaluateExpiry(makeProduct("2026-05-19"), today);
    expect(r.severity).toBe("warning");
    expect(r.daysToExpiry).toBe(7);
  });

  it("clasifica caducidad a 90 días como ok", () => {
    const r = evaluateExpiry(makeProduct("2026-08-10"), today);
    expect(r.severity).toBe("ok");
    expect(r.daysToExpiry).toBe(90);
  });

  it("clasifica caducidad exactamente hoy como warning (días=0)", () => {
    const r = evaluateExpiry(makeProduct("2026-05-12"), today);
    expect(r.severity).toBe("warning");
    expect(r.daysToExpiry).toBe(0);
  });
});
