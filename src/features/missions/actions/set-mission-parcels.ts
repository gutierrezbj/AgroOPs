"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { ROLES, requireRole } from "@/lib/rbac";
import { missionIdSchema, setMissionParcelsSchema } from "../schemas";
import { getMission, setMissionParcels } from "../services";
import type { SetMissionParcelsState } from "./set-mission-parcels.types";

export async function setMissionParcelsAction(
  _prev: SetMissionParcelsState,
  formData: FormData,
): Promise<SetMissionParcelsState> {
  const session = await auth();
  requireRole(session, ROLES.WRITERS);

  const id = missionIdSchema.parse(formData.get("missionId"));
  const parcelIds = formData.getAll("parcelIds").map((v) => String(v));

  const parsed = setMissionParcelsSchema.safeParse({ parcelIds });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return { ok: false, error: first };
  }

  const before = await getMission(id);
  if (!before) return { ok: false, error: "Misión no encontrada" };

  const result = await setMissionParcels(id, parsed.data.parcelIds);
  if (!result.ok) return { ok: false, error: result.error };

  await logAudit({
    userId: session.user.id,
    action: "mission.parcels.updated",
    entityType: "mission",
    entityId: id,
    before: { parcelIds: before.parcels.map((p) => p.parcel.id) },
    after: { parcelIds: parsed.data.parcelIds },
  });

  revalidatePath(`/dashboard/missions/${id}`);

  return { ok: true, count: result.count };
}
