/**
 * Fix existing attendance data: employees who worked on a Sunday currently have
 * the Sunday bonus missing (UNIQUE constraint silently blocked the auto-insert).
 * This script finds those entries and adds the 10h bonus to their daily_salary.
 *
 * Run with: npx tsx scripts/fix-sunday-overtime.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../src/db/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

async function run() {
  // Find all attendance entries that:
  // 1. Fall on a Sunday (strftime('%w') = '0')
  // 2. Are real work entries (notes is null or empty — NOT already a Sunday-only bonus entry)
  // 3. Don't already have the bonus applied (notes != 'Sunday (worked + bonus)')
  const rows = await db.select({
    id:           schema.attendance.id,
    employee_id:  schema.attendance.employee_id,
    date:         schema.attendance.date,
    hourly_rate:  schema.attendance.hourly_rate,
    daily_salary: schema.attendance.daily_salary,
    notes:        schema.attendance.notes,
  })
  .from(schema.attendance)
  .where(sql`strftime('%w', ${schema.attendance.date}) = '0'`);

  // Filter to real work entries (not the auto-Sunday or already-fixed ones)
  const workEntries = rows.filter(r =>
    r.notes !== "Sunday" &&
    r.notes !== "Sunday (worked + bonus)" &&
    !r.notes?.startsWith("Eid") &&
    !r.notes?.startsWith("Labour")
  );

  if (workEntries.length === 0) {
    console.log("✅ No Sunday work entries found that need fixing.");
    process.exit(0);
  }

  console.log(`Found ${workEntries.length} Sunday work entries without bonus. Applying...`);

  let fixed = 0;
  for (const row of workEntries) {
    const bonus = 10 * (row.hourly_rate ?? 66.67);
    await db.update(schema.attendance)
      .set({
        daily_salary: (row.daily_salary ?? 0) + bonus,
        notes: "Sunday (worked + bonus)",
      })
      .where(eq(schema.attendance.id, row.id));
    console.log(`  ✅ ${row.date} emp#${row.employee_id}: added bonus PKR ${bonus.toFixed(2)} → new salary PKR ${((row.daily_salary ?? 0) + bonus).toFixed(2)}`);
    fixed++;
  }

  console.log(`\n✅ Fixed ${fixed} entries.`);
  process.exit(0);
}

run().catch(e => { console.error("Failed:", e); process.exit(1); });
