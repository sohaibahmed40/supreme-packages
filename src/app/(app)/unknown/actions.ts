"use server";
import { db, schema } from "@/db";
import { eq, desc, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createEntity } from "@/lib/entity-actions";
import { retagAllTransactions } from "@/lib/actions";

export async function getTransactionsForIdentifier(kind: string, value: string) {
  // Unknown transactions have account_digits=null; the identifier lives in the description.
  // We store LAST-4 digits of the account number, so we must match the value at the END
  // of the digit sequence: "XXXX001002528307001" ends with "7001" → search "%7001 %".
  // Using a trailing space is reliable because bank descriptions put a space after the acct#.
  const patterns =
    kind === "raast"
      ? [`%PYxxx%${value} %`, `%PYxxx${value} %`]
      : [`%XXXX%${value} %`, `%xxx%${value} %`];

  const results = await Promise.all(
    patterns.map(p =>
      db
        .select({
          id: schema.transactions.id,
          date: schema.transactions.date,
          description: schema.transactions.description,
          debit: schema.transactions.debit,
          credit: schema.transactions.credit,
          category: schema.transactions.category,
        })
        .from(schema.transactions)
        .where(like(schema.transactions.description, p))
        .orderBy(desc(schema.transactions.date))
        .limit(200)
    )
  );

  // Merge and deduplicate by id, then re-sort
  const seen = new Set<number>();
  const merged = results.flat().filter(t => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
  merged.sort((a, b) => (a.date < b.date ? 1 : -1));
  return merged;
}

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
