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
        </ul>
      </section>

      <section className="dashboard__placeholder">
        <h2>Pendiente Sprint 1</h2>
        <ul>
          <li>HU-03 Layout productivo (sidebar por épica) — bloqueado Identity Sprint.</li>
          <li>HU-07 ABM parcelas SIGPAC (geometría PostGIS).</li>
          <li>HU-08 ABM catálogo fitosanitario.</li>
          <li>
            <strong>Identity Sprint</strong> bloquea pantalla "lista":
            tokens del SRS Design System pendientes.
          </li>
        </ul>
      </section>
    </main>
  );
}
