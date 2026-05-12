"use server";

/**
 * AgroOps — createDroneAction (HU-04)
 *
 * Server Action para alta de un dron en la flota. Reglas:
 * - RBAC: `WRITERS` (admin, operario).
 * - Zod input validation via `createDroneSchema` (regla 2).
 * - Verifica unicidad de `serialNumber` antes de insert.
 * - Audit log `drone.created` con el `after` completo.
 * - Revalida `/dashboard/fleet/drones`.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { createDroneSchema } from "../schemas";
import { createDrone, getDroneBySerial } from "../services";

export interface CreateDroneState {
  ok: boolean;
  drone?: { id: string; model: string; serialNumber: string };
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialCreateDroneState: CreateDroneState = { ok: false };

function parseNullableNumber(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseRequiredNumber(v: FormDataEntryValue | null): number {
  if (v == null || v === "") return Number.NaN;
  return Number(v);
}

export async function createDroneAction(
  _prev: CreateDroneState,
  formData: FormData,
): Promise<CreateDroneState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const raw = {
    model: formData.get("model"),
    manufacturer: formData.get("manufacturer") ?? "DJI",
    serialNumber: formData.get("serialNumber"),
    registrationCode: formData.get("registrationCode") ?? null,
    mtomGrams: parseRequiredNumber(formData.get("mtomGrams")),
    easaClass: formData.get("easaClass"),
    applicationCapable: formData.get("applicationCapable") === "on",
    payloadLitres: parseNullableNumber(formData.get("payloadLitres")),
    insurancePolicyNumber: formData.get("insurancePolicyNumber") ?? null,
    insuranceExpiresAt: formData.get("insuranceExpiresAt") ?? null,
    flightHours: parseNullableNumber(formData.get("flightHours")) ?? 0,
    status: formData.get("status") ?? "active",
    notes: formData.get("notes") ?? null,
  };

  const parsed = createDroneSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  const existing = await getDroneBySerial(parsed.data.serialNumber);
  if (existing) {
    return {
      ok: false,
      error: "Ya existe un dron con ese número de serie",
      fieldErrors: {
        serialNumber: "Ya existe un dron con ese número de serie",
      },
    };
  }

  const drone = await createDrone(parsed.data);

  await logAudit({
    userId: session.user.id,
    action: "drone.created",
    entityType: "drone",
    entityId: drone.id,
    after: drone,
  });

  revalidatePath("/dashboard/fleet/drones");

  return {
    ok: true,
    drone: {
      id: drone.id,
      model: drone.model,
      serialNumber: drone.serialNumber,
    },
  };
}
