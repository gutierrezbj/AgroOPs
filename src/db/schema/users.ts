/**
 * AgroOps — users
 *
 * Usuarios internos del único deployment operativo (AgroM en este caso).
 * Sin tenant_id (single-tenant, ver ADR-2).
 *
 * RBAC con 4 roles (ver CLAUDE.md):
 * - admin     → JuanCho (todo)
 * - piloto    → John (operaciones, albaranes, firma, vuelos)
 * - operario  → soporte administrativo
 * - viewer    → solo lectura (peritos, asesores externos)
 */
import { pgEnum, pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "piloto",
  "operario",
  "viewer",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("viewer"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
