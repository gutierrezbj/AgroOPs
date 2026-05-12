/**
 * AgroOps — integración Holded API (facturación)
 *
 * STUB. Implementación real entra en HU-18 / HU-19 / HU-20 (Sprint 3).
 *
 * Holded es la fuente de verdad fiscal (ADR-6). AgroOps dispara facturas y
 * sincroniza el estado de vuelta, pero NO almacena la factura. Se guarda
 * solo el ID y URL en `invoices_ref`.
 *
 * Docs Holded: https://developers.holded.com/
 */
import { z } from "zod";

const HOLDED_API_KEY = process.env.HOLDED_API_KEY;
const HOLDED_BASE_URL =
  process.env.HOLDED_BASE_URL ?? "https://api.holded.com/api/invoicing/v1";

export const holdedInvoicePayloadSchema = z.object({
  contactId: z.string(), // ID del contacto en Holded (cliente)
  contactName: z.string().optional(),
  desc: z.string(), // descripción de la factura
  date: z.number(), // unix timestamp
  items: z
    .array(
      z.object({
        name: z.string(),
        units: z.number(),
        subtotal: z.number(),
        tax: z.number().optional(), // IVA en %
      })
    )
    .min(1),
  notes: z.string().optional(),
});

export type HoldedInvoicePayload = z.infer<typeof holdedInvoicePayloadSchema>;

export type HoldedInvoiceResult = {
  invoiceId: string;
  invoiceNumber?: string;
  url?: string;
  amount?: number;
  currency?: string;
};

/**
 * Crea una factura en Holded. Stub lanza error si falta API key.
 */
export async function createHoldedInvoice(
  _payload: HoldedInvoicePayload
): Promise<HoldedInvoiceResult> {
  if (!HOLDED_API_KEY) {
    throw new Error(
      "[holded] HOLDED_API_KEY no definida. Configurar antes de ejecutar HU-19."
    );
  }
  // TODO HU-19: POST a `${HOLDED_BASE_URL}/documents/invoice` con header `key: ${HOLDED_API_KEY}`
  // Parsear respuesta y devolver HoldedInvoiceResult.
  throw new Error("[holded] STUB. Implementar en HU-19.");
}

/**
 * Sincroniza el estado de una factura desde Holded (pagada / cancelada / etc.).
 */
export async function syncHoldedInvoiceStatus(
  _invoiceId: string
): Promise<{ status: string; paidAt?: Date | null }> {
  if (!HOLDED_API_KEY) {
    throw new Error("[holded] HOLDED_API_KEY no definida.");
  }
  // TODO HU-20
  throw new Error("[holded] STUB. Implementar en HU-20.");
}
