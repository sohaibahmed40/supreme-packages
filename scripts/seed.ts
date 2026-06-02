/**
 * Seed script: populates entities, identifiers, and employees.
 * Run with: npx tsx scripts/seed.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

interface EntitySeed {
  name: string;
  type: typeof schema.entities.$inferInsert["type"];
  category?: string;
  notes?: string;
  identifiers: { kind: "acct" | "raast" | "name"; value: string }[];
}

const ENTITIES: EntitySeed[] = [
  // ── CLIENTS ──
  { name: "Jojo Foods (Zikria Fiaz)", type: "client", category: "Food Packaging Client",
    identifiers: [
      { kind: "acct", value: "2084" }, { kind: "acct", value: "0298" }, { kind: "acct", value: "4934" },
      { kind: "raast", value: "4520" }, { kind: "raast", value: "1121" },
      { kind: "name", value: "Z.A MOBILE CENTRE" }, { kind: "name", value: "Z.A MOBILE" },
      { kind: "name", value: "ZIKRIA" },
    ]},
  { name: "Nexgen Packages", type: "client", category: "Packaging Client/Supplier",
    notes: "Also acts as supplier sometimes",
    identifiers: [
      { kind: "acct", value: "4670" }, { kind: "acct", value: "3105" }, { kind: "acct", value: "2754" },
      { kind: "name", value: "NEXGEN PACKAGES" }, { kind: "name", value: "MUHAMMAD WAHEED IQBAL" },
    ]},
  { name: "Rigid Core (Muhammad Ali)", type: "client", category: "Packaging Client/Supplier",
    notes: "Also acts as supplier sometimes",
    identifiers: [
      { kind: "acct", value: "1942" }, { kind: "name", value: "RIGID CORE" },
    ]},
  { name: "Usman Ali Bunty Box", type: "client", category: "Packaging Client",
    notes: "Currently settled (even)",
    identifiers: [
      { kind: "raast", value: "0043" },
      { kind: "name", value: "USMAN ALI TRADERS" }, { kind: "name", value: "BUNTY BOX" },
    ]},

  // ── SUPPLIERS ──
  { name: "Yasir Paper Tube Operator", type: "supplier", category: "Raw Material - Paper Tube",
    notes: "Raw material + services",
    identifiers: [
      { kind: "acct", value: "8913" }, { kind: "acct", value: "6577" },
      { kind: "acct", value: "1495" }, { kind: "acct", value: "8121" },
      { kind: "acct", value: "7923" },
      { kind: "name", value: "TAHIRA PARVEEN" }, { kind: "name", value: "ALI RAZA" },
      { kind: "name", value: "SAMEERA TUFAIL" }, { kind: "name", value: "YASIR ALI" },
    ]},
  { name: "Daniyal Glue Karachi", type: "supplier", category: "Raw Material - Glue",
    identifiers: [{ kind: "acct", value: "3496" }, { kind: "name", value: "DANIYAL KHAN" }]},
  { name: "Qasim Malik Paper", type: "supplier", category: "Raw Material - Paper",
    identifiers: [{ kind: "acct", value: "1923" }, { kind: "name", value: "QASIM MALIK" }]},
  { name: "Haroon Ali Waste Paper", type: "supplier", category: "Raw Material - Waste Paper",
    identifiers: [{ kind: "acct", value: "0205" }, { kind: "name", value: "HAROON ALI" }]},
  { name: "Ismail Punjab Paper", type: "supplier", category: "Raw Material - Paper",
    identifiers: [{ kind: "acct", value: "7486" }, { kind: "name", value: "USMAN SIDDIQUE" }]},
  { name: "Ahsan Javaid Paper", type: "supplier", category: "Raw Material - Paper",
    identifiers: [{ kind: "acct", value: "1892" }, { kind: "name", value: "MUHAMMAD AHSAN JAVAID" }]},
  { name: "Imran Bashir (Maggi Paper)", type: "supplier", category: "Raw Material - Food Paper",
    identifiers: [{ kind: "acct", value: "8598" }, { kind: "name", value: "MUHAMMAD IMRAN" }]},
  { name: "Talha Gujranwala", type: "supplier", category: "Raw Material",
    identifiers: [{ kind: "acct", value: "8783" }, { kind: "name", value: "MUHAMMAD TALHA" }]},
  { name: "Arshad Plastic Cap", type: "supplier", category: "Raw Material - Plastic",
    identifiers: [{ kind: "acct", value: "3003" }, { kind: "name", value: "ARSHAD" }]},
  { name: "Saddam PVC Ring", type: "supplier", category: "Raw Material - PVC",
    identifiers: [{ kind: "acct", value: "7270" }, { kind: "name", value: "MISBAH BIBI" }]},
  { name: "Iftikhar Gatta Merchant", type: "supplier", category: "Raw Material",
    identifiers: [{ kind: "acct", value: "3126" }, { kind: "name", value: "IFTIKHAR GATTA" }]},
  { name: "Diamond Glue (Abbas Raza)", type: "supplier", category: "Raw Material - Glue",
    identifiers: [{ kind: "acct", value: "3863" }, { kind: "name", value: "ABBAS RAZA" }]},
  { name: "Usman Naeem Malik Glue", type: "supplier", category: "Raw Material - Glue",
    identifiers: [{ kind: "acct", value: "9289" }, { kind: "name", value: "USMAN NAEEM MALIK" }]},

  // ── TRANSPORT ──
  { name: "Awais Ali Rickshaw", type: "transport", category: "Transport",
    identifiers: [{ kind: "acct", value: "8466" }, { kind: "name", value: "AWAIS ALI" }]},
  { name: "Tariq Biker", type: "transport", category: "Transport",
    identifiers: [{ kind: "acct", value: "2077" }, { kind: "name", value: "HAFIZ MUHAMMAD TARIQ" }]},
  { name: "Bilal Biker", type: "transport", category: "Transport",
    identifiers: [{ kind: "acct", value: "9490" }, { kind: "name", value: "MUHAMMAD BILAL ZUBAIR" }]},
  { name: "Yango Drive (Ride Hailing)", type: "transport", category: "Transport - Yango/Ride",
    notes: "Yango driver payments",
    identifiers: [
      { kind: "name", value: "KHAZIMA YASIR BUTT" }, { kind: "name", value: "MUHAMMAD SHERAZ" },
      { kind: "name", value: "MUHAMMAD BILAL KHALID" }, { kind: "name", value: "NADEEM AHMED" },
    ]},

  // ── RENT ──
  { name: "Aslam Factory Rent", type: "rent", category: "Factory Rent",
    identifiers: [
      { kind: "acct", value: "0018" }, { kind: "acct", value: "0020" }, { kind: "acct", value: "6001" },
      { kind: "name", value: "AHMAR" }, { kind: "name", value: "MIAN MUHAMMAD ASLAM" },
    ]},

  // ── STAFF (bank-paid) ──
  { name: "Haseeb Ahmad (Brother)", type: "staff", category: "Salary + Factory Expenses",
    notes: "Brother — handles factory ops + salary",
    identifiers: [{ kind: "acct", value: "4318" }, { kind: "name", value: "HASEEB AHMAD" }]},
  { name: "Muhammad Ali Raza (Employee)", type: "staff", category: "Salary",
    identifiers: [
      { kind: "acct", value: "4645" }, { kind: "acct", value: "0710" },
      { kind: "name", value: "MUHAMMAD ALI RAZA" },
    ]},
  { name: "Irfan Masih (Employee)", type: "staff", category: "Salary",
    identifiers: [{ kind: "acct", value: "0515" }, { kind: "name", value: "IRFAN MASIH" }]},
  { name: "Abdur Rehman (Employee)", type: "staff", category: "Salary",
    identifiers: [{ kind: "acct", value: "3946" }, { kind: "name", value: "ABDUR REHMAN" }]},
  { name: "Hasnain Ali (Employee)", type: "staff", category: "Salary",
    identifiers: [{ kind: "acct", value: "3720" }, { kind: "name", value: "HASNAIN ALI" }]},
  { name: "Rehaan via Sajjad Ali", type: "staff", category: "Salary",
    notes: "Worker Rehaan — paid via father Sajjad Ali",
    identifiers: [{ kind: "acct", value: "3577" }, { kind: "name", value: "SAJJAD ALI" }]},

  // ── OWN ACCOUNTS ──
  { name: "Sohaib Ahmad HBL (Personal)", type: "own_account", category: "Personal — Loan to Business",
    identifiers: [{ kind: "acct", value: "0103" }]},
  { name: "Sohaib Ahmad (Raast 0062)", type: "own_account", category: "Personal — Loan to Business",
    identifiers: [{ kind: "raast", value: "0062" }]},
  { name: "Sohaib Ahmad (Other Personal)", type: "own_account", category: "Personal — Loan to Business",
    identifiers: [{ kind: "acct", value: "9726" }]},
  { name: "Company UBL (Savings)", type: "own_account", category: "Company Savings",
    identifiers: [{ kind: "acct", value: "5933" }]},

  // ── PERSONAL ──
  { name: "Sidra Waheed (Sister Loan)", type: "personal_loan", category: "Loan from Sister",
    notes: "PKR 100,000 loan from sister",
    identifiers: [{ kind: "acct", value: "8005" }, { kind: "name", value: "SIDRA WAHEED" }]},
  { name: "Ayesha Naveed (Family)", type: "personal_family_settled",
    notes: "Sent online, paid back in cash — even",
    identifiers: [{ kind: "acct", value: "3018" }, { kind: "name", value: "AYESHA NAVEED" }]},
  { name: "Huzaifa Hussnain (Friend)", type: "personal_family_settled",
    notes: "Paid back for dinner — even",
    identifiers: [{ kind: "acct", value: "8167" }, { kind: "name", value: "HUZAIFA HUSSNAIN" }]},
  { name: "Muhammad Nabeel (Friend)", type: "personal_family_settled",
    identifiers: [{ kind: "acct", value: "6940" }, { kind: "name", value: "MUHAMMAD NABEEL" }]},
  { name: "Shahriyar Ali Butt (Friend)", type: "personal_family_settled",
    notes: "One-time — paid back in cash",
    identifiers: [{ kind: "acct", value: "5965" }, { kind: "name", value: "SHAHRIYAR ALI BUTT" }]},
  { name: "Marium Khala (Mother Remittance)", type: "personal_non_business",
    notes: "Money for mother — not business",
    identifiers: [{ kind: "acct", value: "0262" }, { kind: "name", value: "REMITLY" }]},

  // ── INVESTMENTS ──
  { name: "CDC MEEZAN SOVEREIGN FUND", type: "personal_investment", category: "Investment Returns",
    identifiers: [{ kind: "acct", value: "0641" }, { kind: "name", value: "CDC TRUSTEE MEEZAN SOVEREIGN" }]},
  { name: "CDC MEEZAN DAILY INCOME FUND", type: "personal_investment", category: "Investment Returns",
    identifiers: [{ kind: "acct", value: "9837" }, { kind: "name", value: "CDC TRUSTEE MEEZAN DAILY" }]},

  // ── SERVICES ──
  { name: "Muhammad Asim Javeed (Internet)", type: "service", category: "Internet Service",
    identifiers: [{ kind: "name", value: "MUHAMMAD ASIM JAVEED" }]},

  // ── ONE-TIME ──
  { name: "Ishaq Ahmed (Transport One-Time)", type: "one_time_expense", category: "Transport — One Time",
    identifiers: [{ kind: "acct", value: "6919" }, { kind: "name", value: "ISHAQ AHMED" }]},

  // ── ONLINE SHOPPING ──
  { name: "AliExpress (Tools)", type: "online_shopping", category: "Business Tools — Online",
    identifiers: [{ kind: "name", value: "ALIEXPRESS" }]},
  { name: "Daraz (Tools)", type: "online_shopping", category: "Business Tools — Online",
    identifiers: [{ kind: "name", value: "DARAZ" }]},
];

const EMPLOYEES = [
  { name: "Shahzaib", monthly_wage: 21240 },
  { name: "Hussnain", monthly_wage: 25000 },
  { name: "Qaiser",   monthly_wage: 20000 },
  { name: "Nabeel",   monthly_wage: 20000 },
  { name: "Ali",      monthly_wage: 20000 },
  { name: "Adeel",    monthly_wage: 20000 },
  { name: "Faizan",   monthly_wage: 20000 },
  { name: "Umar",     monthly_wage: 20000 },
  { name: "Rehaan",   monthly_wage: 21240 },
];

async function seed() {
  console.log("🌱 Seeding Supreme Packages database…\n");

  // Insert entities + identifiers
  for (const e of ENTITIES) {
    const existing = await db.select({ id: schema.entities.id })
      .from(schema.entities).where(eq(schema.entities.name, e.name)).limit(1);
    if (existing.length > 0) {
      console.log(`  ⏭️  ${e.type.padEnd(20)} ${e.name} (already exists)`);
      continue;
    }
    try {
      const [created] = await db.insert(schema.entities).values({
        name: e.name, type: e.type,
        category: e.category || null,
        notes: e.notes || null,
      }).returning();
      for (const id of e.identifiers) {
        try {
          await db.insert(schema.account_identifiers).values({
            entity_id: created.id, kind: id.kind, value: id.value,
          });
        } catch { /* skip duplicate identifier */ }
      }
      console.log(`  ✅ ${e.type.padEnd(20)} ${e.name} (${e.identifiers.length} identifiers)`);
    } catch (err: any) {
      console.error(`  ❌ ${e.name}: ${err?.message}`);
    }
  }

  // Insert employees
  console.log("\n👷 Seeding employees…");
  for (const emp of EMPLOYEES) {
    try {
      await db.insert(schema.employees).values({
        name: emp.name, monthly_wage: emp.monthly_wage, active: true,
      });
      console.log(`  ✅ ${emp.name} — PKR ${emp.monthly_wage.toLocaleString()}/month`);
    } catch (err: any) {
      if (String(err?.message).includes("UNIQUE")) {
        console.log(`  ⏭️  ${emp.name} (already exists)`);
      } else {
        console.error(`  ❌ ${emp.name}: ${err?.message}`);
      }
    }
  }

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch(e => { console.error("Seed failed:", e); process.exit(1); });
