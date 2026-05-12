/**
 * AgroOps — albarans
 *
 * Albarán de aplicación generado al cerrar una misión. Documento legal con:
 * - Producto, lote, caducidad, dosis aplicada.
 * - Telemetría del vuelo (geofence + AEMET cruzado).
 * - Firma del agricultor en finca (canvas → PNG → embedded en PDF).
 *
 * Es la evidencia técnica defendible ante PAC, perito o Agroseguro.
 *
 * Relación 1:1 con missions.
 */
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { missions } from "./missions";

export const albarans = pgTable("albarans", {
  id: uuid("id").primaryKey().defaultRandom(),
  missionId: uuid("mission_id")
    .notNull()
    .unique()
    .references(() => missions.id, { onDelete: "restrict" }),
  code: text("code").notNull().unique(), // "ALB-2026-0001"
  // Firma del agricultor en finca
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signerFullName: text("signer_full_name"),
  signerNif: text("signer_nif"),
  signatureImageBase64: text("signature_image_base64"), // PNG base64 directo en columna (firma es pequeña)
  // PDF final firmado y archivado
  pdfPath: text("pdf_path"), // ruta en storage (local o S3-compatible)
  pdfHash: text("pdf_hash"), // SHA-256 del PDF para integridad
  notes: text("notes"),
  ...timestamps,
});

export type Albaran = typeof albarans.$inferSelect;
export type NewAlbaran = typeof albarans.$inferInsert;
