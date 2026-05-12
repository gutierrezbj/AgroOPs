export interface SetMissionParcelsState {
  ok: boolean;
  count?: number;
  error?: string;
}

export const initialSetMissionParcelsState: SetMissionParcelsState = {
  ok: false,
};
