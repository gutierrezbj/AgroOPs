"use client";

import { useActionState } from "react";
import { archivePhytoProductAction } from "../actions/archive-phyto-product";
import { initialArchivePhytoProductState } from "../actions/archive-phyto-product.types";

export function ArchivePhytoProductButton({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(
    archivePhytoProductAction,
    initialArchivePhytoProductState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "¿Archivar este lote? Quedará marcado como inactivo y fuera de las misiones nuevas.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={productId} />
      <button type="submit" disabled={pending} className="btn-danger">
        {pending ? "Archivando…" : "Archivar lote"}
      </button>
      {state.ok && <p role="status">Lote archivado.</p>}
      {!state.ok && state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
