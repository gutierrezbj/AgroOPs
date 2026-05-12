/**
 * AgroOps — dispatchInvoiceAction state types (split de "use server")
 */
export interface DispatchInvoiceState {
  ok: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  amountEur?: number;
  subtotalEur?: number;
  vatEur?: number;
  error?: string;
  /** Reason discriminado: InvoicingError.kind | HoldedError.kind | "forbidden" | "internal" */
  reason?:
    | "mission-not-found"
    | "mission-not-completed"
    | "albaran-missing"
    | "albaran-not-signed"
    | "client-not-synced"
    | "price-not-configured"
    | "area-missing"
    | "already-invoiced"
    | "not-configured"
    | "unauthorized"
    | "rate-limited"
    | "server-error"
    | "network"
    | "bad-response"
    | "forbidden"
    | "internal";
}

export const initialDispatchInvoiceState: DispatchInvoiceState = { ok: false };
