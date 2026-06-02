"use server";
import { db, schema } from "@/db";
import { eq, and, like, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseAttendanceCSV, getSundaysInMonth } from "@/lib/attendance-parser";

// ── Import CSV ────────────────────────────────────────────────────────────────

export async function importAttendanceCSV(csvText: string): Promise<{
  imported: number;
  skippedDupes: number;
  newEmployeesCreated: string[];
  cashCreated: number;
  sundaysAdded: number;
  holidaysAdded: number;
  holidaysSkipped: string[];
  monthsProcessed: string[];
}> {
  const { rows, globalHolidays } = parseAttendanceCSV(csvText);

  const allEmployees = await db.select({
    id: schema.employees.id, name: schema.employees.name,
    monthly_wage: schema.employees.monthly_wage,
  }).from(schema.employees);
  const empMap = new Map(allEmployees.map(e => [e.name.toLowerCase(), e]));

  let imported = 0, skippedDupes = 0, cashCreated = 0;
  let sundaysAdded = 0, holidaysAdded = 0;
  const newEmployeesCreated: string[] = [];
  const holidaysSkipped: string[] = [];
  const monthsProcessed = new Set<string>();
  const monthWageMap = new Map<string, number>();

  // Auto-create any employees found in the CSV but not in the system
  for (const row of rows) {
    const label = row.employee.toLowerCase();
    if (!empMap.has(label) && row.employee.trim()) {
      try {
        const [created] = await db.insert(schema.employees)
          .values({ name: row.employee.trim(), monthly_wage: row.monthlyWage || 0, active: true })
          .returning({ id: schema.employees.id, name: schema.employees.name, monthly_wage: schema.employees.monthly_wage });
        empMap.set(label, created);
        allEmployees.push(created);
        newEmployeesCreated.push(row.employee.trim());
      } catch { /* unique constraint — another thread inserted it, re-fetch */ }
      if (!empMap.has(label)) {
        const [existing] = await db.select({ id: schema.employees.id, name: schema.employees.name, monthly_wage: schema.employees.monthly_wage })
          .from(schema.employees).where(eq(schema.employees.name, row.employee.trim())).limit(1);
        if (existing) { empMap.set(label, existing); allEmployees.push(existing); }
      }
    }
  }

  // Pre-check which employee+month combos already have data
  const alreadyImported = new Set<string>();
  for (const row of rows) {
    const emp = empMap.get(row.employee.toLowerCase());
    if (!emp) continue;
    const ym = row.date.slice(0, 7);
    const key = `${emp.id}:${ym}`;
    if (!alreadyImported.has(key)) {
      const existing = await db.select({ id: schema.attendance.id })
        .from(schema.attendance)
        .where(and(eq(schema.attendance.employee_id, emp.id), like(schema.attendance.date, `${ym}%`)))
        .limit(1);
      if (existing.length > 0) alreadyImported.add(key);
    }
  }

  // ── Insert per-employee rows ──────────────────────────────────────────────
  for (const row of rows) {
    const emp = empMap.get(row.employee.toLowerCase());
    if (!emp) continue; // shouldn't happen — all employees were auto-created above
    const ym = row.date.slice(0, 7);
    if (alreadyImported.has(`${emp.id}:${ym}`)) { skippedDupes++; continue; }

    try {
      await db.insert(schema.attendance).values({
        employee_id: emp.id, date: row.date,
        in_time: row.inTime, out_time: row.outTime, break_time: row.breakTime,
        hours: row.hours, hourly_rate: row.hourlyRate,
        daily_salary: row.dailySalary, advance: row.advance,
      });
      imported++;
      const mk = `${emp.id}:${ym}`;
      monthsProcessed.add(mk);
      if (!monthWageMap.has(mk)) monthWageMap.set(mk, row.monthlyWage);
    } catch { skippedDupes++; continue; }

    if (row.advance > 0) {
      const desc = `[SALARY] Advance — ${row.employee} (${row.date})`;
      const ex = await db.select({ id: schema.cash_expenses.id }).from(schema.cash_expenses)
        .where(and(eq(schema.cash_expenses.date, row.date), eq(schema.cash_expenses.description, desc))).limit(1);
      if (ex.length === 0) {
        await db.insert(schema.cash_expenses).values({ date: row.date, amount: row.advance, category: "Salary Advance", description: desc, paid_to: row.employee });
        cashCreated++;
      }
    }
  }

  // ── Determine year-month for special entries ──────────────────────────────
  // Get it from processed rows, or from the CSV's first dated row
  const yearMonths = [...new Set([...monthsProcessed].map(k => k.split(":")[1]))];

  for (const ym of yearMonths) {
    const [y, m] = ym.split("-").map(Number);

    // Collect employees who were imported for this month
    const empIds = [...monthsProcessed]
      .filter(k => k.endsWith(`:${ym}`))
      .map(k => parseInt(k.split(":")[0]));

    if (empIds.length === 0) continue;

    // ── Auto-add Sundays (overtime if employee already worked that day) ──────
    const sundays = getSundaysInMonth(ym);
    for (const date of sundays) {
      for (const empId of empIds) {
        const emp = allEmployees.find(e => e.id === empId);
        if (!emp) continue;
        const hourlyRate = Math.round(((emp.monthly_wage ?? 20000) / 300) * 100) / 100;
        const bonus = 10 * hourlyRate;

        const existing = await db.select({ id: schema.attendance.id, notes: schema.attendance.notes })
          .from(schema.attendance)
          .where(and(eq(schema.attendance.employee_id, empId), eq(schema.attendance.date, date)))
          .limit(1);

        if (existing.length > 0) {
          // Employee worked this Sunday — add bonus as overtime (don't change hours/times)
          if (existing[0].notes !== "Sunday") {
            await db.update(schema.attendance)
              .set({ daily_salary: sql`${schema.attendance.daily_salary} + ${bonus}`, notes: "Sunday (worked + bonus)" })
              .where(eq(schema.attendance.id, existing[0].id));
            sundaysAdded++;
          }
          // already processed (notes = "Sunday" means it was a day-off Sunday entry, leave it)
        } else {
          // Employee didn't work — insert a full 10h Sunday entry
          await db.insert(schema.attendance).values({
            employee_id: empId, date,
            in_time: "08:00:00 AM", out_time: "06:00:00 PM", break_time: 0,
            hours: 10, hourly_rate: hourlyRate, daily_salary: bonus, advance: 0,
            notes: "Sunday",
          });
          sundaysAdded++;
        }
      }
    }

    // ── Auto-add public holidays from CSV (same overtime logic) ────────────
    for (const holiday of globalHolidays) {
      if (!holiday.resolvedDate) {
        if (!holidaysSkipped.includes(holiday.label)) holidaysSkipped.push(holiday.label);
        continue;
      }
      if (!holiday.resolvedDate.startsWith(ym)) continue;

      for (const empId of empIds) {
        const emp = allEmployees.find(e => e.id === empId);
        if (!emp) continue;
        const hourlyRate = Math.round(((emp.monthly_wage ?? 20000) / 300) * 100) / 100;
        const bonus = 10 * hourlyRate;

        const existing = await db.select({ id: schema.attendance.id, notes: schema.attendance.notes })
          .from(schema.attendance)
          .where(and(eq(schema.attendance.employee_id, empId), eq(schema.attendance.date, holiday.resolvedDate)))
          .limit(1);

        if (existing.length > 0) {
          if (existing[0].notes !== holiday.label) {
            await db.update(schema.attendance)
              .set({ daily_salary: sql`${schema.attendance.daily_salary} + ${bonus}`, notes: `${holiday.label} (worked + bonus)` })
              .where(eq(schema.attendance.id, existing[0].id));
            holidaysAdded++;
          }
        } else {
          await db.insert(schema.attendance).values({
            employee_id: empId, date: holiday.resolvedDate,
            in_time: "08:00:00 AM", out_time: "06:00:00 PM", break_time: 0,
            hours: 10, hourly_rate: hourlyRate, daily_salary: bonus, advance: 0,
            notes: holiday.label,
          });
          holidaysAdded++;
        }
      }
    }
  }

  // Upsert salary_month records
  for (const key of monthsProcessed) {
    const [empIdStr, yearMonth] = key.split(":");
    await upsertSalaryMonth(parseInt(empIdStr), yearMonth, monthWageMap.get(key));
  }

  revalidatePath("/employees");
  revalidatePath("/cash");

  return {
    imported, skippedDupes, newEmployeesCreated, cashCreated,
    sundaysAdded, holidaysAdded, holidaysSkipped,
    monthsProcessed: [...new Set([...monthsProcessed].map(k => k.split(":")[1]))],
  };
}

