/**
 * AgroOps — createPilot action types (split de "use server")
 */
export interface CreatePilotState {
  ok: boolean;
  pilot?: { id: string; fullName: string; nif: string };
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialCreatePilotState: CreatePilotState = { ok: false };
