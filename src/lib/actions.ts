"use server";
import { db, schema } from "@/db";
import { sql, eq, and } from "drizzle-orm";
import { parseMeezanCSV } from "@/lib/csv-parser";
import {
  buildIdentifierIndex, matchEntity, categorizeWithEntity,
  extractCandidateIdentifiers, extractCandidateName,
} from "@/lib/tagger";
import { revalidatePath } from "next/cache";

export interface IngestResult {
  parsed: number;
  inserted: number;
  duplicates: number;
  tagged: number;
  unknownIdentifiers: number;
  unidentified: number;
  errors: string[];
}

export async function ingestCSV(content: string): Promise<IngestResult> {
  const result: IngestResult = {
    parsed: 0, inserted: 0, duplicates: 0,
    tagged: 0, unknownIdentifiers: 0, unidentified: 0, errors: [],
  };

  try {
    const { transactions: parsed } = parseMeezanCSV(content);
    result.parsed = parsed.length;
    if (parsed.length === 0) {
      result.errors.push("No transactions found in this CSV. Verify it's a Meezan statement.");
      return result;
    }

    // Get all existing dedupe_hashes
    const existing = await db.select({ h: schema.transactions.dedupe_hash }).from(schema.transactions);
    const existingHashes = new Set(existing.map(e => e.h));

    // Build identifier index (one query)
    const index = await buildIdentifierIndex();

    // Track unknown identifiers we saw in this batch (to upsert into queue)
    const newUnknowns = new Map<string, {
      kind: "acct" | "raast";
      value: string;
      sample_description: string;
      sample_name: string | null;
      cnt: number;
      cr: number;
      db: number;
    }>();

    for (const t of parsed) {
      if (existingHashes.has(t.dedupe_hash)) {
        result.duplicates++;
        continue;
      }

      // Try to match
      const match = matchEntity(t.description, index);
      const { category, entity_name } = categorizeWithEntity(match, t.description, t.debit, t.credit);

      // Insert
      try {
        await db.insert(schema.transactions).values({
          dedupe_hash: t.dedupe_hash,
          date: t.date,
          raw_date: t.raw_date,
          description: t.description,
          debit: t.debit,
          credit: t.credit,
          balance: t.balance,
          entity_id: match?.entity_id ?? null,
          category,
          account_digits: match?.matched_value ?? null,
          source: "csv",
        });
        result.inserted++;
        if (match) result.tagged++;
        else {
          result.unidentified++;
          // Queue unknown identifiers
          const cands = extractCandidateIdentifiers(t.description);
          for (const c of cands) {
            const key = `${c.kind}:${c.value}`;
            if (!newUnknowns.has(key)) {
              newUnknowns.set(key, {
                kind: c.kind, value: c.value,
                sample_description: t.description,
                sample_name: extractCandidateName(t.description),
                cnt: 1, cr: t.credit, db: t.debit, last_date: t.date,
              });
            } else {
              const u = newUnknowns.get(key)!;
              u.cnt++; u.cr += t.credit; u.db += t.debit;
              if (t.date > u.last_date) u.last_date = t.date;
            }
          }
        }
      } catch (e: any) {
        // unique constraint => duplicate that slipped through; count it
        if (String(e?.message || "").includes("UNIQUE")) result.duplicates++;
        else result.errors.push(`Insert error for ${t.date}: ${e?.message}`);
      }
    }

    // Upsert unknown identifiers
    for (const u of newUnknowns.values()) {
      const existingRow = await db.select().from(schema.unknown_accounts)
        .where(and(eq(schema.unknown_accounts.kind, u.kind),
                    eq(schema.unknown_accounts.value, u.value)))
        .limit(1);
      if (existingRow.length > 0) {
        const prevDate = existingRow[0].last_txn_date ?? "";
        await db.update(schema.unknown_accounts).set({
          txn_count: (existingRow[0].txn_count || 0) + u.cnt,
          total_credit: (existingRow[0].total_credit || 0) + u.cr,
          total_debit: (existingRow[0].total_debit || 0) + u.db,
          sample_description: u.sample_description,
          sample_name: u.sample_name,
          last_txn_date: u.last_date > prevDate ? u.last_date : prevDate,
        }).where(eq(schema.unknown_accounts.id, existingRow[0].id));
      } else {
        await db.insert(schema.unknown_accounts).values({
          kind: u.kind, value: u.value,
          sample_description: u.sample_description,
          sample_name: u.sample_name,
          txn_count: u.cnt, total_credit: u.cr, total_debit: u.db,
          last_txn_date: u.last_date,
        });
        result.unknownIdentifiers++;
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/unknown");
  } catch (e: any) {
    result.errors.push(`Fatal: ${e?.message || e}`);
  }

  return result;
}

/**
 * Re-tag all transactions after the user identifies new accounts.
 */
export async function retagAllTransactions(): Promise<{ updated: number }> {
  const index = await buildIdentifierIndex();
  const all = await db.select().from(schema.transactions);
  let updated = 0;
  for (const t of all) {
    const match = matchEntity(t.description, index);
    if (!match) continue;
    if (t.entity_id !== match.entity_id) {
      const { category } = categorizeWithEntity(match, t.description, t.debit, t.credit);
      await db.update(schema.transactions).set({
        entity_id: match.entity_id,
        category,
        account_digits: match.matched_value,
      }).where(eq(schema.transactions.id, t.id));
      updated++;
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/unknown");
  return { updated };
}

/**
 * Rebuild unknown_accounts from scratch by re-scanning all unidentified transactions.
 * Fixes stale entries caused by regex changes or double-seeding.
 */
export async function rebuildUnknownAccounts(): Promise<{ rebuilt: number }> {
  await db.delete(schema.unknown_accounts);

  const unidentified = await db
    .select({
      description: schema.transactions.description,
      date: schema.transactions.date,
      credit: schema.transactions.credit,
      debit: schema.transactions.debit,
    })
    .from(schema.transactions)
    .where(sql`${schema.transactions.entity_id} IS NULL`);

  const map = new Map<string, {
    kind: string; value: string;
    sample_description: string; sample_name: string | null;
    cnt: number; cr: number; db_: number; last_date: string;
  }>();

  for (const t of unidentified) {
    const cands = extractCandidateIdentifiers(t.description);
    for (const c of cands) {
      const key = `${c.kind}:${c.value}`;
      if (!map.has(key)) {
        map.set(key, {
          kind: c.kind, value: c.value,
          sample_description: t.description,
          sample_name: extractCandidateName(t.description),
          cnt: 1, cr: t.credit, db_: t.debit, last_date: t.date,
        });
      } else {
        const u = map.get(key)!;
        u.cnt++; u.cr += t.credit; u.db_ += t.debit;
        if (t.date > u.last_date) u.last_date = t.date;
      }
    }
  }

  for (const u of map.values()) {
    await db.insert(schema.unknown_accounts).values({
      kind: u.kind as "acct" | "raast" | "name",
      value: u.value,
      sample_description: u.sample_description,
      sample_name: u.sample_name,
      txn_count: u.cnt,
      total_credit: u.cr,
      total_debit: u.db_,
      last_txn_date: u.last_date,
    });
  }

  revalidatePath("/unknown");
  revalidatePath("/dashboard");
  return { rebuilt: map.size };
}

/**
 * Clear all transactions (mappings preserved).
 */
export async function resetTransactions(): Promise<{ deleted: number }> {
  const result = await db.delete(schema.transactions);
  await db.delete(schema.unknown_accounts);
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/unknown");
  return { deleted: Number(result.rowsAffected || 0) };
}
