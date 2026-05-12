"use server";

/**
 * AgroOps — createPilotAction (HU-05)
 *
 * Alta de piloto en la flota. Reglas:
 * - RBAC: `WRITERS` (admin, operario).
 * - Zod `createPilotSchema` + business rule ROPO cross-field.
 * - Verifica unicidad de `nif` antes del insert.
 * - Audit `pilot.created` con el `after` completo.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { createPilotSchema } from "../schemas";
import { createPilot, getPilotByNif } from "../services";
import type { CreatePilotState } from "./create-pilot.types";

function parseNullableNumber(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function nullableString(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function createPilotAction(
  _prev: CreatePilotState,
  formData: FormData,
): Promise<CreatePilotState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const raw = {
    userId: nullableString(formData.get("userId")),
    fullName: formData.get("fullName"),
    nif: formData.get("nif"),
    aesaLicenseNumber: nullableString(formData.get("aesaLicenseNumber")),
    aesaLicenseClass: nullableString(formData.get("aesaLicenseClass")),
    aesaLicenseExpiresAt: nullableString(formData.get("aesaLicenseExpiresAt")),
    ropoQualified: formData.get("ropoQualified") === "on",
    ropoNumber: nullableString(formData.get("ropoNumber")),
    ropoLevel: nullableString(formData.get("ropoLevel")),
    ropoExpiresAt: nullableString(formData.get("ropoExpiresAt")),
    insurancePolicyNumber: nullableString(
      formData.get("insurancePolicyNumber"),
    ),
    insuranceExpiresAt: nullableString(formData.get("insuranceExpiresAt")),
    medicalCertificateExpiresAt: nullableString(
      formData.get("medicalCertificateExpiresAt"),
    ),
    flightHours: parseNullableNumber(formData.get("flightHours")) ?? 0,
    active: formData.get("active") === "on" || formData.get("active") === null,
    notes: nullableString(formData.get("notes")),
  };

  const parsed = createPilotSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  const existing = await getPilotByNif(parsed.data.nif);
  if (existing) {
    return {
      ok: false,
      error: "Ya existe un piloto con ese NIF",
      fieldErrors: { nif: "Ya existe un piloto con ese NIF" },
    };
  }

  const pilot = await createPilot(parsed.data);

  await logAudit({
    userId: session.user.id,
    action: "pilot.created",
    entityType: "pilot",
    entityId: pilot.id,
    after: pilot,
  });

  revalidatePath("/dashboard/fleet/pilots");

  return {
    ok: true,
    pilot: { id: pilot.id, fullName: pilot.fullName, nif: pilot.nif },
  };
}
