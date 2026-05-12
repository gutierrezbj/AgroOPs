export interface UpdatePhytoProductState {
  ok: boolean;
  productId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialUpdatePhytoProductState: UpdatePhytoProductState = {
  ok: false,
};
