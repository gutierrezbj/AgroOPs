/**
 * AgroOps — ClientsTable
 */
import Link from "next/link";
import type { Client } from "@/db/schema/clients";
import { ClientTypeBadge } from "./ClientTypeBadge";

export function ClientsTable({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <p className="drones-table__empty">
        No hay clientes registrados.{" "}
        <Link href="/dashboard/clients/new">Crea el primero</Link>.
      </p>
    );
  }

  return (
    <table className="drones-table">
      <caption>Clientes AgroOps ({clients.length})</caption>
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">CIF/NIF</th>
          <th scope="col">Tipo</th>
          <th scope="col">Contacto</th>
          <th scope="col">Ubicación</th>
          <th scope="col">Holded</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {clients.map((c) => (
          <tr key={c.id}>
            <td>
              <strong>{c.name}</strong>
            </td>
            <td>
              <code>{c.taxId}</code>
            </td>
            <td>
              <ClientTypeBadge type={c.type} />
            </td>
            <td>
              {c.contactPerson ? (
                <>
                  {c.contactPerson}
                  {c.contactEmail ? (
                    <>
                      <br />
                      <small>{c.contactEmail}</small>
                    </>
                  ) : null}
                </>
              ) : c.contactEmail ? (
                <small>{c.contactEmail}</small>
              ) : (
                "—"
              )}
            </td>
            <td>
              {[c.city, c.province, c.country]
                .filter(Boolean)
                .join(", ") || "—"}
            </td>
            <td>
              {c.holdedContactId ? (
                <code>{c.holdedContactId}</code>
              ) : (
                <small>—</small>
              )}
            </td>
            <td>
              <Link href={`/dashboard/clients/${c.id}`}>Editar</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
