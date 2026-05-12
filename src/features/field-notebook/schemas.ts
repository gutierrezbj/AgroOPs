/**
 * AgroOps — field notebook schemas (HU-21)
 *
 * Filtros para la consulta del cuaderno de campo PAC. Todo opcional para
 * permitir consultas amplias (toda la temporada) o granulares (un cliente,
 * un rango de 2 semanas).
 *
 * Validación de rangos de fecha: si vienen ambos, dateFrom ≤ dateTo.
 */
import { z } from "zod";

const dateStringSchema = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(new Date(s).getTime()), {
    message: "Fecha inválida (usa formato ISO YYYY-MM-DD)",
  });

export const fieldNotebookFiltersSchema = z
  .object({
    /** Fecha mínima de aplicación (inclusive). ISO YYYY-MM-DD. */
    dateFrom: dateStringSchema.optional(),
    /** Fecha máxima de aplicación (inclusive). ISO YYYY-MM-DD. */
    dateTo: dateStringSchema.optional(),
    /** Filtrar por cliente concreto. */
    clientId: z.string().uuid().optional(),
    /** Filtrar por parcela concreta (más específico que clientId). */
    parcelId: z.string().uuid().optional(),
    /** Filtrar por cultivo (texto exacto, ej. "olivar"). */
    crop: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dateFrom && data.dateTo) {
      const a = new Date(data.dateFrom).getTime();
      const b = new Date(data.dateTo).getTime();
      if (a > b) {
        ctx.addIssue({
          code: "custom",
          message: "dateFrom debe ser anterior o igual a dateTo",
          path: ["dateFrom"],
        });
      }
    }
  });

export type FieldNotebookFilters = z.infer<typeof fieldNotebookFiltersSchema>;

/**
 * Helper para construir filtros desde URLSearchParams (uso típico desde
 * page params o API routes).
 */
export function parseFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | undefined>,
): { ok: true; filters: FieldNotebookFilters } | { ok: false; error: string } {
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
  const parsed = fieldNotebookFiltersSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "filtros inválidos",
    };
  }
  return { ok: true, filters: parsed.data };
}
