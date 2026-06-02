/**
 * One-time script: imports March, April, May 2026 attendance CSVs into the DB.
 * Run with: npx tsx scripts/import-attendance.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../src/db/schema";
import { eq, and, like } from "drizzle-orm";
import { parseAttendanceCSV, getSundaysInMonth } from "../src/lib/attendance-parser";
import * as fs from "fs";
import * as path from "path";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

const CSV_FILES = [
  "Employee_Salary_Tracker_Formatted - March 2026.csv",
  "Employee_Salary_Tracker_Formatted - April 2026.csv",
  "Employee_Salary_Tracker_Formatted - May 2026 (1).csv",
];

async function run() {
  console.log("📋 Importing attendance CSVs…\n");

  const allEmployees = await db.select({ id: schema.employees.id, name: schema.employees.name, monthly_wage: schema.employees.monthly_wage }).from(schema.employees);
  const empMap = new Map(allEmployees.map(e => [e.name.toLowerCase(), e.id]));
  console.log(`Found ${allEmployees.length} employees: ${allEmployees.map(e => e.name).join(", ")}\n`);

  for (const file of CSV_FILES) {
    const filePath = path.join(__dirname, "csv", file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found, skipping: ${file}`);
      continue;
    }

    const csvText = fs.readFileSync(filePath, "utf-8");
    const { rows, globalHolidays, skipped, yearMonth } = parseAttendanceCSV(csvText);
    console.log(`\n📁 ${file}`);
    console.log(`   Parsed ${rows.length} rows, skipped ${skipped} special/empty rows`);
    console.log(`   Month: ${yearMonth}`);

    let imported = 0, dupes = 0, unknownEmps: string[] = [], cashCreated = 0;

    // Pre-check which employee+month combos already have data (do this ONCE up front)
    const alreadyImported = new Set<string>();
    for (const row of rows) {
      const empId = empMap.get(row.employee.toLowerCase());
      if (!empId) continue;
      const ym = row.date.slice(0, 7);
      const key = `${empId}:${ym}`;
      if (!alreadyImported.has(key)) {
        const existing = await db.select({ id: schema.attendance.id })
          .from(schema.attendance)
          .where(and(eq(schema.attendance.employee_id, empId), like(schema.attendance.date, `${ym}%`)))
          .limit(1);
        if (existing.length > 0) alreadyImported.add(key);
      }
    }

    for (const row of rows) {
      const empId = empMap.get(row.employee.toLowerCase());
      if (!empId) {
        if (!unknownEmps.includes(row.employee)) unknownEmps.push(row.employee);
        continue;
      }

      const ym = row.date.slice(0, 7);
      if (alreadyImported.has(`${empId}:${ym}`)) { dupes++; continue; }

      try {
        await db.insert(schema.attendance).values({
          employee_id: empId,
          date: row.date,
          in_time: row.inTime,
          out_time: row.outTime,
          break_time: row.breakTime,
          hours: row.hours,
          hourly_rate: row.hourlyRate,
          daily_salary: row.dailySalary,
          advance: row.advance,
        });
        imported++;

        // Upsert salary_month
        const smExisting = await db.select({ id: schema.salary_months.id })
          .from(schema.salary_months)
          .where(and(eq(schema.salary_months.employee_id, empId), eq(schema.salary_months.year_month, ym)))
          .limit(1);
        if (smExisting.length === 0) {
          try {
            await db.insert(schema.salary_months).values({
              employee_id: empId, year_month: ym, status: "unpaid",
              monthly_wage: row.monthlyWage || null,
            });
          } catch { /* unique conflict ok */ }
        }

        // Cash log for advances
        if (row.advance > 0) {
          const desc = `[SALARY] Advance — ${row.employee} (${row.date})`;
          const cashEx = await db.select({ id: schema.cash_expenses.id })
            .from(schema.cash_expenses)
            .where(and(eq(schema.cash_expenses.date, row.date), eq(schema.cash_expenses.description, desc)))
            .limit(1);
          if (cashEx.length === 0) {
            await db.insert(schema.cash_expenses).values({
              date: row.date, amount: row.advance,
              category: "Salary Advance", description: desc, paid_to: row.employee,
            });
            cashCreated++;
          }
        }
      } catch (e: any) {
        if (String(e?.message).includes("UNIQUE")) dupes++;
        else console.error(`   ❌ ${row.employee} ${row.date}: ${e?.message}`);
      }
    }

    if (unknownEmps.length) console.log(`   ⚠️  Unknown employees (not in DB): ${unknownEmps.join(", ")}`);
    console.log(`   ✅ Imported ${imported} records, ${dupes} already existed, ${cashCreated} cash logs created`);

    // ── Auto-add Sundays + public holidays for all imported employees ───────
    if (yearMonth && imported > 0) {
      const importedEmpIds = [...new Set(
        rows.filter(r => empMap.has(r.employee.toLowerCase())).map(r => empMap.get(r.employee.toLowerCase())!)
      )];
      let sundaysAdded = 0, holidaysAdded = 0, holidaysSkipped: string[] = [];

      const sundays = getSundaysInMonth(yearMonth);
      for (const date of sundays) {
        for (const empId of importedEmpIds) {
          const emp = allEmployees.find(e => e.id === empId)!;
          const rate = Math.round(((emp.monthly_wage ?? 20000) / 300) * 100) / 100;
          try {
            await db.insert(schema.attendance).values({
              employee_id: empId, date,
              in_time: "08:00:00 AM", out_time: "06:00:00 PM", break_time: 0,
              hours: 10, hourly_rate: rate, daily_salary: 10 * rate, advance: 0, notes: "Sunday",
            });
            sundaysAdded++;
          } catch { /* duplicate ok */ }
        }
      }

      for (const holiday of globalHolidays) {
        if (!holiday.resolvedDate || !holiday.resolvedDate.startsWith(yearMonth)) {
          if (!holiday.resolvedDate) holidaysSkipped.push(holiday.label);
          continue;
        }
        for (const empId of importedEmpIds) {
          const emp = allEmployees.find(e => e.id === empId)!;
          const rate = Math.round(((emp.monthly_wage ?? 20000) / 300) * 100) / 100;
          try {
            await db.insert(schema.attendance).values({
              employee_id: empId, date: holiday.resolvedDate,
              in_time: "08:00:00 AM", out_time: "06:00:00 PM", break_time: 0,
              hours: 10, hourly_rate: rate, daily_salary: 10 * rate, advance: 0, notes: holiday.label,
            });
            holidaysAdded++;
          } catch { /* duplicate ok */ }
        }
      }

      if (sundaysAdded) console.log(`   📅 Added ${sundaysAdded} Sunday entries`);
      if (holidaysAdded) console.log(`   🎉 Added ${holidaysAdded} holiday entries`);
      if (holidaysSkipped.length) console.log(`   ⚠️  Holidays with no fixed date (add manually): ${holidaysSkipped.join(", ")}`);
    }
  }

  console.log("\n✅ Done!");
  process.exit(0);
}

run().catch(e => { console.error("Failed:", e); process.exit(1); });
