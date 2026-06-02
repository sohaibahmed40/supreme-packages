"use server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { categorizeWithEntity } from "@/lib/tagger";

export async function reassignTransaction(txnId: number, entityId: number | null) {
  if (entityId === null) {
    await db.update(schema.transactions).set({
      entity_id: null,
      category: "Other",
      account_digits: null,
    }).where(eq(schema.transactions.id, txnId));
  } else {
    const [ent] = await db.select().from(schema.entities).where(eq(schema.entities.id, entityId)).limit(1);
    const [txn] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, txnId)).limit(1);
    if (!ent || !txn) throw new Error("Not found");
    const fakeMatch = {
      entity_id: ent.id,
      entity_name: ent.name,
      entity_type: ent.type,
      entity_category: ent.category,
      matched_kind: "name" as const,
      matched_value: "",
    };
    const { category } = categorizeWithEntity(fakeMatch, txn.description, txn.debit, txn.credit);
    await db.update(schema.transactions).set({
      entity_id: entityId,
      category,
    }).where(eq(schema.transactions.id, txnId));
  }
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
