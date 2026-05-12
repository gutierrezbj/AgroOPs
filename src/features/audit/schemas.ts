/**
 * AgroOps — audit log filters schema (HU-23)
 *
 * Filtros para la consulta del audit log. Todos opcionales para soportar
 * tanto "ver todo lo último" como "ver lo que pasó con esta misión".
 */
import { z } from "zod";

const dateStringSchema = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(new Date(s).getTime()), {
    message: "Fecha inválida (usa formato ISO YYYY-MM-DD)",
  });

export const auditLogFiltersSchema = z
  .object({
    /** Fecha mínima (inclusive). */
    dateFrom: dateStringSchema.optional(),
    /** Fecha máxima (inclusive). */
    dateTo: dateStringSchema.optional(),
    /** Filtra por usuario que ejecutó la acción. */
    userId: z.string().uuid().optional(),
    /** Tipo de entidad mutada (mission, albaran, invoice, etc.). */
    entityType: z.string().trim().min(1).optional(),
    /** ID concreto de la entidad (útil para timeline de 1 misión). */
    entityId: z.string().uuid().optional(),
    /** Acción exacta (mission.created, albaran.signed, etc.). */
    action: z.string().trim().min(1).optional(),
    /** Búsqueda de prefijo en action (p.ej. "mission." → todas las de misiones). */
    actionPrefix: z.string().trim().min(1).optional(),
    /** Límite por defecto 100, máximo 500. */
    limit: z.coerce.number().int().min(1).max(500).default(100),
  })
  .superRefine((data, ctx) => {
    if (data.dateFrom && data.dateTo) {
      if (new Date(data.dateFrom).getTime() > new Date(data.dateTo).getTime()) {
        ctx.addIssue({
          code: "custom",
          message: "dateFrom debe ser anterior o igual a dateTo",
          path: ["dateFrom"],
        });
      }
    }
    if (data.action && data.actionPrefix) {
      ctx.addIssue({
        code: "custom",
        message: "Usa 'action' o 'actionPrefix', no ambos",
        path: ["action"],
      });
    }
  });

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;
export type AuditLogFiltersInput = z.input<typeof auditLogFiltersSchema>;

export function parseAuditFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | undefined>,
):
  | { ok: true; filters: AuditLogFilters }
  | { ok: false; error: string } {
  const obj: Record<string, string> = {};
  if (params instanceof URLSearchParams) {
    for (const [k, v] of params.entries()) {
      if (v) obj[k] = v;
    }
  } else {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") obj[k] = v;
    }
  }
  const parsed = auditLogFiltersSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "filtros inválidos",
    };
  }
  return { ok: true, filters: parsed.data };
}
