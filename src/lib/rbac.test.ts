/**
 * AgroOps — rbac helpers tests
 *
 * Cobertura del helper de control de acceso. Sin DB ni Next runtime: tests
 * puros sobre estructuras `Session` mock.
 */
import { describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import {
  ForbiddenError,
  ROLES,
  UnauthorizedError,
  hasRole,
  requireAuth,
  requireRole,
} from "./rbac";
import type { UserRole } from "@/db/schema/users";

function makeSession(role: UserRole, overrides: Partial<Session["user"]> = {}): Session {
  return {
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      email: `${role}@agroops.test`,
      role,
      name: `Test ${role}`,
      ...overrides,
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  };
}

describe("hasRole", () => {
  it("devuelve false si la sesión es null", () => {
    expect(hasRole(null, ROLES.ALL)).toBe(false);
  });

  it("devuelve false si la sesión existe pero no incluye el rol del usuario", () => {
    const session = makeSession("viewer");
    expect(hasRole(session, ROLES.ADMIN_ONLY)).toBe(false);
  });

  it("devuelve true si el rol del usuario está en la allowlist", () => {
    const session = makeSession("admin");
    expect(hasRole(session, ROLES.ADMIN_ONLY)).toBe(true);
  });

  it("acepta cualquier allowlist con el rol incluido", () => {
    const session = makeSession("piloto");
    expect(hasRole(session, ROLES.PILOT_OPERATIONS)).toBe(true);
    expect(hasRole(session, ROLES.FIELD_OPERATIONS)).toBe(true);
    expect(hasRole(session, ROLES.ALL)).toBe(true);
  });
});

describe("requireRole", () => {
  it("lanza UnauthorizedError si la sesión es null", () => {
    expect(() => requireRole(null, ROLES.ALL)).toThrow(UnauthorizedError);
  });

  it("lanza ForbiddenError si el rol no está autorizado", () => {
    const session = makeSession("viewer");
    expect(() => requireRole(session, ROLES.ADMIN_ONLY)).toThrow(ForbiddenError);
  });

  it("no lanza si el rol del usuario está en la allowlist", () => {
    const session = makeSession("operario");
    expect(() => requireRole(session, ROLES.WRITERS)).not.toThrow();
  });

  it("incluye el rol del usuario en el mensaje de ForbiddenError", () => {
    const session = makeSession("viewer");
    try {
      requireRole(session, ROLES.ADMIN_ONLY);
      expect.fail("requireRole debería haber lanzado");
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
      expect((err as Error).message).toContain("viewer");
      expect((err as Error).message).toContain("admin");
    }
  });

  it("acepta los 4 roles seed como válidos en ROLES.ALL", () => {
    for (const role of ["admin", "piloto", "operario", "viewer"] as const) {
      const session = makeSession(role);
      expect(() => requireRole(session, ROLES.ALL)).not.toThrow();
    }
  });
});

describe("requireAuth", () => {
  it("lanza UnauthorizedError si la sesión es null", () => {
    expect(() => requireAuth(null)).toThrow(UnauthorizedError);
  });

  it("no lanza si la sesión existe con cualquier rol", () => {
    for (const role of ["admin", "piloto", "operario", "viewer"] as const) {
      const session = makeSession(role);
      expect(() => requireAuth(session)).not.toThrow();
    }
  });
});

describe("ROLES preset", () => {
  it("ALL incluye los 4 roles seed", () => {
    expect(ROLES.ALL).toEqual(["admin", "piloto", "operario", "viewer"]);
  });

  it("ADMIN_ONLY restringe a admin", () => {
    expect(ROLES.ADMIN_ONLY).toEqual(["admin"]);
  });

  it("WRITERS permite admin y operario, no piloto ni viewer", () => {
    expect(ROLES.WRITERS).toContain("admin");
    expect(ROLES.WRITERS).toContain("operario");
    expect(ROLES.WRITERS).not.toContain("piloto");
    expect(ROLES.WRITERS).not.toContain("viewer");
  });

  it("PILOT_OPERATIONS permite admin y piloto", () => {
    expect(ROLES.PILOT_OPERATIONS).toEqual(["admin", "piloto"]);
  });

  it("FIELD_OPERATIONS permite todo menos viewer", () => {
    expect(ROLES.FIELD_OPERATIONS).toContain("admin");
    expect(ROLES.FIELD_OPERATIONS).toContain("piloto");
    expect(ROLES.FIELD_OPERATIONS).toContain("operario");
    expect(ROLES.FIELD_OPERATIONS).not.toContain("viewer");
  });
});
