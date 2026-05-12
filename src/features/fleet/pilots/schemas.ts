/**
 * AgroOps — pilots schemas (HU-05)
 *
 * Validación Zod para ABM de pilotos. Mirror del schema Drizzle
 * `src/db/schema/pilots.ts` + business rules cross-field.
 *
 * Reglas no negociables (CLAUDE.md regla 2): toda Server Action que mute
 * pilotos pasa por uno de estos schemas.
 */
import { z } from "zod";

/**
 * Niveles ROPO oficiales (Registro Oficial de Productores y Operadores
 * de medios de defensa fitosanitaria). El "Piloto aplicador" es el nivel
 * exigible para aplicación aérea con dron en España.
 */
export const ropoLevelValues = [
  "Básico",
  "Cualificado",
  "Fumigador",
  "Piloto aplicador",
] as const;

/**
 * Clases AESA habituales en operación dron agro. Lista no cerrada por enum
 * en DB para permitir variantes ("A1/A3", etc.).
 */
export const aesaLicenseClassValues = [
  "A1/A3",
  "A2",
  "STS-01",
  "STS-02",
] as const;

/**
 * NIF español: 8 dígitos + 1 letra de control, en mayúscula.
 * NIE: X/Y/Z + 7 dígitos + 1 letra.
 * Para no rechazar pasaportes UE válidos en aplicador, permitimos también
 * 9-10 alfanuméricos en mayúsculas como fallback.
 */
const nifRegex = /^[A-Z0-9]{8,10}$/;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD")
  .optional()
  .nullable();

const pilotBaseShape = {
  userId: z
    .string()
    .uuid("ID de usuario inválido")
    .optional()
    .nullable(),
  fullName: z
    .string()
    .min(1, "Nombre completo requerido")
    .max(200, "Nombre demasiado largo")
    .transform((v) => v.trim()),
  nif: z
    .string()
    .min(1, "NIF requerido")
    .transform((v) => v.trim().toUpperCase())
    .pipe(
      z
        .string()
        .regex(
          nifRegex,
          "NIF inválido (esperado 8-10 alfanuméricos sin guiones)",
        ),
    ),
  aesaLicenseNumber: z
    .string()
    .max(80, "Número de licencia demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  aesaLicenseClass: z
    .string()
    .max(20, "Clase de licencia demasiado larga")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  aesaLicenseExpiresAt: dateString,
  ropoQualified: z.boolean().default(false),
  ropoNumber: z
    .string()
    .max(80, "Número ROPO demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  ropoLevel: z
    .string()
    .max(40, "Nivel ROPO demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  ropoExpiresAt: dateString,
  insurancePolicyNumber: z
    .string()
    .max(80, "Número de póliza demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  insuranceExpiresAt: dateString,
  medicalCertificateExpiresAt: dateString,
  flightHours: z
    .number({ message: "Horas de vuelo inválidas" })
    .nonnegative("Horas ≥ 0")
    .max(999_999.99, "Horas excede capacidad de columna")
    .default(0),
  active: z.boolean().default(true),
  notes: z
    .string()
    .max(2000, "Notas demasiado largas")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
} satisfies Record<string, z.ZodTypeAny>;

/**
 * Cross-field rules:
 * - ropoQualified=true ⇒ requiere ropoNumber + ropoLevel + ropoExpiresAt.
 *   Sin estos datos no podemos demostrar la habilitación frente a auditoría PAC.
 * - Si aesaLicenseClass está definida (STS-01/02 etc.), recomendamos
 *   aesaLicenseNumber + aesaLicenseExpiresAt; lo dejamos como warning soft
 *   en la UI pero no lo bloqueamos en schema (puede ser piloto invitado
 *   bajo NPTA Drovinci todavía sin licencia propia firme).
 */
function checkPilotBusinessRules(
  data: {
    ropoQualified: boolean;
    ropoNumber?: string | null;
    ropoLevel?: string | null;
    ropoExpiresAt?: string | null;
  },
  ctx: z.RefinementCtx,
): void {
  if (data.ropoQualified) {
    if (!data.ropoNumber) {
      ctx.addIssue({
        code: "custom",
        message: "Pilotos ROPO requieren número ROPO",
        path: ["ropoNumber"],
      });
    }
    if (!data.ropoLevel) {
      ctx.addIssue({
        code: "custom",
        message: "Pilotos ROPO requieren nivel (p.ej. Piloto aplicador)",
        path: ["ropoLevel"],
      });
    }
    if (!data.ropoExpiresAt) {
      ctx.addIssue({
        code: "custom",
        message: "Pilotos ROPO requieren fecha de caducidad",
        path: ["ropoExpiresAt"],
      });
    }
  }
}

export const createPilotSchema = z
  .object(pilotBaseShape)
  .superRefine(checkPilotBusinessRules);

export const updatePilotSchema = z
  .object(pilotBaseShape)
  .partial()
  .superRefine((data, ctx) => {
    if (typeof data.ropoQualified === "boolean") {
      checkPilotBusinessRules(
        {
          ropoQualified: data.ropoQualified,
          ropoNumber: data.ropoNumber,
          ropoLevel: data.ropoLevel,
          ropoExpiresAt: data.ropoExpiresAt,
        },
        ctx,
      );
    }
  });

export const pilotIdSchema = z.string().uuid("ID de piloto inválido");

export const listPilotFiltersSchema = z
  .object({
    active: z.boolean().optional(),
    ropoQualified: z.boolean().optional(),
  })
  .partial();

export type CreatePilotInput = z.infer<typeof createPilotSchema>;
export type UpdatePilotInput = z.infer<typeof updatePilotSchema>;
export type ListPilotFilters = z.infer<typeof listPilotFiltersSchema>;
