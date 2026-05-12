export interface SignAlbaranState {
  ok: boolean;
  albaran?: { id: string; code: string };
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialSignAlbaranState: SignAlbaranState = { ok: false };
