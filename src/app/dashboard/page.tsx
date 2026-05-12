/**
 * AgroOps — /dashboard (placeholder Sprint 1)
 *
 * Vista mínima para validar que la sesión llega al servidor con su rol.
 * El layout productivo llega en HU-03 (bloqueado por Identity Sprint para
 * declarar pantalla "lista").
 */
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

      <section className="dashboard__placeholder">
        <h2>Pendiente Sprint 1 (HU-03 en adelante)</h2>
        <ul>
          <li>Layout productivo con sidebar por épica.</li>
          <li>ABM drones / pilotos / clientes / parcelas / fitosanitario.</li>
          <li>Wizard de creación de misión (Sprint 2).</li>
          <li>
            <strong>Identity Sprint</strong> bloquea pantalla "lista":
            tokens del SRS Design System pendientes.
          </li>
        </ul>
      </section>
    </main>
  );
}
