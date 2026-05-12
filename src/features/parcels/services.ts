/**
 * AgroOps — parcels services (HU-07)
 *
 * Manejo de geometría PostGIS. Las queries que tocan `geometry`:
 * - INSERT: `ST_GeomFromGeoJSON(...)` para convertir GeoJSON → geometry.
 * - SELECT: `ST_AsGeoJSON(geometry)` para exponer GeoJSON a la UI.
 * - Área: `ST_Area(geometry::geography) / 10000` → hectáreas (geography para
 *   cálculo esférico exacto, no proyección plana).
 *
 * Como el customType de Drizzle expone `geometry` como string opaco, usamos
 * `db.execute(sql...)` para SELECT con `ST_AsGeoJSON`.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { Parcel } from "@/db/schema/parcels";
import type {
  CreateParcelInput,
  ListParcelFilters,
  PolygonGeoJSON,
  UpdateParcelInput,
} from "./schemas";

/**
 * Forma del row devuelto por las queries SELECT con ST_AsGeoJSON.
 * `geometry` viene como string (resultado de ST_AsGeoJSON).
 */
export interface ParcelWithGeoJSON
  extends Omit<Parcel, "geometry" | "createdAt" | "updatedAt"> {
  geometry: PolygonGeoJSON;
  createdAt: Date;
  updatedAt: Date;
}

