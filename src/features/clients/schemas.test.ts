/**
 * AgroOps — clients schemas tests (HU-06)
 */
import { describe, expect, it } from "vitest";
import {
  clientIdSchema,
  clientTypeValues,
  createClientSchema,
  listClientFiltersSchema,
  updateClientSchema,
} from "./schemas";

const validBasic = {
  name: "Cooperativa La Vega",
  taxId: "B12345678",
};

describe("createClientSchema — happy paths", () => {
  it("acepta cliente básico con name + taxId", () => {
    const result = createClientSchema.safeParse(validBasic);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxId).toBe("B12345678");
      expect(result.data.type).toBe("agricultor");
      expect(result.data.country).toBe("ES");
    }
  });

  it("normaliza taxId con espacios, puntos y guiones", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      taxId: "B-12.345 678",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxId).toBe("B12345678");
    }
  });

  it("normaliza contactEmail trim + lowercase", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      contactEmail: "  Contacto@CLIENTE.es  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactEmail).toBe("contacto@cliente.es");
    }
  });

  it("acepta contactEmail vacío como null", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      contactEmail: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactEmail).toBeNull();
    }
  });

  it("uppercase del country code", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      country: "fr",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.country).toBe("FR");
    }
  });
});

describe("createClientSchema — campos básicos", () => {
  it("rechaza name vacío", () => {
    const result = createClientSchema.safeParse({ ...validBasic, name: "" });
    expect(result.success).toBe(false);
  });

  it("rechaza taxId con letras minoritarias mal formadas", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      taxId: "AB",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza tipo inválido", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      type: "particular",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza email mal formado", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      contactEmail: "no-es-email",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza country distinto de 2 letras", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      country: "ESP",
    });
    expect(result.success).toBe(false);
  });
});

describe("createClientSchema — business rule postalCode ES", () => {
  it("acepta CP español de 5 dígitos", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      country: "ES",
      postalCode: "28001",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza CP español de menos de 5 dígitos", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      country: "ES",
      postalCode: "1234",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === "postalCode",
      );
      expect(issue?.message).toMatch(/5 d/i);
    }
  });

  it("acepta postalCode no-ES con cualquier formato", () => {
    const result = createClientSchema.safeParse({
      ...validBasic,
      country: "PT",
      postalCode: "1234-567",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateClientSchema", () => {
  it("acepta update parcial", () => {
    const result = updateClientSchema.safeParse({ contactPhone: "+34 999..." });
    expect(result.success).toBe(true);
  });

  it("aplica business rule de CP cuando se pasa country + postalCode", () => {
    const result = updateClientSchema.safeParse({
      country: "ES",
      postalCode: "abc",
    });
    expect(result.success).toBe(false);
  });
});

describe("clientIdSchema", () => {
  it("acepta UUID válido", () => {
    expect(
      clientIdSchema.safeParse("00000000-0000-4000-8000-000000000000").success,
    ).toBe(true);
  });
  it("rechaza string que no es UUID", () => {
    expect(clientIdSchema.safeParse("not-uuid").success).toBe(false);
  });
});

describe("listClientFiltersSchema", () => {
  it("acepta filtros vacíos", () => {
    expect(listClientFiltersSchema.safeParse({}).success).toBe(true);
  });
  it("acepta type válido", () => {
    expect(
      listClientFiltersSchema.safeParse({ type: "cooperativa" }).success,
    ).toBe(true);
  });
  it("rechaza type inválido", () => {
    expect(listClientFiltersSchema.safeParse({ type: "x" }).success).toBe(
      false,
    );
  });
});

describe("clientTypeValues", () => {
  it("incluye los 6 tipos canónicos", () => {
    expect(clientTypeValues).toEqual([
      "cooperativa",
      "atria",
      "agricultor",
      "comunidad_regantes",
      "empresa_agraria",
      "otros",
    ]);
  });
});
