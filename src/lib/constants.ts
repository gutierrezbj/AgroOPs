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
 * Cultivos estándar para el desplegable de `parcels.crop`. La lista cubre
 * los cultivos más comunes del territorio español agrícola — alineada con
 * lo que AgroM ve en campo (olivar Andalucía, almendro Albacete/Murcia,
 * cítricos Valencia/Murcia, viña La Mancha/Rioja, cereal Castilla).
 *
 * El backend NO restringe `crop` a esta lista (sigue siendo `text` libre
 * en `parcels.crop`) — esto es UX puramente. Si el operador necesita un
 * cultivo no listado, el `otros` permite seguir avanzando y se puede
 * editar manualmente con SQL si es muy frecuente (en cuyo caso añadirlo
 * aquí). Patrón mismo que `ClientType` enum: prácticos por defecto +
 * escape para casos raros.
 *
 * Las variedades (`cropVariety`) siguen siendo text libre porque hay
 * decenas por cultivo (Picual, Hojiblanca, Marcona, Navelina, Tempranillo,
 * etc.) y no compensa mantener la lista.
 */
export const CROP_OPTIONS = [
  { value: "olivar", label: "Olivar" },
  { value: "almendro", label: "Almendro" },
  { value: "viña", label: "Viña / vid" },
  { value: "cítricos", label: "Cítricos" },
  { value: "cereal", label: "Cereal (trigo, cebada, avena)" },
  { value: "hortícola", label: "Hortícola" },
  { value: "frutales", label: "Frutales (manzana, pera, melocotón)" },
  { value: "girasol", label: "Girasol" },
  { value: "maíz", label: "Maíz" },
  { value: "patata", label: "Patata" },
  { value: "otros", label: "Otros" },
] as const;

export type CropValue = (typeof CROP_OPTIONS)[number]["value"];

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

/**
 * Modo de facturación AgroOps:
 * - `manual` (default v1.0) — AgroM emite facturas en Holded manualmente
 *   fuera del sistema. AgroOps NO dispara API, NO bloquea transición
 *   `completed → invoiced` por falta de holdedContactId. El operador
 *   marca la misión como `invoiced` cuando ha facturado a mano. La
 *   integración HU-18/19/20 queda en código lista para enchufar.
 * - `holded` — Disparo automático activo. Requiere HOLDED_API_KEY +
 *   AGROOPS_PRICE_PER_HA_EUR + clientes sincronizados. Gate estricto.
 *
 * Configurable vía env `AGROOPS_INVOICING_MODE`. Cualquier valor distinto
 * de `holded` (incluido vacío) se interpreta como `manual` — fail-safe.
 */
export type InvoicingMode = "manual" | "holded";

export function getInvoicingMode(): InvoicingMode {
  const raw = (process.env.AGROOPS_INVOICING_MODE ?? "").toLowerCase().trim();
  return raw === "holded" ? "holded" : "manual";
}

export function isHoldedAutoDispatchEnabled(): boolean {
  return getInvoicingMode() === "holded";
}
