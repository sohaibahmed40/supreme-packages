"use server";
import { db, schema } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface IdentifierInput {
  kind: "acct" | "raast" | "name";
  value: string;
  account_holder_name?: string;
}

export async function createEntity(input: {
  name: string;
  type: typeof schema.entities.$inferInsert["type"];
  category?: string;
  notes?: string;
  pending_amount?: number;
  identifiers: IdentifierInput[];
}) {
  const [created] = await db.insert(schema.entities).values({
    name: input.name,
    type: input.type,
    category: input.category || null,
    notes: input.notes || null,
    pending_amount: input.pending_amount || 0,
  }).returning();
  for (const id of input.identifiers) {
    if (!id.value.trim()) continue;
    try {
      await db.insert(schema.account_identifiers).values({
        entity_id: created.id,
        kind: id.kind,
        value: id.value.trim(),
        account_holder_name: id.account_holder_name || null,
      });
    } catch (e) {
      // Skip duplicate identifier values
    }
  }
  revalidatePath("/clients");
  revalidatePath("/suppliers");
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  return created;
}

export async function updateEntity(id: number, input: {
  name?: string;
  category?: string | null;
  notes?: string | null;
  pending_amount?: number;
}) {
  await db.update(schema.entities).set({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.pending_amount !== undefined ? { pending_amount: input.pending_amount } : {}),
  }).where(eq(schema.entities.id, id));
  revalidatePath("/clients");
  revalidatePath("/suppliers");
  revalidatePath("/employees");
  revalidatePath("/dashboard");
}

export async function deleteEntity(id: number) {
  await db.delete(schema.entities).where(eq(schema.entities.id, id));
  revalidatePath("/clients");
  revalidatePath("/suppliers");
  revalidatePath("/employees");
  revalidatePath("/dashboard");
}

export async function addIdentifier(entity_id: number, input: IdentifierInput) {
  await db.insert(schema.account_identifiers).values({
    entity_id,
    kind: input.kind,
    value: input.value.trim(),
    account_holder_name: input.account_holder_name || null,
  });
  revalidatePath("/clients");
  revalidatePath("/suppliers");
  revalidatePath("/employees");
}

export async function removeIdentifier(id: number) {
  await db.delete(schema.account_identifiers).where(eq(schema.account_identifiers.id, id));
  revalidatePath("/clients");
  revalidatePath("/suppliers");
  revalidatePath("/employees");
}
