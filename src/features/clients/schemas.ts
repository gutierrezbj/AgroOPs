/**
 * AgroOps — clients schemas (HU-06)
 *
 * Validación Zod para ABM de clientes (cooperativas, ATRIA, agricultores,
 * comunidades de regantes, empresas agrarias). Mirror del schema Drizzle
 * `src/db/schema/clients.ts`.
 */
import { z } from "zod";

export const clientTypeValues = [
  "cooperativa",
  "atria",
  "agricultor",
  "comunidad_regantes",
  "empresa_agraria",
  "otros",
] as const;

export const clientTypeLabels: Record<(typeof clientTypeValues)[number], string> = {
  cooperativa: "Cooperativa",
  atria: "ATRIA",
  agricultor: "Agricultor profesional",
  comunidad_regantes: "Comunidad de regantes",
  empresa_agraria: "Empresa agraria",
  otros: "Otros",
};

/**
 * CIF / NIF / NIE: permisivo a 8-10 alfanuméricos en mayúsculas.
 */
const taxIdRegex = /^[A-Z0-9]{8,10}$/;

/**
 * Código postal español: 5 dígitos. Si `country !== "ES"` se permite cualquier
 * formato alfanumérico de hasta 12 caracteres.
 */
const spanishPostalCodeRegex = /^\d{5}$/;

const clientBaseShape = {
  name: z
    .string()
    .min(1, "Nombre requerido")
    .max(200, "Nombre demasiado largo")
    .transform((v) => v.trim()),
  taxId: z
    .string()
    .min(1, "CIF/NIF requerido")
    .transform((v) => v.trim().toUpperCase().replace(/[\s.-]/g, ""))
    .pipe(
      z
        .string()
        .regex(
          taxIdRegex,
          "CIF/NIF inválido (esperado 8-10 alfanuméricos sin guiones)",
        ),
    ),
  type: z.enum(clientTypeValues, { message: "Tipo de cliente inválido" }).default("agricultor"),
  contactPerson: z
    .string()
    .max(200, "Nombre de contacto demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  contactEmail: z
    .string()
    .max(200, "Email demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim().toLowerCase() || null))
    .refine(
      (v) => v == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      { message: "Email inválido" },
    ),
  contactPhone: z
    .string()
    .max(40, "Teléfono demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  billingAddress: z
    .string()
    .max(300, "Dirección demasiado larga")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  city: z
    .string()
    .max(120, "Ciudad demasiado larga")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  province: z
    .string()
    .max(120, "Provincia demasiado larga")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  postalCode: z
    .string()
    .max(12, "Código postal demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  country: z
    .string()
    .length(2, "Código de país debe tener 2 letras (ISO 3166-1)")
    .transform((v) => v.toUpperCase())
    .default("ES"),
  holdedContactId: z
    .string()
    .max(80, "Holded ID demasiado largo")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  notes: z
    .string()
    .max(2000, "Notas demasiado largas")
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
} satisfies Record<string, z.ZodTypeAny>;

/**
 * Cross-field rule: si country = "ES" y hay postalCode, debe ser 5 dígitos.
 */
function checkClientBusinessRules(
  data: {
    country?: string;
    postalCode?: string | null;
  },
  ctx: z.RefinementCtx,
): void {
  if (data.country === "ES" && data.postalCode) {
    if (!spanishPostalCodeRegex.test(data.postalCode)) {
      ctx.addIssue({
        code: "custom",
        message: "Código postal español debe tener 5 dígitos",
        path: ["postalCode"],
      });
    }
  }
}

export const createClientSchema = z
  .object(clientBaseShape)
  .superRefine(checkClientBusinessRules);

export const updateClientSchema = z
  .object(clientBaseShape)
  .partial()
  .superRefine(checkClientBusinessRules);

export const clientIdSchema = z.string().uuid("ID de cliente inválido");

export const listClientFiltersSchema = z
  .object({
    type: z.enum(clientTypeValues).optional(),
    country: z.string().length(2).optional(),
  })
  .partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientFilters = z.infer<typeof listClientFiltersSchema>;
