/**
 * AgroOps — phytosanitary_products
 *
 * Catálogo manual local del producto fitosanitario que aporta el cliente.
 * AgroOps NO gestiona stock ni transporte (ver ADR-4). Solo registra el uso.
 *
 * Cada fila representa un lote físico identificado disponible para uso (no SKU genérico).
 * Cuando un lote se agota, se da de baja (active=false) y se crea uno nuevo.
 *
 * En v1.1 entra sincronización con Registro de Productos Fitosanitarios MAPA.
 */
import {
  boolean,
  date,
  decimal,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";

export const doseUnitEnum = pgEnum("dose_unit", [
  "l_per_ha",
  "kg_per_ha",
  "ml_per_ha",
  "g_per_ha",
]);

export const phytosanitaryProducts = pgTable("phytosanitary_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Identidad del producto
  commercialName: text("commercial_name").notNull(),
  activeIngredient: text("active_ingredient").notNull(),
  mapaRegistration: text("mapa_registration"), // nº registro MAPA
  formulation: text("formulation"), // SC, EC, WG, WP, OD, etc.
  // Lote físico
  lotNumber: text("lot_number").notNull(),
  expiresAt: date("expires_at").notNull(),
  // Dosis recomendada por el fabricante / técnico
  recommendedDoseValue: decimal("recommended_dose_value", {
    precision: 8,
    scale: 3,
  }),
  recommendedDoseUnit: doseUnitEnum("recommended_dose_unit"),
  // Plazo de seguridad pre-cosecha (días)
  safetyPeriodDays: decimal("safety_period_days", { precision: 5, scale: 1 }),
  // Estado operativo
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  ...timestamps,
});

export type PhytosanitaryProduct = typeof phytosanitaryProducts.$inferSelect;
export type NewPhytosanitaryProduct = typeof phytosanitaryProducts.$inferInsert;
export type DoseUnit = (typeof doseUnitEnum.enumValues)[number];
