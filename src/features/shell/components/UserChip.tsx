/**
 * AgroOps — UserChip (Sprint 5 Distinctiveness Audit)
 *
 * Chip de usuario en el header del dashboard. Server component que recibe
 * la sesión y muestra nombre + email + role-pill + botón logout (vía
 * Server Action `logoutAction`).
 *
 * El role-pill usa los colores semánticos de la paleta v1:
 * - admin    → accent-action (deep)
 * - piloto   → accent-info
 * - operario → accent-ok
 * - viewer   → text-muted
 */
import type { Session } from "next-auth";
import { logoutAction } from "@/features/auth/actions/logout";

interface UserChipProps {
  session: Session | null;
}

export function UserChip({ session }: UserChipProps) {
  if (!session?.user) {
    return null;
  }
  const { name, email, role } = session.user;
  const display = name?.trim() || email?.trim() || "Usuario";
  const roleClass = roleColorClass(role);

  return (
    <div className="user-chip" aria-label="Sesión activa">
      <div className="user-chip__identity">
        <span className="user-chip__name">{display}</span>
        {email && (
          <span className="user-chip__email mono">{email}</span>
        )}
      </div>
      {role && (
        <span className={`user-chip__role ${roleClass}`}>{role}</span>
      )}
      <form action={logoutAction} className="user-chip__logout-form">
        <button
          type="submit"
          className="user-chip__logout"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          ↪
        </button>
      </form>
    </div>
  );
}

function roleColorClass(role: string | null | undefined): string {
  switch (role) {
    case "admin":
      return "user-chip__role--admin";
    case "piloto":
      return "user-chip__role--pilot";
    case "operario":
      return "user-chip__role--operario";
    case "viewer":
    default:
      return "user-chip__role--viewer";
  }
}