async function upsertSalaryMonth(empId: number, yearMonth: string, monthlyWage?: number) {
  const existing = await db.select({ id: schema.salary_months.id })
    .from(schema.salary_months)
    .where(and(eq(schema.salary_months.employee_id, empId), eq(schema.salary_months.year_month, yearMonth)))
    .limit(1);
  if (existing.length === 0) {
    try {
      await db.insert(schema.salary_months).values({
        employee_id: empId, year_month: yearMonth, status: "unpaid",
        monthly_wage: monthlyWage ?? null,
      });
    } catch { /* already exists */ }
  }
}

// ── Delete entire month ───────────────────────────────────────────────────────

export async function deleteMonthData(yearMonth: string) {
  // Delete attendance for all employees for this month
  await db.delete(schema.attendance)
    .where(like(schema.attendance.date, `${yearMonth}%`));

  // Delete salary_month records
  await db.delete(schema.salary_months)
    .where(eq(schema.salary_months.year_month, yearMonth));

  // Delete auto-created cash logs for this month
  await db.delete(schema.cash_expenses)
    .where(and(
      like(schema.cash_expenses.date, `${yearMonth}%`),
      like(schema.cash_expenses.description, "[SALARY]%")
    ));

  revalidatePath("/employees");
  revalidatePath("/cash");
}

