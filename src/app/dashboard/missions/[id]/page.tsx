/**
 * AgroOps — /dashboard/missions/[id] (HU-09 + HU-10)
 *
 * Vista de edición + transiciones. Estructura:
 * - Header con código, cliente, badge de estado.
 * - Datos generales (MissionForm en modo edit).
 * - Asignación de parcelas (MissionParcelsSelector).
 * - Panel de transiciones (TransitionActions) o cierre manual (CompleteMissionForm) según estado.
 * - Histórico mínimo (audit log podría engancharse aquí en HU-23).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { listClients } from "@/features/clients/services";
import { listDrones } from "@/features/fleet/services";
import { listPilots } from "@/features/fleet/pilots/services";
import { listParcels } from "@/features/parcels/services";
import { getMission } from "@/features/missions/services";
import { MissionForm } from "@/features/missions/components/MissionForm";
import { MissionParcelsSelector } from "@/features/missions/components/MissionParcelsSelector";
import { MissionStatusBadge } from "@/features/missions/components/MissionStatusBadge";
import { TransitionActions } from "@/features/missions/components/TransitionActions";
import { CompleteMissionForm } from "@/features/missions/components/CompleteMissionForm";

export const metadata = { title: "AgroOps — Misión" };
export const dynamic = "force-dynamic";

interface MissionPageProps {
  params: Promise<{ id: string }>;
}

function fmtDateTime(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleString("es-ES");
}

export default async function MissionDetailPage({ params }: MissionPageProps) {
  const { id } = await params;
  const mission = await getMission(id);
  if (!mission) notFound();

  const session = await auth();
  const canWrite = hasRole(session, ROLES.WRITERS);

  const [clients, drones, pilots, allParcels] = await Promise.all([
    listClients(),
    listDrones(),
    listPilots(),
    listParcels({ clientId: mission.clientId }),
  ]);

  const selectedParcelIds = mission.parcels.map((p) => p.parcel.id);
  const summedAreaHa = mission.parcels.reduce(
    (sum, p) => sum + parseFloat(p.parcel.areaHectares),
    0,
  );

  return (
    <main className="drone-edit">
      <header>
        <h1>
          {mission.code} <small>· {mission.client.name}</small>
        </h1>
        <p>
          <MissionStatusBadge status={mission.status} />
          {" · "}
          {mission.parcels.length} parcela(s) · {summedAreaHa.toFixed(2)} ha
          {" · "}
          NPTA <code>{mission.nptaReference}</code>
          {" · "}
          <Link href={`/dashboard/missions/${mission.id}/albaran`}>
            Albarán
          </Link>
          {" · "}
          <Link href="/dashboard/missions">← Volver al listado</Link>
        </p>
      </header>

      <section>
        <h2>Datos generales</h2>
        {canWrite ? (
          <MissionForm
            mode="edit"
            mission={mission}
            clients={clients.map((c) => ({
              id: c.id,
              name: c.name,
              taxId: c.taxId,
            }))}
            drones={drones.map((d) => ({
              id: d.id,
              model: d.model,
              serialNumber: d.serialNumber,
              applicationCapable: d.applicationCapable,
              status: d.status,
            }))}
            pilots={pilots.map((p) => ({
              id: p.id,
              fullName: p.fullName,
              nif: p.nif,
              ropoQualified: p.ropoQualified,
              active: p.active,
            }))}
          />
        ) : (
          <dl>
            <dt>Dron</dt>
            <dd>{mission.drone?.model ?? "—"}</dd>
            <dt>Piloto</dt>
            <dd>{mission.pilot?.fullName ?? "—"}</dd>
            <dt>Programada</dt>
            <dd>{fmtDateTime(mission.scheduledAt)}</dd>
          </dl>
        )}
      </section>

      <section>
        <h2>Parcelas asignadas</h2>
        {canWrite ? (
          <MissionParcelsSelector
            missionId={mission.id}
            parcels={allParcels.map((p) => ({
              id: p.id,
              name: p.name,
              sigpacReference: p.sigpacReference,
              areaHectares: p.areaHectares,
            }))}
            selectedIds={selectedParcelIds}
          />
        ) : (
          <ul>
            {mission.parcels.map((p) => (
              <li key={p.parcel.id}>
                <strong>{p.parcel.name}</strong> ·{" "}
                <code>{p.parcel.sigpacReference}</code> ·{" "}
                {parseFloat(p.parcel.areaHectares).toFixed(2)} ha
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Operación</h2>
        <dl>
          <dt>Inicio vuelo</dt>
          <dd>{fmtDateTime(mission.startedAt)}</dd>
          <dt>Fin vuelo</dt>
          <dd>{fmtDateTime(mission.completedAt)}</dd>
          <dt>Área planificada</dt>
          <dd>
            {mission.areaPlannedHa
              ? `${parseFloat(mission.areaPlannedHa).toFixed(2)} ha`
              : "—"}
          </dd>
          <dt>Área tratada</dt>
          <dd>
            {mission.areaTreatedHa
              ? `${parseFloat(mission.areaTreatedHa).toFixed(2)} ha`
              : "—"}
          </dd>
          <dt>Telemetría</dt>
          <dd>{mission.telemetry ? "✓ capturada" : "—"}</dd>
        </dl>
      </section>

      {mission.weatherSnapshot && (
        <section>
          <h2>Snapshot meteorológico AEMET (HU-13)</h2>
          <p>
            <small>
              Capturado{" "}
              {new Date(mission.weatherSnapshot.capturedAt).toLocaleString(
                "es-ES",
              )}
              {mission.weatherSnapshot.stationId && (
                <>
                  {" · estación "}
                  <code>{mission.weatherSnapshot.stationId}</code>
                </>
              )}
            </small>
          </p>
          <dl>
            <dt>Viento</dt>
            <dd>
              {mission.weatherSnapshot.windSpeedMs != null
                ? `${mission.weatherSnapshot.windSpeedMs.toFixed(1)} m/s`
                : "—"}
              {mission.weatherSnapshot.windDirectionDeg != null && (
                <> · dir {mission.weatherSnapshot.windDirectionDeg}°</>
              )}
            </dd>
            <dt>Precipitación</dt>
            <dd>
              {mission.weatherSnapshot.precipitationMm != null
                ? `${mission.weatherSnapshot.precipitationMm} mm`
                : "—"}
            </dd>
            <dt>Temperatura</dt>
            <dd>
              {mission.weatherSnapshot.temperatureC != null
                ? `${mission.weatherSnapshot.temperatureC} °C`
                : "—"}
            </dd>
            <dt>Humedad</dt>
            <dd>
              {mission.weatherSnapshot.humidityPct != null
                ? `${mission.weatherSnapshot.humidityPct} %`
                : "—"}
            </dd>
            <dt>Apto para vuelo</dt>
            <dd>
              {mission.weatherSnapshot.flightSuitable === true
                ? "✓ sí"
                : mission.weatherSnapshot.flightSuitable === false
                  ? "✗ no"
                  : "—"}
              {typeof mission.weatherSnapshot.raw === "object" &&
                mission.weatherSnapshot.raw != null &&
                "stub" in mission.weatherSnapshot.raw && (
                  <small>
                    {" "}
                    (stub — define <code>AEMET_API_KEY</code> en{" "}
                    <code>.env.local</code> para datos reales)
                  </small>
                )}
            </dd>
          </dl>
        </section>
      )}

      {canWrite && mission.status === "in_flight" && (
        <section>
          <h2>Cerrar misión</h2>
          <CompleteMissionForm
            missionId={mission.id}
            defaultAreaHa={summedAreaHa > 0 ? summedAreaHa.toString() : null}
          />
        </section>
      )}

      {canWrite && (
        <TransitionActions
          missionId={mission.id}
          currentStatus={mission.status}
          userRole={session?.user.role ?? ""}
        />
      )}
    </main>
  );
}
