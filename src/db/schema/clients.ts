/**
 * AgroOps — clients
 *
 * Clientes del operador (a quién le presta servicios AgroM).
 * Tipos: cooperativa, ATRIA, agricultor profesional, comunidad de regantes, otros.
 */
import { pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";

export const clientTypeEnum = pgEnum("client_type", [
  "cooperativa",
  "atria",
  "agricultor",
  "comunidad_regantes",
  "empresa_agraria",
  "otros",
]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  taxId: text("tax_id").notNull().unique(), // CIF / NIF
  type: clientTypeEnum("type").notNull().default("agricultor"),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  billingAddress: text("billing_address"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  country: text("country").notNull().default("ES"),
  // Referencia opcional al ID del contacto/cliente en Holded para reconciliación
  holdedContactId: text("holded_contact_id"),
  notes: text("notes"),
  ...timestamps,
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientType = (typeof clientTypeEnum.enumValues)[number];
