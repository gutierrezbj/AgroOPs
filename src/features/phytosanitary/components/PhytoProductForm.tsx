"use client";

import { useActionState } from "react";
import { createPhytoProductAction } from "../actions/create-phyto-product";
import {
  initialCreatePhytoProductState,
  type CreatePhytoProductState,
} from "../actions/create-phyto-product.types";
import { updatePhytoProductAction } from "../actions/update-phyto-product";
import {
  initialUpdatePhytoProductState,
  type UpdatePhytoProductState,
} from "../actions/update-phyto-product.types";
import {
  doseUnitLabels,
  doseUnitValues,
  formulationSuggestions,
} from "../schemas";
import type { PhytosanitaryProduct } from "@/db/schema/phytosanitary";

type Mode = "create" | "edit";

interface PhytoProductFormProps {
  mode: Mode;
  product?: PhytosanitaryProduct;
}

export function PhytoProductForm({ mode, product }: PhytoProductFormProps) {
  if (mode === "create") return <CreateImpl />;
  if (!product) throw new Error("PhytoProductForm edit requiere `product`");
  return <UpdateImpl product={product} />;
}

function CreateImpl() {
  const [state, formAction, pending] = useActionState(
    createPhytoProductAction,
    initialCreatePhytoProductState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <SharedFields state={state} pending={pending} mode="create" />
      <SubmitFeedback state={state} pending={pending} mode="create" />
    </form>
  );
}

function UpdateImpl({ product }: { product: PhytosanitaryProduct }) {
  const [state, formAction, pending] = useActionState(
    updatePhytoProductAction,
    initialUpdatePhytoProductState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <input type="hidden" name="id" value={product.id} />
      <SharedFields
        state={state}
        pending={pending}
        mode="edit"
        product={product}
      />
      <SubmitFeedback state={state} pending={pending} mode="edit" />
    </form>
  );
}

interface SharedFieldsProps {
  state: CreatePhytoProductState | UpdatePhytoProductState;
  pending: boolean;
  mode: Mode;
  product?: PhytosanitaryProduct;
}

function SharedFields({ state, pending, mode, product }: SharedFieldsProps) {
  const errors = state.fieldErrors ?? {};
  return (
    <fieldset disabled={pending}>
      <legend>
        {mode === "create"
          ? "Nuevo lote fitosanitario"
          : `Editar lote ${product?.lotNumber ?? ""}`}
      </legend>

      <h3>Identidad del producto</h3>

      <Field
        name="commercialName"
        label="Nombre comercial"
        required
        defaultValue={product?.commercialName ?? ""}
        error={errors.commercialName}
        placeholder="Karate Zeon, Vertimec EC, ..."
      />
      <Field
        name="activeIngredient"
        label="Materia activa"
        required
        defaultValue={product?.activeIngredient ?? ""}
        error={errors.activeIngredient}
        placeholder="Lambda-cihalotrina 10% ..."
      />
      <Field
        name="mapaRegistration"
        label="Nº registro MAPA"
        defaultValue={product?.mapaRegistration ?? ""}
        error={errors.mapaRegistration}
        placeholder="22.345"
      />
      <Field
        name="formulation"
        label={`Formulación (${formulationSuggestions.join(", ")})`}
        defaultValue={product?.formulation ?? ""}
        error={errors.formulation}
        placeholder="SC, EC, WG..."
        list="formulation-suggestions"
      />
      <datalist id="formulation-suggestions">
        {formulationSuggestions.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      <h3>Lote físico</h3>

      <Field
        name="lotNumber"
        label="Número de lote"
        required
        defaultValue={product?.lotNumber ?? ""}
        error={errors.lotNumber}
        placeholder="L-2026-001"
      />
      <Field
        name="expiresAt"
        label="Fecha de caducidad"
        required
        type="date"
        defaultValue={product?.expiresAt ?? ""}
        error={errors.expiresAt}
      />

      <h3>Dosis recomendada</h3>

      <Field
        name="recommendedDoseValue"
        label="Valor"
        type="number"
        step="0.001"
        min={0}
        defaultValue={product?.recommendedDoseValue ?? ""}
        error={errors.recommendedDoseValue}
      />

      <label htmlFor="recommendedDoseUnit">
        Unidad
        <select
          id="recommendedDoseUnit"
          name="recommendedDoseUnit"
          defaultValue={product?.recommendedDoseUnit ?? ""}
          aria-invalid={errors.recommendedDoseUnit ? "true" : "false"}
        >
          <option value="">— sin unidad —</option>
          {doseUnitValues.map((v) => (
            <option key={v} value={v}>
              {doseUnitLabels[v]}
            </option>
          ))}
        </select>
      </label>
      {errors.recommendedDoseUnit && (
        <p role="alert" className="drone-form__error">
          {errors.recommendedDoseUnit}
        </p>
      )}

      <Field
        name="safetyPeriodDays"
        label="Plazo de seguridad (días pre-cosecha)"
        type="number"
        step="0.1"
        min={0}
        defaultValue={product?.safetyPeriodDays ?? ""}
        error={errors.safetyPeriodDays}
      />

      <h3>Estado</h3>

      <label htmlFor="active" className="drone-form__checkbox">
        <input
          id="active"
          type="checkbox"
          name="active"
          defaultChecked={product?.active ?? true}
        />
        Lote disponible para uso
      </label>

      <label htmlFor="notes">
        Notas
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={product?.notes ?? ""}
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

interface FieldProps {
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  type?: "text" | "number" | "date";
  step?: string;
  min?: number;
  placeholder?: string;
  list?: string;
}

function Field({
  name,
  label,
  defaultValue = "",
  error,
  required = false,
  type = "text",
  step,
  min,
  placeholder,
  list,
}: FieldProps) {
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
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          list={list}
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
  state: CreatePhytoProductState | UpdatePhytoProductState;
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
            ? "Crear lote"
            : "Guardar cambios"}
      </button>
      {state.ok && mode === "create" && "product" in state && state.product && (
        <p role="status" className="drone-form__success">
          Lote creado: <strong>{state.product.commercialName}</strong> (
          <code>{state.product.lotNumber}</code>)
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
