/**
 * AgroOps — archivePilot action types (split de "use server")
 */
export interface ArchivePilotState {
  ok: boolean;
  error?: string;
}

export const initialArchivePilotState: ArchivePilotState = { ok: false };
