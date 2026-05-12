"use client";

/**
 * AgroOps — MissionParcelsSelector
 *
 * Multi-select de parcelas del cliente de la misión. Es una HU concreta
 * separada del MissionForm porque depende del cliente ya elegido y se
 * persiste con un Server Action propio (setMissionParcels).
 */
import { useActionState } from "react";
import { setMissionParcelsAction } from "../actions/set-mission-parcels";
import { initialSetMissionParcelsState } from "../actions/set-mission-parcels.types";

interface ParcelOption {
  id: string;
  name: string;
  sigpacReference: string;
  areaHectares: string;
}

interface MissionParcelsSelectorProps {
  missionId: string;
  parcels: ParcelOption[];
  selectedIds: string[];
}

export function MissionParcelsSelector({
  missionId,
  parcels,
  selectedIds,
}: MissionParcelsSelectorProps) {
  const [state, formAction, pending] = useActionState(
    setMissionParcelsAction,
    initialSetMissionParcelsState,
  );

  if (parcels.length === 0) {
    return (
      <p>
        El cliente de esta misión no tiene parcelas registradas. Crea al menos
        una en{" "}
        <a href="/dashboard/parcels/new">/dashboard/parcels/new</a>.
      </p>
    );
  }

  return (
    <form action={formAction} className="drone-form" noValidate>
      <fieldset disabled={pending}>
        <legend>Parcelas de la misión</legend>
        <input type="hidden" name="missionId" value={missionId} />

        <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0" }}>
          {parcels.map((p) => (
            <li key={p.id} style={{ marginBottom: "0.4rem" }}>
              <label
                htmlFor={`parcel-${p.id}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "0.5rem",
                  display: "flex",
                }}
              >
                <input
                  id={`parcel-${p.id}`}
                  type="checkbox"
                  name="parcelIds"
                  value={p.id}
                  defaultChecked={selectedIds.includes(p.id)}
                />
                <span>
                  <strong>{p.name}</strong> ·{" "}
                  <code>{p.sigpacReference}</code> · {parseFloat(p.areaHectares).toFixed(2)} ha
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="drone-form__submit">
          <button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar parcelas"}
          </button>
          {state.ok && (
            <p role="status" className="drone-form__success">
              {state.count} parcela(s) asignada(s).
            </p>
          )}
          {!state.ok && state.error && (
            <p role="alert" className="drone-form__error">
              {state.error}
            </p>
          )}
        </div>
      </fieldset>
    </form>
  );
}
