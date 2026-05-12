/**
 * AgroOps — field-notebook tests (HU-21)
 *
 * Tests puros sin DB sobre:
 * - summarizeFieldNotebook (agregación)
 * - formatDose / formatTotalAmount (helpers)
 *
 * El `listFieldNotebookEntries` toca DB con SQL raw multi-join. Su test
 * E2E queda para Sprint 5 hardening con Playwright + DB seedeada.
 */
import { describe, expect, it } from "vitest";
import {
  formatDose,
  formatTotalAmount,
  summarizeFieldNotebook,
  type FieldNotebookEntry,
} from "./services";

function makeEntry(overrides: Partial<FieldNotebookEntry> = {}): FieldNotebookEntry {
  return {
    missionId: "m-1",
    missionCode: "AGM-2026-0001",
    parcelId: "p-1",
    appliedAt: "2026-05-10T08:00:00.000Z",
    clientId: "c-1",
    clientName: "Cooperativa La Solana",
    clientTaxId: "B22222222",
    parcelName: "Recinto 12",
    sigpacReference: "28-079-0-0-12-345-1",
    crop: "olivar",
    cropVariety: "Picual",
    areaTreatedHa: 4.5,
    productCommercialName: "Karate Zeon",
    productActiveIngredient: "Lambda-cihalotrín 10%",
    productMapaRegistration: "23.111",
    productFormulation: "CS",
    lotUsed: "LOTE-2026-A",
    appliedDoseValue: 0.4,
    appliedDoseUnit: "l_per_ha",
    totalAmountUsed: 1.8,
    totalAmountUnit: "L",
    pilotName: "John Doe",
    pilotNif: "12345678Z",
    pilotRopoNumber: "ROPO-2026-XX",
    pilotAesaLicense: "AESA-A2-001",
    droneModel: "T50",
    droneSerialNumber: "T50-001",
    droneRegistrationCode: "ES-A123",
    nptaReference: "NPTA-DROVINCI-2026",
    albaranCode: "ALB-2026-0001",
    albaranPdfHash: "sha256:abc...",
    albaranSignedAt: "2026-05-10T09:00:00.000Z",
    ...overrides,
  };
}

