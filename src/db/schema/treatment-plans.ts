/**
 * AgroOps — treatment_plans
 *
 * Planificación por temporada y parcela. Sirve como referencia técnica antes de
 * generar misiones individuales. Un plan puede generar N misiones a lo largo del año.
 *
 * En v1 es un contenedor sencillo (JSON con los tratamientos previstos).
 * Estructura más rica entrará en v1.1 si la operativa lo demanda.
 */
import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { clients } from "./clients";
import { parcels } from "./parcels";

export const treatmentPlans = pgTable(
  "treatment_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    parcelId: uuid("parcel_id").references(() => parcels.id, {
      onDelete: "set null",
    }),
    season: text("season").notNull(), // "2026", "2026-otoño"
    crop: text("crop").notNull(),
    // Array de tratamientos previstos:
    // [{ plannedAt, productCommercial, doseValue, doseUnit, notes }]
    plannedTreatments: jsonb("planned_treatments")
      .$type<
        Array<{
          plannedAt: string; // ISO
          productCommercial: string;
          activeIngredient?: string;
          doseValue?: number;
          doseUnit?: string;
          notes?: string;
        }>
      >()
      .notNull()
      .default([]),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => ({
    clientIdx: index("treatment_plans_client_idx").on(table.clientId),
  })
);

export type TreatmentPlan = typeof treatmentPlans.$inferSelect;
export type NewTreatmentPlan = typeof treatmentPlans.$inferInsert;
