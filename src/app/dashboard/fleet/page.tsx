/**
 * AgroOps — /dashboard/fleet
 *
 * Índice de fleet management con cards equivalentes al patrón del home
 * dashboard. Acceso rápido a drones + pilotos + (futuro: mantenimiento
 * aeronaves en v1.1).
 */
import Link from "next/link";
import { listDrones } from "@/features/fleet/services";
import { listPilots } from "@/features/fleet/pilots/services";

export const metadata = {
  title: "AgroOps — Flota",
};

export const dynamic = "force-dynamic";

interface FleetCard {
  href: string;
  title: string;
  description: string;
  count: number;
  countLabel: string;
}

export default async function FleetIndexPage() {
  const [drones, pilots] = await Promise.all([listDrones(), listPilots()]);

  const cards: FleetCard[] = [
    {
      href: "/dashboard/fleet/drones",
      title: "Drones",
      description:
        "Aeronaves UAS aplicadoras (T50, T40), inspección (Mavic 3E) y estaciones RTK (D-RTK 2). MTOM, clase EASA, seguros y horas de vuelo.",
      count: drones.length,
      countLabel: drones.length === 1 ? "registrado" : "registrados",
    },
    {
      href: "/dashboard/fleet/pilots",
      title: "Pilotos",
      description:
        "Operadores con licencia AESA, cualificación ROPO, seguro civil y reconocimiento médico. Vinculados opcionalmente a cuenta de usuario.",
      count: pilots.length,
      countLabel: pilots.length === 1 ? "registrado" : "registrados",
    },
  ];

  return (
    <main className="dashboard-home">
      <header className="dashboard-home__hero">
        <h1>Flota</h1>
        <p className="dashboard-home__greeting">
          Gestión de aeronaves y pilotos. Cada misión aérea exige asignar un
          dron aplicador + un piloto con ROPO activo antes de entrar en{" "}
          <code>planned</code>.
        </p>
      </header>

      <section className="dashboard-home__section">
        <div className="dashboard-home__cards">
          {cards.map((card) => (
            <Link
              href={card.href}
              key={card.href}
              className="dashboard-home__card"
            >
              <article>
                <h3>
                  {card.title}{" "}
                  <span className="fleet-card__count mono">
                    ({card.count} {card.countLabel})
                  </span>
                </h3>
                <p>{card.description}</p>
                <span className="dashboard-home__card-cta" aria-hidden="true">
                  Abrir →
                </span>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
