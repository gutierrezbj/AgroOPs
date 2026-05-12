/**
 * AgroOps — clients services tests (HU-06, integración Postgres)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { like } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import {
  createClient,
  getClient,
  getClientByTaxId,
  listClients,
  updateClient,
} from "./services";

const TEST_PREFIX = "TEST06CL";

async function cleanup() {
  await db.delete(clients).where(like(clients.taxId, `${TEST_PREFIX}%`));
}

beforeAll(cleanup);
afterAll(cleanup);

describe("clients services", () => {
  it("listClients devuelve al menos el seed AgroM (cliente demo)", async () => {
    const all = await listClients();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it("createClient inserta y devuelve la fila con defaults aplicados", async () => {
    const created = await createClient({
      name: "Test Cooperativa Vega",
      taxId: `${TEST_PREFIX}A`,
      type: "cooperativa",
      contactPerson: null,
      contactEmail: null,
      contactPhone: null,
      billingAddress: null,
      city: null,
      province: null,
      postalCode: null,
      country: "ES",
      holdedContactId: null,
      notes: null,
    });
    expect(created.type).toBe("cooperativa");
    expect(created.country).toBe("ES");
  });

  it("getClientByTaxId encuentra al recién creado", async () => {
    const found = await getClientByTaxId(`${TEST_PREFIX}A`);
    expect(found?.name).toBe("Test Cooperativa Vega");
  });

  it("updateClient actualiza campos parciales", async () => {
    const created = await createClient({
      name: "Test Update",
      taxId: `${TEST_PREFIX}B`,
      type: "agricultor",
      contactPerson: null,
      contactEmail: null,
      contactPhone: null,
      billingAddress: null,
      city: null,
      province: null,
      postalCode: null,
      country: "ES",
      holdedContactId: null,
      notes: null,
    });
    const updated = await updateClient(created.id, {
      contactEmail: "nuevo@ejemplo.es",
      city: "Madrid",
    });
    expect(updated?.contactEmail).toBe("nuevo@ejemplo.es");
    expect(updated?.city).toBe("Madrid");
    expect(updated?.name).toBe("Test Update");
  });

  it("listClients filtra por type cooperativa", async () => {
    const result = await listClients({ type: "cooperativa" });
    expect(result.every((c) => c.type === "cooperativa")).toBe(true);
    expect(result.some((c) => c.taxId === `${TEST_PREFIX}A`)).toBe(true);
  });

  it("getClient con id no existente devuelve null", async () => {
    expect(
      await getClient("00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });

  it("createClient duplicado por taxId lanza por UNIQUE", async () => {
    const taxId = `${TEST_PREFIX}D`;
    await createClient({
      name: "Test First",
      taxId,
      type: "agricultor",
      contactPerson: null,
      contactEmail: null,
      contactPhone: null,
      billingAddress: null,
      city: null,
      province: null,
      postalCode: null,
      country: "ES",
      holdedContactId: null,
      notes: null,
    });
    await expect(
      createClient({
        name: "Test Duplicate",
        taxId,
        type: "agricultor",
        contactPerson: null,
        contactEmail: null,
        contactPhone: null,
        billingAddress: null,
        city: null,
        province: null,
        postalCode: null,
        country: "ES",
        holdedContactId: null,
        notes: null,
      }),
    ).rejects.toThrow();
  });
});
