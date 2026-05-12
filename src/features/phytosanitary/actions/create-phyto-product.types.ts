export interface CreatePhytoProductState {
  ok: boolean;
  product?: { id: string; commercialName: string; lotNumber: string };
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialCreatePhytoProductState: CreatePhytoProductState = { ok: false };
