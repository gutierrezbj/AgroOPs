/**
 * AgroOps — pilots
 *
 * Pilotos del deployment con cualificaciones AESA + ROPO (aplicador fitosanitario).
 *
 * Diferencia con users:
 * - users → cuenta de login con rol RBAC.
 * - pilots → activo legal con licencias, seguros, horas vuelo.
 * - Un piloto puede tener cuenta de usuario (user_id) o no (operador externo invitado).
 */
import {
  boolean,
  date,
  decimal,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { users } from "./users";

export const pilots = pgTable("pilots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  nif: text("nif").notNull().unique(), // documento de identidad
  // Licencia AESA piloto a distancia
  aesaLicenseNumber: text("aesa_license_number"),
  aesaLicenseClass: text("aesa_license_class"), // "A1/A3", "A2", "STS-01", "STS-02", etc.
  aesaLicenseExpiresAt: date("aesa_license_expires_at"),
  // ROPO — Registro Oficial de Productores y Operadores de medios de defensa fitosanitaria
  ropoQualified: boolean("ropo_qualified").notNull().default(false),
  ropoNumber: text("ropo_number"),
  ropoLevel: text("ropo_level"), // "Básico", "Cualificado", "Fumigador", "Piloto aplicador"
  ropoExpiresAt: date("ropo_expires_at"),
  // Seguro de responsabilidad civil del piloto
  insurancePolicyNumber: text("insurance_policy_number"),
  insuranceExpiresAt: date("insurance_expires_at"),
  // Reconocimiento médico (Clase 2 LAPL o equivalente cuando aplique)
  medicalCertificateExpiresAt: date("medical_certificate_expires_at"),
  // Horas vuelo acumuladas (auto-actualizables tras cierre de misión)
  flightHours: decimal("flight_hours", { precision: 8, scale: 2 })
    .notNull()
    .default("0"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  ...timestamps,
});

export type Pilot = typeof pilots.$inferSelect;
export type NewPilot = typeof pilots.$inferInsert;
