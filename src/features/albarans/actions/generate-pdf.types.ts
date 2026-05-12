export interface GeneratePdfState {
  ok: boolean;
  pdfHash?: string;
  error?: string;
}

export const initialGeneratePdfState: GeneratePdfState = { ok: false };
