"use server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createEntity } from "@/lib/entity-actions";
import { retagAllTransactions } from "@/lib/actions";

export async function assignUnknownAccount(input: {
  unknownId: number; kind: "acct" | "raast"; value: string;
  mode: "existing" | "new"; existingEntityId?: number;
  newName?: string; newType?: string; newCategory?: string;
}) {
  let entityId: number;
  if (input.mode === "existing") {
    if (!input.existingEntityId) throw new Error("Select an entity");
    entityId = input.existingEntityId;
    await db.insert(schema.account_identifiers).values({
      entity_id: entityId, kind: input.kind, value: input.value,
    });
  } else {
    if (!input.newName?.trim()) throw new Error("Name is required");
    const created = await createEntity({
      name: input.newName.trim(), type: input.newType as any || "other",
      category: input.newCategory || undefined,
      identifiers: [{ kind: input.kind, value: input.value }],
    });
    entityId = created.id;
  }
  await db.delete(schema.unknown_accounts).where(eq(schema.unknown_accounts.id, input.unknownId));
  await retagAllTransactions();
  revalidatePath("/unknown"); revalidatePath("/transactions"); revalidatePath("/dashboard");
}
