/**
 * AgroOps — /dashboard (Sprint 5 Distinctiveness Audit)
 *
 * Pantalla de inicio del dashboard. La sesión + logout ya están en el
 * `DashboardHeader` del layout, así que aquí mostramos un hero AgroOps
 * con la operación del día y los accesos rápidos a las épicas v1.
 *
 * El listado de accesos se agrupa por dominio (Operación / Recursos /
 * Cumplimiento / Diagnóstico) para que el operador no tenga que escanear
 * una lista plana. Las tarjetas son `<a>` con `<article>` semántico.
 */
import Link from "next/link";
import { auth } from "@/auth";
import { ROLES, hasRole } from "@/lib/rbac";
import { getInvoicingMode } from "@/lib/constants";

export const metadata = {
  title: "AgroOps — Dashboard",
};

interface ShortcutCard {
  href: string;
  title: string;
  description: string;
  /** Sólo se muestra si el rol está incluido (default: todos). */
  roles?: ReadonlyArray<"admin" | "piloto" | "operario" | "viewer">;
}

const OPERACION: ShortcutCard[] = [
  {
    href: "/dashboard/missions",
    title: "Misiones",
    description:
      "State machine 8 estados con gates duros, capturas meteo automáticas y albarán firmado en finca.",
  },
  {
    href: "/dashboard/map",
    title: "Mapa operativo",
    description:
      "Parcelas SIGPAC + NOTAMs ENAIRE sobre MapLibre. Dibujo interactivo de polígonos.",
  },
  {
    href: "/dashboard/field-notebook",
    title: "Cuaderno de campo",
    description:
      "Registro PAC con export PDF tabular agrupado por aplicación-parcela-producto.",
  },
];

const RECURSOS: ShortcutCard[] = [
  {
    href: "/dashboard/clients",
    title: "Clientes",
    description:
      "Cooperativas, ATRIA, agricultores y comunidades de regantes. Sincronización opt-in con Holded.",
  },
  {
    href: "/dashboard/parcels",
    title: "Parcelas SIGPAC",
    description:
      "Geometría PostGIS Polygon SRID 4326. Área autocalculada con ST_Area::geography.",
  },
  {
    href: "/dashboard/fleet",
    title: "Flota",
    description:
      "Drones aplicadores (T50), inspección (Mavic 3E), referencia (D-RTK 2) y pilotos con licencia AESA + ROPO.",
  },
  {
    href: "/dashboard/phytosanitary",
    title: "Catálogo fitosanitario",
    description:
      "Producto + materia activa + lote + caducidad + dosis. ADR-4: el producto lo aporta el cliente final.",
  },
];

const CUMPLIMIENTO: ShortcutCard[] = [
  {
    href: "/dashboard/audit-log",
    title: "Audit log",
    description:
      "Trazabilidad append-only de mutaciones críticas. JSON before/after por entrada.",
    roles: ["admin"],
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role;
  const userDisplayName =
    session?.user?.name?.trim() || session?.user?.email || "operador";
  const isAdmin = hasRole(session, ROLES.ADMIN_ONLY);
  const invoicingMode = getInvoicingMode();

  return (
    <div className="dashboard-home">
      <header className="dashboard-home__hero">
        <h1>AgroOps · Dashboard</h1>
        <p className="dashboard-home__greeting">
          Buenas, <strong>{userDisplayName}</strong>. Operación bajo paraguas
          Drovinci NPTA. Facturación{" "}
          <code>{invoicingMode}</code> activa (
          {invoicingMode === "manual"
            ? "v1.0 por defecto"
            : "Holded autodispara al facturar"}
          ).
        </p>
      </header>

      <Section title="Operación" cards={OPERACION} userRole={role} />
      <Section title="Recursos" cards={RECURSOS} userRole={role} />
      {isAdmin && (
        <Section
          title="Cumplimiento"
          cards={CUMPLIMIENTO}
          userRole={role}
        />
      )}

      <footer className="dashboard-home__pending">
        <small>
          <strong>Sprint 5 en curso:</strong> Distinctiveness Audit · E2E
          Playwright · primera operación real end-to-end. Si detectas algo que
          chirría visualmente o no se siente AgroOps, anótalo y lo afinamos.
        </small>
      </footer>
    </div>
  );
}

interface SectionProps {
  title: string;
  cards: ShortcutCard[];
  userRole: string | undefined;
}

function Section({ title, cards, userRole }: SectionProps) {
  const visible = cards.filter((c) => {
    if (!c.roles) return true;
    if (!userRole) return false;
    return (c.roles as ReadonlyArray<string>).includes(userRole);
  });
  if (visible.length === 0) return null;
  return (
    <section className="dashboard-home__section" aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="dashboard-home__section-title">
        {title}
      </h2>
      <div className="dashboard-home__cards">
        {visible.map((card) => (
          <Link
            href={card.href}
            key={card.href}
            className="dashboard-home__card"
          >
            <article>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <span className="dashboard-home__card-cta" aria-hidden="true">
                Abrir →
              </span>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
