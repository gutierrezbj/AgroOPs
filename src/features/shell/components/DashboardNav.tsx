"use client";

/**
 * AgroOps — DashboardNav (Sprint 5 Distinctiveness Audit)
 *
 * Navegación primaria del dashboard. Cliente porque necesita leer
 * `pathname` para resaltar el link activo. Iconografía minimalista
 * (Unicode + texto) — sin librería de iconos para no inflar bundle.
 *
 * Los links visibles dependen del rol: admin ve `/audit-log`, el resto no.
 * El active state usa border-bottom terra (--brand-accent) que es la
 * excepción documentada del Identity Sprint: terra sólo para marca y
 * para indicar "estás aquí" (literal acción de marca sobre el lienzo).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  /** Match exacto (default) o prefix. */
  matchPrefix?: boolean;
  /** Si está, sólo se muestra a estos roles. */
  roles?: ReadonlyArray<"admin" | "piloto" | "operario" | "viewer">;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/missions", label: "Misiones", matchPrefix: true },
  { href: "/dashboard/clients", label: "Clientes", matchPrefix: true },
  { href: "/dashboard/parcels", label: "Parcelas", matchPrefix: true },
  { href: "/dashboard/fleet", label: "Flota", matchPrefix: true },
  {
    href: "/dashboard/phytosanitary",
    label: "Fitosanitarios",
    matchPrefix: true,
  },
  { href: "/dashboard/map", label: "Mapa" },
  { href: "/dashboard/field-notebook", label: "Cuaderno" },
  {
    href: "/dashboard/audit-log",
    label: "Audit",
    roles: ["admin"],
  },
];

interface DashboardNavProps {
  userRole?: string | null;
}

export function DashboardNav({ userRole }: DashboardNavProps) {
  const pathname = usePathname() ?? "";

  const items = NAV.filter((item) => {
    if (!item.roles) return true;
    if (!userRole) return false;
    return (item.roles as ReadonlyArray<string>).includes(userRole);
  });

  return (
    <nav className="dashboard-nav" aria-label="Navegación principal">
      <ul>
        {items.map((item) => {
          const isActive = item.matchPrefix
            ? pathname === item.href || pathname.startsWith(`${item.href}/`)
            : pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`dashboard-nav__link${isActive ? " dashboard-nav__link--active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
