"use client";

/**
 * AgroOps — ParcelForm
 *
 * Form de parcela con geometría GeoJSON pegada en textarea. **HU-14 Fase B**:
 * en modo `create` se ofrece un drawer colapsable con MapLibre interactivo
 * (`ParcelDrawMap`) que popula el textarea al cerrar el polígono. El
 * textarea se mantiene para fine-tune manual o pegar GeoJSON externo
 * (SIGPAC / Google Earth / QGIS).
 */
import { useRef, useState, useActionState } from "react";
import { CROP_OPTIONS } from "@/lib/constants";
import { createParcelAction } from "../actions/create-parcel";
import {
  initialCreateParcelState,
  type CreateParcelState,
} from "../actions/create-parcel.types";
import { updateParcelAction } from "../actions/update-parcel";
import {
  initialUpdateParcelState,
  type UpdateParcelState,
} from "../actions/update-parcel.types";
import type { ParcelWithGeoJSON } from "../services";
import type { PolygonGeoJSON } from "../schemas";
import { ParcelDrawMap } from "@/features/map/components/ParcelDrawMap";

interface ClientOption {
  id: string;
  name: string;
  taxId: string;
}

type Mode = "create" | "edit";

interface ParcelFormProps {
  mode: Mode;
  parcel?: ParcelWithGeoJSON;
  clients: ClientOption[];
}

export function ParcelForm({ mode, parcel, clients }: ParcelFormProps) {
  if (mode === "create") return <CreateImpl clients={clients} />;
  if (!parcel) throw new Error("ParcelForm edit requiere `parcel`");
  return <UpdateImpl parcel={parcel} clients={clients} />;
}

function CreateImpl({ clients }: { clients: ClientOption[] }) {
  const [state, formAction, pending] = useActionState(
    createParcelAction,
    initialCreateParcelState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <SharedFields
        state={state}
        pending={pending}
        mode="create"
        clients={clients}
      />
      <SubmitFeedback state={state} pending={pending} mode="create" />
    </form>
  );
}

function UpdateImpl({
  parcel,
  clients,
}: {
  parcel: ParcelWithGeoJSON;
  clients: ClientOption[];
}) {
  const [state, formAction, pending] = useActionState(
    updateParcelAction,
    initialUpdateParcelState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <input type="hidden" name="id" value={parcel.id} />
      <SharedFields
        state={state}
        pending={pending}
        mode="edit"
        parcel={parcel}
        clients={clients}
      />
      <SubmitFeedback state={state} pending={pending} mode="edit" />
    </form>
  );
}

interface SharedFieldsProps {
  state: CreateParcelState | UpdateParcelState;
  pending: boolean;
  mode: Mode;
  parcel?: ParcelWithGeoJSON;
  clients: ClientOption[];
}

