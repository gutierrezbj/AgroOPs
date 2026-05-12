export interface CompleteMissionState {
  ok: boolean;
  warnings?: string[];
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialCompleteMissionState: CompleteMissionState = { ok: false };
