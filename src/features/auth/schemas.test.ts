/**
 * AgroOps — auth schemas tests
 *
 * Cobertura del Zod `loginSchema`. Tests puros, sin DB ni Next runtime.
 */
import { describe, expect, it } from "vitest";
import { loginSchema } from "./schemas";

describe("loginSchema", () => {
  it("acepta credenciales válidas", () => {
    const result = loginSchema.safeParse({
      email: "juancho@systemrapid.io",
      password: "agroops-dev-2026",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("juancho@systemrapid.io");
      expect(result.data.password).toBe("agroops-dev-2026");
    }
  });

  it("normaliza email a lowercase y trimea", () => {
    const result = loginSchema.safeParse({
      email: "  JuanCho@SystemRapid.IO  ",
      password: "agroops-dev-2026",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("juancho@systemrapid.io");
    }
  });

  it("rechaza email vacío", () => {
    const result = loginSchema.safeParse({ email: "", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "email");
      expect(issue?.message).toMatch(/requerido|email/i);
    }
  });

  it("rechaza email malformado", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "agroops-dev-2026",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "email");
      expect(issue?.message).toMatch(/email inválido/i);
    }
  });

  it("rechaza password vacío", () => {
    const result = loginSchema.safeParse({
      email: "juancho@systemrapid.io",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "password");
      expect(issue?.message).toMatch(/requerida/i);
    }
  });

  it("rechaza password > 256 caracteres (DoS bcrypt)", () => {
    const result = loginSchema.safeParse({
      email: "juancho@systemrapid.io",
      password: "x".repeat(257),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "password");
      expect(issue?.message).toMatch(/demasiado larga/i);
    }
  });

  it("rechaza inputs ausentes", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("email");
      expect(fields).toContain("password");
    }
  });
});
