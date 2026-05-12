/**
 * AgroOps — /dashboard/missions/[id]/albaran/sign (HU-15)
 *
 * Pantalla para que el operador (en finca) capture la firma del agricultor.
 * Sólo accesible para PILOT_OPERATIONS (admin + piloto).
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { getMission } from "@/features/missions/services";
import { getAlbaranByMission } from "@/features/albarans/services";
import { AlbaranSignForm } from "@/features/albarans/components/AlbaranSignForm";

export const metadata = { title: "AgroOps — Firmar albarán" };
export const dynamic = "force-dynamic";

interface SignAlbaranPageProps {
  params: Promise<{ id: string }>;
}

export default async function SignAlbaranPage({
  params,
}: SignAlbaranPageProps) {
  const { id } = await params;
  const session = await auth();
  if (!hasRole(session, ROLES.PILOT_OPERATIONS)) {
    redirect(`/dashboard/missions/${id}?error=forbidden`);
  }

  const mission = await getMission(id);
  if (!mission) notFound();

  const existing = await getAlbaranByMission(id);

  return (
    <main className="drones-new">
      <header>
        <h1>Firmar albarán</h1>
        <p>
          Misión <code>{mission.code}</code> · Cliente{" "}
          <strong>{mission.client.name}</strong>
          {" · "}
          <Link href={`/dashboard/missions/${id}`}>← Volver a la misión</Link>
        </p>
        {existing && (
          <p>
            <small>
              Ya existe albarán <code>{existing.code}</code> firmado el{" "}
              {existing.signedAt?.toLocaleString("es-ES") ?? "—"}. Si vuelves a
              firmar, el PDF anterior queda invalidado y hay que regenerarlo.
            </small>
          </p>
        )}
      </header>

      <AlbaranSignForm
        missionId={mission.id}
        missionCode={mission.code}
        existingSigner={
          existing
            ? {
                fullName: existing.signerFullName,
                nif: existing.signerNif,
              }
            : undefined
        }
      />
    </main>
  );
}
