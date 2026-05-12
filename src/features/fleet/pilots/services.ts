/**
 * AgroOps — pilots services (HU-05)
 *
 * Lógica de negocio para pilotos. Mismo patrón que drones services:
 * funciones puras que reciben input ya validado y hablan con Drizzle.
 *
 * El audit log se hace en las Server Actions, no aquí.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pilots, type NewPilot, type Pilot } from "@/db/schema/pilots";
import type {
  CreatePilotInput,
  ListPilotFilters,
  UpdatePilotInput,
} from "./schemas";

/**
 * Convierte el input Zod (números, opcionales) a los formatos de columna
 * Drizzle. `flightHours` es decimal en DB (string TS).
 */
function toDbValues(
  input: CreatePilotInput | UpdatePilotInput,
): Partial<NewPilot> {
  const out: Partial<NewPilot> = {};
  if (input.userId !== undefined) out.userId = input.userId;
  if (input.fullName !== undefined) out.fullName = input.fullName;
  if (input.nif !== undefined) out.nif = input.nif;
  if (input.aesaLicenseNumber !== undefined) {
    out.aesaLicenseNumber = input.aesaLicenseNumber;
  }
  if (input.aesaLicenseClass !== undefined) {
    out.aesaLicenseClass = input.aesaLicenseClass;
  }
  if (input.aesaLicenseExpiresAt !== undefined) {
    out.aesaLicenseExpiresAt = input.aesaLicenseExpiresAt;
  }
  if (input.ropoQualified !== undefined) {
    out.ropoQualified = input.ropoQualified;
  }
  if (input.ropoNumber !== undefined) out.ropoNumber = input.ropoNumber;
  if (input.ropoLevel !== undefined) out.ropoLevel = input.ropoLevel;
  if (input.ropoExpiresAt !== undefined) {
    out.ropoExpiresAt = input.ropoExpiresAt;
  }
  if (input.insurancePolicyNumber !== undefined) {
    out.insurancePolicyNumber = input.insurancePolicyNumber;
  }
  if (input.insuranceExpiresAt !== undefined) {
    out.insuranceExpiresAt = input.insuranceExpiresAt;
  }
  if (input.medicalCertificateExpiresAt !== undefined) {
    out.medicalCertificateExpiresAt = input.medicalCertificateExpiresAt;
  }
  if (input.flightHours !== undefined) {
    out.flightHours = input.flightHours.toFixed(2);
  }
  if (input.active !== undefined) out.active = input.active;
  if (input.notes !== undefined) out.notes = input.notes;
  return out;
}

export async function listPilots(
  filters: ListPilotFilters = {},
): Promise<Pilot[]> {
  const conditions = [];
  if (typeof filters.active === "boolean") {
    conditions.push(eq(pilots.active, filters.active));
  }
  if (typeof filters.ropoQualified === "boolean") {
    conditions.push(eq(pilots.ropoQualified, filters.ropoQualified));
  }

  return db
    .select()
    .from(pilots)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(pilots.fullName));
}

export async function getPilot(id: string): Promise<Pilot | null> {
  const result = await db.query.pilots.findFirst({
    where: eq(pilots.id, id),
  });
  return result ?? null;
}

export async function getPilotByNif(nif: string): Promise<Pilot | null> {
  const result = await db.query.pilots.findFirst({
    where: eq(pilots.nif, nif),
  });
  return result ?? null;
}

export async function createPilot(input: CreatePilotInput): Promise<Pilot> {
  const values = toDbValues(input) as NewPilot;
  const [created] = await db.insert(pilots).values(values).returning();
  if (!created) {
    throw new Error("createPilot: inserción no devolvió fila");
  }
  return created;
}

export async function updatePilot(
  id: string,
  input: UpdatePilotInput,
): Promise<Pilot | null> {
  const values = toDbValues(input);
  if (Object.keys(values).length === 0) {
    return getPilot(id);
  }
  const [updated] = await db
    .update(pilots)
    .set(values)
    .where(eq(pilots.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Archivar piloto = marcar `active = false`. No borramos por FK (misiones
 * históricas seguirán referenciando al piloto).
 */
export async function archivePilot(id: string): Promise<Pilot | null> {
  const [updated] = await db
    .update(pilots)
    .set({ active: false })
    .where(eq(pilots.id, id))
    .returning();
  return updated ?? null;
}

export async function restorePilot(id: string): Promise<Pilot | null> {
  const [updated] = await db
    .update(pilots)
    .set({ active: true })
    .where(eq(pilots.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Helper UI: dado un piloto, devuelve qué credenciales están vencidas o
 * a punto de vencer (≤ 30 días). Sin lanzar — sólo describe el estado.
 */
export interface PilotCredentialStatus {
  field: "aesa" | "ropo" | "insurance" | "medical";
  expiresAt: string;
  daysToExpiry: number;
  severity: "expired" | "warning" | "ok";
}

const WARNING_THRESHOLD_DAYS = 30;

export function evaluateCredentials(
  pilot: Pilot,
  today: Date = new Date(),
): PilotCredentialStatus[] {
  const out: PilotCredentialStatus[] = [];
  const todayMs = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();

  const fields: Array<[PilotCredentialStatus["field"], string | null]> = [
    ["aesa", pilot.aesaLicenseExpiresAt],
    ["ropo", pilot.ropoExpiresAt],
    ["insurance", pilot.insuranceExpiresAt],
    ["medical", pilot.medicalCertificateExpiresAt],
  ];

  for (const [field, expiresAt] of fields) {
    if (!expiresAt) continue;
    const ts = Date.parse(expiresAt + "T00:00:00Z");
    if (Number.isNaN(ts)) continue;
    const days = Math.floor((ts - todayMs) / (1000 * 60 * 60 * 24));
    let severity: PilotCredentialStatus["severity"];
    if (days < 0) severity = "expired";
    else if (days <= WARNING_THRESHOLD_DAYS) severity = "warning";
    else severity = "ok";
    out.push({
      field,
      expiresAt,
      daysToExpiry: days,
      severity,
    });
  }

  return out;
}