describe("summarizeFieldNotebook", () => {
  it("devuelve resumen vacío si no hay entradas", () => {
    const summary = summarizeFieldNotebook([]);
    expect(summary).toEqual({
      entryCount: 0,
      missionCount: 0,
      parcelCount: 0,
      totalAreaHa: 0,
      totalProductLitres: 0,
      dateRangeFrom: null,
      dateRangeTo: null,
    });
  });

  it("cuenta entradas, misiones y parcelas distintas", () => {
    const entries = [
      makeEntry({ missionId: "m-1", parcelId: "p-1" }),
      makeEntry({ missionId: "m-1", parcelId: "p-2" }), // misma misión, distinta parcela
      makeEntry({ missionId: "m-2", parcelId: "p-1" }), // otra misión, parcela repetida
      makeEntry({ missionId: "m-2", parcelId: "p-3" }),
    ];
    const s = summarizeFieldNotebook(entries);
    expect(s.entryCount).toBe(4);
    expect(s.missionCount).toBe(2);
    expect(s.parcelCount).toBe(3);
  });

  it("suma areaTreatedHa con 4 decimales", () => {
    const s = summarizeFieldNotebook([
      makeEntry({ areaTreatedHa: 1.5 }),
      makeEntry({ areaTreatedHa: 2.25 }),
      makeEntry({ areaTreatedHa: 0.3333 }),
    ]);
    expect(s.totalAreaHa).toBe(4.0833);
  });

  it("calcula litros desde totalAmountUsed con unit L", () => {
    const s = summarizeFieldNotebook([
      makeEntry({ totalAmountUsed: 12.5, totalAmountUnit: "L" }),
      makeEntry({ totalAmountUsed: 5, totalAmountUnit: "L" }),
    ]);
    expect(s.totalProductLitres).toBe(17.5);
  });

  it("convierte ml a litros si totalAmountUnit es ml", () => {
    const s = summarizeFieldNotebook([
      makeEntry({ totalAmountUsed: 2500, totalAmountUnit: "ml" }),
    ]);
    expect(s.totalProductLitres).toBe(2.5);
  });

  it("estima litros desde dosis l_per_ha × area si no hay totalAmountUsed", () => {
    const s = summarizeFieldNotebook([
      makeEntry({
        appliedDoseValue: 0.5,
        appliedDoseUnit: "l_per_ha",
        areaTreatedHa: 10,
        totalAmountUsed: null,
      }),
    ]);
    expect(s.totalProductLitres).toBe(5);
  });

  it("estima litros desde ml_per_ha × area", () => {
    const s = summarizeFieldNotebook([
      makeEntry({
        appliedDoseValue: 200,
        appliedDoseUnit: "ml_per_ha",
        areaTreatedHa: 10,
        totalAmountUsed: null,
      }),
    ]);
    // 200 ml/ha × 10 ha = 2000 ml = 2 L
    expect(s.totalProductLitres).toBe(2);
  });

  it("no cuenta sólidos (g/kg) en litros", () => {
    const s = summarizeFieldNotebook([
      makeEntry({
        appliedDoseValue: 100,
        appliedDoseUnit: "g_per_ha",
        areaTreatedHa: 5,
        totalAmountUsed: 500,
        totalAmountUnit: "g",
      }),
    ]);
    expect(s.totalProductLitres).toBe(0);
  });

  it("detecta dateRange min/max", () => {
    const s = summarizeFieldNotebook([
      makeEntry({ appliedAt: "2026-05-10T08:00:00.000Z" }),
      makeEntry({ appliedAt: "2026-04-15T10:00:00.000Z" }),
      makeEntry({ appliedAt: "2026-05-20T12:00:00.000Z" }),
    ]);
    expect(s.dateRangeFrom).toBe("2026-04-15T10:00:00.000Z");
    expect(s.dateRangeTo).toBe("2026-05-20T12:00:00.000Z");
  });
});

describe("formatDose", () => {
  it("convierte enum a notación legible", () => {
    expect(formatDose(0.4, "l_per_ha")).toBe("0.400 L/ha");
    expect(formatDose(1.5, "kg_per_ha")).toBe("1.500 kg/ha");
    expect(formatDose(200, "ml_per_ha")).toBe("200.0 ml/ha");
    expect(formatDose(50, "g_per_ha")).toBe("50.00 g/ha");
  });

  it("respeta unit desconocido (no rompe)", () => {
    expect(formatDose(1, "weird_unit")).toBe("1.000 weird_unit");
  });

  it("redondeo: 3 decimales si <10, 2 si <100, 1 si más", () => {
    expect(formatDose(0.001, "l_per_ha")).toBe("0.001 L/ha");
    expect(formatDose(9.999, "l_per_ha")).toBe("9.999 L/ha");
    expect(formatDose(10, "l_per_ha")).toBe("10.00 L/ha");
    expect(formatDose(99.99, "l_per_ha")).toBe("99.99 L/ha");
    expect(formatDose(100, "l_per_ha")).toBe("100.0 L/ha");
    expect(formatDose(1234.5, "l_per_ha")).toBe("1234.5 L/ha");
  });
});

describe("formatTotalAmount", () => {
  it("devuelve em-dash si valor o unit es null", () => {
    expect(formatTotalAmount(null, "L")).toBe("—");
    expect(formatTotalAmount(5, null)).toBe("—");
    expect(formatTotalAmount(null, null)).toBe("—");
  });

  it("formatea con unit", () => {
    expect(formatTotalAmount(12.5, "L")).toBe("12.50 L");
    expect(formatTotalAmount(2500, "ml")).toBe("2500.0 ml");
    expect(formatTotalAmount(0.5, "kg")).toBe("0.500 kg");
  });
});
