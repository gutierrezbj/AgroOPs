/**
 * AgroOps — RBAC helpers
 *
 * Wrappers de control de acceso para Server Actions y route handlers.
 * Regla no negociable 4 del CLAUDE.md: "RBAC chequeado en server. Nunca confiar
 * en el cliente." Toda Server Action que mute datos críticos debe llamar a
 * `requireRole` o `requireAuth` antes de tocar `db`.
 */
import type { Session } from "next-auth";
import type { UserRole } from "@/db/schema/users";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized: sin sesión activa") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Comprueba si la sesión actual tiene alguno de los roles permitidos.
 * No lanza — usar para condicionales en UI / lógica opcional.
 */
export function hasRole(
  session: Session | null,
  allowed: readonly UserRole[],
): boolean {
  if (!session?.user?.role) return false;
  return allowed.includes(session.user.role);
}

/**
 * Garantiza que la sesión existe y el rol está en la allowlist.
 * Lanza `UnauthorizedError` (sin sesión) o `ForbiddenError` (rol no permitido).
 * Usar al principio de cada Server Action sensible.
 */
export function requireRole(
  session: Session | null,
  allowed: readonly UserRole[],
): asserts session is Session {
  if (!session?.user?.role) {
    throw new UnauthorizedError();
  }
  if (!allowed.includes(session.user.role)) {
    throw new ForbiddenError(
      `Forbidden: rol "${session.user.role}" no autorizado. Requerido: ${allowed.join(", ")}`,
    );
  }
}

/**
 * Garantiza sólo que hay sesión activa, sin restringir por rol.
 * Útil para Server Actions accesibles a cualquier usuario autenticado.
 */
export function requireAuth(
  session: Session | null,
): asserts session is Session {
  if (!session?.user) {
    throw new UnauthorizedError();
  }
}

/**
 * Conjuntos de roles canónicos para reutilizar en Server Actions.
 * Mantener aquí la verdad única — no duplicar arrays inline en cada action.
 */
export const ROLES = {
  ALL: ["admin", "piloto", "operario", "viewer"] as const,
  WRITERS: ["admin", "operario"] as const,
  ADMIN_ONLY: ["admin"] as const,
  PILOT_OPERATIONS: ["admin", "piloto"] as const,
  FIELD_OPERATIONS: ["admin", "piloto", "operario"] as const,
} satisfies Record<string, readonly UserRole[]>;
