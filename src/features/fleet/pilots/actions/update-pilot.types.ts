/**
 * AgroOps — updatePilot action types (split de "use server")
 */
export interface UpdatePilotState {
  ok: boolean;
  pilotId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialUpdatePilotState: UpdatePilotState = { ok: false };
