/**
 * AgroOps — login action types
 *
 * Types y estado inicial separados del archivo `use server` porque Next.js 16
 * sólo permite `export async function` en archivos `"use server"`.
 */
export interface LoginState {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
}

export const initialLoginState: LoginState = { ok: false };
