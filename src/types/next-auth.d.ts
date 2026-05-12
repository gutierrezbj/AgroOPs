/**
 * AgroOps — Auth.js v5 type augmentation
 *
 * Extiende `User`, `Session` y `JWT` con campos del dominio AgroOps:
 * - `id` (uuid del usuario en `users` table — ya existe en DefaultUser).
 * - `role` (admin / piloto / operario / viewer) — ver ADR-7.
 *
 * Single-tenant per deployment (ADR-2): sin `tenantId` en la sesión.
 *
 * El archivo debe ser un MÓDULO (tener al menos un `import`/`export`) para
 * que `declare module` actúe como augmentation y no como redefinición.
 */
import type { UserRole } from "@/db/schema/users";

declare module "next-auth" {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: UserRole;
  }
}

export {};
