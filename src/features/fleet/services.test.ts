/**
 * AgroOps — fleet services tests (integración con DB local)
 *
 * Tests sobre el ciclo completo create → read → update → archive contra
 * la Postgres local en `127.0.0.1:6170`. Cada test usa un `serialNumber`
 * único y limpia después para no contaminar el estado del seed.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import { drones } from "@/db/schema/drones";
import {
  archiveDrone,
  createDrone,
  getDrone,
  getDroneBySerial,
  listDrones,
  restoreDrone,
  updateDrone,
} from "./services";

// Prefijo para todos los drones creados por este test → permite limpiar al final.
const TEST_PREFIX = "AGM-TEST-FLEET-";

async function cleanupTestDrones() {
  await db.delete(drones).where(like(drones.serialNumber, `${TEST_PREFIX}%`));
}

beforeAll(async () => {
  await cleanupTestDrones();
});

afterAll(async () => {
  await cleanupTestDrones();
});

describe("fleet services (Postgres 127.0.0.1:6170)", () => {
  it("lista los drones del seed AgroM (≥ 3)", async () => {
    const all = await listDrones();
    expect(all.length).toBeGreaterThanOrEqual(3);
    const seedSerials = all.map((d) => d.serialNumber);
    expect(seedSerials).toContain("SEED-T50-AGROM-001");
    expect(seedSerials).toContain("SEED-M3E-AGROM-001");
    expect(seedSerials).toContain("SEED-DRTK2-AGROM-001");
  });

  it("listDrones filtra por status active", async () => {
    const active = await listDrones({ status: "active" });
    expect(active.every((d) => d.status === "active")).toBe(true);
  });

  it("listDrones filtra por applicationCapable true (sólo T50 del seed)", async () => {
    const apps = await listDrones({ applicationCapable: true });
    expect(apps.length).toBeGreaterThanOrEqual(1);
    expect(apps.some((d) => d.model === "Agras T50")).toBe(true);
    expect(apps.every((d) => d.applicationCapable === true)).toBe(true);
  });

  it("createDrone inserta y devuelve la fila", async () => {
    const serial = `${TEST_PREFIX}CREATE-001`;
    const created = await createDrone({
      model: "T50 Test",
      manufacturer: "DJI",
      serialNumber: serial,
      registrationCode: null,
      mtomGrams: 92000,
      easaClass: "c6",
      applicationCapable: true,
      payloadLitres: 40,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      flightHours: 0,
      status: "active",
      notes: null,
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.serialNumber).toBe(serial);
    expect(created.payloadLitres).toBe("40.00"); // decimal stored as string
  });

  it("getDroneBySerial encuentra el dron recién creado", async () => {
    const found = await getDroneBySerial(`${TEST_PREFIX}CREATE-001`);
    expect(found).not.toBeNull();
    expect(found?.model).toBe("T50 Test");
  });

  it("getDrone con id válido devuelve la fila completa", async () => {
    const created = await createDrone({
      model: "Mavic Test",
      manufacturer: "DJI",
      serialNumber: `${TEST_PREFIX}GET-001`,
      registrationCode: null,
      mtomGrams: 920,
      easaClass: "c1",
      applicationCapable: false,
      payloadLitres: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      flightHours: 0,
      status: "active",
      notes: null,
    });
    const fetched = await getDrone(created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.applicationCapable).toBe(false);
  });

  it("getDrone con id no existente devuelve null", async () => {
    const fetched = await getDrone("00000000-0000-4000-8000-000000000000");
    expect(fetched).toBeNull();
  });

  it("updateDrone actualiza parcialmente", async () => {
    const created = await createDrone({
      model: "Original",
      manufacturer: "DJI",
      serialNumber: `${TEST_PREFIX}UPDATE-001`,
      registrationCode: null,
      mtomGrams: 1000,
      easaClass: "c2",
      applicationCapable: false,
      payloadLitres: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      flightHours: 5,
      status: "active",
      notes: null,
    });

    const updated = await updateDrone(created.id, {
      flightHours: 12.5,
      notes: "primer mantenimiento ok",
    });
    expect(updated?.flightHours).toBe("12.50");
    expect(updated?.notes).toBe("primer mantenimiento ok");
    expect(updated?.model).toBe("Original"); // no cambia
  });

  it("updateDrone con input vacío no rompe y devuelve la fila actual", async () => {
    const created = await createDrone({
      model: "Stable",
      manufacturer: "DJI",
      serialNumber: `${TEST_PREFIX}NOOP-001`,
      registrationCode: null,
      mtomGrams: 1000,
      easaClass: "c2",
      applicationCapable: false,
      payloadLitres: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      flightHours: 0,
      status: "active",
      notes: null,
    });
    const result = await updateDrone(created.id, {});
    expect(result?.id).toBe(created.id);
  });

  it("archiveDrone marca status retired", async () => {
    const created = await createDrone({
      model: "ToArchive",
      manufacturer: "DJI",
      serialNumber: `${TEST_PREFIX}ARCHIVE-001`,
      registrationCode: null,
      mtomGrams: 1000,
      easaClass: "c2",
      applicationCapable: false,
      payloadLitres: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      flightHours: 0,
      status: "active",
      notes: null,
    });
    const archived = await archiveDrone(created.id);
    expect(archived?.status).toBe("retired");
  });

  it("restoreDrone vuelve a active", async () => {
    const created = await createDrone({
      model: "ToRestore",
      manufacturer: "DJI",
      serialNumber: `${TEST_PREFIX}RESTORE-001`,
      registrationCode: null,
      mtomGrams: 1000,
      easaClass: "c2",
      applicationCapable: false,
      payloadLitres: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      flightHours: 0,
      status: "retired",
      notes: null,
    });
    const restored = await restoreDrone(created.id);
    expect(restored?.status).toBe("active");
  });

  it("createDrone con serialNumber duplicado lanza por constraint UNIQUE", async () => {
    const serial = `${TEST_PREFIX}DUP-001`;
    await createDrone({
      model: "First",
      manufacturer: "DJI",
      serialNumber: serial,
      registrationCode: null,
      mtomGrams: 1000,
      easaClass: "c2",
      applicationCapable: false,
      payloadLitres: null,
      insurancePolicyNumber: null,
      insuranceExpiresAt: null,
      flightHours: 0,
      status: "active",
      notes: null,
    });
    await expect(
      createDrone({
        model: "Duplicate",
        manufacturer: "DJI",
        serialNumber: serial,
        registrationCode: null,
        mtomGrams: 2000,
        easaClass: "c3",
        applicationCapable: false,
        payloadLitres: null,
        insurancePolicyNumber: null,
        insuranceExpiresAt: null,
        flightHours: 0,
        status: "active",
        notes: null,
      }),
    ).rejects.toThrow();
  });
});
