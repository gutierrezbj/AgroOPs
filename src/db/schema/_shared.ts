/**
 * AgroOps — Helpers compartidos del schema
 *
 * - timestamps(): created_at + updated_at con timezone, default now.
 * - geometry<T>(): customType PostGIS para columnas geográficas.
 *
 * Single-tenant per deployment (ver ADR-2). Sin tenant_id en ninguna tabla.
 */
import { customType, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Bloque estándar de timestamps. Usar en todas las tablas:
 *
 * ```ts
 * export const users = pgTable("users", {
 *   id: uuid("id").primaryKey().defaultRandom(),
 *   // ...
 *   ...timestamps,
 * });
 * ```
 */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
};

/**
 * PostGIS geometry columna. Por defecto Polygon SRID 4326 (WGS84, lat/lng global).
 *
 * Uso:
 * ```ts
 * geometry: geometryColumn("geometry", "Polygon", 4326)
 * ```
 *
 * Almacena como WKT (well-known text) o WKB binario. La app puede leer/escribir
 * GeoJSON pasando por ST_AsGeoJSON / ST_GeomFromGeoJSON en queries.
 */
export const geometryColumn = (
  name: string,
  geomType: "Point" | "Polygon" | "MultiPolygon" | "LineString" = "Polygon",
  srid: number = 4326
) =>
  customType<{ data: string; driverData: string }>({
    dataType() {
      return `geometry(${geomType}, ${srid})`;
    },
  })(name);
