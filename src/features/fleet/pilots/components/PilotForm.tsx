"use client";

/**
 * AgroOps — PilotForm
 *
 * Form crear/editar piloto. Misma mecánica que DroneForm:
 * - useActionState con createPilotAction o updatePilotAction.
 * - Field errors inline con aria-invalid + aria-describedby.
 * - Sin styling final (Identity Sprint pending).
 */
import { useActionState } from "react";
import { createPilotAction } from "../actions/create-pilot";
import {
  initialCreatePilotState,
  type CreatePilotState,
} from "../actions/create-pilot.types";
import { updatePilotAction } from "../actions/update-pilot";
import {
  initialUpdatePilotState,
  type UpdatePilotState,
} from "../actions/update-pilot.types";
import {
  aesaLicenseClassValues,
  ropoLevelValues,
} from "../schemas";
import type { Pilot } from "@/db/schema/pilots";

type Mode = "create" | "edit";

interface PilotFormProps {
  mode: Mode;
  pilot?: Pilot;
}

export function PilotForm({ mode, pilot }: PilotFormProps) {
  if (mode === "create") return <CreatePilotFormImpl />;
  if (!pilot) throw new Error("PilotForm en modo edit requiere prop `pilot`");
  return <UpdatePilotFormImpl pilot={pilot} />;
}

function CreatePilotFormImpl() {
  const [state, formAction, pending] = useActionState(
    createPilotAction,
    initialCreatePilotState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <SharedFields state={state} pending={pending} mode="create" />
      <SubmitFeedback state={state} pending={pending} mode="create" />
    </form>
  );
}

function UpdatePilotFormImpl({ pilot }: { pilot: Pilot }) {
  const [state, formAction, pending] = useActionState(
    updatePilotAction,
    initialUpdatePilotState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <input type="hidden" name="id" value={pilot.id} />
      <SharedFields state={state} pending={pending} mode="edit" pilot={pilot} />
      <SubmitFeedback state={state} pending={pending} mode="edit" />
    </form>
  );
}

interface SharedFieldsProps {
  state: CreatePilotState | UpdatePilotState;
  pending: boolean;
  mode: Mode;
  pilot?: Pilot;
}

