"use server";

/**
 * AgroOps — logout Server Action
 *
 * Cierra la sesión y redirige a `/login`. Llamable desde un form simple en
 * cualquier layout autenticado.
 */
import { signOut } from "@/auth";

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