// ── Mark all employees paid for a month ──────────────────────────────────────

export async function markAllMonthPaid(yearMonth: string) {
  const today = new Date().toISOString().slice(0, 10);
  await db.update(schema.salary_months)
    .set({ status: "paid", paid_at: today })
    .where(eq(schema.salary_months.year_month, yearMonth));
  revalidatePath("/employees");
}

// ── Monthly status toggles ────────────────────────────────────────────────────

export async function markMonthPaid(employeeId: number, yearMonth: string) {
  await db.update(schema.salary_months)
    .set({ status: "paid", paid_at: new Date().toISOString().slice(0, 10) })
    .where(and(eq(schema.salary_months.employee_id, employeeId), eq(schema.salary_months.year_month, yearMonth)));
  revalidatePath("/employees");
}

export async function markMonthUnpaid(employeeId: number, yearMonth: string) {
  await db.update(schema.salary_months)
    .set({ status: "unpaid", paid_at: null })
    .where(and(eq(schema.salary_months.employee_id, employeeId), eq(schema.salary_months.year_month, yearMonth)));
  revalidatePath("/employees");
}

// ── Manual attendance entry ───────────────────────────────────────────────────

export async function addAttendanceEntry(data: {
  employeeId: number; date: string;
  inTime?: string; outTime?: string; breakTime?: number;
  hours: number; hourlyRate: number; advance: number; notes?: string;
}) {
  const isSunday = new Date(data.date + "T00:00:00").getDay() === 0;
  const sundayBonus = isSunday ? 10 * data.hourlyRate : 0;
  const dailySalary = data.hours * data.hourlyRate - data.advance + sundayBonus;
  const notes = isSunday
    ? "Sunday (worked + bonus)"
    : (data.notes || null);
  await db.insert(schema.attendance).values({
    employee_id: data.employeeId, date: data.date,
    in_time: data.inTime || null, out_time: data.outTime || null,
    break_time: data.breakTime ?? 0,
    hours: data.hours, hourly_rate: data.hourlyRate,
    daily_salary: dailySalary, advance: data.advance,
    notes,
  });

  const yearMonth = data.date.slice(0, 7);
  await upsertSalaryMonth(data.employeeId, yearMonth);

  if (data.advance > 0) {
    const emp = await db.select({ name: schema.employees.name }).from(schema.employees).where(eq(schema.employees.id, data.employeeId)).limit(1);
    const name = emp[0]?.name ?? "Employee";
    const desc = `[SALARY] Advance — ${name} (${data.date})`;
    const ex = await db.select({ id: schema.cash_expenses.id }).from(schema.cash_expenses)
      .where(and(eq(schema.cash_expenses.date, data.date), eq(schema.cash_expenses.description, desc))).limit(1);
    if (ex.length === 0) {
      await db.insert(schema.cash_expenses).values({ date: data.date, amount: data.advance, category: "Salary Advance", description: desc, paid_to: name });
    }
  }

  revalidatePath("/employees");
  revalidatePath("/cash");
}

