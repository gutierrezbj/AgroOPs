/**
 * AgroOps — seed orquestador
 *
 * Ejecuta los seeds en orden de dependencias.
 * Idempotente: usa ON CONFLICT DO NOTHING en cada inserción.
 *
 * Uso:
 *   pnpm tsx src/db/seed/index.ts
 *
 * o vía Makefile:
 *   make db-seed
 */
import "dotenv/config";
import { seedUsers } from "./users";
import { seedDrones } from "./drones";
import { seedPilots } from "./pilots";
import { seedClients } from "./clients";

async function main() {
  console.log("AgroOps — seed inicial AgroM");
  console.log("─────────────────────────────");

  await seedUsers();
  await seedDrones();
  await seedPilots();
  await seedClients();

  console.log("─────────────────────────────");
  console.log("✓ Seed completado.");
  console.log("");
  console.log("Credenciales DEV (password por defecto: agroops-dev-2026):");
  console.log("  - juancho@systemrapid.io  (admin)");
  console.log("  - john@agrom.es           (piloto)");
  console.log("  - adriana@agrom.es        (operario)");
  console.log("");
  console.log("Sobrescribir con env vars SEED_ADMIN_PASSWORD / SEED_PILOT_PASSWORD / SEED_OPERARIO_PASSWORD si quieres otras.");

  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Seed falló:", err);
  process.exit(1);
});
