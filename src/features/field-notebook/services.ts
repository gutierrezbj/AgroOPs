/**
 * AgroOps — field-notebook services (HU-21)
 *
 * Vista derivada del cuaderno de campo PAC. Cruza missions (completadas o
 * facturadas) × mission_parcels × mission_phyto × phytosanitary_products
 * × parcels × clients × pilots × drones × albarans para producir una fila
 * por aplicación-de-producto-en-parcela. Es lo que la PAC exige documentar:
 * fecha, parcela SIGPAC, cultivo, producto fitosanitario (marca + materia
 * activa + lote + registro MAPA), dosis aplicada, área cubierta, operador
 * (piloto + ROPO + AESA), equipo (dron + nº serie + registro), albarán
 * firmado + hash PDF, NPTA.
 *
 * Usamos `db.execute<...>(sql\`...\`)` con raw SQL para tener control
 * absoluto del JOIN (8 tablas) y los alias de columnas que Drizzle no
 * facilita tipados en `select` declarativo.
 *
 * Filosofía: el cuaderno NO incluye misiones en estados pre-completed
 * (draft/planned/approved/preflight/in_flight). El PAC sólo documenta
 * aplicaciones ejecutadas — borradores no.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { FieldNotebookFilters } from "./schemas";

/**
 * Una fila del cuaderno: representa la aplicación de UN producto en UNA
 * parcela durante UNA misión. Si una misión usa 3 productos sobre 2
 * parcelas, genera 6 filas.
 */
export interface FieldNotebookEntry {
  // Identificadores
  missionId: string;
  missionCode: string; // "AGM-2026-0001"
  parcelId: string;
  // Fecha aplicación (ISO string)
  appliedAt: string;
  // Cliente / titular
  clientId: string;
  clientName: string;
  clientTaxId: string;
  // Parcela SIGPAC
  parcelName: string;
  sigpacReference: string;
  crop: string | null;
  cropVariety: string | null;
  areaTreatedHa: number; // suma de areaCovered en mission_phyto o area de mission_parcel
  // Producto fitosanitario
  productCommercialName: string;
  productActiveIngredient: string;
  productMapaRegistration: string | null;
  productFormulation: string | null;
  lotUsed: string;
  // Dosis
  appliedDoseValue: number;
  appliedDoseUnit: string; // "l_per_ha" | "kg_per_ha" | "ml_per_ha" | "g_per_ha"
  totalAmountUsed: number | null;
  totalAmountUnit: string | null;
  // Operador
  pilotName: string | null;
  pilotNif: string | null;
  pilotRopoNumber: string | null;
  pilotAesaLicense: string | null;
  // Equipo
  droneModel: string | null;
  droneSerialNumber: string | null;
  droneRegistrationCode: string | null;
  // Cumplimiento
  nptaReference: string;
  // Albarán (evidencia)
  albaranCode: string | null;
  albaranPdfHash: string | null;
  albaranSignedAt: string | null;
}

/**
 * Resumen agregado para el header del cuaderno.
 */
export interface FieldNotebookSummary {
  entryCount: number; // filas totales
  missionCount: number; // misiones distintas
  parcelCount: number; // parcelas distintas
  totalAreaHa: number; // suma area_treated_ha
  totalProductLitres: number; // suma total_amount_used si unidad ∈ {L, l_per_ha (×ha=L)}
  dateRangeFrom: string | null; // mínima appliedAt
  dateRangeTo: string | null; // máxima appliedAt
}

/**
 * Consulta principal: lista de entradas del cuaderno con todos los joins
 * y filtros. Ordenada por fecha descendente (más recientes primero).
 *
 * Sólo incluye misiones en estado `completed` o `invoiced` (ya ejecutadas
 * con albarán emitido).
 */
