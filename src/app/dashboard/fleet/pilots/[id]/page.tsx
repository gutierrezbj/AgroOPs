/**
 * AgroOps — /dashboard/fleet/pilots/[id]
 *
 * Editar piloto existente. Aplica RBAC: lectura para todos, edición
 * requiere `WRITERS`. Admin además puede archivar (active=false).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { PilotForm } from "@/features/fleet/pilots/components/PilotForm";
import { PilotStatusBadge } from "@/features/fleet/pilots/components/PilotStatusBadge";
import { ArchivePilotButton } from "@/features/fleet/pilots/components/ArchivePilotButton";
import {
  evaluateCredentials,
  getPilot,
} from "@/features/fleet/pilots/services";

export const metadata = {
  title: "AgroOps — Piloto",
};

export const dynamic = "force-dynamic";

const CREDENTIAL_LABELS: Record<string, string> = {
  aesa: "Licencia AESA",
  ropo: "ROPO",
  insurance: "Seguro RC",
  medical: "Reconocimiento médico",
};

interface EditPilotPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPilotPage({ params }: EditPilotPageProps) {
  const { id } = await params;
  const pilot = await getPilot(id);
  if (!pilot) {
    notFound();
  }

  const session = await auth();
  const canWrite = hasRole(session, ROLES.WRITERS);
  const canAdmin = hasRole(session, ROLES.ADMIN_ONLY);
  const credentials = evaluateCredentials(pilot);

  return (
    <main className="drone-edit">
      <header>
        <h1>
          {pilot.fullName} <small>({pilot.nif})</small>
        </h1>
        <p>
          <PilotStatusBadge pilot={pilot} />
          {" · "}
          <Link href="/dashboard/fleet/pilots">← Volver al listado</Link>
        </p>
      </header>

      {credentials.length > 0 && (
        <section>
          <h2>Credenciales</h2>
          <ul>
            {credentials.map((c) => (
              <li key={c.field}>
                <strong>{CREDENTIAL_LABELS[c.field] ?? c.field}:</strong>{" "}
                caduca {c.expiresAt}{" "}
                {c.severity === "expired" && (
                  <em>
                    — vencida hace {Math.abs(c.daysToExpiry)} día(s) 🚨
                  </em>
                )}
                {c.severity === "warning" && (
                  <em>— caduca en {c.daysToExpiry} día(s) ⚠️</em>
                )}
                {c.severity === "ok" && (
                  <em>— en {c.daysToExpiry} día(s) ✓</em>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {canWrite ? (
        <PilotForm mode="edit" pilot={pilot} />
      ) : (
        <section>
          <p>
            No tienes permisos para editar pilotos (requiere rol{" "}
            <code>admin</code> u <code>operario</code>).
          </p>
          <dl>
            <dt>Nombre</dt>
            <dd>{pilot.fullName}</dd>
            <dt>NIF</dt>
            <dd>
              <code>{pilot.nif}</code>
            </dd>
            <dt>AESA</dt>
            <dd>
              {pilot.aesaLicenseClass ?? "—"}{" "}
              {pilot.aesaLicenseNumber && (
                <small>({pilot.aesaLicenseNumber})</small>
              )}
            </dd>
            <dt>ROPO</dt>
            <dd>{pilot.ropoQualified ? (pilot.ropoLevel ?? "Sí") : "No"}</dd>
            <dt>Horas de vuelo</dt>
            <dd>{parseFloat(pilot.flightHours).toFixed(1)} h</dd>
          </dl>
        </section>
      )}

      {canAdmin && pilot.active && (
        <section className="drone-edit__danger">
          <h2>Zona de archivo</h2>
          <p>
            Archivar el piloto lo marca como inactivo. Las misiones históricas
            siguen referenciándolo, pero queda fuera de selección para misiones
            nuevas.
          </p>
          <ArchivePilotButton pilotId={pilot.id} />
        </section>
      )}
    </main>
  );
}
