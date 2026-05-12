/**
 * AgroOps — mission_parcels
 *
 * Junction many-to-many: una misión puede cubrir varias parcelas, y una parcela
 * acumula muchas misiones a lo largo del tiempo. Se guarda el área concreta tratada
 * en cada combinación misión × parcela (puede diferir del area total de la parcela).
 */
import {
  decimal,
  pgTable,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { missions } from "./missions";
import { parcels } from "./parcels";

export const missionParcels = pgTable(
  "mission_parcels",
  {
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    parcelId: uuid("parcel_id")
      .notNull()
      .references(() => parcels.id, { onDelete: "restrict" }),
    areaTreatedHa: decimal("area_treated_ha", { precision: 10, scale: 4 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.missionId, table.parcelId] }),
  })
);

export type MissionParcel = typeof missionParcels.$inferSelect;
export type NewMissionParcel = typeof missionParcels.$inferInsert;
