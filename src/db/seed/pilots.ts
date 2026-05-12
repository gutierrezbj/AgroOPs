/**
 * AgroOps — seed: pilots
 *
 * Pilotos iniciales AgroM. John como piloto aplicador único en fase puente.
 *
 * Datos reales (licencias, ROPO, seguros) se completan tras alta operativa.
 * El seed deja la fila creada con placeholders para que la UI lo muestre.
 */
import { eq } from "drizzle-orm";
import { db } from "../index";
import { pilots, type NewPilot } from "../schema/pilots";
import { users } from "../schema/users";

export async function seedPilots() {
  // Buscar la cuenta de usuario "John" para enlazar pilot.user_id
  const johnUser = await db.query.users.findFirst({
    where: eq(users.email, "john@agrom.es"),
  });

  const rows: NewPilot[] = [
    {
      userId: johnUser?.id ?? null,
      fullName: "John (piloto aplicador AgroM)",
      nif: "SEED-PILOT-001", // sustituir por NIF real
      aesaLicenseNumber: null,
      aesaLicenseClass: "STS-02",
      aesaLicenseExpiresAt: null,
      ropoQualified: true,
      ropoNumber: null,
      ropoLevel: "Piloto aplicador",
      ropoExpiresAt: null,
      flightHours: "0",
      active: true,
      notes: "Piloto principal. Cualificación ROPO 'Piloto aplicador' requerida para aplicación fitosanitaria aérea.",
    },
  ];

  const inserted = await db
    .insert(pilots)
    .values(rows)
    .onConflictDoNothing({ target: pilots.nif })
    .returning();

  console.log(`  ✓ pilots: ${inserted.length} insertados / ${rows.length} totales`);
  return inserted;
}
