/**
 * AgroOps — audit_log
 *
 * Trazabilidad de mutaciones críticas (misiones, albaranes, facturas, fito).
 * Append-only desde server/audit/index.ts en cada Server Action que muta estado.
 *
 * Action format: "<entity>.<verb>"
 *   p.ej. "mission.created", "albaran.signed", "invoice.dispatched", "phyto.applied"
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // "mission.created", "albaran.signed", etc.
    entityType: text("entity_type").notNull(), // "mission", "albaran", "invoice"
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    entityIdx: index("audit_log_entity_idx").on(table.entityType, table.entityId),
    actionIdx: index("audit_log_action_idx").on(table.action),
    createdIdx: index("audit_log_created_idx").on(table.createdAt),
  })
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
