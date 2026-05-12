"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { createMissionSchema } from "../schemas";
import { createMission } from "../services";
import type { CreateMissionState } from "./create-mission.types";

function nullableString(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function createMissionAction(
  _prev: CreateMissionState,
  formData: FormData,
): Promise<CreateMissionState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const raw = {
    clientId: formData.get("clientId"),
    droneId: nullableString(formData.get("droneId")),
    pilotId: nullableString(formData.get("pilotId")),
    scheduledAt: nullableString(formData.get("scheduledAt")),
    notes: nullableString(formData.get("notes")),
  };

  const parsed = createMissionSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos resaltados", fieldErrors };
  }

  const mission = await createMission(parsed.data);

  await logAudit({
    userId: session.user.id,
    action: "mission.created",
    entityType: "mission",
    entityId: mission.id,
    after: {
      id: mission.id,
      code: mission.code,
      status: mission.status,
      clientId: mission.clientId,
    },
  });

  revalidatePath("/dashboard/missions");

  return { ok: true, mission: { id: mission.id, code: mission.code } };
}
