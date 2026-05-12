/**
 * AgroOps — fleet services (HU-04 ABM drones)
 *
 * Lógica de negocio para la flota. Sin lógica UI, sin contexto de Next.
 * Las Server Actions de `actions/` validan input + RBAC + audit log y delegan
 * aquí. Estos servicios reciben datos ya validados.
 *
 * Reglas (CLAUDE.md):
 * - Queries vía Drizzle (regla 5).
 * - Sin raw SQL (regla 5).
 * - Auditoría se hace en la action, no aquí.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  drones,
  type Drone,
  type NewDrone,
} from "@/db/schema/drones";
import type {
  CreateDroneInput,
  ListDroneFilters,
  UpdateDroneInput,
} from "./schemas";

/**
 * Convierte el input Zod (números) a los formatos de columna Drizzle (decimal
 * en TS es `string` en Drizzle). Encapsula el casting feo en un único sitio.
 */
function toDbValues(
  input: CreateDroneInput | UpdateDroneInput,
): Partial<NewDrone> {
  const out: Partial<NewDrone> = {};
  if (input.model !== undefined) out.model = input.model;
  if (input.manufacturer !== undefined) out.manufacturer = input.manufacturer;
  if (input.serialNumber !== undefined) out.serialNumber = input.serialNumber;
  if (input.registrationCode !== undefined) {
    out.registrationCode = input.registrationCode;
  }
  if (input.mtomGrams !== undefined) out.mtomGrams = input.mtomGrams;
  if (input.easaClass !== undefined) out.easaClass = input.easaClass;
  if (input.applicationCapable !== undefined) {
    out.applicationCapable = input.applicationCapable;
  }
  if (input.payloadLitres !== undefined) {
    out.payloadLitres =
      input.payloadLitres == null ? null : input.payloadLitres.toFixed(2);
  }
  if (input.insurancePolicyNumber !== undefined) {
    out.insurancePolicyNumber = input.insurancePolicyNumber;
  }
  if (input.insuranceExpiresAt !== undefined) {
    out.insuranceExpiresAt = input.insuranceExpiresAt;
  }
  if (input.flightHours !== undefined) {
    out.flightHours = input.flightHours.toFixed(2);
  }
  if (input.status !== undefined) out.status = input.status;
  if (input.notes !== undefined) out.notes = input.notes;
  return out;
}

export async function listDrones(
  filters: ListDroneFilters = {},
): Promise<Drone[]> {
  const conditions = [];
  if (filters.status) conditions.push(eq(drones.status, filters.status));
  if (filters.easaClass) {
    conditions.push(eq(drones.easaClass, filters.easaClass));
  }
  if (typeof filters.applicationCapable === "boolean") {
    conditions.push(eq(drones.applicationCapable, filters.applicationCapable));
  }

  return db
    .select()
    .from(drones)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(drones.model), asc(drones.serialNumber));
}

export async function getDrone(id: string): Promise<Drone | null> {
  const result = await db.query.drones.findFirst({ where: eq(drones.id, id) });
  return result ?? null;
}

export async function getDroneBySerial(
  serialNumber: string,
): Promise<Drone | null> {
  const result = await db.query.drones.findFirst({
    where: eq(drones.serialNumber, serialNumber),
  });
  return result ?? null;
}

export async function createDrone(input: CreateDroneInput): Promise<Drone> {
  const values = toDbValues(input) as NewDrone;
  const [created] = await db.insert(drones).values(values).returning();
  if (!created) {
    throw new Error("createDrone: inserción no devolvió fila");
  }
  return created;
}

export async function updateDrone(
  id: string,
  input: UpdateDroneInput,
): Promise<Drone | null> {
  const values = toDbValues(input);
  if (Object.keys(values).length === 0) {
    return getDrone(id);
  }
  const [updated] = await db
    .update(drones)
    .set(values)
    .where(eq(drones.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Archivar = marcar `status = "retired"`. No borramos por FK desde misiones
 * (operaciones históricas siguen requiriendo el dron en la tabla).
 */
export async function archiveDrone(id: string): Promise<Drone | null> {
  const [updated] = await db
    .update(drones)
    .set({ status: "retired" })
    .where(eq(drones.id, id))
    .returning();
  return updated ?? null;
}

export async function restoreDrone(id: string): Promise<Drone | null> {
  const [updated] = await db
    .update(drones)
    .set({ status: "active" })
    .where(eq(drones.id, id))
    .returning();
  return updated ?? null;
}
