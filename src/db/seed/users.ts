/**
 * AgroOps — seed: users
 *
 * Cuentas iniciales AgroM:
 * - JuanCho (admin, dirección operativa SRS)
 * - John (piloto aplicador, autónomo en fase puente)
 * - Adriana (operario, titular fiscal en fase puente)
 *
 * Passwords iniciales en variables de entorno. Si no están, se usan defaults DEV.
 */
import bcrypt from "bcryptjs";
import { db } from "../index";
import { users, type NewUser } from "../schema/users";

const DEFAULT_DEV_PASSWORD = "agroops-dev-2026";

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function seedUsers() {
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_DEV_PASSWORD;
  const pilotPassword = process.env.SEED_PILOT_PASSWORD ?? DEFAULT_DEV_PASSWORD;
  const operarioPassword =
    process.env.SEED_OPERARIO_PASSWORD ?? DEFAULT_DEV_PASSWORD;

  const rows: NewUser[] = [
    {
      email: "juancho@systemrapid.io",
      passwordHash: await hashPassword(adminPassword),
      fullName: "Juan Ramón Gutiérrez (JuanCho)",
      role: "admin",
      active: true,
    },
    {
      email: "john@agrom.es",
      passwordHash: await hashPassword(pilotPassword),
      fullName: "John (piloto aplicador AgroM)",
      role: "piloto",
      active: true,
    },
    {
      email: "adriana@agrom.es",
      passwordHash: await hashPassword(operarioPassword),
      fullName: "Adriana (operario AgroM)",
      role: "operario",
      active: true,
    },
  ];

  const inserted = await db
    .insert(users)
    .values(rows)
    .onConflictDoNothing({ target: users.email })
    .returning();

  console.log(`  ✓ users: ${inserted.length} insertados / ${rows.length} totales`);
  return inserted;
}
