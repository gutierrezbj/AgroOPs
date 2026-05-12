"use client";

/**
 * AgroOps — AlbaranSignForm (HU-15)
 *
 * Form de firma del agricultor: nombre completo, NIF, pad de firma.
 * Tras el submit, el operador puede volver a la misión y generar el PDF.
 */
import { useActionState } from "react";
import { signAlbaranAction } from "../actions/sign-albaran";
import { initialSignAlbaranState } from "../actions/sign-albaran.types";
import { SignaturePad } from "./SignaturePad";

interface AlbaranSignFormProps {
  missionId: string;
  missionCode: string;
  existingSigner?: {
    fullName: string | null;
    nif: string | null;
  };
}

export function AlbaranSignForm({
  missionId,
  missionCode,
  existingSigner,
}: AlbaranSignFormProps) {
  const [state, formAction, pending] = useActionState(
    signAlbaranAction,
    initialSignAlbaranState,
  );

  return (
    <form action={formAction} className="drone-form">
      <input type="hidden" name="missionId" value={missionId} />
      <fieldset disabled={pending}>
        <legend>Firma del agricultor — misión {missionCode}</legend>

        <label htmlFor="signerFullName">
          Nombre completo del firmante *
          <input
            id="signerFullName"
            name="signerFullName"
            required
            defaultValue={existingSigner?.fullName ?? ""}
            aria-invalid={state.fieldErrors?.signerFullName ? "true" : "false"}
            placeholder="Nombre y apellidos del agricultor"
          />
        </label>
        {state.fieldErrors?.signerFullName && (
          <p role="alert" className="drone-form__error">
            {state.fieldErrors.signerFullName}
          </p>
        )}

        <label htmlFor="signerNif">
          NIF del firmante *
          <input
            id="signerNif"
            name="signerNif"
            required
            defaultValue={existingSigner?.nif ?? ""}
            aria-invalid={state.fieldErrors?.signerNif ? "true" : "false"}
            placeholder="12345678A"
          />
        </label>
        {state.fieldErrors?.signerNif && (
          <p role="alert" className="drone-form__error">
            {state.fieldErrors.signerNif}
          </p>
        )}

        <fieldset style={{ marginTop: "0.5rem" }}>
          <legend>Firma *</legend>
          <SignaturePad />
          {state.fieldErrors?.signatureImageBase64 && (
            <p role="alert" className="drone-form__error">
              {state.fieldErrors.signatureImageBase64}
            </p>
          )}
          <small>
            Dibuja la firma en el pad de arriba con el dedo (tablet) o ratón.
            Pulsa &quot;Confirmar firma&quot; antes de guardar.
          </small>
        </fieldset>

        <label htmlFor="notes">
          Notas (opcional)
          <textarea id="notes" name="notes" rows={2} maxLength={2000} />
        </label>

        <div className="drone-form__submit">
          <button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar firma"}
          </button>
          {state.ok && state.albaran && (
            <p role="status" className="drone-form__success">
              Albarán <code>{state.albaran.code}</code> firmado.
            </p>
          )}
          {!state.ok && state.error && !state.fieldErrors && (
            <p role="alert" className="drone-form__error">
              {state.error}
            </p>
          )}
        </div>
      </fieldset>
    </form>
  );
}
