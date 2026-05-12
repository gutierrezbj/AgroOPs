"use client";

/**
 * AgroOps — ClientForm (HU-06)
 */
import { useActionState } from "react";
import { createClientAction } from "../actions/create-client";
import {
  initialCreateClientState,
  type CreateClientState,
} from "../actions/create-client.types";
import { updateClientAction } from "../actions/update-client";
import {
  initialUpdateClientState,
  type UpdateClientState,
} from "../actions/update-client.types";
import { clientTypeLabels, clientTypeValues } from "../schemas";
import type { Client } from "@/db/schema/clients";

type Mode = "create" | "edit";

interface ClientFormProps {
  mode: Mode;
  client?: Client;
}

export function ClientForm({ mode, client }: ClientFormProps) {
  if (mode === "create") return <CreateClientFormImpl />;
  if (!client) {
    throw new Error("ClientForm en modo edit requiere prop `client`");
  }
  return <UpdateClientFormImpl client={client} />;
}

function CreateClientFormImpl() {
  const [state, formAction, pending] = useActionState(
    createClientAction,
    initialCreateClientState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <SharedFields state={state} pending={pending} mode="create" />
      <SubmitFeedback state={state} pending={pending} mode="create" />
    </form>
  );
}

function UpdateClientFormImpl({ client }: { client: Client }) {
  const [state, formAction, pending] = useActionState(
    updateClientAction,
    initialUpdateClientState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <input type="hidden" name="id" value={client.id} />
      <SharedFields
        state={state}
        pending={pending}
        mode="edit"
        client={client}
      />
      <SubmitFeedback state={state} pending={pending} mode="edit" />
    </form>
  );
}

interface SharedFieldsProps {
  state: CreateClientState | UpdateClientState;
  pending: boolean;
  mode: Mode;
  client?: Client;
}

function SharedFields({ state, pending, mode, client }: SharedFieldsProps) {
  const errors = state.fieldErrors ?? {};
  return (
    <fieldset disabled={pending}>
      <legend>
        {mode === "create"
          ? "Nuevo cliente"
          : `Editar ${client?.name ?? "cliente"}`}
      </legend>

      <FormField
        name="name"
        label="Nombre / Razón social"
        required
        defaultValue={client?.name ?? ""}
        error={errors.name}
        placeholder="Cooperativa La Vega, Juan García Pérez..."
      />
      <FormField
        name="taxId"
        label="CIF / NIF"
        required
        defaultValue={client?.taxId ?? ""}
        error={errors.taxId}
        placeholder="B12345678 o 12345678A"
      />

      <label htmlFor="type">
        Tipo
        <select
          id="type"
          name="type"
          required
          defaultValue={client?.type ?? "agricultor"}
          aria-invalid={errors.type ? "true" : "false"}
        >
          {clientTypeValues.map((v) => (
            <option key={v} value={v}>
              {clientTypeLabels[v]}
            </option>
          ))}
        </select>
      </label>
      {errors.type && (
        <p role="alert" className="drone-form__error">
          {errors.type}
        </p>
      )}

      <h3>Contacto</h3>

      <FormField
        name="contactPerson"
        label="Persona de contacto"
        defaultValue={client?.contactPerson ?? ""}
        error={errors.contactPerson}
      />
      <FormField
        name="contactEmail"
        label="Email"
        type="email"
        defaultValue={client?.contactEmail ?? ""}
        error={errors.contactEmail}
        placeholder="contacto@cliente.es"
      />
      <FormField
        name="contactPhone"
        label="Teléfono"
        defaultValue={client?.contactPhone ?? ""}
        error={errors.contactPhone}
        placeholder="+34 ..."
      />

      <h3>Dirección de facturación</h3>

      <FormField
        name="billingAddress"
        label="Dirección"
        defaultValue={client?.billingAddress ?? ""}
        error={errors.billingAddress}
        placeholder="Calle, número, piso..."
      />
      <FormField
        name="city"
        label="Ciudad"
        defaultValue={client?.city ?? ""}
        error={errors.city}
      />
      <FormField
        name="province"
        label="Provincia"
        defaultValue={client?.province ?? ""}
        error={errors.province}
      />
      <FormField
        name="postalCode"
        label="Código postal"
        defaultValue={client?.postalCode ?? ""}
        error={errors.postalCode}
        placeholder="28001"
      />
      <FormField
        name="country"
        label="País (ISO 3166-1 alpha-2)"
        defaultValue={client?.country ?? "ES"}
        error={errors.country}
        maxLength={2}
      />

      <h3>Holded</h3>

      <FormField
        name="holdedContactId"
        label="Holded contact ID (opcional, se sincroniza automáticamente con HU-19)"
        defaultValue={client?.holdedContactId ?? ""}
        error={errors.holdedContactId}
      />

      <label htmlFor="notes">
        Notas
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={client?.notes ?? ""}
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
  type?: "text" | "email" | "number" | "date";
  placeholder?: string;
  maxLength?: number;
}

function FormField({
  name,
  label,
  defaultValue = "",
  error,
  required = false,
  type = "text",
  placeholder,
  maxLength,
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
          required={required}
          maxLength={maxLength}
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
  state: CreateClientState | UpdateClientState;
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
            ? "Crear cliente"
            : "Guardar cambios"}
      </button>
      {state.ok && mode === "create" && "client" in state && state.client && (
        <p role="status" className="drone-form__success">
          Cliente creado: <strong>{state.client.name}</strong> (
          <code>{state.client.taxId}</code>)
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
