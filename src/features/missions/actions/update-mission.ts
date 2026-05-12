"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { missionIdSchema, updateMissionSchema } from "../schemas";
import { getMission, updateMission } from "../services";
import type { UpdateMissionState } from "./update-mission.types";

function nullableString(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function updateMissionAction(
  _prev: UpdateMissionState,
  formData: FormData,
): Promise<UpdateMissionState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const id = missionIdSchema.parse(formData.get("id"));
  const before = await getMission(id);
  if (!before) return { ok: false, error: "Misión no encontrada" };

  const raw = {
    clientId: formData.get("clientId") ?? undefined,
    droneId: nullableString(formData.get("droneId")),
    pilotId: nullableString(formData.get("pilotId")),
    scheduledAt: nullableString(formData.get("scheduledAt")),
    notes: nullableString(formData.get("notes")),
  };

  const parsed = updateMissionSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  const updated = await updateMission(id, parsed.data);
  if (!updated) return { ok: false, error: "No se pudo actualizar la misión" };

  await logAudit({
    userId: session.user.id,
    action: "mission.updated",
    entityType: "mission",
    entityId: id,
    before: {
      code: before.code,
      status: before.status,
      droneId: before.droneId,
      pilotId: before.pilotId,
      scheduledAt: before.scheduledAt,
    },
    after: {
      code: updated.code,
      status: updated.status,
      droneId: updated.droneId,
      pilotId: updated.pilotId,
      scheduledAt: updated.scheduledAt,
    },
  });

  revalidatePath("/dashboard/missions");
  revalidatePath(`/dashboard/missions/${id}`);

  return { ok: true, missionId: id };
}
