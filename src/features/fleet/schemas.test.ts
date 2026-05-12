/**
 * AgroOps — fleet schemas tests
 *
 * Cobertura del `createDroneSchema` y `updateDroneSchema`. Verifica las
 * reglas de negocio cross-field (applicationCapable ↔ payloadLitres ↔ easaClass)
 * y normalización (trim, uppercase de serialNumber, default DJI).
 */
import { describe, expect, it } from "vitest";
import {
  createDroneSchema,
  droneIdSchema,
  listDroneFiltersSchema,
  updateDroneSchema,
} from "./schemas";

const validApplicator = {
  model: "T50",
  serialNumber: "agm-t50-001",
  mtomGrams: 92000,
  easaClass: "c6" as const,
  applicationCapable: true,
  payloadLitres: 40,
};

const validNonApplicator = {
  model: "Mavic 3 Enterprise",
  serialNumber: "agm-m3e-001",
  mtomGrams: 920,
  easaClass: "c1" as const,
  applicationCapable: false,
};

describe("createDroneSchema — happy paths", () => {
  it("acepta un aplicador T50 con C6 y tanque", () => {
    const result = createDroneSchema.safeParse(validApplicator);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.manufacturer).toBe("DJI"); // default
      expect(result.data.serialNumber).toBe("AGM-T50-001"); // uppercase
      expect(result.data.status).toBe("active"); // default
      expect(result.data.flightHours).toBe(0); // default
    }
  });

  it("acepta un Mavic no aplicador", () => {
    const result = createDroneSchema.safeParse(validNonApplicator);
    expect(result.success).toBe(true);
  });

  it("normaliza serialNumber con trim + uppercase", () => {
    const result = createDroneSchema.safeParse({
      ...validApplicator,
      serialNumber: "  agm-t50-002  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.serialNumber).toBe("AGM-T50-002");
    }
  });

  it("normaliza notas vacías o sólo espacios a null", () => {
    const result = createDroneSchema.safeParse({
      ...validApplicator,
      notes: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
    }
  });
});

describe("createDroneSchema — business rules", () => {
  it("rechaza aplicador sin tanque", () => {
    const result = createDroneSchema.safeParse({
      ...validApplicator,
      payloadLitres: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === "payloadLitres",
      );
      expect(issue?.message).toMatch(/tanque/i);
    }
  });

  it("rechaza aplicador con tanque = 0", () => {
    const result = createDroneSchema.safeParse({
      ...validApplicator,
      payloadLitres: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza aplicador con clase EASA fuera de C5/C6", () => {
    const result = createDroneSchema.safeParse({
      ...validApplicator,
      easaClass: "c1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "easaClass");
      expect(issue?.message).toMatch(/C5 o C6/);
    }
  });

  it("rechaza n_a marcado como aplicador", () => {
    const result = createDroneSchema.safeParse({
      ...validNonApplicator,
      easaClass: "n_a",
      applicationCapable: true,
      payloadLitres: 40,
    });
    expect(result.success).toBe(false);
  });
});

describe("createDroneSchema — campos básicos", () => {
  it("rechaza model vacío", () => {
    const result = createDroneSchema.safeParse({
      ...validNonApplicator,
      model: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza mtomGrams negativo", () => {
    const result = createDroneSchema.safeParse({
      ...validNonApplicator,
      mtomGrams: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza mtomGrams no entero", () => {
    const result = createDroneSchema.safeParse({
      ...validNonApplicator,
      mtomGrams: 920.5,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza mtomGrams > 200_000", () => {
    const result = createDroneSchema.safeParse({
      ...validNonApplicator,
      mtomGrams: 500_000,
    });
    expect(result.success).toBe(false);
  });

  it("acepta insuranceExpiresAt en formato YYYY-MM-DD", () => {
    const result = createDroneSchema.safeParse({
      ...validApplicator,
      insuranceExpiresAt: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza insuranceExpiresAt con formato distinto", () => {
    const result = createDroneSchema.safeParse({
      ...validApplicator,
      insuranceExpiresAt: "31/12/2026",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateDroneSchema", () => {
  it("acepta update parcial sin tocar businessRules cross-field", () => {
    const result = updateDroneSchema.safeParse({
      flightHours: 12.5,
    });
    expect(result.success).toBe(true);
  });

  it("aplica businessRules sólo si applicationCapable + easaClass juntos", () => {
    const result = updateDroneSchema.safeParse({
      applicationCapable: true,
      easaClass: "c1",
      payloadLitres: 10,
    });
    expect(result.success).toBe(false);
  });

  it("update sólo applicationCapable sin easaClass no valida cross-field", () => {
    const result = updateDroneSchema.safeParse({
      applicationCapable: true,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza fields fuera del schema", () => {
    const result = updateDroneSchema.safeParse({
      pilotId: "should-not-be-allowed",
    });
    // partial pero strict false por default — Zod ignora keys extra.
    // Si quisiéramos strict, deberíamos usar .strict(). Verificamos
    // que al menos pasa pero ignora la key.
    expect(result.success).toBe(true);
    if (result.success) {
      expect("pilotId" in result.data).toBe(false);
    }
  });
});

describe("droneIdSchema", () => {
  it("acepta UUIDs válidos", () => {
    expect(
      droneIdSchema.safeParse("00000000-0000-4000-8000-000000000000").success,
    ).toBe(true);
  });

  it("rechaza strings que no son UUID", () => {
    expect(droneIdSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(droneIdSchema.safeParse("").success).toBe(false);
  });
});

describe("listDroneFiltersSchema", () => {
  it("acepta filtros vacíos", () => {
    const result = listDroneFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("acepta filtros parciales", () => {
    const result = listDroneFiltersSchema.safeParse({ status: "active" });
    expect(result.success).toBe(true);
  });

  it("rechaza valores de enum inválidos", () => {
    const result = listDroneFiltersSchema.safeParse({
      status: "invalido",
    });
    expect(result.success).toBe(false);
  });
});
