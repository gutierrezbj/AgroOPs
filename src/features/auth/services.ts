/**
 * AgroOps — auth services
 *
 * Lógica de negocio de autenticación. Sin lógica de UI ni dependencias de Next:
 * funciones puras que reciben input validado y hablan con `db` via Drizzle.
 *
 * Reglas (CLAUDE.md):
 * - Queries vía Drizzle (regla 5).
 * - Sin secretos hardcodeados (regla 7).
 * - bcrypt.compare para verificar password (ADR-7).
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User, type UserRole } from "@/db/schema/users";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

/**
 * Verifica credenciales contra la tabla `users`.
 *
 * Devuelve el usuario autenticado si el email existe, la cuenta está activa
 * y el password coincide con el hash bcrypt. Si algo falla, devuelve `null`
 * (sin filtrar qué condición específica falló para no facilitar enumeración).
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !user.active) {
    return null;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return null;
  }

  return toAuthenticatedUser(user);
}

/**
 * Actualiza el campo `lastLoginAt` tras un login exitoso.
 *
 * Operación best-effort: si falla (DB caída), no rompe el flow de login,
 * sólo log de error. No es información crítica de auditoría — el `audit_log`
 * formal cubre los eventos relevantes.
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  } catch (err) {
    console.error("[auth] No se pudo actualizar lastLoginAt:", err);
  }
}

function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.fullName,
  };
}
