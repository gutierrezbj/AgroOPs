/**
 * AgroOps — constantes operativas
 *
 * Valores que no cambian o cambian muy raramente. Centralizados aquí para
 * evitar magic strings repartidos por el código.
 */

/**
 * Operación bajo paraguas Drovinci (NPTA AESA) hasta SORA propia AgroM (ADR-5).
 * Una vez AgroM tenga autorización SORA propia, este valor pasa a ser dinámico
 * (selector de operador en alta de misión).
 */
export const NPTA_DROVINCI = "NPTA-DROVINCI-2026"; // sustituir por número real

/**
 * Prefijo para auto-código de misiones: AGM-YYYY-NNNN
 */
export const MISSION_CODE_PREFIX = "AGM";

/**
 * Prefijo para auto-código de albaranes: ALB-YYYY-NNNN
 */
export const ALBARAN_CODE_PREFIX = "ALB";

/**
 * SRID por defecto para todas las geometrías PostGIS. WGS84.
 */
export const DEFAULT_SRID = 4326;

/**
 * Roles RBAC reconocidos por el sistema (espejo del enum users.role).
 */
export const USER_ROLES = ["admin", "piloto", "operario", "viewer"] as const;
export type AppUserRole = (typeof USER_ROLES)[number];

/**
 * Estados de la state machine de missions. Espejo del enum DB.
 * El orden importa: indica el flujo "happy path" de izquierda a derecha.
 */
export const MISSION_STATUS_FLOW = [
  "draft",
  "planned",
  "approved",
  "preflight",
  "in_flight",
  "completed",
  "invoiced",
] as const;

export const MISSION_STATUS_TERMINAL = ["invoiced", "cancelled"] as const;

/**
 * Precio por hectárea aplicado en €. Configurable vía env var
 * `AGROOPS_PRICE_PER_HA_EUR`. Si no está definida o es 0, la facturación
 * automática se rechaza con error claro (no factura con 0 €).
 *
 * En v1.0 es global. En v1.1 evaluaremos overrides por cliente (tarifa
 * cooperativa vs agricultor individual) sin tocar el shape de la factura.
 */
export function getPricePerHaEur(): number {
  const raw = process.env.AGROOPS_PRICE_PER_HA_EUR;
  if (!raw) return 0;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * IVA aplicado en las facturas Holded. Default 21% (general España).
 * Configurable vía `AGROOPS_INVOICE_VAT_PCT`. Si el cliente está bajo
 * régimen agrario (4% o 10%), el operador puede ajustar en Holded
 * después; la factura llega ya con el porcentaje base.
 */
export function getInvoiceVatPct(): number {
  const raw = process.env.AGROOPS_INVOICE_VAT_PCT;
  if (!raw) return 21;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 21;
}
