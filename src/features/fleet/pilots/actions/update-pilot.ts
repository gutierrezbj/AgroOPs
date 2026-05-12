"use server";

/**
 * AgroOps — updatePilotAction (HU-05)
 *
 * Update parcial. Reglas:
 * - RBAC: `WRITERS`.
 * - Zod `updatePilotSchema` partial + business rules ROPO cross-field.
 * - Verifica unicidad de `nif` si se cambia.
 * - Audit `pilot.updated` con before/after.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { pilotIdSchema, updatePilotSchema } from "../schemas";
import { getPilot, getPilotByNif, updatePilot } from "../services";
import type { UpdatePilotState } from "./update-pilot.types";

function nullableString(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function updatePilotAction(
  _prev: UpdatePilotState,
  formData: FormData,
): Promise<UpdatePilotState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const id = pilotIdSchema.parse(formData.get("id"));
  const before = await getPilot(id);
  if (!before) {
    return { ok: false, error: "Piloto no encontrado" };
  }

  const raw = {
    userId: nullableString(formData.get("userId")),
    fullName: formData.get("fullName") ?? undefined,
    nif: formData.get("nif") ?? undefined,
    aesaLicenseNumber: nullableString(formData.get("aesaLicenseNumber")),
    aesaLicenseClass: nullableString(formData.get("aesaLicenseClass")),
    aesaLicenseExpiresAt: nullableString(formData.get("aesaLicenseExpiresAt")),
    ropoQualified:
      formData.get("ropoQualified") === "on"
        ? true
        : formData.get("ropoQualified") === "off"
          ? false
          : undefined,
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
    flightHours:
      formData.get("flightHours") != null
        ? Number(formData.get("flightHours"))
        : undefined,
    active:
      formData.get("active") === "on"
        ? true
        : formData.get("active") === "off"
          ? false
          : undefined,
    notes: nullableString(formData.get("notes")),
  };

  const parsed = updatePilotSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  if (parsed.data.nif !== undefined && parsed.data.nif !== before.nif) {
    const conflict = await getPilotByNif(parsed.data.nif);
    if (conflict && conflict.id !== id) {
      return {
        ok: false,
        error: "Ya existe otro piloto con ese NIF",
        fieldErrors: { nif: "Ya existe otro piloto con ese NIF" },
      };
    }
  }

  const updated = await updatePilot(id, parsed.data);
  if (!updated) {
    return { ok: false, error: "No se pudo actualizar el piloto" };
  }

  await logAudit({
    userId: session.user.id,
    action: "pilot.updated",
    entityType: "pilot",
    entityId: id,
    before,
    after: updated,
  });

  revalidatePath("/dashboard/fleet/pilots");
  revalidatePath(`/dashboard/fleet/pilots/${id}`);

  return { ok: true, pilotId: id };
}
