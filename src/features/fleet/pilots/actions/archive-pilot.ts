"use server";

/**
 * AgroOps — archivePilotAction (HU-05)
 *
 * Archivar piloto = marcar `active = false`. No borra (FK desde misiones).
 * - RBAC: `ADMIN_ONLY` (decisión sensible: implica que no aparece en
 *   selección de misiones nuevas).
 * - Audit `pilot.archived` con before/after.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { pilotIdSchema } from "../schemas";
import { archivePilot, getPilot } from "../services";
import type { ArchivePilotState } from "./archive-pilot.types";

export async function archivePilotAction(
  _prev: ArchivePilotState,
  formData: FormData,
): Promise<ArchivePilotState> {
  const session = await auth();
  requireRole(session, ROLES.ADMIN_ONLY);

  const id = pilotIdSchema.parse(formData.get("id"));

  const before = await getPilot(id);
  if (!before) {
    return { ok: false, error: "Piloto no encontrado" };
  }
  if (!before.active) {
    return { ok: false, error: "El piloto ya está inactivo" };
  }

  const updated = await archivePilot(id);
  if (!updated) {
    return { ok: false, error: "No se pudo archivar el piloto" };
  }

  await logAudit({
    userId: session.user.id,
    action: "pilot.archived",
    entityType: "pilot",
    entityId: id,
    before,
    after: updated,
  });

  revalidatePath("/dashboard/fleet/pilots");
  revalidatePath(`/dashboard/fleet/pilots/${id}`);

  return { ok: true };
}
