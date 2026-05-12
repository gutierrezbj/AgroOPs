/**
 * AgroOps — audit feature services (HU-23)
 *
 * Lectura del audit log. La escritura sigue siendo responsabilidad de
 * `src/server/audit/index.ts` (`logAudit()`); aquí sólo se hace SELECT
 * con filtros y un join opcional con `users` para mostrar email.
 */
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema/audit-log";
import { users } from "@/db/schema/users";
import type { AuditLogFilters } from "./schemas";

export interface AuditLogEntry {
  id: string;
  createdAt: Date;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function listAuditLog(
  filters: AuditLogFilters,
): Promise<AuditLogEntry[]> {
  const conditions = [];
  if (filters.dateFrom) {
    conditions.push(gte(auditLog.createdAt, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    // Incluir el día completo: dateTo + 1 día sin tocar el filtro raw
    const end = new Date(filters.dateTo);
    end.setUTCHours(23, 59, 59, 999);
    conditions.push(lte(auditLog.createdAt, end));
  }
  if (filters.userId) conditions.push(eq(auditLog.userId, filters.userId));
  if (filters.entityType)
    conditions.push(eq(auditLog.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(auditLog.entityId, filters.entityId));
  if (filters.action) conditions.push(eq(auditLog.action, filters.action));
  if (filters.actionPrefix) {
    conditions.push(sql`${auditLog.action} LIKE ${`${filters.actionPrefix}%`}`);
  }

  const rows = await db
    .select({
      id: auditLog.id,
      createdAt: auditLog.createdAt,
      userId: auditLog.userId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      before: auditLog.before,
      after: auditLog.after,
      metadata: auditLog.metadata,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      userEmail: users.email,
      userName: users.fullName,
      userRole: users.role,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(filters.limit);

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    userId: r.userId,
    userEmail: r.userEmail,
    userName: r.userName,
    userRole: r.userRole,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    before: r.before,
    after: r.after,
    metadata: r.metadata,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
  }));
}

/**
 * Subset de acciones conocidas para el dropdown del filtro. Es informativo —
 * el operador puede teclear cualquier acción aunque no esté aquí.
 */
export const KNOWN_AUDIT_ACTIONS = [
  // Auth
  "user.login",
  "user.logout",
  // Clients
  "client.created",
  "client.updated",
  "client.holded_linked",
  "client.holded_created",
  // Fleet
  "drone.created",
  "drone.updated",
  "drone.archived",
  "pilot.created",
  "pilot.updated",
  // Parcels
  "parcel.created",
  "parcel.updated",
  // Phytosanitary
  "phyto_product.created",
  "phyto_product.updated",
  // Missions
  "mission.created",
  "mission.updated",
  "mission.parcels_set",
  "mission.transitioned",
  "mission.completed",
  "mission.invoice_dispatched",
  "mission.invoice_status_synced",
  // Albarans
  "albaran.signed",
  "albaran.pdf_generated",
] as const;

export const KNOWN_ENTITY_TYPES = [
  "user",
  "client",
  "drone",
  "pilot",
  "parcel",
  "phyto_product",
  "mission",
  "albaran",
  "invoice",
] as const;

/**
 * Formatea un audit action para UI ("mission.invoice_dispatched" → "Factura disparada").
 * Si el action no está mapeado, devuelve el texto original.
 */
export function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    "user.login": "Inicio de sesión",
    "user.logout": "Cierre de sesión",
    "client.created": "Cliente creado",
    "client.updated": "Cliente actualizado",
    "client.holded_linked": "Cliente enlazado con Holded",
    "client.holded_created": "Cliente creado en Holded",
    "drone.created": "Dron creado",
    "drone.updated": "Dron actualizado",
    "drone.archived": "Dron archivado",
    "pilot.created": "Piloto creado",
    "pilot.updated": "Piloto actualizado",
    "parcel.created": "Parcela creada",
    "parcel.updated": "Parcela actualizada",
    "phyto_product.created": "Producto fito creado",
    "phyto_product.updated": "Producto fito actualizado",
    "mission.created": "Misión creada",
    "mission.updated": "Misión actualizada",
    "mission.parcels_set": "Parcelas asignadas",
    "mission.transitioned": "Transición de estado",
    "mission.completed": "Misión completada",
    "mission.invoice_dispatched": "Factura disparada",
    "mission.invoice_status_synced": "Estado factura sincronizado",
    "albaran.signed": "Albarán firmado",
    "albaran.pdf_generated": "PDF albarán generado",
  };
  return map[action] ?? action;
}
