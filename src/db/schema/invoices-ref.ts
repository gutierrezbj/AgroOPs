/**
 * AgroOps — invoices_ref
 *
 * Referencia a la factura emitida en Holded. AgroOps NO almacena la factura
 * (Holded es la fuente de verdad fiscal, ver ADR-6). Solo guardamos el ID y el
 * estado para reconciliación y para que el operador acceda con un click.
 *
 * Relación 1:1 con missions (una misión → una factura).
 */
import {
  decimal,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { missions } from "./missions";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending", // disparada pero aún sin confirmación
  "issued",  // emitida y aceptada por Holded
  "paid",
  "cancelled",
  "error",   // fallo en disparo a Holded
]);

export const invoicesRef = pgTable("invoices_ref", {
  id: uuid("id").primaryKey().defaultRandom(),
  missionId: uuid("mission_id")
    .notNull()
    .unique()
    .references(() => missions.id, { onDelete: "restrict" }),
  // ID en Holded
  holdedInvoiceId: text("holded_invoice_id").unique(),
  holdedInvoiceNumber: text("holded_invoice_number"),
  holdedInvoiceUrl: text("holded_invoice_url"), // link directo a la factura en Holded
  // Importes (denormalizados desde Holded para listados rápidos)
  amount: decimal("amount", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("EUR"),
  status: invoiceStatusEnum("status").notNull().default("pending"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  // Si hubo error en disparo, guardar mensaje para diagnóstico
  errorMessage: text("error_message"),
  ...timestamps,
});

export type InvoiceRef = typeof invoicesRef.$inferSelect;
export type NewInvoiceRef = typeof invoicesRef.$inferInsert;
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