function SharedFields({
  state,
  pending,
  mode,
  parcel,
  clients,
}: SharedFieldsProps) {
  const errors = state.fieldErrors ?? {};
  const defaultGeometryJson = parcel
    ? JSON.stringify(parcel.geometry, null, 2)
    : "";

  // HU-14 Fase B — sólo en create. En edit el textarea pre-cargado es la
  // forma estable de fine-tune (v1.1 añadirá drag de vertices).
  const [selectedClientId, setSelectedClientId] = useState<string>(
    parcel?.clientId ?? "",
  );
  const [drawOpen, setDrawOpen] = useState(false);
  const geometryRef = useRef<HTMLTextAreaElement>(null);

  function handlePolygonComplete(geojson: PolygonGeoJSON) {
    if (!geometryRef.current) return;
    geometryRef.current.value = JSON.stringify(geojson, null, 2);
    // Triggear input event para que aria-invalid se reevalúe si hay un
    // listener; React no observa cambios programáticos a defaultValue.
    geometryRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    setDrawOpen(false);
  }

  return (
    <fieldset disabled={pending}>
      <legend>
        {mode === "create"
          ? "Nueva parcela SIGPAC"
          : `Editar parcela ${parcel?.name ?? ""}`}
      </legend>

      <label htmlFor="clientId">
        Cliente *
        <select
          id="clientId"
          name="clientId"
          required
          defaultValue={parcel?.clientId ?? ""}
          aria-invalid={errors.clientId ? "true" : "false"}
          onChange={(e) => setSelectedClientId(e.currentTarget.value)}
        >
          <option value="" disabled>
            Selecciona cliente
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.taxId})
            </option>
          ))}
        </select>
      </label>
      {errors.clientId && (
        <p role="alert" className="drone-form__error">
          {errors.clientId}
        </p>
      )}

      <Field
        name="sigpacReference"
        label="Referencia SIGPAC"
        required
        defaultValue={parcel?.sigpacReference ?? ""}
        error={errors.sigpacReference}
        placeholder="28-079-0-0-12-345-1"
      />
      <Field
        name="name"
        label="Nombre / alias"
        required
        defaultValue={parcel?.name ?? ""}
        error={errors.name}
        placeholder="La Solana — Recinto 12"
      />

      <h3>Geometría</h3>

      {mode === "create" && (
        <div className="parcel-form__draw-toggle">
          <button
            type="button"
            onClick={() => setDrawOpen((v) => !v)}
            className="parcel-form__draw-btn"
            aria-expanded={drawOpen}
            aria-controls="parcel-draw-section"
          >
            {drawOpen
              ? "▼ Cerrar mapa de dibujo"
              : "▶ Dibujar en mapa interactivo"}
          </button>
          <span className="parcel-form__draw-hint">
            O pega el GeoJSON directamente en el textarea de abajo.
          </span>
        </div>
      )}

      {mode === "create" && drawOpen && (
        <section
          id="parcel-draw-section"
          aria-label="Mapa interactivo de dibujo"
          className="parcel-form__draw-canvas"
        >
          <ParcelDrawMap
            onPolygonComplete={handlePolygonComplete}
            clientId={selectedClientId || undefined}
          />
        </section>
      )}

      <label htmlFor="geometry">
        GeoJSON Polygon *{" "}
        <small>
          (pega el polígono exportado de SIGPAC, Google Earth o QGIS — type
          &quot;Polygon&quot;, coordinates lat/lng WGS84)
        </small>
        <textarea
          ref={geometryRef}
          id="geometry"
          name="geometry"
          rows={10}
          required={mode === "create"}
          defaultValue={defaultGeometryJson}
          aria-invalid={errors.geometry ? "true" : "false"}
          placeholder='{"type":"Polygon","coordinates":[[[-3.7,40.4],[-3.69,40.4],[-3.69,40.41],[-3.7,40.41],[-3.7,40.4]]]}'
          style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}
        />
      </label>
      {errors.geometry && (
        <p role="alert" className="drone-form__error">
          {errors.geometry}
        </p>
      )}

      <Field
        name="areaHectares"
        label="Área en hectáreas (opcional; se calcula automáticamente desde la geometría)"
        type="number"
        step="0.0001"
        min={0}
        defaultValue={parcel?.areaHectares ?? ""}
        error={errors.areaHectares}
      />

      <h3>Cultivo</h3>

      <CropSelect
        defaultValue={parcel?.crop ?? ""}
        error={errors.crop}
      />
      <Field
        name="cropVariety"
        label="Variedad"
        defaultValue={parcel?.cropVariety ?? ""}
        error={errors.cropVariety}
        placeholder="Picual, Navelina, Marcona, Tempranillo..."
      />

      <label htmlFor="notes">
        Notas
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={parcel?.notes ?? ""}
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

interface CropSelectProps {
  defaultValue: string;
  error?: string;
}

/**
 * Desplegable de cultivos con la lista canónica `CROP_OPTIONS`. Si la
 * parcela tiene un `crop` guardado que no coincide con ninguna opción
 * (ej. datos legacy o cultivo raro), se añade dinámicamente como opción
 * extra al inicio para preservar el valor existente.
 */
function CropSelect({ defaultValue, error }: CropSelectProps) {
  const errorId = error ? "crop-error" : undefined;
  const optionsValues: string[] = CROP_OPTIONS.map((o) => o.value);
  const showLegacyValue =
    defaultValue.length > 0 && !optionsValues.includes(defaultValue);
  return (
    <>
      <label htmlFor="crop">
        Cultivo principal
        <select
          id="crop"
          name="crop"
          defaultValue={defaultValue}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={errorId}
        >
          <option value="">— Sin especificar —</option>
          {showLegacyValue && (
            <option value={defaultValue}>{defaultValue} (actual)</option>
          )}
          {CROP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p id={errorId} role="alert" className="drone-form__error">
          {error}
        </p>
      )}
    </>
  );
}

interface FieldProps {
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  type?: "text" | "number";
  step?: string;
  min?: number;
  placeholder?: string;
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
  state: CreateParcelState | UpdateParcelState;
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
            ? "Crear parcela"
            : "Guardar cambios"}
      </button>
      {state.ok && mode === "create" && "parcel" in state && state.parcel && (
        <p role="status" className="drone-form__success">
          Parcela creada: <strong>{state.parcel.name}</strong> —{" "}
          {parseFloat(state.parcel.areaHectares).toFixed(2)} ha
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
