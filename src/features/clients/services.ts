/**
 * AgroOps — clients services (HU-06 + HU-18)
 *
 * Lógica de negocio de clientes. **HU-18**: integración real con Holded
 * vía `syncClientToHolded()` que llama `findOrCreateHoldedContact()` y
 * persiste el `holdedContactId` en DB para que HU-19 pueda disparar
 * facturas sin re-buscar el contacto cada vez.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type Client, type NewClient } from "@/db/schema/clients";
import {
  findOrCreateHoldedContact,
  type HoldedContact,
} from "@/server/integrations/holded";
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

/**
 * Resultado de la sincronización con Holded. Permite al caller distinguir
 * para auditar la acción y mostrar el feedback adecuado en UI.
 */
export interface SyncClientToHoldedResult {
  client: Client;
  contact: HoldedContact;
  /** true si se creó nuevo en Holded; false si se enlazó a uno existente. */
  created: boolean;
  /** true si el cliente ya tenía holdedContactId cacheado (no hubo round trip). */
  cached: boolean;
}

/**
 * HU-18 — Sincroniza el cliente AgroOps con el directorio de contactos
 * Holded:
 *
 * 1. Carga el cliente desde DB.
 * 2. Llama `findOrCreateHoldedContact` (estrategia idempotente: cache → taxId → email → create).
 * 3. Persiste `holdedContactId` si no estaba ya cacheado.
 *
 * El caller (server action) se encarga de:
 * - RBAC (admin u operario).
 * - logAudit("client.holded_synced" | "client.holded_created").
 * - revalidatePath de la ruta del cliente.
 *
 * Lanza `HoldedError` (kind="not-configured"|"unauthorized"|...) si Holded
 * rechaza la operación. La action las captura y devuelve mensaje legible.
 */
export async function syncClientToHolded(
  clientId: string,
): Promise<SyncClientToHoldedResult> {
  const client = await getClient(clientId);
  if (!client) {
    throw new Error(`syncClientToHolded: cliente ${clientId} no existe`);
  }

  const wasCached = Boolean(client.holdedContactId);
  const { contact, created } = await findOrCreateHoldedContact({
    name: client.name,
    taxId: client.taxId,
    contactEmail: client.contactEmail,
    contactPhone: client.contactPhone,
    holdedContactId: client.holdedContactId,
  });

  // Si era cache hit en findOrCreate, no necesitamos persistir.
  let updated: Client = client;
  if (!wasCached) {
    const [persisted] = await db
      .update(clients)
      .set({ holdedContactId: contact.id })
      .where(eq(clients.id, clientId))
      .returning();
    if (persisted) updated = persisted;
  }

  return {
    client: updated,
    contact,
    created,
    cached: wasCached,
  };
}
