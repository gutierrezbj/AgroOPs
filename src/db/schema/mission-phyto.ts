/**
 * AgroOps — mission_phyto
 *
 * Uso real de producto fitosanitario en cada misión. Una misión puede aplicar
 * varios productos (mezcla en tanque o aplicaciones sucesivas).
 *
 * Guarda lote y dosis efectivamente aplicada (puede diferir de la dosis
 * recomendada del catálogo si John ajusta en campo).
 */
import { decimal, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { missions } from "./missions";
import { phytosanitaryProducts, doseUnitEnum } from "./phytosanitary";

export const missionPhyto = pgTable("mission_phyto", {
  id: uuid("id").primaryKey().defaultRandom(),
  missionId: uuid("mission_id")
    .notNull()
    .references(() => missions.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => phytosanitaryProducts.id, { onDelete: "restrict" }),
  // Lote efectivamente usado (snapshot por si el catálogo cambia después)
  lotUsed: text("lot_used").notNull(),
  // Dosis aplicada (puede diferir de la recomendada del catálogo)
  appliedDoseValue: decimal("applied_dose_value", { precision: 8, scale: 3 }).notNull(),
  appliedDoseUnit: doseUnitEnum("applied_dose_unit").notNull(),
  // Volumen total usado en la operación (L o kg)
  totalAmountUsed: decimal("total_amount_used", { precision: 10, scale: 3 }),
  totalAmountUnit: text("total_amount_unit"), // "L", "kg", "ml", "g"
  // Área cubierta por esta aplicación específica
  areaCoveredHa: decimal("area_covered_ha", { precision: 10, scale: 4 }),
  notes: text("notes"),
  ...timestamps,
});

export type MissionPhyto = typeof missionPhyto.$inferSelect;
export type NewMissionPhyto = typeof missionPhyto.$inferInsert;
