"use server";

/**
 * AgroOps — archiveDroneAction (HU-04)
 *
 * Marca un dron como `retired`. NO borra (hay FK desde misiones históricas).
 * Reglas:
 * - RBAC: `ADMIN_ONLY` (decisión de flota crítica).
 * - Audit log `drone.archived` con before/after.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { droneIdSchema } from "../schemas";
import { archiveDrone, getDrone } from "../services";
import type { ArchiveDroneState } from "./archive-drone.types";

export async function archiveDroneAction(
  _prev: ArchiveDroneState,
  formData: FormData,
): Promise<ArchiveDroneState> {
  const session = await auth();
  requireRole(session, ROLES.ADMIN_ONLY);

  const id = droneIdSchema.parse(formData.get("id"));

  const before = await getDrone(id);
  if (!before) {
    return { ok: false, error: "Dron no encontrado" };
  }
  if (before.status === "retired") {
    return { ok: false, error: "El dron ya está retirado" };
  }

  const updated = await archiveDrone(id);
  if (!updated) {
    return { ok: false, error: "No se pudo archivar el dron" };
  }

  await logAudit({
    userId: session.user.id,
    action: "drone.archived",
    entityType: "drone",
    entityId: id,
    before,
    after: updated,
  });

  revalidatePath("/dashboard/fleet/drones");
  revalidatePath(`/dashboard/fleet/drones/${id}`);

  return { ok: true };
}
