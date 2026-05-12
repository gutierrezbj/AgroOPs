/**
 * AgroOps — auth schemas
 *
 * Validación Zod para entradas de autenticación. Single-tenant (ADR-2):
 * no hay campo de tenant ni código de organización en el login.
 */
import { z } from "zod";

export const loginSchema = z.object({
  // Normaliza primero (trim + lowercase) y después valida que sea email,
  // así un input "  JuanCho@SystemRapid.IO  " pasa la validación.
  email: z
    .string()
    .min(1, "Email requerido")
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.string().email("Email inválido")),
  password: z
    .string()
    .min(1, "Contraseña requerida")
    .max(256, "Contraseña demasiado larga"),
});

export type LoginInput = z.infer<typeof loginSchema>;
