"use client";

/**
 * AgroOps — DroneForm
 *
 * Formulario funcional para crear/editar un dron. Usa `useActionState`
 * conectando con `createDroneAction` o `updateDroneAction` según uso.
 *
 * Sin styling final (Identity Sprint pendiente). Sólo cumple HU-04:
 * - Inputs por cada campo del schema.
 * - aria-invalid + aria-describedby para accesibilidad.
 * - Field errors devueltos por la action se renderizan inline.
 *
 * Reuso: el mismo componente sirve para `new` (pasa `mode="create"`) y para
 * `edit` (pasa `mode="edit"` + `drone` existente como `defaultValues`).
 */
import { useActionState } from "react";
import {
  createDroneAction,
  initialCreateDroneState,
  type CreateDroneState,
} from "../actions/create-drone";
import {
  updateDroneAction,
  initialUpdateDroneState,
  type UpdateDroneState,
} from "../actions/update-drone";
import {
  droneEasaClassValues,
  droneStatusValues,
} from "../schemas";
import type { Drone } from "@/db/schema/drones";

type Mode = "create" | "edit";

interface DroneFormProps {
  mode: Mode;
  drone?: Drone;
}

const EASA_LABELS: Record<string, string> = {
  c0: "C0",
  c1: "C1",
  c2: "C2",
  c3: "C3",
  c4: "C4",
  c5: "C5 — aplicador STS-01",
  c6: "C6 — aplicador STS-02 (T50)",
  n_a: "n/a — no UAS",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  maintenance: "Mantenimiento",
  retired: "Retirado",
};

export function DroneForm({ mode, drone }: DroneFormProps) {
  if (mode === "create") {
    return <CreateDroneFormImpl />;
  }
  if (!drone) {
    throw new Error("DroneForm en modo edit requiere prop `drone`");
  }
  return <UpdateDroneFormImpl drone={drone} />;
}

function CreateDroneFormImpl() {
  const [state, formAction, pending] = useActionState(
    createDroneAction,
    initialCreateDroneState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <SharedFields state={state} pending={pending} mode="create" />
      <SubmitFeedback state={state} pending={pending} mode="create" />
    </form>
  );
}

function UpdateDroneFormImpl({ drone }: { drone: Drone }) {
  const [state, formAction, pending] = useActionState(
    updateDroneAction,
    initialUpdateDroneState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <input type="hidden" name="id" value={drone.id} />
      <SharedFields state={state} pending={pending} mode="edit" drone={drone} />
      <SubmitFeedback state={state} pending={pending} mode="edit" />
    </form>
  );
}

interface SharedFieldsProps {
  state: CreateDroneState | UpdateDroneState;
  pending: boolean;
  mode: Mode;
  drone?: Drone;
}

function SharedFields({ state, pending, mode, drone }: SharedFieldsProps) {
  const errors = state.fieldErrors ?? {};
  return (
    <fieldset disabled={pending}>
      <legend>{mode === "create" ? "Nuevo dron" : `Editar ${drone?.model ?? "dron"}`}</legend>

      <FormField
        name="model"
        label="Modelo"
        required
        defaultValue={drone?.model ?? ""}
        error={errors.model}
        placeholder="T50, Mavic 3 Enterprise, ..."
      />
      <FormField
        name="manufacturer"
        label="Fabricante"
        defaultValue={drone?.manufacturer ?? "DJI"}
        error={errors.manufacturer}
      />
      <FormField
        name="serialNumber"
        label="Número de serie"
        required
        defaultValue={drone?.serialNumber ?? ""}
        error={errors.serialNumber}
        placeholder="DJI-T50-001..."
      />
      <FormField
        name="registrationCode"
        label="Código de registro AESA (opcional)"
        defaultValue={drone?.registrationCode ?? ""}
        error={errors.registrationCode}
      />
      <FormField
        name="mtomGrams"
        label="MTOM (gramos)"
        required
        type="number"
        min={1}
        max={200000}
        defaultValue={drone?.mtomGrams?.toString() ?? ""}
        error={errors.mtomGrams}
      />

      <label htmlFor="easaClass">
        Clase EASA
        <select
          id="easaClass"
          name="easaClass"
          required
          defaultValue={drone?.easaClass ?? ""}
          aria-invalid={errors.easaClass ? "true" : "false"}
          aria-describedby={errors.easaClass ? "easaClass-error" : undefined}
        >
          <option value="" disabled>
            Selecciona clase
          </option>
          {droneEasaClassValues.map((v) => (
            <option key={v} value={v}>
              {EASA_LABELS[v]}
            </option>
          ))}
        </select>
      </label>
      {errors.easaClass && (
        <p id="easaClass-error" role="alert" className="drone-form__error">
          {errors.easaClass}
        </p>
      )}

      <label htmlFor="applicationCapable" className="drone-form__checkbox">
        <input
          id="applicationCapable"
          type="checkbox"
          name="applicationCapable"
          defaultChecked={drone?.applicationCapable ?? false}
        />
        Aplicador (puede aplicar fitosanitario aéreo)
      </label>
      {errors.applicationCapable && (
        <p role="alert" className="drone-form__error">
          {errors.applicationCapable}
        </p>
      )}

      <FormField
        name="payloadLitres"
        label="Capacidad de tanque (litros) — sólo aplicadores"
        type="number"
        step="0.1"
        min={0}
        defaultValue={drone?.payloadLitres ?? ""}
        error={errors.payloadLitres}
      />
      <FormField
        name="insurancePolicyNumber"
        label="Nº de póliza (opcional)"
        defaultValue={drone?.insurancePolicyNumber ?? ""}
        error={errors.insurancePolicyNumber}
      />
      <FormField
        name="insuranceExpiresAt"
        label="Caducidad de seguro"
        type="date"
        defaultValue={drone?.insuranceExpiresAt ?? ""}
        error={errors.insuranceExpiresAt}
      />
      <FormField
        name="flightHours"
        label="Horas de vuelo acumuladas"
        type="number"
        step="0.1"
        min={0}
        defaultValue={drone?.flightHours ?? "0"}
        error={errors.flightHours}
      />

      <label htmlFor="status">
        Estado
        <select
          id="status"
          name="status"
          required
          defaultValue={drone?.status ?? "active"}
        >
          {droneStatusValues.map((v) => (
            <option key={v} value={v}>
              {STATUS_LABELS[v]}
            </option>
          ))}
        </select>
      </label>
      {errors.status && (
        <p role="alert" className="drone-form__error">
          {errors.status}
        </p>
      )}

      <label htmlFor="notes">
        Notas
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={drone?.notes ?? ""}
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
  state: CreateDroneState | UpdateDroneState;
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
            ? "Crear dron"
            : "Guardar cambios"}
      </button>
      {state.ok && mode === "create" && "drone" in state && state.drone && (
        <p role="status" className="drone-form__success">
          Dron creado: <code>{state.drone.serialNumber}</code>
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
