/**
 * AgroOps — parcels schemas tests (HU-07)
 *
 * Tests puros (sin DB) sobre validación GeoJSON Polygon + SIGPAC regex.
 */
import { describe, expect, it } from "vitest";
import {
  createParcelSchema,
  listParcelFiltersSchema,
  parcelIdSchema,
  polygonGeoJSONSchema,
  updateParcelSchema,
} from "./schemas";

const validPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-3.7, 40.4],
      [-3.69, 40.4],
      [-3.69, 40.41],
      [-3.7, 40.41],
      [-3.7, 40.4],
    ],
  ],
};

const validBasic = {
  clientId: "00000000-0000-4000-8000-000000000001",
  sigpacReference: "28-079-0-0-12-345-1",
  name: "La Solana — Recinto 12",
  geometry: validPolygon,
};

describe("polygonGeoJSONSchema", () => {
  it("acepta Polygon válido", () => {
    expect(polygonGeoJSONSchema.safeParse(validPolygon).success).toBe(true);
  });

  it("rechaza type distinto de Polygon", () => {
    expect(
      polygonGeoJSONSchema.safeParse({ ...validPolygon, type: "Point" }).success,
    ).toBe(false);
  });

  it("rechaza coordinates con menos de 4 puntos (no es polígono cerrado)", () => {
    expect(
      polygonGeoJSONSchema.safeParse({
        type: "Polygon",
        coordinates: [
          [
            [-3.7, 40.4],
            [-3.69, 40.4],
            [-3.7, 40.4],
          ],
        ],
      }).success,
    ).toBe(false);
  });

  it("acepta polígono con multiple rings (exterior + holes)", () => {
    expect(
      polygonGeoJSONSchema.safeParse({
        type: "Polygon",
        coordinates: [
          [
            [-3.7, 40.4],
            [-3.6, 40.4],
            [-3.6, 40.5],
            [-3.7, 40.5],
            [-3.7, 40.4],
          ],
          [
            [-3.68, 40.42],
            [-3.62, 40.42],
            [-3.62, 40.48],
            [-3.68, 40.48],
            [-3.68, 40.42],
          ],
        ],
      }).success,
    ).toBe(true);
  });
});

describe("createParcelSchema — happy paths", () => {
  it("acepta input válido con objeto Polygon", () => {
    const result = createParcelSchema.safeParse(validBasic);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.geometry.type).toBe("Polygon");
      expect(result.data.sigpacReference).toBe("28-079-0-0-12-345-1");
    }
  });

  it("acepta geometry como string JSON (textarea)", () => {
    const result = createParcelSchema.safeParse({
      ...validBasic,
      geometry: JSON.stringify(validPolygon),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.geometry.type).toBe("Polygon");
    }
  });

  it("normaliza sigpacReference (trim)", () => {
    const result = createParcelSchema.safeParse({
      ...validBasic,
      sigpacReference: "   28-079-0-0-12-345-1   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sigpacReference).toBe("28-079-0-0-12-345-1");
    }
  });
});

describe("createParcelSchema — campos básicos", () => {
  it("rechaza clientId no UUID", () => {
    expect(
      createParcelSchema.safeParse({ ...validBasic, clientId: "not-uuid" })
        .success,
    ).toBe(false);
  });

  it("rechaza sigpacReference con formato inválido", () => {
    expect(
      createParcelSchema.safeParse({
        ...validBasic,
        sigpacReference: "28079001234500001",
      }).success,
    ).toBe(false);
  });

  it("rechaza name vacío", () => {
    expect(
      createParcelSchema.safeParse({ ...validBasic, name: "" }).success,
    ).toBe(false);
  });

  it("rechaza geometry string no parseable JSON", () => {
    const result = createParcelSchema.safeParse({
      ...validBasic,
      geometry: "{not valid json",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza lat/lng fuera de rango", () => {
    const result = createParcelSchema.safeParse({
      ...validBasic,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [200, 100],
            [201, 100],
            [201, 101],
            [200, 101],
            [200, 100],
          ],
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it("acepta areaHectares opcional", () => {
    const result = createParcelSchema.safeParse({
      ...validBasic,
      areaHectares: 2.5,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza areaHectares negativo", () => {
    const result = createParcelSchema.safeParse({
      ...validBasic,
      areaHectares: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateParcelSchema", () => {
  it("acepta update parcial sin geometry", () => {
    const result = updateParcelSchema.safeParse({ crop: "olivar" });
    expect(result.success).toBe(true);
  });

  it("acepta update parcial sólo con name", () => {
    const result = updateParcelSchema.safeParse({ name: "Nuevo nombre" });
    expect(result.success).toBe(true);
  });
});

describe("parcelIdSchema", () => {
  it("acepta UUID válido", () => {
    expect(
      parcelIdSchema.safeParse("00000000-0000-4000-8000-000000000000").success,
    ).toBe(true);
  });
  it("rechaza no-UUID", () => {
    expect(parcelIdSchema.safeParse("not-uuid").success).toBe(false);
  });
});

describe("listParcelFiltersSchema", () => {
  it("acepta filtros vacíos", () => {
    expect(listParcelFiltersSchema.safeParse({}).success).toBe(true);
  });
  it("acepta clientId válido", () => {
    expect(
      listParcelFiltersSchema.safeParse({
        clientId: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
  });
  it("rechaza clientId no UUID", () => {
    expect(
      listParcelFiltersSchema.safeParse({ clientId: "foo" }).success,
    ).toBe(false);
  });
});
