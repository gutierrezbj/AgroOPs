/**
 * AgroOps — seed: clients
 *
 * Cliente seed de pruebas. Sustituir por clientes reales tras primer alta operativa.
 */
import { db } from "../index";
import { clients, type NewClient } from "../schema/clients";

export async function seedClients() {
  const rows: NewClient[] = [
    {
      name: "Cliente de prueba (Seed)",
      taxId: "SEED-CLIENT-001",
      type: "agricultor",
      contactPerson: "Cliente Demo",
      contactEmail: "demo@example.com",
      contactPhone: "+34 600 000 000",
      billingAddress: "Dirección de prueba",
      city: "Sevilla",
      province: "Sevilla",
      postalCode: "41001",
      country: "ES",
      notes: "Registro seed. Eliminar antes de pasar a operación real.",
    },
  ];

  const inserted = await db
    .insert(clients)
    .values(rows)
    .onConflictDoNothing({ target: clients.taxId })
    .returning();

  console.log(`  ✓ clients: ${inserted.length} insertados / ${rows.length} totales`);
  return inserted;
}
