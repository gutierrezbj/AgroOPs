/**
 * AgroOps — createClient action types (split de "use server")
 */
export interface CreateClientState {
  ok: boolean;
  client?: { id: string; name: string; taxId: string };
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialCreateClientState: CreateClientState = { ok: false };