function SharedFields({ state, pending, mode, pilot }: SharedFieldsProps) {
  const errors = state.fieldErrors ?? {};
  return (
    <fieldset disabled={pending}>
      <legend>
        {mode === "create"
          ? "Nuevo piloto"
          : `Editar ${pilot?.fullName ?? "piloto"}`}
      </legend>

      <FormField
        name="fullName"
        label="Nombre completo"
        required
        defaultValue={pilot?.fullName ?? ""}
        error={errors.fullName}
        placeholder="Nombre y apellidos"
      />
      <FormField
        name="nif"
        label="NIF / NIE"
        required
        defaultValue={pilot?.nif ?? ""}
        error={errors.nif}
        placeholder="12345678A"
      />

      <h3>Licencia AESA</h3>

      <label htmlFor="aesaLicenseClass">
        Clase
        <select
          id="aesaLicenseClass"
          name="aesaLicenseClass"
          defaultValue={pilot?.aesaLicenseClass ?? ""}
          aria-invalid={errors.aesaLicenseClass ? "true" : "false"}
        >
          <option value="">— sin clase —</option>
          {aesaLicenseClassValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      {errors.aesaLicenseClass && (
        <p role="alert" className="drone-form__error">
          {errors.aesaLicenseClass}
        </p>
      )}

      <FormField
        name="aesaLicenseNumber"
        label="Número de licencia AESA"
        defaultValue={pilot?.aesaLicenseNumber ?? ""}
        error={errors.aesaLicenseNumber}
      />
      <FormField
        name="aesaLicenseExpiresAt"
        label="Caducidad licencia AESA"
        type="date"
        defaultValue={pilot?.aesaLicenseExpiresAt ?? ""}
        error={errors.aesaLicenseExpiresAt}
      />

      <h3>ROPO</h3>

      <label htmlFor="ropoQualified" className="drone-form__checkbox">
        <input
          id="ropoQualified"
          type="checkbox"
          name="ropoQualified"
          defaultChecked={pilot?.ropoQualified ?? false}
        />
        ROPO habilitado (Reglamento Oficial Productores y Operadores)
      </label>
      {errors.ropoQualified && (
        <p role="alert" className="drone-form__error">
          {errors.ropoQualified}
        </p>
      )}

      <FormField
        name="ropoNumber"
        label="Número ROPO"
        defaultValue={pilot?.ropoNumber ?? ""}
        error={errors.ropoNumber}
      />

      <label htmlFor="ropoLevel">
        Nivel ROPO
        <select
          id="ropoLevel"
          name="ropoLevel"
          defaultValue={pilot?.ropoLevel ?? ""}
          aria-invalid={errors.ropoLevel ? "true" : "false"}
        >
          <option value="">— sin nivel —</option>
          {ropoLevelValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      {errors.ropoLevel && (
        <p role="alert" className="drone-form__error">
          {errors.ropoLevel}
        </p>
      )}

      <FormField
        name="ropoExpiresAt"
        label="Caducidad ROPO"
        type="date"
        defaultValue={pilot?.ropoExpiresAt ?? ""}
        error={errors.ropoExpiresAt}
      />

      <h3>Seguros y médico</h3>

      <FormField
        name="insurancePolicyNumber"
        label="Nº de póliza de RC"
        defaultValue={pilot?.insurancePolicyNumber ?? ""}
        error={errors.insurancePolicyNumber}
      />
      <FormField
        name="insuranceExpiresAt"
        label="Caducidad RC"
        type="date"
        defaultValue={pilot?.insuranceExpiresAt ?? ""}
        error={errors.insuranceExpiresAt}
      />
      <FormField
        name="medicalCertificateExpiresAt"
        label="Caducidad reconocimiento médico"
        type="date"
        defaultValue={pilot?.medicalCertificateExpiresAt ?? ""}
        error={errors.medicalCertificateExpiresAt}
      />

      <h3>Operación</h3>

      <FormField
        name="flightHours"
        label="Horas de vuelo acumuladas"
        type="number"
        step="0.1"
        min={0}
        defaultValue={pilot?.flightHours ?? "0"}
        error={errors.flightHours}
      />

      <label htmlFor="active" className="drone-form__checkbox">
        <input
          id="active"
          type="checkbox"
          name="active"
          defaultChecked={pilot?.active ?? true}
        />
        Activo (aparece en selección de misiones nuevas)
      </label>

      <label htmlFor="notes">
        Notas
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={pilot?.notes ?? ""}
          aria-invalid={errors.notes ? "true" : "false"}
        />
      </label>
      {errors.notes && (
        <p role="alert" className="drone-form__error">
          {errors.notes}
        </p>
      )}
    </fieldset>
  );
}

interface FormFieldProps {
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  type?: "text" | "number" | "date";
  step?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}

function FormField({
  name,
  label,
  defaultValue = "",
  error,
  required = false,
  type = "text",
  step,
  min,
  max,
  placeholder,
}: FormFieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <>
      <label htmlFor={name}>
        {label}
        {required ? " *" : ""}
        <input
          id={name}
          name={name}
          type={type}
          step={step}
          min={min}
          max={max}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={errorId}
        />
      </label>
      {error && (
        <p id={errorId} role="alert" className="drone-form__error">
          {error}
        </p>
      )}
    </>
  );
}

interface SubmitFeedbackProps {
  state: CreatePilotState | UpdatePilotState;
  pending: boolean;
  mode: Mode;
}

function SubmitFeedback({ state, pending, mode }: SubmitFeedbackProps) {
  return (
    <div className="drone-form__submit">
      <button type="submit" disabled={pending}>
        {pending
          ? mode === "create"
            ? "Creando…"
            : "Guardando…"
          : mode === "create"
            ? "Crear piloto"
            : "Guardar cambios"}
      </button>
      {state.ok && mode === "create" && "pilot" in state && state.pilot && (
        <p role="status" className="drone-form__success">
          Piloto creado: <strong>{state.pilot.fullName}</strong> (
          <code>{state.pilot.nif}</code>)
        </p>
      )}
      {state.ok && mode === "edit" && (
        <p role="status" className="drone-form__success">
          Cambios guardados.
        </p>
      )}
      {!state.ok && state.error && !state.fieldErrors && (
        <p role="alert" className="drone-form__error">
          {state.error}
        </p>
      )}
    </div>
  );
}