// ── Fetch daily records for detail sheet ─────────────────────────────────────

export async function getEmployeeMonthAttendance(employeeId: number, yearMonth: string) {
  return db.select()
    .from(schema.attendance)
    .where(and(eq(schema.attendance.employee_id, employeeId), like(schema.attendance.date, `${yearMonth}%`)))
    .orderBy(schema.attendance.date);
}

export async function deleteAttendanceEntry(id: number) {
  await db.delete(schema.attendance).where(eq(schema.attendance.id, id));
  revalidatePath("/employees");
}

// ── Employee CRUD ─────────────────────────────────────────────────────────────

export async function createEmployee(data: { name: string; monthlyWage: number; notes?: string }) {
  await db.insert(schema.employees).values({ name: data.name.trim(), monthly_wage: data.monthlyWage, active: true, notes: data.notes || null });
  revalidatePath("/employees");
}

export async function updateEmployee(id: number, data: { name?: string; monthlyWage?: number; active?: boolean; notes?: string | null }) {
  await db.update(schema.employees).set({
    ...(data.name !== undefined && { name: data.name.trim() }),
    ...(data.monthlyWage !== undefined && { monthly_wage: data.monthlyWage }),
    ...(data.active !== undefined && { active: data.active }),
    ...(data.notes !== undefined && { notes: data.notes }),
  }).where(eq(schema.employees.id, id));
  revalidatePath("/employees");
}

export async function deleteEmployee(id: number) {
  await db.delete(schema.employees).where(eq(schema.employees.id, id));
  revalidatePath("/employees");
}

// ── Apply variable-date holiday bonus (e.g. Eid) ─────────────────────────────

export async function applyVariableHoliday(yearMonth: string, holidayDate: string, holidayLabel: string): Promise<{ applied: number }> {
  const monthRows = await db.selectDistinct({ employee_id: schema.attendance.employee_id })
    .from(schema.attendance)
    .where(like(schema.attendance.date, `${yearMonth}%`));

  const empIds = monthRows.map(r => r.employee_id);
  if (empIds.length === 0) return { applied: 0 };

  const emps = await db.select({ id: schema.employees.id, monthly_wage: schema.employees.monthly_wage })
    .from(schema.employees)
    .where(inArray(schema.employees.id, empIds));

  let applied = 0;

  for (const emp of emps) {
    const hourlyRate = Math.round(((emp.monthly_wage ?? 20000) / 300) * 100) / 100;
    const bonus = 10 * hourlyRate;

    const existing = await db.select({ id: schema.attendance.id, notes: schema.attendance.notes })
      .from(schema.attendance)
      .where(and(eq(schema.attendance.employee_id, emp.id), eq(schema.attendance.date, holidayDate)))
      .limit(1);

    if (existing.length > 0) {
      if (!existing[0].notes?.includes(holidayLabel)) {
        await db.update(schema.attendance)
          .set({ daily_salary: sql`${schema.attendance.daily_salary} + ${bonus}`, notes: `${holidayLabel} (worked + bonus)` })
          .where(eq(schema.attendance.id, existing[0].id));
        applied++;
      }
    } else {
      await db.insert(schema.attendance).values({
        employee_id: emp.id, date: holidayDate,
        in_time: "08:00:00 AM", out_time: "06:00:00 PM", break_time: 0,
        hours: 10, hourly_rate: hourlyRate, daily_salary: bonus, advance: 0,
        notes: holidayLabel,
      });
      applied++;
    }
  }

  revalidatePath("/employees");
  return { applied };
}
