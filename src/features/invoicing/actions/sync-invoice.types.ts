/**
 * AgroOps — syncInvoiceStatusAction state types (split de "use server")
 */
import type { InvoiceStatus } from "@/db/schema/invoices-ref";

export interface SyncInvoiceState {
  ok: boolean;
  /** Status devuelto por Holded tras la sync. */
  newStatus?: InvoiceStatus;
  /** Status previo en `invoices_ref` (para feedback). */
  previousStatus?: InvoiceStatus;
  /** True si el sync resultó en un cambio persistido. */
  changed?: boolean;
  paidAt?: string | null;
  amountEur?: number | null;
  error?: string;
  reason?:
    | "mission-not-found"
    | "not-configured"
    | "unauthorized"
    | "rate-limited"
    | "server-error"
    | "network"
    | "bad-response"
    | "forbidden"
    | "internal";
}

export const initialSyncInvoiceState: SyncInvoiceState = { ok: false };
