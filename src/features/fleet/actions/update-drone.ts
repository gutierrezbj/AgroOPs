"use server";

/**
 * AgroOps — updateDroneAction (HU-04)
 *
 * Actualización parcial de un dron. Mismas reglas que create:
 * - RBAC: `WRITERS`.
 * - Zod `updateDroneSchema` (todos los campos opcionales).
 * - Verifica unicidad de `serialNumber` si se cambia.
 * - Audit log `drone.updated` con `before` y `after`.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { droneIdSchema, updateDroneSchema } from "../schemas";
import { getDrone, getDroneBySerial, updateDrone } from "../services";

export interface UpdateDroneState {
  ok: boolean;
  droneId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialUpdateDroneState: UpdateDroneState = { ok: false };

function parseNullableNumber(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function updateDroneAction(
  _prev: UpdateDroneState,
  formData: FormData,
): Promise<UpdateDroneState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const id = droneIdSchema.parse(formData.get("id"));

  const before = await getDrone(id);
  if (!before) {
    return { ok: false, error: "Dron no encontrado" };
  }

  const raw = {
    model: formData.get("model") ?? undefined,
    manufacturer: formData.get("manufacturer") ?? undefined,
    serialNumber: formData.get("serialNumber") ?? undefined,
    registrationCode: formData.get("registrationCode"),
    mtomGrams:
      formData.get("mtomGrams") != null
        ? Number(formData.get("mtomGrams"))
        : undefined,
    easaClass: formData.get("easaClass") ?? undefined,
    applicationCapable:
      formData.get("applicationCapable") === "on"
        ? true
        : formData.get("applicationCapable") === "off"
          ? false
          : undefined,
    payloadLitres: parseNullableNumber(formData.get("payloadLitres")),
    insurancePolicyNumber: formData.get("insurancePolicyNumber"),
    insuranceExpiresAt: formData.get("insuranceExpiresAt"),
    flightHours:
      formData.get("flightHours") != null
        ? Number(formData.get("flightHours"))
        : undefined,
    status: formData.get("status") ?? undefined,
    notes: formData.get("notes"),
  };

  const parsed = updateDroneSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  if (
    parsed.data.serialNumber !== undefined &&
    parsed.data.serialNumber !== before.serialNumber
  ) {
    const conflict = await getDroneBySerial(parsed.data.serialNumber);
    if (conflict && conflict.id !== id) {
      return {
        ok: false,
        error: "Ya existe otro dron con ese número de serie",
        fieldErrors: {
          serialNumber: "Ya existe otro dron con ese número de serie",
        },
      };
    }
  }

  const updated = await updateDrone(id, parsed.data);
  if (!updated) {
    return { ok: false, error: "No se pudo actualizar el dron" };
  }

  await logAudit({
    userId: session.user.id,
    action: "drone.updated",
    entityType: "drone",
    entityId: id,
    before,
    after: updated,
  });

  revalidatePath("/dashboard/fleet/drones");
  revalidatePath(`/dashboard/fleet/drones/${id}`);

  return { ok: true, droneId: id };
}
