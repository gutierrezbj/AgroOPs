export interface UpdateMissionState {
  ok: boolean;
  missionId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialUpdateMissionState: UpdateMissionState = { ok: false };