function rowToParcel(row: Record<string, unknown>): ParcelWithGeoJSON {
  const geometryRaw = row.geometry as string;
  const geometry =
    typeof geometryRaw === "string"
      ? (JSON.parse(geometryRaw) as PolygonGeoJSON)
      : (geometryRaw as PolygonGeoJSON);
  return {
    id: row.id as string,
    clientId: row.clientId as string,
    sigpacReference: row.sigpacReference as string,
    name: row.name as string,
    geometry,
    areaHectares: row.areaHectares as string,
    crop: (row.crop as string | null) ?? null,
    cropVariety: (row.cropVariety as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  };
}

export async function listParcels(
  filters: ListParcelFilters = {},
): Promise<ParcelWithGeoJSON[]> {
  const clientFilter = filters.clientId
    ? sql`AND p.client_id = ${filters.clientId}::uuid`
    : sql``;
  const cropFilter = filters.crop ? sql`AND p.crop = ${filters.crop}` : sql``;

  const result = await db.execute<Record<string, unknown>>(sql`
    SELECT
      p.id,
      p.client_id          AS "clientId",
      p.sigpac_reference   AS "sigpacReference",
      p.name,
      ST_AsGeoJSON(p.geometry) AS geometry,
      p.area_hectares      AS "areaHectares",
      p.crop,
      p.crop_variety       AS "cropVariety",
      p.notes,
      p.created_at         AS "createdAt",
      p.updated_at         AS "updatedAt"
    FROM parcels p
    WHERE 1=1 ${clientFilter} ${cropFilter}
    ORDER BY p.name ASC
  `);

  return result.rows.map(rowToParcel);
}

export async function getParcel(
  id: string,
): Promise<ParcelWithGeoJSON | null> {
  const result = await db.execute<Record<string, unknown>>(sql`
    SELECT
      p.id,
      p.client_id          AS "clientId",
      p.sigpac_reference   AS "sigpacReference",
      p.name,
      ST_AsGeoJSON(p.geometry) AS geometry,
      p.area_hectares      AS "areaHectares",
      p.crop,
      p.crop_variety       AS "cropVariety",
      p.notes,
      p.created_at         AS "createdAt",
      p.updated_at         AS "updatedAt"
    FROM parcels p
    WHERE p.id = ${id}::uuid
    LIMIT 1
  `);
  const row = result.rows[0];
  return row ? rowToParcel(row) : null;
}

/**
 * Calcula el área en hectáreas con ST_Area sobre la geometría casteada
 * a geography (cálculo esférico exacto). Retorna número con 4 decimales.
 */
async function calculateAreaFromGeoJSON(
  geojson: PolygonGeoJSON,
): Promise<number> {
  const result = await db.execute<{ area: string }>(sql`
    SELECT ST_Area(
      ST_GeomFromGeoJSON(${JSON.stringify(geojson)})::geography
    ) / 10000.0 AS area
  `);
  const row = result.rows[0];
  if (!row) {
    throw new Error("ST_Area no devolvió fila");
  }
  return parseFloat(row.area);
}

export async function createParcel(
  input: CreateParcelInput,
): Promise<ParcelWithGeoJSON> {
  const geojsonString = JSON.stringify(input.geometry);

  // Si el operador no proporcionó areaHectares, la calculamos con PostGIS.
  const computedArea =
    input.areaHectares != null
      ? input.areaHectares
      : await calculateAreaFromGeoJSON(input.geometry);

  const areaFixed = computedArea.toFixed(4);

  const result = await db.execute<Record<string, unknown>>(sql`
    INSERT INTO parcels (
      client_id, sigpac_reference, name, geometry,
      area_hectares, crop, crop_variety, notes
    ) VALUES (
      ${input.clientId}::uuid,
      ${input.sigpacReference},
      ${input.name},
      ST_GeomFromGeoJSON(${geojsonString}),
      ${areaFixed}::numeric,
      ${input.crop ?? null},
      ${input.cropVariety ?? null},
      ${input.notes ?? null}
    )
    RETURNING
      id,
      client_id        AS "clientId",
      sigpac_reference AS "sigpacReference",
      name,
      ST_AsGeoJSON(geometry) AS geometry,
      area_hectares    AS "areaHectares",
      crop,
      crop_variety     AS "cropVariety",
      notes,
      created_at       AS "createdAt",
      updated_at       AS "updatedAt"
  `);
  const row = result.rows[0];
  if (!row) {
    throw new Error("createParcel: inserción no devolvió fila");
  }
  return rowToParcel(row);
}

export async function updateParcel(
  id: string,
  input: UpdateParcelInput,
): Promise<ParcelWithGeoJSON | null> {
  // Para updates parciales construimos sets dinámicamente. Mantener simple:
  // si geometry está en input, recalcular área si no viene explícita.
  const updates: Array<ReturnType<typeof sql>> = [];

  if (input.clientId !== undefined) {
    updates.push(sql`client_id = ${input.clientId}::uuid`);
  }
  if (input.sigpacReference !== undefined) {
    updates.push(sql`sigpac_reference = ${input.sigpacReference}`);
  }
  if (input.name !== undefined) {
    updates.push(sql`name = ${input.name}`);
  }
  if (input.geometry !== undefined) {
    updates.push(
      sql`geometry = ST_GeomFromGeoJSON(${JSON.stringify(input.geometry)})`,
    );
    // Si no se pasa areaHectares pero sí geometry, recalcular área.
    if (input.areaHectares === undefined) {
      const recomputed = await calculateAreaFromGeoJSON(input.geometry);
      updates.push(sql`area_hectares = ${recomputed.toFixed(4)}::numeric`);
    }
  }
  if (input.areaHectares !== undefined && input.areaHectares !== null) {
    updates.push(sql`area_hectares = ${input.areaHectares.toFixed(4)}::numeric`);
  }
  if (input.crop !== undefined) {
    updates.push(sql`crop = ${input.crop}`);
  }
  if (input.cropVariety !== undefined) {
    updates.push(sql`crop_variety = ${input.cropVariety}`);
  }
  if (input.notes !== undefined) {
    updates.push(sql`notes = ${input.notes}`);
  }

  if (updates.length === 0) {
    return getParcel(id);
  }

  const setClause = sql.join(updates, sql`, `);

  const result = await db.execute<Record<string, unknown>>(sql`
    UPDATE parcels
    SET ${setClause}
    WHERE id = ${id}::uuid
    RETURNING
      id,
      client_id        AS "clientId",
      sigpac_reference AS "sigpacReference",
      name,
      ST_AsGeoJSON(geometry) AS geometry,
      area_hectares    AS "areaHectares",
      crop,
      crop_variety     AS "cropVariety",
      notes,
      created_at       AS "createdAt",
      updated_at       AS "updatedAt"
  `);
  const row = result.rows[0];
  return row ? rowToParcel(row) : null;
}
