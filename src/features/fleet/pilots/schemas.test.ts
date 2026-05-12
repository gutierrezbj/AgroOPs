/**
 * AgroOps — pilots schemas tests (HU-05)
 *
 * Cobertura del `createPilotSchema` y `updatePilotSchema` incluidas las
 * business rules cross-field de ROPO y normalización del NIF.
 */
import { describe, expect, it } from "vitest";
import {
  createPilotSchema,
  listPilotFiltersSchema,
  pilotIdSchema,
  updatePilotSchema,
} from "./schemas";

const validBasic = {
  fullName: "John Doe",
  nif: "12345678a",
};

const validRopo = {
  fullName: "John Aplicador",
  nif: "87654321B",
  ropoQualified: true,
  ropoNumber: "ROPO-2026-001",
  ropoLevel: "Piloto aplicador",
  ropoExpiresAt: "2028-12-31",
};

describe("createPilotSchema — happy paths", () => {
  it("acepta piloto básico sólo con fullName + NIF", () => {
    const result = createPilotSchema.safeParse(validBasic);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nif).toBe("12345678A"); // uppercased
      expect(result.data.ropoQualified).toBe(false); // default
      expect(result.data.active).toBe(true); // default
      expect(result.data.flightHours).toBe(0); // default
    }
  });

  it("acepta piloto ROPO con todos los campos requeridos", () => {
    const result = createPilotSchema.safeParse(validRopo);
    expect(result.success).toBe(true);
  });

  it("normaliza NIF con espacios y minúsculas", () => {
    const result = createPilotSchema.safeParse({
      ...validBasic,
      nif: "  12345678a  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nif).toBe("12345678A");
    }
  });

  it("acepta NIE válido (X1234567L)", () => {
    const result = createPilotSchema.safeParse({
      ...validBasic,
      nif: "X1234567L",
    });
    expect(result.success).toBe(true);
  });

  it("normaliza notas vacías a null", () => {
    const result = createPilotSchema.safeParse({
      ...validBasic,
      notes: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
    }
  });
});

describe("createPilotSchema — business rules ROPO", () => {
  it("rechaza ROPO sin ropoNumber", () => {
    const result = createPilotSchema.safeParse({
      ...validRopo,
      ropoNumber: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === "ropoNumber",
      );
      expect(issue?.message).toMatch(/número ROPO/i);
    }
  });

  it("rechaza ROPO sin ropoLevel", () => {
    const result = createPilotSchema.safeParse({
      ...validRopo,
      ropoLevel: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "ropoLevel");
      expect(issue?.message).toMatch(/nivel/i);
    }
  });

  it("rechaza ROPO sin ropoExpiresAt", () => {
    const result = createPilotSchema.safeParse({
      ...validRopo,
      ropoExpiresAt: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === "ropoExpiresAt",
      );
      expect(issue?.message).toMatch(/caducidad/i);
    }
  });

  it("acepta ropoQualified=false sin campos ROPO", () => {
    const result = createPilotSchema.safeParse(validBasic);
    expect(result.success).toBe(true);
  });
});

describe("createPilotSchema — campos básicos", () => {
  it("rechaza fullName vacío", () => {
    const result = createPilotSchema.safeParse({
      ...validBasic,
      fullName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza NIF con caracteres no alfanuméricos", () => {
    const result = createPilotSchema.safeParse({
      ...validBasic,
      nif: "12.34.56-A",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza NIF demasiado corto", () => {
    const result = createPilotSchema.safeParse({
      ...validBasic,
      nif: "1234A",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza fechas en formato no ISO", () => {
    const result = createPilotSchema.safeParse({
      ...validBasic,
      aesaLicenseExpiresAt: "31/12/2026",
    });
    expect(result.success).toBe(false);
  });

  it("acepta fechas YYYY-MM-DD en todos los campos de caducidad", () => {
    const result = createPilotSchema.safeParse({
      ...validBasic,
      aesaLicenseExpiresAt: "2026-12-31",
      insuranceExpiresAt: "2026-06-30",
      medicalCertificateExpiresAt: "2027-01-15",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza flightHours negativo", () => {
    const result = createPilotSchema.safeParse({
      ...validBasic,
      flightHours: -10,
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePilotSchema", () => {
  it("acepta update parcial sin trigger de business rules", () => {
    const result = updatePilotSchema.safeParse({ flightHours: 25.5 });
    expect(result.success).toBe(true);
  });

  it("aplica business rules ROPO si ropoQualified está presente", () => {
    const result = updatePilotSchema.safeParse({
      ropoQualified: true,
      ropoNumber: null,
    });
    expect(result.success).toBe(false);
  });

  it("update con ropoQualified=false no exige campos ROPO", () => {
    const result = updatePilotSchema.safeParse({ ropoQualified: false });
    expect(result.success).toBe(true);
  });
});

describe("pilotIdSchema", () => {
  it("acepta UUIDs válidos", () => {
    expect(
      pilotIdSchema.safeParse("00000000-0000-4000-8000-000000000000").success,
    ).toBe(true);
  });

  it("rechaza strings que no son UUID", () => {
    expect(pilotIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("listPilotFiltersSchema", () => {
  it("acepta filtros vacíos", () => {
    expect(listPilotFiltersSchema.safeParse({}).success).toBe(true);
  });
  it("acepta filtros parciales válidos", () => {
    expect(
      listPilotFiltersSchema.safeParse({ active: true, ropoQualified: false })
        .success,
    ).toBe(true);
  });
});
