/**
 * AgroOps — state machine tests (HU-10)
 *
 * Tests puros (sin DB) sobre las transiciones, roles permitidos y gates de
 * pre-requisitos. Los gates se prueban con mocks de Mission, Drone, Pilot
 * porque su lógica no depende de Drizzle.
 */
import { describe, expect, it } from "vitest";
import type { Drone } from "@/db/schema/drones";
import type { Mission, MissionStatus } from "@/db/schema/missions";
import type { Pilot } from "@/db/schema/pilots";
import { ROLES } from "@/lib/rbac";
import {
  MISSION_STATUS_LABELS,
  MISSION_TRANSITIONS,
  availableTransitions,
  canTransition,
  evaluateGate,
  rolesForTransition,
} from "./state-machine";

const ALL_STATES: MissionStatus[] = [
  "draft",
  "planned",
  "approved",
  "preflight",
  "in_flight",
  "completed",
  "invoiced",
  "cancelled",
];

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    code: "AGM-2026-9999",
    type: "aerial_application",
    status: "draft",
    clientId: "00000000-0000-0000-0000-000000000002",
    pilotId: null,
    droneId: null,
    nptaReference: "NPTA-DROVINCI-2026",
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    areaPlannedHa: null,
    areaTreatedHa: null,
    weatherSnapshot: null,
    telemetry: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDrone(overrides: Partial<Drone> = {}): Drone {
  return {
    id: "00000000-0000-0000-0000-000000000010",
    model: "T50",
    manufacturer: "DJI",
    serialNumber: "T50-001",
    registrationCode: null,
    mtomGrams: 92000,
    easaClass: "c6",
    applicationCapable: true,
    payloadLitres: "40.00",
    insurancePolicyNumber: null,
    insuranceExpiresAt: null,
    flightHours: "0.00",
    status: "active",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePilot(overrides: Partial<Pilot> = {}): Pilot {
  return {
    id: "00000000-0000-0000-0000-000000000020",
    userId: null,
    fullName: "Test Pilot",
    nif: "TEST00001",
    aesaLicenseNumber: null,
    aesaLicenseClass: null,
    aesaLicenseExpiresAt: null,
    ropoQualified: true,
    ropoNumber: "ROPO-001",
    ropoLevel: "Piloto aplicador",
    ropoExpiresAt: "2027-12-31",
    insurancePolicyNumber: null,
    insuranceExpiresAt: null,
    medicalCertificateExpiresAt: null,
    flightHours: "0.00",
    active: true,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("MISSION_TRANSITIONS tabla", () => {
  it("contiene los 8 estados como claves", () => {
    for (const state of ALL_STATES) {
      expect(MISSION_TRANSITIONS).toHaveProperty(state);
    }
  });

  it("invoiced y cancelled son terminales (array vacío)", () => {
    expect(MISSION_TRANSITIONS.invoiced).toEqual([]);
    expect(MISSION_TRANSITIONS.cancelled).toEqual([]);
  });

  it("happy path completo: cada estado avanza al siguiente", () => {
    expect(canTransition("draft", "planned")).toBe(true);
    expect(canTransition("planned", "approved")).toBe(true);
    expect(canTransition("approved", "preflight")).toBe(true);
    expect(canTransition("preflight", "in_flight")).toBe(true);
    expect(canTransition("in_flight", "completed")).toBe(true);
    expect(canTransition("completed", "invoiced")).toBe(true);
  });

  it("cancelled disponible desde cualquier no-terminal", () => {
    for (const state of [
      "draft",
      "planned",
      "approved",
      "preflight",
      "in_flight",
      "completed",
    ] as MissionStatus[]) {
      expect(canTransition(state, "cancelled")).toBe(true);
    }
  });

  it("rechaza saltos de estado", () => {
    expect(canTransition("draft", "in_flight")).toBe(false);
    expect(canTransition("draft", "completed")).toBe(false);
    expect(canTransition("planned", "preflight")).toBe(false);
    expect(canTransition("approved", "completed")).toBe(false);
  });

  it("rechaza salidas desde estados terminales", () => {
    for (const state of ALL_STATES) {
      expect(canTransition("invoiced", state)).toBe(false);
      expect(canTransition("cancelled", state)).toBe(false);
    }
  });
});

describe("rolesForTransition", () => {
  it("draft->planned requiere WRITERS", () => {
    expect(rolesForTransition("draft", "planned")).toEqual(ROLES.WRITERS);
  });

  it("planned->approved requiere ADMIN_ONLY", () => {
    expect(rolesForTransition("planned", "approved")).toEqual(
      ROLES.ADMIN_ONLY,
    );
  });

  it("preflight->in_flight requiere PILOT_OPERATIONS", () => {
    expect(rolesForTransition("preflight", "in_flight")).toEqual(
      ROLES.PILOT_OPERATIONS,
    );
  });

  it("completed->invoiced requiere ADMIN_ONLY", () => {
    expect(rolesForTransition("completed", "invoiced")).toEqual(
      ROLES.ADMIN_ONLY,
    );
  });

  it("cualquier->cancelled usa WRITERS por defecto", () => {
    expect(rolesForTransition("draft", "cancelled")).toEqual(ROLES.WRITERS);
    expect(rolesForTransition("planned", "cancelled")).toEqual(ROLES.WRITERS);
    expect(rolesForTransition("in_flight", "cancelled")).toEqual(
      ROLES.WRITERS,
    );
  });
});

describe("availableTransitions", () => {
  it("desde draft devuelve planned + cancelled", () => {
    expect(availableTransitions("draft").sort()).toEqual(
      ["cancelled", "planned"].sort(),
    );
  });

  it("desde estados terminales devuelve array vacío", () => {
    expect(availableTransitions("invoiced")).toEqual([]);
    expect(availableTransitions("cancelled")).toEqual([]);
  });
});

describe("evaluateGate — draft → planned", () => {
  const baseCtx = {
    mission: makeMission({
      status: "draft" as const,
      droneId: "00000000-0000-0000-0000-000000000010",
      pilotId: "00000000-0000-0000-0000-000000000020",
    }),
    drone: makeDrone(),
    pilot: makePilot(),
    parcelCount: 1,
  };

  it("pasa con recursos completos", () => {
    const result = evaluateGate("draft", "planned", baseCtx);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rechaza sin parcelas", () => {
    const result = evaluateGate("draft", "planned", {
      ...baseCtx,
      parcelCount: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /parcela/i.test(e))).toBe(true);
  });

  it("rechaza sin droneId", () => {
    const result = evaluateGate("draft", "planned", {
      ...baseCtx,
      mission: makeMission({
        ...baseCtx.mission,
        droneId: null,
      }),
      drone: null,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /dron/i.test(e))).toBe(true);
  });

  it("rechaza dron no aplicador", () => {
    const result = evaluateGate("draft", "planned", {
      ...baseCtx,
      drone: makeDrone({ applicationCapable: false, model: "Mavic 3E" }),
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /aplicador/i.test(e))).toBe(true);
  });

  it("rechaza dron retirado", () => {
    const result = evaluateGate("draft", "planned", {
      ...baseCtx,
      drone: makeDrone({ status: "retired" }),
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /retirado/i.test(e))).toBe(true);
  });

  it("avisa (no bloquea) si dron en mantenimiento", () => {
    const result = evaluateGate("draft", "planned", {
      ...baseCtx,
      drone: makeDrone({ status: "maintenance" }),
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => /mantenimiento/i.test(w))).toBe(true);
  });

  it("rechaza piloto inactivo", () => {
    const result = evaluateGate("draft", "planned", {
      ...baseCtx,
      pilot: makePilot({ active: false }),
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /inactivo/i.test(e))).toBe(true);
  });

  it("rechaza piloto no ROPO", () => {
    const result = evaluateGate("draft", "planned", {
      ...baseCtx,
      pilot: makePilot({ ropoQualified: false }),
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /ROPO/i.test(e))).toBe(true);
  });
});

describe("evaluateGate — in_flight → completed", () => {
  const baseCtx = {
    mission: makeMission({
      status: "in_flight" as const,
      telemetry: {
        startedAt: "2026-05-12T10:00:00Z",
        finishedAt: "2026-05-12T10:45:00Z",
      },
      areaTreatedHa: "4.5",
    }),
    drone: makeDrone(),
    pilot: makePilot(),
    parcelCount: 2,
  };

  it("pasa con telemetría y área tratada", () => {
    const result = evaluateGate("in_flight", "completed", baseCtx);
    expect(result.ok).toBe(true);
  });

  it("rechaza sin telemetría", () => {
    const result = evaluateGate("in_flight", "completed", {
      ...baseCtx,
      mission: makeMission({
        ...baseCtx.mission,
        telemetry: null,
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /telemetría/i.test(e))).toBe(true);
  });

  it("rechaza sin área tratada", () => {
    const result = evaluateGate("in_flight", "completed", {
      ...baseCtx,
      mission: makeMission({
        ...baseCtx.mission,
        areaTreatedHa: null,
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /área tratada/i.test(e))).toBe(true);
  });
});

describe("evaluateGate — approved → preflight", () => {
  const baseCtx = {
    mission: makeMission({ status: "approved" as const }),
    drone: makeDrone(),
    pilot: makePilot(),
    parcelCount: 1,
  };

  it("warning si no hay snapshot meteorológico (lo capturará HU-13)", () => {
    const result = evaluateGate("approved", "preflight", baseCtx);
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => /meteorológico/i.test(w))).toBe(true);
  });

  it("rechaza si flightSuitable=false en el snapshot", () => {
    const result = evaluateGate("approved", "preflight", {
      ...baseCtx,
      mission: makeMission({
        ...baseCtx.mission,
        weatherSnapshot: {
          capturedAt: "2026-05-12T10:00:00Z",
          flightSuitable: false,
        },
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /apto para vuelo/i.test(e))).toBe(true);
  });
});

describe("evaluateGate — cancelación", () => {
  it("permite cancelar desde cualquier estado no-terminal", () => {
    for (const from of [
      "draft",
      "planned",
      "approved",
      "preflight",
      "in_flight",
      "completed",
    ] as MissionStatus[]) {
      const result = evaluateGate(from, "cancelled", {
        mission: makeMission({ status: from }),
        drone: null,
        pilot: null,
        parcelCount: 0,
      });
      expect(result.ok).toBe(true);
    }
  });
});

describe("evaluateGate — transición no permitida", () => {
  it("retorna error si la transición no existe en la tabla", () => {
    const result = evaluateGate("draft", "completed", {
      mission: makeMission(),
      drone: null,
      pilot: null,
      parcelCount: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/no permitida/);
  });
});

describe("MISSION_STATUS_LABELS", () => {
  it("mapea los 8 estados", () => {
    for (const state of ALL_STATES) {
      expect(MISSION_STATUS_LABELS[state]).toBeTruthy();
    }
  });
});
