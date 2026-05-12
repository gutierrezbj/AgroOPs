/**
 * AgroOps — /dashboard (placeholder Sprint 1)
 *
 * Vista mínima para validar que la sesión llega al servidor con su rol.
 * El layout productivo llega en HU-03 (bloqueado por Identity Sprint para
 * declarar pantalla "lista").
 */
import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/features/auth/actions/logout";

export const metadata = {
  title: "AgroOps — Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="dashboard">
      <header>
        <h1>AgroOps · Dashboard</h1>
      </header>

      {session?.user ? (
        <section className="dashboard__session">
          <h2>Sesión activa</h2>
          <dl>
            <dt>Usuario</dt>
            <dd>{session.user.name ?? session.user.email}</dd>
            <dt>Email</dt>
            <dd>{session.user.email}</dd>
            <dt>Rol</dt>
            <dd>
              <code>{session.user.role}</code>
            </dd>
            <dt>User ID</dt>
            <dd>
              <code>{session.user.id}</code>
            </dd>
          </dl>

          <form action={logoutAction}>
            <button type="submit">Cerrar sesión</button>
          </form>
        </section>
      ) : (
        <p>Sin sesión activa.</p>
      )}

      <section>
        <h2>Atajos</h2>
        <ul>
          <li>
            <Link href="/dashboard/fleet">Flota</Link> — drones + pilotos.
          </li>
          <li>
            <Link href="/dashboard/clients">Clientes</Link> — cooperativas,
            ATRIA, agricultores.
          </li>
          <li>
            <Link href="/dashboard/phytosanitary">Catálogo fitosanitario</Link>
            {" "}— lotes de productos fitosanitarios.
          </li>
          <li>
            <Link href="/dashboard/parcels">Parcelas SIGPAC</Link> — geometría
            PostGIS, área autocalculada.
          </li>
          <li>
            <Link href="/dashboard/missions">Misiones</Link> — state machine
            8 estados, gates de transición, audit log.
          </li>
          <li>
            <Link href="/dashboard/map">Mapa operativo</Link> — parcelas
            SIGPAC + NOTAMs ENAIRE en MapLibre con dibujo interactivo.
          </li>
          <li>
            <Link href="/dashboard/field-notebook">Cuaderno de campo</Link>
            {" "}— registro PAC con export PDF tabular (HU-21 + HU-22).
          </li>
          {session?.user.role === "admin" && (
            <li>
              <Link href="/dashboard/audit-log">Audit log</Link> — trazabilidad
              append-only de mutaciones críticas (HU-23, solo admin).
            </li>
          )}
        </ul>
      </section>

      <section className="dashboard__placeholder">
        <h2>Pendiente</h2>
        <ul>
          <li>HU-03 Layout productivo (sidebar por épica) — Identity Sprint v1 aplicada, falta sidebar productivo.</li>
          <li>Sprint 5 — primera operación real end-to-end por John con AgroOps.</li>
        </ul>
      </section>
    </main>
  );
}
