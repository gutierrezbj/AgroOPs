/**
 * AgroOps — fleet schemas
 *
 * Validación Zod para ABM de drones (HU-04). Mirror del schema Drizzle
 * `src/db/schema/drones.ts` con reglas de negocio explícitas y mensajes en
 * español.
 *
 * Reglas no negociables (CLAUDE.md regla 2): toda Server Action que mute
 * drones pasa por uno de estos schemas.
 */
import { z } from "zod";

export const droneStatusValues = ["active", "maintenance", "retired"] as const;
export const droneEasaClassValues = [
  "c0",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "n_a",
] as const;

/**
 * Base común a create/update. Aquí van los validators de cada campo.
 * Las business rules cross-campo viven en `.refine` o `.superRefine`.
 */
const droneBaseShape = {
  model: z
    .string()
    .min(1, "Modelo requerido")
    .max(80, "Modelo demasiado largo")
    .transform((v) => v.trim()),
  manufacturer: z
    .string()
    .min(1, "Fabricante requerido")
    .max(80, "Fabricante demasiado largo")
    .transform((v) => v.trim())
    .default("DJI"),
  serialNumber: z
    .string()
    .min(1, "Número de serie requerido")
    .max(120, "Número de serie demasiado largo")
    .transform((v) => v.trim().toUpperCase()),
  registrationCode: z
    .string()
    .max(40, "Código de registro demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  mtomGrams: z
    .number({ message: "MTOM requerido en gramos" })
    .int("MTOM debe ser entero (gramos)")
    .positive("MTOM debe ser > 0")
    .max(200_000, "MTOM > 200 kg poco realista"),
  easaClass: z.enum(droneEasaClassValues, {
    message: "Clase EASA inválida",
  }),
  applicationCapable: z.boolean().default(false),
  payloadLitres: z
    .number({ message: "Capacidad de tanque inválida" })
    .nonnegative("Capacidad ≥ 0")
    .max(999.99, "Capacidad excede 999.99 L")
    .optional()
    .nullable(),
  insurancePolicyNumber: z
    .string()
    .max(80, "Número de póliza demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  insuranceExpiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD")
    .optional()
    .nullable(),
  flightHours: z
    .number({ message: "Horas de vuelo inválidas" })
    .nonnegative("Horas ≥ 0")
    .max(999_999.99, "Horas excede capacidad de columna")
    .default(0),
  status: z.enum(droneStatusValues, { message: "Estado inválido" }).default("active"),
  notes: z
    .string()
    .max(2000, "Notas demasiado largas")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
} satisfies Record<string, z.ZodTypeAny>;

/**
 * Cross-field rules:
 * - applicationCapable=true ⇒ payloadLitres > 0 (no tiene sentido aplicador sin tanque)
 * - applicationCapable=true ⇒ easaClass ∈ {c5, c6} (categoría específica STS-01/02)
 * - easaClass=n_a ⇒ applicationCapable=false (D-RTK 2 y similares no son UAS)
 */
function checkBusinessRules(
  data: {
    applicationCapable: boolean;
    payloadLitres?: number | null;
    easaClass: (typeof droneEasaClassValues)[number];
  },
  ctx: z.RefinementCtx,
): void {
  if (data.applicationCapable) {
    if (data.payloadLitres == null || data.payloadLitres <= 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "Drones aplicadores requieren capacidad de tanque > 0",
        path: ["payloadLitres"],
      });
    }
    if (data.easaClass !== "c5" && data.easaClass !== "c6") {
      ctx.addIssue({
        code: "custom",
        message:
          "Drones aplicadores requieren clase EASA C5 o C6 (categoría específica)",
        path: ["easaClass"],
      });
    }
  }

  if (data.easaClass === "n_a" && data.applicationCapable) {
    ctx.addIssue({
      code: "custom",
      message: "Activos no-UAS (n_a) no pueden ser aplicadores",
      path: ["applicationCapable"],
    });
  }
}

export const createDroneSchema = z
  .object(droneBaseShape)
  .superRefine(checkBusinessRules);

/**
 * Update: todos los campos opcionales (parcial). serialNumber se permite
 * cambiar pero seguirá sometido al UNIQUE de la DB.
 *
 * Aplicamos las mismas business rules pero sólo si todos los campos
 * relevantes están presentes en el update (no podemos validar cross-field
 * si sólo se actualiza uno).
 */
export const updateDroneSchema = z
  .object(droneBaseShape)
  .partial()
  .superRefine((data, ctx) => {
    if (
      typeof data.applicationCapable === "boolean" &&
      data.easaClass !== undefined
    ) {
      checkBusinessRules(
        {
          applicationCapable: data.applicationCapable,
          payloadLitres: data.payloadLitres,
          easaClass: data.easaClass,
        },
        ctx,
      );
    }
  });

export const droneIdSchema = z
  .string()
  .uuid("ID de dron inválido");

export const listDroneFiltersSchema = z
  .object({
    status: z.enum(droneStatusValues).optional(),
    easaClass: z.enum(droneEasaClassValues).optional(),
    applicationCapable: z.boolean().optional(),
  })
  .partial();

export type CreateDroneInput = z.infer<typeof createDroneSchema>;
export type UpdateDroneInput = z.infer<typeof updateDroneSchema>;
export type ListDroneFilters = z.infer<typeof listDroneFiltersSchema>;
