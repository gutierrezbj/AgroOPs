/**
 * AgroOps — syncClientToHolded action types (split de "use server")
 *
 * Estado del form action que dispara la sincronización Holded de un cliente.
 * Captura el resultado positivo (con contactId + flag created) y los errores
 * tipados de HoldedError (not-configured / unauthorized / etc.).
 */
export interface SyncHoldedState {
  ok: boolean;
  contactId?: string;
  created?: boolean;
  cached?: boolean;
  error?: string;
  /**
   * Subset de HoldedError.kind para que la UI muestre acciones específicas
   * (p.ej. "configurar .env" si not-configured, "revisar API key" si
   * unauthorized).
   */
  reason?:
    | "not-configured"
    | "unauthorized"
    | "rate-limited"
    | "server-error"
    | "network"
    | "bad-response"
    | "forbidden"
    | "internal";
}

export const initialSyncHoldedState: SyncHoldedState = { ok: false };
