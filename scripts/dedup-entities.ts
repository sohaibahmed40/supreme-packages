/**
 * One-time script: removes duplicate entity rows, keeping the lowest-ID copy of each name.
 * Run with: npx tsx scripts/dedup-entities.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../src/db/schema";
import { eq, sql } from "drizzle-orm";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

async function dedup() {
  const all = await db.select({ id: schema.entities.id, name: schema.entities.name, type: schema.entities.type })
    .from(schema.entities)
    .orderBy(schema.entities.name, schema.entities.id);

  // Group by name — keep the first (lowest) ID, collect the rest for deletion
  const keep = new Map<string, number>();
  const toDelete: number[] = [];

  for (const e of all) {
    if (!keep.has(e.name)) {
      keep.set(e.name, e.id);
    } else {
      toDelete.push(e.id);
    }
  }

  if (toDelete.length === 0) {
    console.log("✅ No duplicates found — database is clean.");
    process.exit(0);
  }

  console.log(`Found ${toDelete.length} duplicate row(s) to remove:\n`);

  for (const id of toDelete) {
    const [row] = await db.select({ name: schema.entities.name, type: schema.entities.type })
      .from(schema.entities).where(eq(schema.entities.id, id));
    await db.delete(schema.entities).where(eq(schema.entities.id, id));
    console.log(`  🗑️  Deleted id=${id}  "${row.name}" (${row.type})`);
  }

  console.log(`\n✅ Done — removed ${toDelete.length} duplicate(s).`);
  process.exit(0);
}

dedup().catch(e => { console.error("Failed:", e); process.exit(1); });
