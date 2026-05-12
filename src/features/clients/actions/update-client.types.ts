/**
 * AgroOps — updateClient action types (split de "use server")
 */
export interface UpdateClientState {
  ok: boolean;
  clientId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialUpdateClientState: UpdateClientState = { ok: false };
