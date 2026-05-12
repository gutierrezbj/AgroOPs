/**
 * AgroOps — Auth.js v5 entry point
 *
 * Combina la config edge-compatible (`auth.config.ts`) con el provider
 * `Credentials` que sí requiere Node runtime (bcrypt + pg).
 *
 * Exporta:
 * - `handlers` — route handlers para `/api/auth/[...nextauth]`.
 * - `auth` — server-side helper para leer sesión (`await auth()`).
 * - `signIn` / `signOut` — Server Action invokers.
 *
 * Reglas (CLAUDE.md):
 * - Credentials provider validado con Zod antes de tocar DB (regla 2).
 * - bcrypt.compare via `verifyCredentials` service (ADR-7).
 * - No expone hash en la sesión.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { loginSchema } from "@/features/auth/schemas";
import {
  verifyCredentials,
  updateLastLogin,
} from "@/features/auth/services";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "AgroOps credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await verifyCredentials(
          parsed.data.email,
          parsed.data.password,
        );
        if (!user) return null;

        // Best-effort, no rompe login si falla.
        await updateLastLogin(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
