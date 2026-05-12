/**
 * AgroOps — drones
 *
 * Flota de aeronaves del deployment. Para AgroM: T50 (aplicador), Mavic 3E (inspección),
 * D-RTK 2 (referencia GPS — no es UAS pero se modela como activo de flota).
 */
import {
  boolean,
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";

export const droneStatusEnum = pgEnum("drone_status", [
  "active",
  "maintenance",
  "retired",
]);

/**
 * Clase EASA según Reglamento 2019/945:
 * - C0/C1/C2/C3/C4 → consumo/profesional ligero
 * - C5/C6 → operaciones STS-01 / STS-02 (categoría específica) — agro aplicador
 * - n_a   → activos no UAS (p.ej. D-RTK 2)
 */
export const easaClassEnum = pgEnum("drone_easa_class", [
  "c0",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "n_a",
]);

export const drones = pgTable("drones", {
  id: uuid("id").primaryKey().defaultRandom(),
  model: text("model").notNull(), // "T50", "Mavic 3E", "D-RTK 2"
  manufacturer: text("manufacturer").notNull().default("DJI"),
  serialNumber: text("serial_number").notNull().unique(),
  registrationCode: text("registration_code"), // código AESA si aplica
  mtomGrams: integer("mtom_grams").notNull(), // peso máximo despegue
  easaClass: easaClassEnum("easa_class").notNull(),
  applicationCapable: boolean("application_capable").notNull().default(false), // true para T50
  payloadLitres: decimal("payload_litres", { precision: 5, scale: 2 }), // capacidad tanque (T50: 40L)
  insurancePolicyNumber: text("insurance_policy_number"),
  insuranceExpiresAt: date("insurance_expires_at"),
  flightHours: decimal("flight_hours", { precision: 8, scale: 2 })
    .notNull()
    .default("0"),
  status: droneStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  ...timestamps,
});

export type Drone = typeof drones.$inferSelect;
export type NewDrone = typeof drones.$inferInsert;
export type DroneStatus = (typeof droneStatusEnum.enumValues)[number];
export type DroneEasaClass = (typeof easaClassEnum.enumValues)[number];
