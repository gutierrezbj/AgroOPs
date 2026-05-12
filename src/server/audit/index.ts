/**
 * AgroOps — audit log helper
 *
 * Llamar desde Server Actions que mutan estado crítico (misiones, albaranes,
 * facturas, fito). Append-only. Captura ip + user-agent desde headers de Next.
 *
 * Uso:
 *
 * ```ts
 * import { logAudit } from "@/server/audit";
 *
 * await logAudit({
 *   userId: session.user.id,
 *   action: "mission.created",
 *   entityType: "mission",
 *   entityId: mission.id,
 *   after: mission,
 * });
 * ```
 */
import { headers } from "next/headers";
import { db } from "@/db";
import { auditLog, type NewAuditLog } from "@/db/schema/audit-log";

type LogAuditInput = Omit<NewAuditLog, "id" | "createdAt" | "ipAddress" | "userAgent"> & {
  ipAddress?: string;
  userAgent?: string;
};

export async function logAudit(input: LogAuditInput): Promise<void> {
  let ip = input.ipAddress;
  let ua = input.userAgent;

  try {
    const h = await headers();
    // h.get() devuelve `string | null`; aquí el tipo local es `string | undefined` (LogAuditInput.ipAddress es opcional),
    // por eso el fallback final es undefined, no null. Bug menor del bundle schema (corrige aguas arriba).
    ip ??= h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? undefined;
    ua ??= h.get("user-agent") ?? undefined;
  } catch {
    // headers() solo disponible en contexto de request — fuera de él, omitir.
  }

  await db.insert(auditLog).values({
    ...input,
    ipAddress: ip ?? null,
    userAgent: ua ?? null,
  });
}
