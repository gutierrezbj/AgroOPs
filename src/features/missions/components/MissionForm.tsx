"use client";

/**
 * AgroOps — MissionForm
 *
 * Crear / editar info general de la misión (cliente, dron, piloto,
 * scheduledAt, notas). Las parcelas se gestionan en un componente
 * separado (MissionParcelsSelector) porque dependen del cliente.
 */
import { useActionState } from "react";
import { createMissionAction } from "../actions/create-mission";
import {
  initialCreateMissionState,
  type CreateMissionState,
} from "../actions/create-mission.types";
import { updateMissionAction } from "../actions/update-mission";
import {
  initialUpdateMissionState,
  type UpdateMissionState,
} from "../actions/update-mission.types";
import type { MissionDetail } from "../services";

interface ClientOption {
  id: string;
  name: string;
  taxId: string;
}
interface DroneOption {
  id: string;
  model: string;
  serialNumber: string;
  applicationCapable: boolean;
  status: string;
}
interface PilotOption {
  id: string;
  fullName: string;
  nif: string;
  ropoQualified: boolean;
  active: boolean;
}

type Mode = "create" | "edit";

interface MissionFormProps {
  mode: Mode;
  mission?: MissionDetail;
  clients: ClientOption[];
  drones: DroneOption[];
  pilots: PilotOption[];
}

function formatDatetimeLocal(value: Date | null): string {
  if (!value) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function MissionForm({
  mode,
  mission,
  clients,
  drones,
  pilots,
}: MissionFormProps) {
  if (mode === "create") {
    return (
      <CreateImpl clients={clients} drones={drones} pilots={pilots} />
    );
  }
  if (!mission) throw new Error("MissionForm edit requiere `mission`");
  return (
    <UpdateImpl
      mission={mission}
      clients={clients}
      drones={drones}
      pilots={pilots}
    />
  );
}

function CreateImpl(props: {
  clients: ClientOption[];
  drones: DroneOption[];
  pilots: PilotOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createMissionAction,
    initialCreateMissionState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <SharedFields
        state={state}
        pending={pending}
        mode="create"
        clients={props.clients}
        drones={props.drones}
        pilots={props.pilots}
      />
      <SubmitFeedback state={state} pending={pending} mode="create" />
    </form>
  );
}

function UpdateImpl(props: {
  mission: MissionDetail;
  clients: ClientOption[];
  drones: DroneOption[];
  pilots: PilotOption[];
}) {
  const [state, formAction, pending] = useActionState(
    updateMissionAction,
    initialUpdateMissionState,
  );
  return (
    <form action={formAction} className="drone-form" noValidate>
      <input type="hidden" name="id" value={props.mission.id} />
      <SharedFields
        state={state}
        pending={pending}
        mode="edit"
        mission={props.mission}
        clients={props.clients}
        drones={props.drones}
        pilots={props.pilots}
      />
      <SubmitFeedback state={state} pending={pending} mode="edit" />
    </form>
  );
}

interface SharedFieldsProps {
  state: CreateMissionState | UpdateMissionState;
  pending: boolean;
  mode: Mode;
  mission?: MissionDetail;
  clients: ClientOption[];
  drones: DroneOption[];
  pilots: PilotOption[];
}

function SharedFields({
  state,
  pending,
  mode,
  mission,
  clients,
  drones,
  pilots,
}: SharedFieldsProps) {
  const errors = state.fieldErrors ?? {};
  return (
    <fieldset disabled={pending}>
      <legend>
        {mode === "create"
          ? "Nueva misión"
          : `Editar ${mission?.code ?? "misión"}`}
      </legend>

      <label htmlFor="clientId">
        Cliente *
        <select
          id="clientId"
          name="clientId"
          required
          defaultValue={mission?.clientId ?? ""}
          aria-invalid={errors.clientId ? "true" : "false"}
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

      <label htmlFor="droneId">
        Dron (opcional al crear)
        <select
          id="droneId"
          name="droneId"
          defaultValue={mission?.droneId ?? ""}
          aria-invalid={errors.droneId ? "true" : "false"}
        >
          <option value="">— sin asignar —</option>
          {drones.map((d) => (
            <option key={d.id} value={d.id}>
              {d.model} ({d.serialNumber})
              {d.applicationCapable ? " · aplicador" : " · no aplicador"}
              {d.status !== "active" ? ` · ${d.status}` : ""}
            </option>
          ))}
        </select>
      </label>
      {errors.droneId && (
        <p role="alert" className="drone-form__error">
          {errors.droneId}
        </p>
      )}

      <label htmlFor="pilotId">
        Piloto (opcional al crear)
        <select
          id="pilotId"
          name="pilotId"
          defaultValue={mission?.pilotId ?? ""}
          aria-invalid={errors.pilotId ? "true" : "false"}
        >
          <option value="">— sin asignar —</option>
          {pilots.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName} ({p.nif})
              {p.ropoQualified ? " · ROPO" : " · NO ROPO"}
              {!p.active ? " · inactivo" : ""}
            </option>
          ))}
        </select>
      </label>
      {errors.pilotId && (
        <p role="alert" className="drone-form__error">
          {errors.pilotId}
        </p>
      )}

      <label htmlFor="scheduledAt">
        Programada para (opcional)
        <input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          defaultValue={formatDatetimeLocal(mission?.scheduledAt ?? null)}
          aria-invalid={errors.scheduledAt ? "true" : "false"}
        />
      </label>
      {errors.scheduledAt && (
        <p role="alert" className="drone-form__error">
          {errors.scheduledAt}
        </p>
      )}

      <label htmlFor="notes">
        Notas
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={mission?.notes ?? ""}
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

interface SubmitFeedbackProps {
  state: CreateMissionState | UpdateMissionState;
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
            ? "Crear misión (borrador)"
            : "Guardar cambios"}
      </button>
      {state.ok && mode === "create" && "mission" in state && state.mission && (
        <p role="status" className="drone-form__success">
          Misión creada: <code>{state.mission.code}</code>
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
