/**
 * AgroOps — phytosanitary schemas tests (HU-08)
 */
import { describe, expect, it } from "vitest";
import {
  createPhytoProductSchema,
  doseUnitValues,
  listPhytoFiltersSchema,
  phytoProductIdSchema,
  updatePhytoProductSchema,
} from "./schemas";

const valid = {
  commercialName: "Karate Zeon",
  activeIngredient: "Lambda-cihalotrina 10% [CS]",
  lotNumber: "L-2026-001",
  expiresAt: "2027-12-31",
};

describe("createPhytoProductSchema — happy paths", () => {
  it("acepta el mínimo viable", () => {
    const result = createPhytoProductSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(true);
      expect(result.data.formulation).toBeNull();
    }
  });

  it("normaliza formulación a uppercase", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      formulation: "ec",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.formulation).toBe("EC");
    }
  });

  it("acepta dosis recomendada con value + unit", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      recommendedDoseValue: 1.5,
      recommendedDoseUnit: "l_per_ha",
    });
    expect(result.success).toBe(true);
  });
});

describe("createPhytoProductSchema — business rules dosis", () => {
  it("rechaza dosis con value sin unit", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      recommendedDoseValue: 1.5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === "recommendedDoseUnit",
      );
      expect(issue?.message).toMatch(/unidad/i);
    }
  });

  it("rechaza dosis con unit sin value", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      recommendedDoseUnit: "l_per_ha",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === "recommendedDoseValue",
      );
      expect(issue?.message).toMatch(/valor/i);
    }
  });

  it("acepta value=0 con unit (dosis disuasoria documentada)", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      recommendedDoseValue: 0,
      recommendedDoseUnit: "l_per_ha",
    });
    expect(result.success).toBe(true);
  });
});

describe("createPhytoProductSchema — campos básicos", () => {
  it("rechaza commercialName vacío", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      commercialName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza activeIngredient vacío", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      activeIngredient: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza lotNumber vacío", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      lotNumber: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza expiresAt formato no ISO", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      expiresAt: "31-12-2027",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza safetyPeriodDays negativo", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      safetyPeriodDays: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza unidad de dosis inválida", () => {
    const result = createPhytoProductSchema.safeParse({
      ...valid,
      recommendedDoseValue: 1,
      recommendedDoseUnit: "kg_per_acre" as unknown as (typeof doseUnitValues)[number],
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePhytoProductSchema", () => {
  it("acepta update parcial", () => {
    const result = updatePhytoProductSchema.safeParse({
      safetyPeriodDays: 14,
    });
    expect(result.success).toBe(true);
  });

  it("aplica business rule si ambos campos están presentes", () => {
    const result = updatePhytoProductSchema.safeParse({
      recommendedDoseValue: 2.0,
    });
    expect(result.success).toBe(false);
  });
});

describe("phytoProductIdSchema", () => {
  it("acepta UUID válido", () => {
    expect(
      phytoProductIdSchema.safeParse("00000000-0000-4000-8000-000000000000")
        .success,
    ).toBe(true);
  });
  it("rechaza no-UUID", () => {
    expect(phytoProductIdSchema.safeParse("foo").success).toBe(false);
  });
});

describe("listPhytoFiltersSchema", () => {
  it("acepta filtros vacíos", () => {
    expect(listPhytoFiltersSchema.safeParse({}).success).toBe(true);
  });
  it("acepta active boolean", () => {
    expect(listPhytoFiltersSchema.safeParse({ active: false }).success).toBe(
      true,
    );
  });
});
