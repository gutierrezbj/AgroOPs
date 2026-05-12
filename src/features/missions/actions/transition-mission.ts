"use server";

/**
 * AgroOps — transitionMissionAction (HU-10)
 *
 * Aplica una transición de estado validando:
 * - El rol del usuario contra `rolesForTransition(from, to)`.
 * - Los gates de pre-requisitos (`evaluateGate`).
 * - El audit log refleja before/after + warnings + reason si aplica.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAudit } from "@/server/audit";
import { UnauthorizedError, requireAuth } from "@/lib/rbac";
import { missionIdSchema, transitionMissionSchema } from "../schemas";
import { getMission, transitionMission } from "../services";
import { rolesForTransition } from "../state-machine";
import type { TransitionMissionState } from "./transition-mission.types";

export async function transitionMissionAction(
  _prev: TransitionMissionState,
  formData: FormData,
): Promise<TransitionMissionState> {
  const session = await auth();
  requireAuth(session);

  const id = missionIdSchema.parse(formData.get("missionId"));
  const parsed = transitionMissionSchema.safeParse({
    targetStatus: formData.get("targetStatus"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const before = await getMission(id);
  if (!before) return { ok: false, error: "Misión no encontrada" };

  // Validar rol contra la transición concreta.
  const allowedRoles = rolesForTransition(before.status, parsed.data.targetStatus);
  if (!allowedRoles.includes(session.user.role)) {
    throw new UnauthorizedError(
      `Rol ${session.user.role} no autorizado para transición ${before.status} → ${parsed.data.targetStatus}. Requerido: ${allowedRoles.join(", ")}`,
    );
  }

  const result = await transitionMission(id, parsed.data.targetStatus);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      warnings: result.gate?.warnings,
    };
  }

  await logAudit({
    userId: session.user.id,
    action: `mission.${parsed.data.targetStatus}`,
    entityType: "mission",
    entityId: id,
    before: { status: before.status, code: before.code },
    after: {
      status: result.mission.status,
      code: result.mission.code,
      startedAt: result.mission.startedAt,
      completedAt: result.mission.completedAt,
    },
    metadata: parsed.data.reason
      ? { reason: parsed.data.reason, warnings: result.gate.warnings }
      : result.gate.warnings.length > 0
        ? { warnings: result.gate.warnings }
        : null,
  });

  revalidatePath("/dashboard/missions");
  revalidatePath(`/dashboard/missions/${id}`);

  return {
    ok: true,
    newStatus: result.mission.status,
    warnings: result.gate.warnings,
  };
}