export async function listFieldNotebookEntries(
  filters: FieldNotebookFilters = {},
): Promise<FieldNotebookEntry[]> {
  // Construcción dinámica de condiciones — los placeholders se interpolan
  // como parámetros seguros (no string concat).
  const dateFromFilter = filters.dateFrom
    ? sql`AND COALESCE(m.completed_at, m.started_at)::date >= ${filters.dateFrom}::date`
    : sql``;
  const dateToFilter = filters.dateTo
    ? sql`AND COALESCE(m.completed_at, m.started_at)::date <= ${filters.dateTo}::date`
    : sql``;
  const clientFilter = filters.clientId
    ? sql`AND m.client_id = ${filters.clientId}::uuid`
    : sql``;
  const parcelFilter = filters.parcelId
    ? sql`AND mp.parcel_id = ${filters.parcelId}::uuid`
    : sql``;
  const cropFilter = filters.crop
    ? sql`AND p.crop = ${filters.crop}`
    : sql``;

  const result = await db.execute<Record<string, unknown>>(sql`
    SELECT
      m.id                              AS "missionId",
      m.code                            AS "missionCode",
      COALESCE(m.completed_at, m.started_at) AS "appliedAt",
      m.npta_reference                  AS "nptaReference",
      -- Cliente
      c.id                              AS "clientId",
      c.name                            AS "clientName",
      c.tax_id                          AS "clientTaxId",
      -- Parcela
      p.id                              AS "parcelId",
      p.name                            AS "parcelName",
      p.sigpac_reference                AS "sigpacReference",
      p.crop,
      p.crop_variety                    AS "cropVariety",
      COALESCE(
        mph.area_covered_ha,
        mp.area_treated_ha,
        p.area_hectares
      )::numeric                        AS "areaTreatedHa",
      -- Producto
      pp.commercial_name                AS "productCommercialName",
      pp.active_ingredient              AS "productActiveIngredient",
      pp.mapa_registration              AS "productMapaRegistration",
      pp.formulation                    AS "productFormulation",
      mph.lot_used                      AS "lotUsed",
      mph.applied_dose_value::numeric   AS "appliedDoseValue",
      mph.applied_dose_unit::text       AS "appliedDoseUnit",
      mph.total_amount_used::numeric    AS "totalAmountUsed",
      mph.total_amount_unit             AS "totalAmountUnit",
      -- Piloto
      pl.full_name                      AS "pilotName",
      pl.nif                            AS "pilotNif",
      pl.ropo_number                    AS "pilotRopoNumber",
      pl.aesa_license_number            AS "pilotAesaLicense",
      -- Dron
      d.model                           AS "droneModel",
      d.serial_number                   AS "droneSerialNumber",
      d.registration_code               AS "droneRegistrationCode",
      -- Albarán
      a.code                            AS "albaranCode",
      a.pdf_hash                        AS "albaranPdfHash",
      a.signed_at                       AS "albaranSignedAt"
    FROM missions m
    JOIN clients c             ON c.id = m.client_id
    LEFT JOIN pilots pl        ON pl.id = m.pilot_id
    LEFT JOIN drones d         ON d.id = m.drone_id
    JOIN mission_parcels mp    ON mp.mission_id = m.id
    JOIN parcels p             ON p.id = mp.parcel_id
    JOIN mission_phyto mph     ON mph.mission_id = m.id
    JOIN phytosanitary_products pp ON pp.id = mph.product_id
    LEFT JOIN albarans a       ON a.mission_id = m.id
    WHERE m.status IN ('completed', 'invoiced')
      ${dateFromFilter}
      ${dateToFilter}
      ${clientFilter}
      ${parcelFilter}
      ${cropFilter}
    ORDER BY COALESCE(m.completed_at, m.started_at) DESC, c.name ASC, p.name ASC, pp.commercial_name ASC
  `);

  return result.rows.map((row) => ({
    missionId: row.missionId as string,
    missionCode: row.missionCode as string,
    appliedAt:
      row.appliedAt instanceof Date
        ? row.appliedAt.toISOString()
        : String(row.appliedAt),
    parcelId: row.parcelId as string,
    clientId: row.clientId as string,
    clientName: row.clientName as string,
    clientTaxId: row.clientTaxId as string,
    parcelName: row.parcelName as string,
    sigpacReference: row.sigpacReference as string,
    crop: (row.crop as string | null) ?? null,
    cropVariety: (row.cropVariety as string | null) ?? null,
    areaTreatedHa: parseFloat(row.areaTreatedHa as string),
    productCommercialName: row.productCommercialName as string,
    productActiveIngredient: row.productActiveIngredient as string,
    productMapaRegistration: (row.productMapaRegistration as string | null) ?? null,
    productFormulation: (row.productFormulation as string | null) ?? null,
    lotUsed: row.lotUsed as string,
    appliedDoseValue: parseFloat(row.appliedDoseValue as string),
    appliedDoseUnit: row.appliedDoseUnit as string,
    totalAmountUsed:
      row.totalAmountUsed != null ? parseFloat(row.totalAmountUsed as string) : null,
    totalAmountUnit: (row.totalAmountUnit as string | null) ?? null,
    pilotName: (row.pilotName as string | null) ?? null,
    pilotNif: (row.pilotNif as string | null) ?? null,
    pilotRopoNumber: (row.pilotRopoNumber as string | null) ?? null,
    pilotAesaLicense: (row.pilotAesaLicense as string | null) ?? null,
    droneModel: (row.droneModel as string | null) ?? null,
    droneSerialNumber: (row.droneSerialNumber as string | null) ?? null,
    droneRegistrationCode: (row.droneRegistrationCode as string | null) ?? null,
    nptaReference: row.nptaReference as string,
    albaranCode: (row.albaranCode as string | null) ?? null,
    albaranPdfHash: (row.albaranPdfHash as string | null) ?? null,
    albaranSignedAt:
      row.albaranSignedAt instanceof Date
        ? row.albaranSignedAt.toISOString()
        : ((row.albaranSignedAt as string | null) ?? null),
  }));
}

