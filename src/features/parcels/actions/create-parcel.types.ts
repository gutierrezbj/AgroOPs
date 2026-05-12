export interface CreateParcelState {
  ok: boolean;
  parcel?: { id: string; name: string; sigpacReference: string; areaHectares: string };
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialCreateParcelState: CreateParcelState = { ok: false };
