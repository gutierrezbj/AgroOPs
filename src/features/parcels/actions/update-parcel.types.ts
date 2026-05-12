export interface UpdateParcelState {
  ok: boolean;
  parcelId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialUpdateParcelState: UpdateParcelState = { ok: false };
