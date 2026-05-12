/**
 * AgroOps — clients services (HU-06)
 *
 * Lógica de negocio de clientes. La integración real con Holded
 * (`holdedContactId` sync) llega en HU-19; aquí sólo persistimos el id si
 * el operador lo pega manualmente.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type Client, type NewClient } from "@/db/schema/clients";
import type {
  CreateClientInput,
  ListClientFilters,
  UpdateClientInput,
} from "./schemas";

function toDbValues(
  input: CreateClientInput | UpdateClientInput,
): Partial<NewClient> {
  const out: Partial<NewClient> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.taxId !== undefined) out.taxId = input.taxId;
  if (input.type !== undefined) out.type = input.type;
  if (input.contactPerson !== undefined) out.contactPerson = input.contactPerson;
  if (input.contactEmail !== undefined) out.contactEmail = input.contactEmail;
  if (input.contactPhone !== undefined) out.contactPhone = input.contactPhone;
  if (input.billingAddress !== undefined) {
    out.billingAddress = input.billingAddress;
  }
  if (input.city !== undefined) out.city = input.city;
  if (input.province !== undefined) out.province = input.province;
  if (input.postalCode !== undefined) out.postalCode = input.postalCode;
  if (input.country !== undefined) out.country = input.country;
  if (input.holdedContactId !== undefined) {
    out.holdedContactId = input.holdedContactId;
  }
  if (input.notes !== undefined) out.notes = input.notes;
  return out;
}

export async function listClients(
  filters: ListClientFilters = {},
): Promise<Client[]> {
  const conditions = [];
  if (filters.type) conditions.push(eq(clients.type, filters.type));
  if (filters.country) conditions.push(eq(clients.country, filters.country));

  return db
    .select()
    .from(clients)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(clients.name));
}

export async function getClient(id: string): Promise<Client | null> {
  const result = await db.query.clients.findFirst({
    where: eq(clients.id, id),
  });
  return result ?? null;
}

export async function getClientByTaxId(taxId: string): Promise<Client | null> {
  const result = await db.query.clients.findFirst({
    where: eq(clients.taxId, taxId),
  });
  return result ?? null;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const values = toDbValues(input) as NewClient;
  const [created] = await db.insert(clients).values(values).returning();
  if (!created) {
    throw new Error("createClient: inserción no devolvió fila");
  }
  return created;
}

export async function updateClient(
  id: string,
  input: UpdateClientInput,
): Promise<Client | null> {
  const values = toDbValues(input);
  if (Object.keys(values).length === 0) {
    return getClient(id);
  }
  const [updated] = await db
    .update(clients)
    .set(values)
    .where(eq(clients.id, id))
    .returning();
  return updated ?? null;
}
