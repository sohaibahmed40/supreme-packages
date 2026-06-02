import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../src/db/schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

async function run() {
  const a = await db.delete(schema.attendance);
  const s = await db.delete(schema.salary_months);
  console.log("Cleared attendance and salary_months tables");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
