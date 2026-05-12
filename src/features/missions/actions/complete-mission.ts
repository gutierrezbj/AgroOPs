"use server";

/**
 * AgroOps — completeMissionAction (HU-10 cierre manual)
 *
 * Cierra una misión `in_flight` capturando areaTreatedHa y un telemetry
 * stub mínimo (HU-14 traerá telemetría real). Pasa por el gate
 * `in_flight → completed` igual que la transición regular.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { UnauthorizedError, requireAuth } from "@/lib/rbac";
import { completeMissionSchema, missionIdSchema } from "../schemas";
import { completeMissionManually, getMission } from "../services";
import { rolesForTransition } from "../state-machine";
import type { CompleteMissionState } from "./complete-mission.types";

export async function completeMissionAction(
  _prev: CompleteMissionState,
  formData: FormData,
): Promise<CompleteMissionState> {
  const session = await auth();
  requireAuth(session);

  const id = missionIdSchema.parse(formData.get("missionId"));
  const before = await getMission(id);
  if (!before) return { ok: false, error: "Misión no encontrada" };

  const allowedRoles = rolesForTransition(before.status, "completed");
  if (!allowedRoles.includes(session.user.role)) {
    throw new UnauthorizedError(
      `Rol ${session.user.role} no puede cerrar la misión. Requerido: ${allowedRoles.join(", ")}`,
    );
  }

  const areaRaw = formData.get("areaTreatedHa");
  const areaNum = areaRaw != null ? Number(areaRaw) : NaN;

  const parsed = completeMissionSchema.safeParse({
    areaTreatedHa: areaNum,
    telemetryNotes: formData.get("telemetryNotes") ?? null,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos", fieldErrors };
  }

  const result = await completeMissionManually(id, session.user.id, parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      warnings: result.gate?.warnings,
    };
  }

  await logAudit({
    userId: session.user.id,
    action: "mission.completed",
    entityType: "mission",
    entityId: id,
    before: { status: before.status, code: before.code },
    after: {
      status: result.mission.status,
      areaTreatedHa: result.mission.areaTreatedHa,
      completedAt: result.mission.completedAt,
    },
    metadata: {
      manualClose: true,
      telemetryNotes: parsed.data.telemetryNotes,
      warnings: result.gate.warnings,
    },
  });

  revalidatePath("/dashboard/missions");
  revalidatePath(`/dashboard/missions/${id}`);

  return { ok: true, warnings: result.gate.warnings };
}
