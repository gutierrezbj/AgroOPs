/**
 * AgroOps — ParcelsTable
 */
import Link from "next/link";
import type { ParcelWithGeoJSON } from "../services";

interface ParcelsTableProps {
  parcels: ParcelWithGeoJSON[];
  clientNames: Record<string, string>; // clientId → name
}

function fmtHa(value: string): string {
  return `${parseFloat(value).toFixed(2)} ha`;
}

export function ParcelsTable({ parcels, clientNames }: ParcelsTableProps) {
  if (parcels.length === 0) {
    return (
      <p className="drones-table__empty">
        No hay parcelas registradas.{" "}
        <Link href="/dashboard/parcels/new">Crea la primera</Link>.
      </p>
    );
  }

  const totalHa = parcels.reduce(
    (sum, p) => sum + parseFloat(p.areaHectares),
    0,
  );

  return (
    <table className="drones-table">
      <caption>
        Parcelas ({parcels.length}) — {totalHa.toFixed(2)} ha en total
      </caption>
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">SIGPAC</th>
          <th scope="col">Cliente</th>
          <th scope="col">Área</th>
          <th scope="col">Cultivo</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {parcels.map((p) => (
          <tr key={p.id}>
            <td>
              <strong>{p.name}</strong>
            </td>
            <td>
              <code>{p.sigpacReference}</code>
            </td>
            <td>{clientNames[p.clientId] ?? p.clientId.slice(0, 8)}</td>
            <td>{fmtHa(p.areaHectares)}</td>
            <td>
              {p.crop ?? "—"}
              {p.cropVariety && (
                <>
                  <br />
                  <small>{p.cropVariety}</small>
                </>
              )}
            </td>
            <td>
              <Link href={`/dashboard/parcels/${p.id}`}>Editar</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
