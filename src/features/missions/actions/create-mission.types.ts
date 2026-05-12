export interface CreateMissionState {
  ok: boolean;
  mission?: { id: string; code: string };
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialCreateMissionState: CreateMissionState = { ok: false };
