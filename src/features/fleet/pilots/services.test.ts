/**
 * AgroOps — pilots services tests (HU-05, integración Postgres local)
 *
 * Cobertura del ciclo create → read → update → archive y del helper
 * `evaluateCredentials` para badges/warnings de UI.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { like } from "drizzle-orm";
import { db } from "@/db";
import { pilots, type Pilot } from "@/db/schema/pilots";
import {
  archivePilot,
  createPilot,
  evaluateCredentials,
  getPilot,
  getPilotByNif,
  listPilots,
  restorePilot,
  updatePilot,
} from "./services";

const TEST_PREFIX = "AGM-TEST-PILOT-";

async function cleanupTestPilots() {
  await db.delete(pilots).where(like(pilots.nif, `${TEST_PREFIX}%`));
}

beforeAll(async () => {
  await cleanupTestPilots();
});

afterAll(async () => {
  await cleanupTestPilots();
});

describe("pilots services (Postgres 127.0.0.1:6170)", () => {
  it("lista el piloto del seed AgroM (John)", async () => {
    const all = await listPilots();
    expect(all.length).toBeGreaterThanOrEqual(1);
    const john = all.find((p) => p.fullName.includes("John"));
    expect(john?.ropoQualified).toBe(true);
  });

  it("listPilots filtra por active=true", async () => {
    const active = await listPilots({ active: true });
    expect(active.every((p) => p.active === true)).toBe(true);
  });

  it("createPilot inserta y devuelve la fila", async () => {
    const nif = `${TEST_PREFIX}A1`;
    const created = await createPilot({
      userId: null,
      fullName: "Test Piloto Básico",
      nif,
      aesaLicenseNumber: null,
      aesaLicenseClass: null,
      aesaLicenseExpiresAt: null,
      ropoQualified: false,
      ropoNumber: null,
      ropoLevel: null,
      ropoExpiresAt: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      medicalCertificateExpiresAt: null,
      flightHours: 0,
      active: true,
      notes: null,
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.nif).toBe(nif);
    expect(created.flightHours).toBe("0.00");
  });

  it("getPilotByNif encuentra al recién creado", async () => {
    const found = await getPilotByNif(`${TEST_PREFIX}A1`);
    expect(found).not.toBeNull();
    expect(found?.fullName).toBe("Test Piloto Básico");
  });

  it("getPilot por id null si no existe", async () => {
    expect(
      await getPilot("00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });

  it("updatePilot actualiza campos selectivos", async () => {
    const created = await createPilot({
      userId: null,
      fullName: "Test Update Original",
      nif: `${TEST_PREFIX}UP1`,
      aesaLicenseNumber: null,
      aesaLicenseClass: null,
      aesaLicenseExpiresAt: null,
      ropoQualified: false,
      ropoNumber: null,
      ropoLevel: null,
      ropoExpiresAt: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      medicalCertificateExpiresAt: null,
      flightHours: 0,
      active: true,
      notes: null,
    });
    const updated = await updatePilot(created.id, {
      flightHours: 50.25,
      aesaLicenseClass: "STS-02",
      aesaLicenseNumber: "AESA-AGM-001",
      aesaLicenseExpiresAt: "2027-09-30",
    });
    expect(updated?.flightHours).toBe("50.25");
    expect(updated?.aesaLicenseClass).toBe("STS-02");
    expect(updated?.fullName).toBe("Test Update Original"); // no cambia
  });

  it("archivePilot marca active=false y restorePilot lo restaura", async () => {
    const created = await createPilot({
      userId: null,
      fullName: "Test Archive",
      nif: `${TEST_PREFIX}AR1`,
      aesaLicenseNumber: null,
      aesaLicenseClass: null,
      aesaLicenseExpiresAt: null,
      ropoQualified: false,
      ropoNumber: null,
      ropoLevel: null,
      ropoExpiresAt: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      medicalCertificateExpiresAt: null,
      flightHours: 0,
      active: true,
      notes: null,
    });
    const archived = await archivePilot(created.id);
    expect(archived?.active).toBe(false);
    const restored = await restorePilot(created.id);
    expect(restored?.active).toBe(true);
  });

  it("createPilot duplicado por NIF lanza por UNIQUE", async () => {
    const nif = `${TEST_PREFIX}DUP`;
    await createPilot({
      userId: null,
      fullName: "Test First",
      nif,
      aesaLicenseNumber: null,
      aesaLicenseClass: null,
      aesaLicenseExpiresAt: null,
      ropoQualified: false,
      ropoNumber: null,
      ropoLevel: null,
      ropoExpiresAt: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      medicalCertificateExpiresAt: null,
      flightHours: 0,
      active: true,
      notes: null,
    });
    await expect(
      createPilot({
        userId: null,
        fullName: "Test Duplicate",
        nif,
        aesaLicenseNumber: null,
        aesaLicenseClass: null,
        aesaLicenseExpiresAt: null,
        ropoQualified: false,
        ropoNumber: null,
        ropoLevel: null,
        ropoExpiresAt: null,
        insurancePolicyNumber: null,
        insuranceExpiresAt: null,
        medicalCertificateExpiresAt: null,
        flightHours: 0,
        active: true,
        notes: null,
      }),
    ).rejects.toThrow();
  });
});

describe("evaluateCredentials", () => {
  // Today fijado para tests deterministas
  const today = new Date("2026-05-12T10:00:00Z");

  function makePilot(overrides: Partial<Pilot> = {}): Pilot {
    return {
      id: "00000000-0000-0000-0000-000000000001",
      userId: null,
      fullName: "Test",
      nif: "TEST00001",
      aesaLicenseNumber: null,
      aesaLicenseClass: null,
      aesaLicenseExpiresAt: null,
      ropoQualified: false,
      ropoNumber: null,
      ropoLevel: null,
      ropoExpiresAt: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      medicalCertificateExpiresAt: null,
      flightHours: "0",
      active: true,
      notes: null,
      createdAt: today,
      updatedAt: today,
      ...overrides,
    };
  }

  it("piloto sin caducidades devuelve lista vacía", () => {
    const result = evaluateCredentials(makePilot(), today);
    expect(result).toHaveLength(0);
  });

  it("clasifica una caducidad vencida hace 5 días como expired", () => {
    const result = evaluateCredentials(
      makePilot({ aesaLicenseExpiresAt: "2026-05-07" }),
      today,
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.field).toBe("aesa");
    expect(result[0]?.severity).toBe("expired");
    expect(result[0]?.daysToExpiry).toBe(-5);
  });

  it("clasifica una caducidad a 15 días como warning", () => {
    const result = evaluateCredentials(
      makePilot({ ropoExpiresAt: "2026-05-27" }),
      today,
    );
    expect(result[0]?.severity).toBe("warning");
    expect(result[0]?.daysToExpiry).toBe(15);
  });

  it("clasifica una caducidad a 60 días como ok", () => {
    const result = evaluateCredentials(
      makePilot({ insuranceExpiresAt: "2026-07-11" }),
      today,
    );
    expect(result[0]?.severity).toBe("ok");
    expect(result[0]?.daysToExpiry).toBe(60);
  });

  it("devuelve las 4 credenciales si todas tienen fecha", () => {
    const result = evaluateCredentials(
      makePilot({
        aesaLicenseExpiresAt: "2027-01-01",
        ropoExpiresAt: "2027-06-01",
        insuranceExpiresAt: "2027-03-01",
        medicalCertificateExpiresAt: "2027-12-01",
      }),
      today,
    );
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.field).sort()).toEqual([
      "aesa",
      "insurance",
      "medical",
      "ropo",
    ]);
  });
});
