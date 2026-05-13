/**
 * AgroOps — DashboardHeader (Sprint 5 Distinctiveness Audit)
 *
 * Header sticky global del dashboard. Marca AgroOps con logo wordmark
 * (Fraunces) en zona izquierda, nav primaria centrada y user chip a
 * la derecha. Server component — recibe la sesión y propaga el rol al
 * `DashboardNav` para filtrar links restringidos (audit log).
 */
import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { DashboardNav } from "./DashboardNav";
import { UserChip } from "./UserChip";

interface DashboardHeaderProps {
  session: Session | null;
}

export function DashboardHeader({ session }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header" role="banner">
      <div className="dashboard-header__inner">
        <Link
          href="/dashboard"
          className="dashboard-header__brand"
          aria-label="AgroOps — Inicio"
        >
          <Image
            src="/agroops-logo.svg"
            alt="AgroOps"
            width={140}
            height={39}
            priority
            className="dashboard-header__logo"
          />
        </Link>
        <DashboardNav userRole={session?.user?.role} />
        <UserChip session={session} />
      </div>
    </header>
  );
}
