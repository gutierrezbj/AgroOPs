/**
 * AgroOps — parcels
 *
 * Parcelas SIGPAC del cliente. Geometría PostGIS (Polygon SRID 4326).
 *
 * En v1 las parcelas se cargan manualmente (referencia catastral + import polígono).
 * Contrato API con FitoLink para sincronización entra en v1.2 (ver SDD-02).
 */
import {
  decimal,
  index,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps, geometryColumn } from "./_shared";
import { clients } from "./clients";

export const parcels = pgTable(
  "parcels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    // Referencia SIGPAC completa: provincia-municipio-agregado-zona-polígono-parcela-recinto
    sigpacReference: text("sigpac_reference").notNull(),
    name: text("name").notNull(), // alias humano: "La Solana - Recinto 12"
    geometry: geometryColumn("geometry", "Polygon", 4326).notNull(),
    areaHectares: decimal("area_hectares", { precision: 10, scale: 4 }).notNull(),
    crop: text("crop"), // "olivar", "cítricos", "almendro", etc.
    cropVariety: text("crop_variety"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => ({
    // GIST index sobre la geometría: imprescindible para consultas espaciales rápidas
    geometryIdx: index("parcels_geometry_gist_idx").using("gist", table.geometry),
    clientIdx: index("parcels_client_idx").on(table.clientId),
    sigpacIdx: index("parcels_sigpac_idx").on(table.sigpacReference),
  })
);

export type Parcel = typeof parcels.$inferSelect;
export type NewParcel = typeof parcels.$inferInsert;
