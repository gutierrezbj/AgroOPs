/**
 * AgroOps — parcels schemas (HU-07)
 *
 * Validación Zod para ABM de parcelas SIGPAC. Geometría se acepta como
 * GeoJSON Polygon (lat/lng WGS84, SRID 4326). Para input rico (dibujo en
 * mapa) se usará MapLibre en HU-14; en v1 el operador pega GeoJSON exportado
 * de SIGPAC / Google Earth / QGIS.
 */
import { z } from "zod";

/**
 * SIGPAC reference: provincia-municipio-agregado-zona-polígono-parcela-recinto.
 * Cada parte numérica de hasta 3-4 dígitos, separadas por guiones.
 * Ej: `28-079-0-0-12-345-1`
 *
 * Lo validamos permisivamente: 7 grupos separados por `-`, sólo dígitos.
 */
const sigpacRegex = /^\d{1,3}(-\d{1,4}){6}$/;

/**
 * Validación GeoJSON Polygon mínimo:
 * - type === "Polygon"
 * - coordinates: array de arrays de pares [lng, lat] (al menos 4 puntos por anillo, primero = último)
 * - lat ∈ [-90, 90], lng ∈ [-180, 180]
 *
 * En v1 sólo aceptamos exterior ring (sin holes interiores) para simplificar el form.
 * Si llega Polygon con holes (>1 ring), avisamos pero permitimos (PostGIS lo gestiona).
 */
const coordPairSchema = z.tuple([
  z
    .number()
    .min(-180, "Longitud fuera de rango (-180 a 180)")
    .max(180, "Longitud fuera de rango (-180 a 180)"),
  z
    .number()
    .min(-90, "Latitud fuera de rango (-90 a 90)")
    .max(90, "Latitud fuera de rango (-90 a 90)"),
]);

const ringSchema = z
  .array(coordPairSchema)
  .min(4, "Cada anillo del polígono debe tener al menos 4 puntos (primero = último)");

export const polygonGeoJSONSchema = z.object({
  type: z.literal("Polygon", { message: "GeoJSON debe ser un Polygon" }),
  coordinates: z.array(ringSchema).min(1, "El polígono debe tener al menos un anillo"),
});

export type PolygonGeoJSON = z.infer<typeof polygonGeoJSONSchema>;

/**
 * Acepta string (textarea con JSON pegado) o objeto ya parseado.
 * El parser intenta JSON.parse si recibe string.
 */
const polygonGeoJSONInputSchema = z.union([
  polygonGeoJSONSchema,
  z
    .string()
    .min(1, "Geometría requerida (GeoJSON Polygon)")
    .transform((s, ctx) => {
      try {
        return JSON.parse(s) as unknown;
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Geometría no es JSON válido",
        });
        return z.NEVER;
      }
    })
    .pipe(polygonGeoJSONSchema),
]);

const parcelBaseShape = {
  clientId: z.string().uuid("Cliente requerido (UUID inválido)"),
  sigpacReference: z
    .string()
    .min(1, "Referencia SIGPAC requerida")
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .regex(
          sigpacRegex,
          "Referencia SIGPAC inválida (formato esperado: 28-079-0-0-12-345-1)",
        ),
    ),
  name: z
    .string()
    .min(1, "Nombre requerido")
    .max(200, "Nombre demasiado largo")
    .transform((v) => v.trim()),
  geometry: polygonGeoJSONInputSchema,
  /**
   * Área en hectáreas. Si no se proporciona, el service la calcula con
   * ST_Area sobre la geometría. Validamos el input como número opcional ≥ 0.
   */
  areaHectares: z
    .number({ message: "Área inválida" })
    .nonnegative("Área ≥ 0")
    .max(999999.9999, "Área demasiado grande")
    .optional()
    .nullable(),
  crop: z
    .string()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  cropVariety: z
    .string()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
  notes: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : v.trim() || null)),
} satisfies Record<string, z.ZodTypeAny>;

export const createParcelSchema = z.object(parcelBaseShape);

export const updateParcelSchema = z.object(parcelBaseShape).partial();

export const parcelIdSchema = z.string().uuid("ID de parcela inválido");

export const listParcelFiltersSchema = z
  .object({
    clientId: z.string().uuid().optional(),
    crop: z.string().optional(),
  })
  .partial();

export type CreateParcelInput = z.infer<typeof createParcelSchema>;
export type UpdateParcelInput = z.infer<typeof updateParcelSchema>;
export type ListParcelFilters = z.infer<typeof listParcelFiltersSchema>;