/**
 * Calcula el resumen agregado del cuaderno a partir de las entradas ya
 * cargadas (función pura — fácil de testear).
 */
export function summarizeFieldNotebook(
  entries: FieldNotebookEntry[],
): FieldNotebookSummary {
  if (entries.length === 0) {
    return {
      entryCount: 0,
      missionCount: 0,
      parcelCount: 0,
      totalAreaHa: 0,
      totalProductLitres: 0,
      dateRangeFrom: null,
      dateRangeTo: null,
    };
  }

  const missions = new Set<string>();
  const parcels = new Set<string>();
  let totalAreaHa = 0;
  let totalProductLitres = 0;
  let minDate = entries[0]!.appliedAt;
  let maxDate = entries[0]!.appliedAt;

  for (const e of entries) {
    missions.add(e.missionId);
    parcels.add(e.parcelId);
    totalAreaHa += e.areaTreatedHa;
    // Estimación de litros: si la unidad es l_per_ha o ml_per_ha + area, o si
    // viene totalAmountUsed con unit L. Mantenemos simple en v1.
    if (e.totalAmountUsed != null) {
      if (e.totalAmountUnit === "L" || e.totalAmountUnit === "l") {
        totalProductLitres += e.totalAmountUsed;
      } else if (e.totalAmountUnit === "ml") {
        totalProductLitres += e.totalAmountUsed / 1000;
      }
    } else if (e.appliedDoseUnit === "l_per_ha") {
      totalProductLitres += e.appliedDoseValue * e.areaTreatedHa;
    } else if (e.appliedDoseUnit === "ml_per_ha") {
      totalProductLitres += (e.appliedDoseValue * e.areaTreatedHa) / 1000;
    }
    if (e.appliedAt < minDate) minDate = e.appliedAt;
    if (e.appliedAt > maxDate) maxDate = e.appliedAt;
  }

  return {
    entryCount: entries.length,
    missionCount: missions.size,
    parcelCount: parcels.size,
    totalAreaHa: Math.round(totalAreaHa * 10000) / 10000,
    totalProductLitres: Math.round(totalProductLitres * 1000) / 1000,
    dateRangeFrom: minDate,
    dateRangeTo: maxDate,
  };
}

/**
 * Formatea una dosis legible para el cuaderno PDF / tabla. Convierte el
 * enum DB a la forma humana ("1.500 L/ha", "200 g/ha", etc.).
 */
export function formatDose(value: number, unit: string): string {
  const unitMap: Record<string, string> = {
    l_per_ha: "L/ha",
    kg_per_ha: "kg/ha",
    ml_per_ha: "ml/ha",
    g_per_ha: "g/ha",
  };
  const u = unitMap[unit] ?? unit;
  // Formatear con 3 decimales si <10, 2 si <100, 0-1 si más
  const fmt =
    value < 10 ? value.toFixed(3) : value < 100 ? value.toFixed(2) : value.toFixed(1);
  return `${fmt} ${u}`;
}

/**
 * Formatea un volumen total ("12.500 L", "1.250 g").
 */
export function formatTotalAmount(
  value: number | null,
  unit: string | null,
): string {
  if (value == null || !unit) return "—";
  const fmt =
    value < 10 ? value.toFixed(3) : value < 100 ? value.toFixed(2) : value.toFixed(1);
  return `${fmt} ${unit}`;
}
