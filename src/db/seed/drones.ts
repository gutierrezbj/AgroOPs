/**
 * AgroOps — seed: drones
 *
 * Flota inicial AgroM:
 * - DJI Agras T50 (aplicador agrícola, clase EASA C6)
 * - DJI Mavic 3E (inspección/mapeo, clase EASA C1)
 * - DJI D-RTK 2 (estación base RTK, no UAS)
 *
 * Los seriales y nº de seguro se rellenan al alta real de los activos.
 */
import { db } from "../index";
import { drones, type NewDrone } from "../schema/drones";

export async function seedDrones() {
  const rows: NewDrone[] = [
    {
      model: "Agras T50",
      manufacturer: "DJI",
      serialNumber: "SEED-T50-AGROM-001",
      registrationCode: null,
      mtomGrams: 92_000, // ~92 kg con tanque lleno (40L) y batería
      easaClass: "c6",
      applicationCapable: true,
      payloadLitres: "40.00",
      flightHours: "0",
      status: "active",
      notes: "Aplicador principal AgroM. Operación STS bajo paraguas Drovinci hasta SORA propia.",
    },
    {
      model: "Mavic 3 Enterprise",
      manufacturer: "DJI",
      serialNumber: "SEED-M3E-AGROM-001",
      mtomGrams: 920,
      easaClass: "c1",
      applicationCapable: false,
      payloadLitres: null,
      flightHours: "0",
      status: "active",
      notes: "Inspección previa al aplicador. Mapeo y verificación de límites de parcela.",
    },
    {
      model: "D-RTK 2",
      manufacturer: "DJI",
      serialNumber: "SEED-DRTK2-AGROM-001",
      mtomGrams: 0, // estación base, no vuela
      easaClass: "n_a",
      applicationCapable: false,
      payloadLitres: null,
      flightHours: "0",
      status: "active",
      notes: "Estación base RTK para precisión centimétrica del T50.",
    },
  ];

  const inserted = await db
    .insert(drones)
    .values(rows)
    .onConflictDoNothing({ target: drones.serialNumber })
    .returning();

  console.log(`  ✓ drones: ${inserted.length} insertados / ${rows.length} totales`);
  return inserted;
}
