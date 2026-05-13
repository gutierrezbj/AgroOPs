/**
 * AgroOps — Dashboard layout (Sprint 5 Distinctiveness Audit)
 *
 * Shell común para todas las pantallas /dashboard/**: header sticky con
 * logo + nav primaria + user chip, main content con padding consistente,
 * footer sutil con tagline + paraguas Drovinci + version.
 *
 * Server component — carga la sesión una sola vez y la propaga. Si no
 * hay sesión, las páginas internas hacen su propio redirect a /login.
 * El layout no fuerza redirect aquí para que pantallas como /dashboard
 * que ya manejan el caso "sin sesión" no rebote dos veces.
 */
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { DashboardHeader } from "@/features/shell/components/DashboardHeader";
import { DashboardFooter } from "@/features/shell/components/DashboardFooter";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  return (
    <div className="dashboard-shell">
      <DashboardHeader session={session} />
      <main className="dashboard-shell__main">{children}</main>
      <DashboardFooter />
    </div>
  );
}
