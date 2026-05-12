/**
 * AgroOps — albarans schemas (HU-15)
 *
 * Validación Zod para firma de albarán y generación de PDF. El campo
 * `signatureImageBase64` debe ser un data URL PNG (formato del canvas
 * `toDataURL("image/png")`).
 */
import { z } from "zod";

/**
 * Data URL PNG. El prefijo `data:image/png;base64,` es exigido por la
 * convención del SignaturePad client.
 */
const pngDataUrlRegex = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;

/**
 * NIF / NIE / Passport — mismo patrón que clients y pilots.
 */
const nifRegex = /^[A-Z0-9]{8,10}$/;

export const signAlbaranSchema = z.object({
  missionId: z.string().uuid("ID de misión inválido"),
  signerFullName: z
    .string()
    .min(1, "Nombre del firmante requerido")
    .max(200, "Nombre demasiado largo")
    .transform((v) => v.trim()),
  signerNif: z
    .string()
    .min(1, "NIF del firmante requerido")
    .transform((v) => v.trim().toUpperCase().replace(/[\s.-]/g, ""))
    .pipe(
      z
        .string()
        .regex(
          nifRegex,
          "NIF inválido (esperado 8-10 alfanuméricos sin guiones)",
        ),
    ),
  signatureImageBase64: z
    .string()
    .min(1, "Firma requerida")
    .regex(pngDataUrlRegex, "La firma debe ser un data URL PNG"),
  notes: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
});

export const albaranIdSchema = z.string().uuid("ID de albarán inválido");
export const albaranCodeSchema = z.string().regex(/^ALB-\d{4}-\d{4}$/, "Código de albarán inválido");

export type SignAlbaranInput = z.infer<typeof signAlbaranSchema>;
