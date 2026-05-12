/**
 * AgroOps — phytosanitary schemas (HU-08)
 *
 * Catálogo local de productos fitosanitarios. Cada fila = un LOTE físico
 * concreto (no SKU genérico). El producto lo aporta el cliente (ADR-4);
 * AgroOps registra el lote usado en cada misión.
 */
import { z } from "zod";

export const doseUnitValues = [
  "l_per_ha",
  "kg_per_ha",
  "ml_per_ha",
  "g_per_ha",
] as const;

export const doseUnitLabels: Record<(typeof doseUnitValues)[number], string> = {
  l_per_ha: "L / ha",
  kg_per_ha: "kg / ha",
  ml_per_ha: "ml / ha",
  g_per_ha: "g / ha",
};

/**
 * Tipos de formulación habituales en agro español. Lista no cerrada en DB
 * — la UI sugiere estos pero acepta cualquier string.
 *  SC = Suspensión concentrada
 *  EC = Concentrado emulsionable
 *  WG = Gránulos dispersables
 *  WP = Polvo mojable
 *  OD = Suspensión oleodispersable
 *  EW = Emulsión aceite-agua
 *  SL = Concentrado soluble
 *  CS = Suspensión de cápsulas
 */
export const formulationSuggestions = [
  "SC",
  "EC",
  "WG",
  "WP",
  "OD",
  "EW",
  "SL",
  "CS",
] as const;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD");

const phytoBaseShape = {
  commercialName: z
    .string()
    .min(1, "Nombre comercial requerido")
    .max(200, "Nombre demasiado largo")
    .transform((v) => v.trim()),
  activeIngredient: z
    .string()
    .min(1, "Materia activa requerida")
    .max(300, "Materia activa demasiado larga")
    .transform((v) => v.trim()),
  mapaRegistration: z
    .string()
    .max(40, "Nº registro MAPA demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  formulation: z
    .string()
    .max(20, "Formulación demasiado larga")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim().toUpperCase() || null)),
  lotNumber: z
    .string()
    .min(1, "Número de lote requerido")
    .max(80, "Lote demasiado largo")
    .transform((v) => v.trim()),
  expiresAt: dateString,
  recommendedDoseValue: z
    .number({ message: "Dosis recomendada inválida" })
    .nonnegative("Dosis ≥ 0")
    .max(99999.999, "Dosis excede capacidad de columna")
    .optional()
    .nullable(),
  recommendedDoseUnit: z
    .enum(doseUnitValues, { message: "Unidad de dosis inválida" })
    .optional()
    .nullable(),
  safetyPeriodDays: z
    .number({ message: "Plazo de seguridad inválido" })
    .nonnegative("Plazo ≥ 0")
    .max(9999.9, "Plazo excede capacidad de columna")
    .optional()
    .nullable(),
  active: z.boolean().default(true),
  notes: z
    .string()
    .max(2000, "Notas demasiado largas")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
} satisfies Record<string, z.ZodTypeAny>;

/**
 * Cross-field rule: si hay recommendedDoseValue debe haber recommendedDoseUnit
 * y viceversa. No tiene sentido "2" sin saber si son litros, kilos o ml.
 */
function checkPhytoBusinessRules(
  data: {
    recommendedDoseValue?: number | null;
    recommendedDoseUnit?: (typeof doseUnitValues)[number] | null;
  },
  ctx: z.RefinementCtx,
): void {
  const hasValue =
    data.recommendedDoseValue !== null &&
    data.recommendedDoseValue !== undefined;
  const hasUnit =
    data.recommendedDoseUnit !== null &&
    data.recommendedDoseUnit !== undefined;

  if (hasValue && !hasUnit) {
    ctx.addIssue({
      code: "custom",
      message: "Indica la unidad de la dosis (L/ha, kg/ha, ml/ha o g/ha)",
      path: ["recommendedDoseUnit"],
    });
  }
  if (hasUnit && !hasValue) {
    ctx.addIssue({
      code: "custom",
      message: "Indica el valor numérico de la dosis",
      path: ["recommendedDoseValue"],
    });
  }
}

export const createPhytoProductSchema = z
  .object(phytoBaseShape)
  .superRefine(checkPhytoBusinessRules);

export const updatePhytoProductSchema = z
  .object(phytoBaseShape)
  .partial()
  .superRefine((data, ctx) => {
    // Solo aplicar la regla si AMBOS campos están presentes en el update
    // o si uno se establece y el otro ya está implícito en el dato existente.
    // Aquí simplificamos: aplicar si al menos uno está siendo modificado.
    if (
      data.recommendedDoseValue !== undefined ||
      data.recommendedDoseUnit !== undefined
    ) {
      checkPhytoBusinessRules(
        {
          recommendedDoseValue: data.recommendedDoseValue,
          recommendedDoseUnit: data.recommendedDoseUnit,
        },
        ctx,
      );
    }
  });

export const phytoProductIdSchema = z.string().uuid("ID de producto inválido");

export const listPhytoFiltersSchema = z
  .object({
    active: z.boolean().optional(),
  })
  .partial();

export type CreatePhytoProductInput = z.infer<typeof createPhytoProductSchema>;
export type UpdatePhytoProductInput = z.infer<typeof updatePhytoProductSchema>;
export type ListPhytoFilters = z.infer<typeof listPhytoFiltersSchema>;
