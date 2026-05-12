"use server";

/**
 * AgroOps — login Server Action
 *
 * Delega a `signIn("credentials", ...)` de Auth.js v5. La verificación real
 * de credenciales sucede dentro de `authorize()` (ver `auth.ts`), que llama
 * a `verifyCredentials` del service.
 *
 * Estado tipado vive en `login.types.ts` porque Next.js 16 sólo permite
 * `export async function` en archivos `"use server"`.
 */
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema } from "../schemas";
import type { LoginState } from "./login.types";

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: LoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" || field === "password") {
        fieldErrors[field] = issue.message;
      }
    }
    return { ok: false, error: "Revisa los datos del formulario", fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Credenciales inválidas" };
    }
    // signIn lanza un NEXT_REDIRECT en éxito — Next lo maneja, lo re-lanzamos.
    throw err;
  }
}
