"use client";

/**
 * AgroOps — GeneratePdfButton (HU-16)
 *
 * Botón aislado: genera (o regenera) el PDF del albarán y revalida la
 * página. Si la firma cambia, el albarán perdió `pdfPath` automáticamente
 * y el operador debe regenerar.
 */
import { useActionState } from "react";
import { generateAlbaranPdfAction } from "../actions/generate-pdf";
import { initialGeneratePdfState } from "../actions/generate-pdf.types";

interface GeneratePdfButtonProps {
  albaranId: string;
  hasPdf: boolean;
}

export function GeneratePdfButton({ albaranId, hasPdf }: GeneratePdfButtonProps) {
  const [state, formAction, pending] = useActionState(
    generateAlbaranPdfAction,
    initialGeneratePdfState,
  );

  return (
    <form action={formAction} style={{ display: "inline" }}>
      <input type="hidden" name="albaranId" value={albaranId} />
      <button type="submit" disabled={pending}>
        {pending
          ? "Generando…"
          : hasPdf
            ? "Regenerar PDF"
            : "Generar PDF"}
      </button>
      {state.ok && (
        <small style={{ marginLeft: "0.6rem", color: "#166534" }}>
          ✓ PDF generado (SHA-256: {state.pdfHash?.substring(0, 12)}…)
        </small>
      )}
      {!state.ok && state.error && (
        <small style={{ marginLeft: "0.6rem", color: "#b91c1c" }}>
          {state.error}
        </small>
      )}
    </form>
  );
}
