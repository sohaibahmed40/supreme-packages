import { db, schema } from "@/db";
import { sql } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { formatPKR } from "@/lib/utils";
import EmployeesClient from "./employees-client";

export default async function EmployeesPage() {
  const [employees, rawSummaries, salaryMonths, analyticsRows, analyticsMonthly] = await Promise.all([
    db.select().from(schema.employees).orderBy(schema.employees.name),

    db.select({
      employee_id: schema.attendance.employee_id,
      year_month: sql<string>`substr(${schema.attendance.date}, 1, 7)`,
      // gross earned = daily_salary (net) + advance = hours × hourly_rate
      total_earned:  sql<number>`coalesce(sum(${schema.attendance.daily_salary} + ${schema.attendance.advance}), 0)`,
      total_advance: sql<number>`coalesce(sum(${schema.attendance.advance}), 0)`,
      total_hours:   sql<number>`coalesce(sum(${schema.attendance.hours}), 0)`,
      days:          sql<number>`count(*)`,
    })
    .from(schema.attendance)
    .groupBy(schema.attendance.employee_id, sql`substr(${schema.attendance.date}, 1, 7)`),

    db.select({
      employee_id:  schema.salary_months.employee_id,
      year_month:   schema.salary_months.year_month,
      status:       schema.salary_months.status,
      monthly_wage: schema.salary_months.monthly_wage,
    }).from(schema.salary_months),

    // Analytics: per-employee aggregate stats across all attendance
    db.select({
      employee_id:    schema.attendance.employee_id,
      total_days:     sql<number>`count(*)`,
      total_hours:    sql<number>`coalesce(sum(${schema.attendance.hours}), 0)`,
      total_advance:  sql<number>`coalesce(sum(${schema.attendance.advance}), 0)`,
      total_earned:   sql<number>`coalesce(sum(${schema.attendance.daily_salary} + ${schema.attendance.advance}), 0)`,
      // Late arrivals: in_time stored as "HH:MM:SS AM/PM", late if hour >= 9 AM (>30 min grace)
      // Format: "08:30:00 AM" — check if AM and hour part > 8, or if 9+ AM
      late_days:      sql<number>`sum(case when ${schema.attendance.in_time} is not null and ${schema.attendance.notes} is null and cast(substr(${schema.attendance.in_time},1,2) as integer) > 8 and ${schema.attendance.in_time} like '%AM%' then 1 else 0 end)`,
      // Overtime days: hours > 10
      overtime_days:  sql<number>`sum(case when ${schema.attendance.hours} > 10 then 1 else 0 end)`,
      // Late night: out_time in PM and hour >= 9 PM
      late_night_days: sql<number>`sum(case when ${schema.attendance.out_time} like '%PM%' and cast(substr(${schema.attendance.out_time},1,2) as integer) >= 9 and cast(substr(${schema.attendance.out_time},1,2) as integer) != 12 then 1 else 0 end)`,
      // Sunday/holiday entries
      holiday_days:   sql<number>`sum(case when ${schema.attendance.notes} is not null and ${schema.attendance.notes} != '' then 1 else 0 end)`,
      avg_hours:      sql<number>`coalesce(avg(${schema.attendance.hours}), 0)`,
    })
    .from(schema.attendance)
    .groupBy(schema.attendance.employee_id),

    // Analytics per employee per month (for the month filter)
    db.select({
      employee_id:     schema.attendance.employee_id,
      year_month:      sql<string>`substr(${schema.attendance.date}, 1, 7)`,
      total_days:      sql<number>`count(*)`,
      total_hours:     sql<number>`coalesce(sum(${schema.attendance.hours}), 0)`,
      total_advance:   sql<number>`coalesce(sum(${schema.attendance.advance}), 0)`,
      total_earned:    sql<number>`coalesce(sum(${schema.attendance.daily_salary} + ${schema.attendance.advance}), 0)`,
      late_days:       sql<number>`sum(case when ${schema.attendance.in_time} is not null and ${schema.attendance.notes} is null and cast(substr(${schema.attendance.in_time},1,2) as integer) > 8 and ${schema.attendance.in_time} like '%AM%' then 1 else 0 end)`,
      overtime_days:   sql<number>`sum(case when ${schema.attendance.hours} > 10 then 1 else 0 end)`,
      late_night_days: sql<number>`sum(case when ${schema.attendance.out_time} like '%PM%' and cast(substr(${schema.attendance.out_time},1,2) as integer) >= 9 and cast(substr(${schema.attendance.out_time},1,2) as integer) != 12 then 1 else 0 end)`,
      holiday_days:    sql<number>`sum(case when ${schema.attendance.notes} is not null and ${schema.attendance.notes} != '' then 1 else 0 end)`,
      avg_hours:       sql<number>`coalesce(avg(${schema.attendance.hours}), 0)`,
    })
    .from(schema.attendance)
    .groupBy(schema.attendance.employee_id, sql`substr(${schema.attendance.date}, 1, 7)`),
  ]);

  const total = employees.reduce((a, e) => a + (e.monthly_wage ?? 0), 0);
  const activeCount = employees.filter(e => e.active).length;
  const allMonths = [...new Set(rawSummaries.map(s => s.year_month))].sort().reverse();
  const unpaidMonths = salaryMonths.filter(s => s.status === "unpaid").length;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employees</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage factory workers and track monthly attendance & salary.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Workers</div>
          <div className="text-3xl font-bold mt-1">{employees.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Active</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">{activeCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Combined Wage</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">PKR {formatPKR(total)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Unpaid Months</div>
          <div className={`text-3xl font-bold mt-1 ${unpaidMonths > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {unpaidMonths}
          </div>
        </Card>
      </div>

      <EmployeesClient
        employees={employees}
        monthSummaries={rawSummaries}
        salaryMonths={salaryMonths}
        allMonths={allMonths}
        analyticsRows={analyticsRows}
        analyticsMonthly={analyticsMonthly}
      />
    </div>
  );
}
