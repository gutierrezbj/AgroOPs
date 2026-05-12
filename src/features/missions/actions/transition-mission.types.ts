import type { MissionStatus } from "@/db/schema/missions";

export interface TransitionMissionState {
  ok: boolean;
  newStatus?: MissionStatus;
  warnings?: string[];
  error?: string;
}

export const initialTransitionMissionState: TransitionMissionState = {
  ok: false,
};
