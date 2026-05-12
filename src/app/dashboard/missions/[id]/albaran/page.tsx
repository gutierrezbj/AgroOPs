/**
 * AgroOps — /dashboard/missions/[id]/albaran (HU-15 + HU-16)
 *
 * Vista del albarán de una misión: datos del firmante, firma renderizada,
 * estado del PDF, botón para generar/regenerar PDF, link de descarga.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, ROLES } from "@/lib/rbac";
import { getMission } from "@/features/missions/services";
import { getAlbaranByMission } from "@/features/albarans/services";
import { GeneratePdfButton } from "@/features/albarans/components/GeneratePdfButton";

export const metadata = { title: "AgroOps — Albarán" };
export const dynamic = "force-dynamic";

interface AlbaranPageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbaranPage({ params }: AlbaranPageProps) {
  const { id } = await params;
  const mission = await getMission(id);
  if (!mission) notFound();

  const albaran = await getAlbaranByMission(id);
  const session = await auth();
  const canManage = hasRole(session, ROLES.PILOT_OPERATIONS);

  return (
    <main className="drone-edit">
      <header>
        <h1>Albarán de misión {mission.code}</h1>
        <p>
          Cliente: <strong>{mission.client.name}</strong>
          {" · "}
          <Link href={`/dashboard/missions/${id}`}>← Volver a la misión</Link>
        </p>
      </header>

      {!albaran ? (
        <section>
          <p>
            Esta misión todavía no tiene albarán firmado.
            {canManage && (
              <>
                {" "}
                <Link
                  href={`/dashboard/missions/${id}/albaran/sign`}
                  className="btn-primary"
                >
                  Firmar ahora
                </Link>
              </>
            )}
          </p>
        </section>
      ) : (
        <>
          <section>
            <h2>Datos del albarán</h2>
            <dl>
              <dt>Código</dt>
              <dd>
                <code>{albaran.code}</code>
              </dd>
              <dt>Firmado el</dt>
              <dd>{albaran.signedAt?.toLocaleString("es-ES") ?? "—"}</dd>
              <dt>Firmante</dt>
              <dd>{albaran.signerFullName ?? "—"}</dd>
              <dt>NIF</dt>
              <dd>
                <code>{albaran.signerNif ?? "—"}</code>
              </dd>
            </dl>

            {albaran.signatureImageBase64 && (
              <figure style={{ margin: "1rem 0" }}>
                <figcaption>
                  <small>Firma del agricultor</small>
                </figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={albaran.signatureImageBase64}
                  alt="Firma del agricultor"
                  style={{
                    maxWidth: "320px",
                    border: "1px solid rgba(0,0,0,0.15)",
                    borderRadius: 4,
                    background: "#fff",
                  }}
                />
              </figure>
            )}

            {canManage && (
              <p>
                <Link
                  href={`/dashboard/missions/${id}/albaran/sign`}
                  className="btn-primary"
                >
                  Volver a firmar
                </Link>
                <small>
                  {" "}— invalida el PDF actual y hay que regenerarlo.
                </small>
              </p>
            )}
          </section>

          <section>
            <h2>PDF</h2>
            {albaran.pdfPath ? (
              <p>
                ✓ PDF generado · Hash SHA-256:{" "}
                <code>{albaran.pdfHash}</code>
                <br />
                <a
                  href={`/api/albarans/${albaran.code}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ marginTop: "0.5rem" }}
                >
                  Descargar PDF
                </a>{" "}
                {canManage && (
                  <GeneratePdfButton
                    albaranId={albaran.id}
                    hasPdf={true}
                  />
                )}
              </p>
            ) : (
              <p>
                No hay PDF generado todavía.
                {canManage && (
                  <>
                    {" "}
                    <GeneratePdfButton
                      albaranId={albaran.id}
                      hasPdf={false}
                    />
                  </>
                )}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
