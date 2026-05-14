/**
 * AgroOps — /dashboard/missions/[id] (HU-09 + HU-10 · Sprint 5 polish)
 *
 * Vista detalle/edición de una misión con layout productivo:
 *
 *   Hero        — código + cliente + status badge prominente
 *   Toolbar     — acciones contextuales (albarán, cuaderno, volver) + transiciones
 *   Form        — MissionForm full-width (recursos, fechas, área)
 *   Parcelas    — selector M:M
 *   Stats grid  — operación · meteo · invoice (cards lado a lado en desktop)
 *
 * Las transiciones de state machine viven en la toolbar (no al final
 * de la página) porque son la acción más importante: cambiar de estado
 * es el CTA crítico que John va a usar después de un vuelo.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { getInvoicingMode } from "@/lib/constants";
import { listClients } from "@/features/clients/services";
import { listDrones } from "@/features/fleet/services";
import { listPilots } from "@/features/fleet/pilots/services";
import { listParcels } from "@/features/parcels/services";
import { getMission } from "@/features/missions/services";
import { getInvoiceForMission } from "@/features/invoicing/services";
import { MissionForm } from "@/features/missions/components/MissionForm";
import { MissionParcelsSelector } from "@/features/missions/components/MissionParcelsSelector";
import { MissionStatusBadge } from "@/features/missions/components/MissionStatusBadge";
import { TransitionActions } from "@/features/missions/components/TransitionActions";
import { CompleteMissionForm } from "@/features/missions/components/CompleteMissionForm";
import { InvoicePanel } from "@/features/invoicing/components/InvoicePanel";

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

  const [clients, drones, pilots, allParcels, invoice] = await Promise.all([
    listClients(),
    listDrones(),
    listPilots(),
    listParcels({ clientId: mission.clientId }),
    getInvoiceForMission(mission.id),
  ]);
  const canDispatchInvoice = hasRole(session, ROLES.ADMIN_ONLY);
  const invoicingMode = getInvoicingMode();

  const selectedParcelIds = mission.parcels.map((p) => p.parcel.id);
  const summedAreaHa = mission.parcels.reduce(
    (sum, p) => sum + parseFloat(p.parcel.areaHectares),
    0,
  );

  const showInvoicePanel =
    mission.status === "completed" ||
    mission.status === "invoiced" ||
    invoice !== null;

  return (
    <main className="mission-detail">
      {/* ─── Hero: código + cliente + badge prominente ───────────────────── */}
      <header className="mission-detail__hero">
        <div className="mission-detail__hero-text">
          <h1>
            <span className="mono">{mission.code}</span>
            <small className="mission-detail__client"> · {mission.client.name}</small>
          </h1>
          <p className="mission-detail__meta">
            <span className="mono">{mission.nptaReference}</span> ·{" "}
            {mission.parcels.length} parcela{mission.parcels.length === 1 ? "" : "s"}
            {summedAreaHa > 0 && <> · {summedAreaHa.toFixed(2)} ha</>}
          </p>
        </div>
        <MissionStatusBadge status={mission.status} />
      </header>

      {/* ─── Toolbar: navegación + transiciones ────────────────────────── */}
      <section className="mission-detail__toolbar" aria-label="Acciones">
        <div className="mission-detail__toolbar-nav">
          <Link href="/dashboard/missions" className="mission-detail__back">
            ← Misiones
          </Link>
          <span className="mission-detail__sep" aria-hidden="true">·</span>
          <Link href={`/dashboard/missions/${mission.id}/albaran`}>
            Albarán
          </Link>
          <span className="mission-detail__sep" aria-hidden="true">·</span>
          <Link href="/dashboard/field-notebook">Cuaderno PAC</Link>
        </div>
        {canWrite && (
          <div className="mission-detail__toolbar-transitions">
            <TransitionActions
              missionId={mission.id}
              currentStatus={mission.status}
              userRole={session?.user.role ?? ""}
            />
          </div>
        )}
      </section>

      {/* ─── Form principal (full width) ──────────────────────────────── */}
      <section className="mission-detail__panel" aria-label="Datos generales">
        <header className="mission-detail__panel-header">
          <h2>Datos generales</h2>
        </header>
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
          <dl className="mission-detail__dl">
            <div>
              <dt>Dron</dt>
              <dd>{mission.drone?.model ?? "—"}</dd>
            </div>
            <div>
              <dt>Piloto</dt>
              <dd>{mission.pilot?.fullName ?? "—"}</dd>
            </div>
            <div>
              <dt>Programada</dt>
              <dd className="mono">{fmtDateTime(mission.scheduledAt)}</dd>
            </div>
          </dl>
        )}
      </section>

      {/* ─── Parcelas (full width) ───────────────────────────────────── */}
      <section className="mission-detail__panel" aria-label="Parcelas asignadas">
        <header className="mission-detail__panel-header">
          <h2>Parcelas asignadas ({mission.parcels.length})</h2>
        </header>
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
          <ul className="mission-detail__parcel-list">
            {mission.parcels.map((p) => (
              <li key={p.parcel.id}>
                <strong>{p.parcel.name}</strong>{" "}
                <small>
                  <code>{p.parcel.sigpacReference}</code> ·{" "}
                  {parseFloat(p.parcel.areaHectares).toFixed(2)} ha
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Stats grid: operación + meteo + invoice (2-col desktop) ── */}
      <section className="mission-detail__grid" aria-label="Estado de la operación">
        {/* Operación */}
        <article className="mission-detail__panel mission-detail__panel--inline">
          <header className="mission-detail__panel-header">
            <h2>Operación</h2>
          </header>
          <dl className="mission-detail__dl">
            <div>
              <dt>Inicio vuelo</dt>
              <dd className="mono">{fmtDateTime(mission.startedAt)}</dd>
            </div>
            <div>
              <dt>Fin vuelo</dt>
              <dd className="mono">{fmtDateTime(mission.completedAt)}</dd>
            </div>
            <div>
              <dt>Área planificada</dt>
              <dd className="mono">
                {mission.areaPlannedHa
                  ? `${parseFloat(mission.areaPlannedHa).toFixed(4)} ha`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Área tratada</dt>
              <dd className="mono">
                {mission.areaTreatedHa
                  ? `${parseFloat(mission.areaTreatedHa).toFixed(4)} ha`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Telemetría</dt>
              <dd>
                {mission.telemetry ? (
                  <span className="mission-detail__chip mission-detail__chip--ok">
                    ✓ capturada
                  </span>
                ) : (
                  <span className="mission-detail__chip mission-detail__chip--muted">
                    pendiente
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </article>

        {/* Meteorología */}
        {mission.weatherSnapshot && (
          <article className="mission-detail__panel mission-detail__panel--inline">
            <header className="mission-detail__panel-header">
              <h2>Meteorología AEMET</h2>
              <small className="mission-detail__panel-eyebrow">
                Capturado{" "}
                <span className="mono">
                  {new Date(mission.weatherSnapshot.capturedAt).toLocaleString(
                    "es-ES",
                  )}
                </span>
                {mission.weatherSnapshot.stationId && (
                  <>
                    {" · estación "}
                    <code className="mono">{mission.weatherSnapshot.stationId}</code>
                  </>
                )}
              </small>
            </header>
            <dl className="mission-detail__dl">
              <div>
                <dt>Viento</dt>
                <dd className="mono">
                  {mission.weatherSnapshot.windSpeedMs != null
                    ? `${mission.weatherSnapshot.windSpeedMs.toFixed(1)} m/s`
                    : "—"}
                  {mission.weatherSnapshot.windDirectionDeg != null && (
                    <> · dir {mission.weatherSnapshot.windDirectionDeg}°</>
                  )}
                </dd>
              </div>
              <div>
                <dt>Precipitación</dt>
                <dd className="mono">
                  {mission.weatherSnapshot.precipitationMm != null
                    ? `${mission.weatherSnapshot.precipitationMm} mm`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Temperatura</dt>
                <dd className="mono">
                  {mission.weatherSnapshot.temperatureC != null
                    ? `${mission.weatherSnapshot.temperatureC} °C`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Humedad</dt>
                <dd className="mono">
                  {mission.weatherSnapshot.humidityPct != null
                    ? `${mission.weatherSnapshot.humidityPct} %`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Apto vuelo</dt>
                <dd>
                  {mission.weatherSnapshot.flightSuitable === true ? (
                    <span className="mission-detail__chip mission-detail__chip--ok">
                      ✓ sí
                    </span>
                  ) : mission.weatherSnapshot.flightSuitable === false ? (
                    <span className="mission-detail__chip mission-detail__chip--danger">
                      ✗ no
                    </span>
                  ) : (
                    <span className="mission-detail__chip mission-detail__chip--muted">
                      —
                    </span>
                  )}
                  {typeof mission.weatherSnapshot.raw === "object" &&
                    mission.weatherSnapshot.raw != null &&
                    "stub" in mission.weatherSnapshot.raw && (
                      <small className="mission-detail__stub-warning">
                        {" "}(stub — define <code>AEMET_API_KEY</code>)
                      </small>
                    )}
                </dd>
              </div>
            </dl>
          </article>
        )}
      </section>

      {/* ─── Cerrar misión (solo in_flight) ──────────────────────────── */}
      {canWrite && mission.status === "in_flight" && (
        <section className="mission-detail__panel mission-detail__panel--action" aria-label="Cerrar misión">
          <header className="mission-detail__panel-header">
            <h2>Cerrar misión</h2>
            <small className="mission-detail__panel-eyebrow">
              Captura el área tratada y la nota de telemetría para pasar la
              misión a estado <code>completed</code>.
            </small>
          </header>
          <CompleteMissionForm
            missionId={mission.id}
            defaultAreaHa={summedAreaHa > 0 ? summedAreaHa.toString() : null}
          />
        </section>
      )}

      {/* ─── Invoice panel ────────────────────────────────────────────── */}
      {showInvoicePanel && (
        <InvoicePanel
          missionId={mission.id}
          missionStatus={mission.status}
          invoice={invoice}
          canDispatch={canDispatchInvoice}
          invoicingMode={invoicingMode}
        />
      )}
    </main>
  );
}
