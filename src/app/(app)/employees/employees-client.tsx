"use client";
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { formatPKR, formatDate } from "@/lib/utils";
import {
  importAttendanceCSV, addAttendanceEntry, deleteAttendanceEntry,
  markMonthPaid, markMonthUnpaid, markAllMonthPaid, deleteMonthData,
  createEmployee, updateEmployee, deleteEmployee,
  getEmployeeMonthAttendance, applyVariableHoliday,
} from "@/lib/attendance-actions";
import { toast } from "sonner";
import {
  Upload, Plus, Pencil, Trash2, CheckCircle, XCircle,
  Search, Loader2, ChevronDown, ChevronUp, CheckCheck, Clock, Moon, Coffee, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee { id: number; name: string; monthly_wage: number | null; active: boolean | null; notes: string | null; }
interface MonthSummary { employee_id: number; year_month: string; total_earned: number; total_advance: number; total_hours: number; days: number; }
interface SalaryMonth { employee_id: number; year_month: string; status: string; monthly_wage: number | null; }
interface AnalyticsRow {
  employee_id: number; year_month?: string;
  total_days: number; total_hours: number; total_advance: number; total_earned: number;
  late_days: number; overtime_days: number; late_night_days: number; holiday_days: number; avg_hours: number;
}
interface DayRecord {
  id: number; date: string; in_time: string | null; out_time: string | null; break_time: number | null;
  hours: number | null; hourly_rate: number | null; daily_salary: number | null; advance: number | null; notes: string | null;
}
interface Props {
  employees: Employee[]; monthSummaries: MonthSummary[]; salaryMonths: SalaryMonth[];
  allMonths: string[]; analyticsRows: AnalyticsRow[]; analyticsMonthly: AnalyticsRow[];
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m]} ${y}`;
}

const BRAND_COLORS = ["#E8A93C","#1F2940","#22c55e","#ef4444","#3b82f6","#8b5cf6","#f97316","#06b6d4","#ec4899"];

export default function EmployeesClient({ employees, monthSummaries, salaryMonths, allMonths, analyticsRows, analyticsMonthly }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([allMonths[0] ?? ""]));
  const [detailEmp, setDetailEmp] = useState<Employee | null>(null);
  const [detailMonth, setDetailMonth] = useState("");
  const [detailDays, setDetailDays] = useState<DayRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddDay, setShowAddDay] = useState(false);

  const [analyticsMonth, setAnalyticsMonth] = useState<string>("all");
  const [pendingHolidays, setPendingHolidays] = useState<{ label: string; yearMonth: string; date: string }[]>([]);
  const [applyingHoliday, setApplyingHoliday] = useState<string | null>(null);

  const summaryMap = new Map(monthSummaries.map(s => [`${s.employee_id}:${s.year_month}`, s]));
  const salaryMonthMap = new Map(salaryMonths.map(s => [`${s.employee_id}:${s.year_month}`, s]));

  // Build analytics map from all-time or filtered month
  const activeAnalytics: AnalyticsRow[] = analyticsMonth === "all"
    ? analyticsRows
    : analyticsMonthly.filter(r => r.year_month === analyticsMonth);
  const analyticsMap = new Map(activeAnalytics.map(r => [r.employee_id, r]));

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) || (e.notes ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const result = await importAttendanceCSV(text);
      if (result.imported === 0 && result.sundaysAdded === 0) {
        toast.info("No new data — month already imported. Delete the month first to re-upload.");
      } else {
        const months = result.monthsProcessed.map(fmtMonth).join(", ");
        const parts = [
          `${result.imported} attendance records`,
          `${result.sundaysAdded} Sundays`,
          result.holidaysAdded > 0 && `${result.holidaysAdded} holidays`,
          result.cashCreated > 0 && `${result.cashCreated} cash logs`,
        ].filter(Boolean).join(", ");
        toast.success(`Imported for ${months}: ${parts}.`);
        if (result.newEmployeesCreated.length) toast.info(`Auto-created employees: ${result.newEmployeesCreated.join(", ")}`);
        if (result.holidaysSkipped.length && result.monthsProcessed.length > 0) {
          const ym = result.monthsProcessed[0];
          setPendingHolidays(result.holidaysSkipped.map(label => ({ label, yearMonth: ym, date: "" })));
          toast.warning(`Enter dates for variable holidays: ${result.holidaysSkipped.join(", ")}`);
        }
      }
      router.refresh();
    } catch (err: any) { toast.error(err?.message || "Import failed"); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function handleTogglePaid(empId: number, ym: string, currentStatus: string) {
    try {
      if (currentStatus === "paid") { await markMonthUnpaid(empId, ym); toast.success("Marked as unpaid"); }
      else { await markMonthPaid(empId, ym); toast.success("Marked as paid"); }
      router.refresh();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  async function handleMarkAllPaid(ym: string) {
    try { await markAllMonthPaid(ym); toast.success(`All employees marked paid for ${fmtMonth(ym)}`); router.refresh(); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  async function handleDeleteMonth(ym: string) {
    if (!confirm(`Delete ALL data for ${fmtMonth(ym)}? This removes attendance, salary records and auto-created cash logs. Re-upload CSV to restore.`)) return;
    try { await deleteMonthData(ym); toast.success(`${fmtMonth(ym)} deleted.`); router.refresh(); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  async function openDetail(emp: Employee, ym: string) {
    setDetailEmp(emp); setDetailMonth(ym); setDetailDays([]); setDetailLoading(true); setShowAddDay(false);
    try { setDetailDays((await getEmployeeMonthAttendance(emp.id, ym)) as DayRecord[]); }
    finally { setDetailLoading(false); }
  }

  async function handleDeleteDay(id: number) {
    try { await deleteAttendanceEntry(id); setDetailDays(prev => prev.filter(d => d.id !== id)); toast.success("Entry removed"); router.refresh(); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  function toggleMonth(ym: string) {
    setExpandedMonths(prev => { const n = new Set(prev); n.has(ym) ? n.delete(ym) : n.add(ym); return n; });
  }

  const detailSm      = detailEmp && detailMonth ? salaryMonthMap.get(`${detailEmp.id}:${detailMonth}`) : null;
  const detailSummary = detailEmp && detailMonth ? summaryMap.get(`${detailEmp.id}:${detailMonth}`) : null;

  return (
    <>
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="salary">Salary & Reports</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Team ─────────────────────────────────────────────────── */}
        <TabsContent value="team">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button variant="gold" className="ml-auto" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Employee
              </Button>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-right px-4 py-3">Monthly Wage</th>
                      <th className="text-center px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Notes</th>
                      <th className="text-right px-4 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map(e => (
                      <tr key={e.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold">{e.name}</td>
                        <td className="px-4 py-3 text-right">PKR {formatPKR(e.monthly_wage ?? 0)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${e.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {e.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{e.notes ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditEmp(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No employees found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 2: Salary & Reports ─────────────────────────────────────── */}
        <TabsContent value="salary">
          <div className="space-y-6">
            {/* Import button */}
            <div className="flex justify-end">
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
              <Button variant="gold" onClick={() => fileRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                {importing ? "Importing…" : "Upload Attendance CSV"}
              </Button>
            </div>

            {/* ── Pending variable holidays ─────────────────────────────────── */}
            {pendingHolidays.length > 0 && (
              <Card className="border-amber-300 bg-amber-50/60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                    <span>⚠ Variable-date holidays need dates to apply bonuses</span>
                  </div>
                  {pendingHolidays.map((h, i) => (
                    <div key={h.label} className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium w-28">{h.label}</span>
                      <Input
                        type="date"
                        className="h-8 w-44 text-sm"
                        value={h.date}
                        min={`${h.yearMonth}-01`}
                        max={`${h.yearMonth}-31`}
                        onChange={e => setPendingHolidays(prev => prev.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        disabled={!h.date || applyingHoliday === h.label}
                        onClick={async () => {
                          setApplyingHoliday(h.label);
                          try {
                            const r = await applyVariableHoliday(h.yearMonth, h.date, h.label);
                            toast.success(`${h.label} applied — ${r.applied} employees updated`);
                            setPendingHolidays(prev => prev.filter((_, j) => j !== i));
                            router.refresh();
                          } catch (e: any) { toast.error(e?.message || "Failed"); }
                          finally { setApplyingHoliday(null); }
                        }}
                      >
                        {applyingHoliday === h.label ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Apply Bonus
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground"
                        onClick={() => setPendingHolidays(prev => prev.filter((_, j) => j !== i))}>
                        Dismiss
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ── Analytics dashboard ──────────────────────────────────────── */}
            {analyticsRows.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-semibold">Attendance Analytics</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Standard shift = 10 hours. {analyticsMonth === "all" ? "Showing all-time data." : `Showing ${fmtMonth(analyticsMonth)}.`}</p>
                  </div>
                  <Select value={analyticsMonth} onValueChange={setAnalyticsMonth}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All months</SelectItem>
                      {allMonths.map(ym => (
                        <SelectItem key={ym} value={ym}>{fmtMonth(ym)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(() => {
                    const mostLate = employees.reduce((best, e) => {
                      const a = analyticsMap.get(e.id); if (!a) return best;
                      return (a.late_days > (analyticsMap.get(best?.id ?? -1)?.late_days ?? -1)) ? e : best;
                    }, employees[0]);
                    const mostOvertime = employees.reduce((best, e) => {
                      const a = analyticsMap.get(e.id); if (!a) return best;
                      return (a.overtime_days > (analyticsMap.get(best?.id ?? -1)?.overtime_days ?? -1)) ? e : best;
                    }, employees[0]);
                    const lateNight = employees.reduce((best, e) => {
                      const a = analyticsMap.get(e.id); if (!a) return best;
                      return (a.late_night_days > (analyticsMap.get(best?.id ?? -1)?.late_night_days ?? -1)) ? e : best;
                    }, employees[0]);
                    const avgHoursLeader = employees.reduce((best, e) => {
                      const a = analyticsMap.get(e.id); if (!a) return best;
                      return (a.avg_hours > (analyticsMap.get(best?.id ?? -1)?.avg_hours ?? -1)) ? e : best;
                    }, employees[0]);
                    return (<>
                      <Card className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1"><Clock className="h-3.5 w-3.5" /> Most Late Arrivals</div>
                        <div className="font-bold">{mostLate?.name ?? "—"}</div>
                        <div className="text-xs text-red-500">{analyticsMap.get(mostLate?.id ?? -1)?.late_days ?? 0} days late</div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1"><TrendingUp className="h-3.5 w-3.5" /> Most Overtime</div>
                        <div className="font-bold">{mostOvertime?.name ?? "—"}</div>
                        <div className="text-xs text-amber-500">{analyticsMap.get(mostOvertime?.id ?? -1)?.overtime_days ?? 0} days &gt;10h</div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1"><Moon className="h-3.5 w-3.5" /> Most Late Nights</div>
                        <div className="font-bold">{lateNight?.name ?? "—"}</div>
                        <div className="text-xs text-purple-500">{analyticsMap.get(lateNight?.id ?? -1)?.late_night_days ?? 0} nights past 9PM</div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1"><Coffee className="h-3.5 w-3.5" /> Highest Avg Hours</div>
                        <div className="font-bold">{avgHoursLeader?.name ?? "—"}</div>
                        <div className="text-xs text-emerald-500">{(analyticsMap.get(avgHoursLeader?.id ?? -1)?.avg_hours ?? 0).toFixed(1)}h avg/day</div>
                      </Card>
                    </>);
                  })()}
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Hours worked */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Total Hours Worked</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={employees.map((e, i) => ({ name: e.name.split(" ")[0], hours: +(analyticsMap.get(e.id)?.total_hours ?? 0).toFixed(0), color: BRAND_COLORS[i % BRAND_COLORS.length] }))} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => [`${v}h`, "Hours"]} />
                          <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                            {employees.map((_, i) => <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Late arrivals vs overtime */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Late Arrivals vs Overtime Days</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={employees.map(e => ({ name: e.name.split(" ")[0], late: analyticsMap.get(e.id)?.late_days ?? 0, overtime: analyticsMap.get(e.id)?.overtime_days ?? 0 }))} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="late" name="Late arrivals" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="overtime" name="Overtime days" fill="#E8A93C" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Late nights */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Late Night Shifts (past 9 PM)</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={employees.map((e, i) => ({ name: e.name.split(" ")[0], nights: analyticsMap.get(e.id)?.late_night_days ?? 0, color: BRAND_COLORS[i % BRAND_COLORS.length] }))} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => [v, "Nights"]} />
                          <Bar dataKey="nights" radius={[4, 4, 0, 0]}>
                            {employees.map((_, i) => <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Advances taken */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Total Advances Taken (PKR)</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={employees.map((e, i) => ({ name: e.name.split(" ")[0], advance: +(analyticsMap.get(e.id)?.total_advance ?? 0).toFixed(0), color: BRAND_COLORS[i % BRAND_COLORS.length] }))} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: any) => [`PKR ${v.toLocaleString()}`, "Advance"]} />
                          <Bar dataKey="advance" radius={[4, 4, 0, 0]}>
                            {employees.map((_, i) => <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ── Monthly salary sections ──────────────────────────────────── */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Monthly Salary Status</h2>
              {allMonths.length === 0 && <p className="text-muted-foreground text-sm">No attendance data yet. Upload a CSV to get started.</p>}
              {allMonths.map(ym => {
                const expanded = expandedMonths.has(ym);
                const monthEmps = employees.filter(e => summaryMap.has(`${e.id}:${ym}`));
                const totalEarned = monthEmps.reduce((s, e) => s + (summaryMap.get(`${e.id}:${ym}`)?.total_earned ?? 0), 0);
                const totalAdv = monthEmps.reduce((s, e) => s + (summaryMap.get(`${e.id}:${ym}`)?.total_advance ?? 0), 0);
                const paidCount = monthEmps.filter(e => salaryMonthMap.get(`${e.id}:${ym}`)?.status === "paid").length;

                return (
                  <Card key={ym}>
                    <div className="flex items-center">
                      <button className="flex-1 flex items-center gap-4 flex-wrap px-4 py-3 hover:bg-muted/30 transition-colors text-left" onClick={() => toggleMonth(ym)}>
                        <span className="font-semibold text-base">{fmtMonth(ym)}</span>
                        <span className="text-xs text-muted-foreground">{paidCount}/{monthEmps.length} paid</span>
                        <span className="text-xs text-muted-foreground">Earned: <span className="text-foreground font-medium">PKR {formatPKR(totalEarned)}</span></span>
                        <span className="text-xs text-muted-foreground">Advances: <span className="text-amber-600 font-medium">PKR {formatPKR(totalAdv)}</span></span>
                        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
                      </button>
                      <div className="flex items-center gap-1 px-3 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleMarkAllPaid(ym)}>
                          <CheckCheck className="h-3 w-3" /> All Paid
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteMonth(ym)}>
                          <Trash2 className="h-3 w-3" /> Delete Month
                        </Button>
                      </div>
                    </div>

                    {expanded && (
                      <CardContent className="p-0 border-t">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/30 text-xs uppercase tracking-wide">
                              <tr>
                                <th className="text-left px-4 py-2">Employee</th>
                                <th className="text-right px-4 py-2">Salary</th>
                                <th className="text-right px-4 py-2">Days</th>
                                <th className="text-right px-4 py-2">Hours</th>
                                <th className="text-right px-4 py-2">Earned</th>
                                <th className="text-right px-4 py-2">Advances</th>
                                <th className="text-right px-4 py-2">Net</th>
                                <th className="text-center px-4 py-2">Status</th>
                                <th className="text-right px-4 py-2 w-36">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {monthEmps.map(e => {
                                const s = summaryMap.get(`${e.id}:${ym}`);
                                const sm = salaryMonthMap.get(`${e.id}:${ym}`);
                                const status = sm?.status ?? "unpaid";
                                const salary = sm?.monthly_wage ?? e.monthly_wage ?? 0;
                                const net = (s?.total_earned ?? 0) - (s?.total_advance ?? 0);
                                return (
                                  <tr key={e.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => openDetail(e, ym)}>
                                    <td className="px-4 py-2.5 font-medium">{e.name}</td>
                                    <td className="px-4 py-2.5 text-right text-muted-foreground">PKR {formatPKR(salary)}</td>
                                    <td className="px-4 py-2.5 text-right text-muted-foreground">{s?.days ?? 0}</td>
                                    <td className="px-4 py-2.5 text-right text-muted-foreground">{(s?.total_hours ?? 0).toFixed(1)}</td>
                                    <td className="px-4 py-2.5 text-right font-semibold">PKR {formatPKR(s?.total_earned ?? 0)}</td>
                                    <td className="px-4 py-2.5 text-right text-amber-600">{(s?.total_advance ?? 0) > 0 ? `PKR ${formatPKR(s?.total_advance ?? 0)}` : "—"}</td>
                                    <td className={`px-4 py-2.5 text-right font-semibold ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                      PKR {formatPKR(Math.abs(net))}{net < 0 ? " ↑" : ""}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                        {status === "paid" ? "Paid" : "Unpaid"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right" onClick={e2 => e2.stopPropagation()}>
                                      <Button size="sm" variant="outline"
                                        className={`h-7 text-xs gap-1 ${status === "paid" ? "text-red-600 border-red-200 hover:bg-red-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"}`}
                                        onClick={() => handleTogglePaid(e.id, ym, status)}>
                                        {status === "paid" ? <><XCircle className="h-3 w-3" /> Unpaid</> : <><CheckCircle className="h-3 w-3" /> Mark Paid</>}
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Employee detail dialog (full content, no nested scroll) ─────────── */}
      <Dialog open={!!detailEmp} onOpenChange={v => { if (!v) { setDetailEmp(null); setShowAddDay(false); } }}>
        <DialogContent className="max-w-4xl w-full p-0">
          {detailEmp && (
            <div className="flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b">
                <DialogTitle className="text-lg font-semibold">
                  {detailEmp.name} — {fmtMonth(detailMonth)}
                </DialogTitle>
                <DialogDescription className="sr-only">Daily attendance records</DialogDescription>
                <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                  <span>Salary: <span className="font-semibold text-foreground">PKR {formatPKR(detailSm?.monthly_wage ?? detailEmp.monthly_wage ?? 0)}</span></span>
                  <span>Days: <span className="font-semibold text-foreground">{detailSummary?.days ?? 0}</span></span>
                  <span>Hours: <span className="font-semibold text-foreground">{(detailSummary?.total_hours ?? 0).toFixed(1)}</span></span>
                  <span>Earned: <span className="font-semibold text-emerald-600">PKR {formatPKR(detailSummary?.total_earned ?? 0)}</span></span>
                  {(detailSummary?.total_advance ?? 0) > 0 && (
                    <span>Advances: <span className="font-semibold text-amber-600">PKR {formatPKR(detailSummary?.total_advance ?? 0)}</span></span>
                  )}
                </div>
              </div>

              {/* Add day form */}
              <div className="px-6 pt-3">
                {!showAddDay ? (
                  <Button variant="outline" size="sm" onClick={() => setShowAddDay(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Day
                  </Button>
                ) : (
                  <AddDayForm
                    employeeId={detailEmp.id}
                    yearMonth={detailMonth}
                    hourlyRate={Math.round((detailEmp.monthly_wage ?? 20000) / 300)}
                    onSaved={(d) => { setDetailDays(prev => [...prev, d].sort((a, b) => a.date.localeCompare(b.date))); setShowAddDay(false); router.refresh(); }}
                    onCancel={() => setShowAddDay(false)}
                  />
                )}
              </div>

              {/* Day table — no inner scroll, full table shown */}
              <div className="px-6 pb-6 pt-3">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-20 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
                  </div>
                ) : detailDays.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">No records for this month.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-[10px] uppercase tracking-wide sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2">Date</th>
                          <th className="text-left px-3 py-2">Day</th>
                          <th className="text-left px-3 py-2">In</th>
                          <th className="text-left px-3 py-2">Out</th>
                          <th className="text-right px-3 py-2">Break</th>
                          <th className="text-right px-3 py-2">Hours</th>
                          <th className="text-right px-3 py-2">Advance</th>
                          <th className="text-right px-3 py-2">Net Salary</th>
                          <th className="text-left px-3 py-2">Notes</th>
                          <th className="w-8 px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {detailDays.map(d => {
                            const dow = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
                            const isSundayWorkedBonus = d.notes === "Sunday (worked + bonus)";
                            const isSunday = dow === "Sun";
                            const rate = d.hourly_rate ?? 0;
                            const actualSalary = isSundayWorkedBonus
                              ? (d.hours ?? 0) * rate - (d.advance ?? 0)
                              : (d.daily_salary ?? 0);
                            const sundayBonus = isSundayWorkedBonus ? 10 * rate : 0;
                            return (
                              <React.Fragment key={d.id}>
                                <tr className={`hover:bg-muted/20 ${isSunday ? "bg-amber-50/60" : ""}`}>
                                  <td className="px-3 py-1.5 font-medium whitespace-nowrap">{formatDate(d.date)}</td>
                                  <td className={`px-3 py-1.5 font-medium whitespace-nowrap ${isSunday ? "text-amber-600" : "text-muted-foreground"}`}>{dow}</td>
                                  <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{d.in_time ?? "—"}</td>
                                  <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{d.out_time ?? "—"}</td>
                                  <td className="px-3 py-1.5 text-right text-muted-foreground">{d.break_time ? `${d.break_time}h` : "—"}</td>
                                  <td className="px-3 py-1.5 text-right">{(d.hours ?? 0).toFixed(2)}</td>
                                  <td className="px-3 py-1.5 text-right text-amber-600">{(d.advance ?? 0) > 0 ? formatPKR(d.advance ?? 0) : "—"}</td>
                                  <td className={`px-3 py-1.5 text-right font-semibold ${actualSalary >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {formatPKR(actualSalary)}
                                  </td>
                                  <td className="px-3 py-1.5 text-muted-foreground max-w-[110px] truncate">{isSundayWorkedBonus ? "" : (d.notes ?? "")}</td>
                                  <td className="px-2 py-1.5">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => handleDeleteDay(d.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                                {isSundayWorkedBonus && (
                                  <tr className="bg-amber-50/60">
                                    <td className="px-3 py-1.5 font-medium whitespace-nowrap text-muted-foreground">{formatDate(d.date)}</td>
                                    <td className="px-3 py-1.5 font-medium whitespace-nowrap text-amber-600">{dow}</td>
                                    <td className="px-3 py-1.5 text-muted-foreground">—</td>
                                    <td className="px-3 py-1.5 text-muted-foreground">—</td>
                                    <td className="px-3 py-1.5 text-right text-muted-foreground">—</td>
                                    <td className="px-3 py-1.5 text-right">10.00</td>
                                    <td className="px-3 py-1.5 text-right text-amber-600">—</td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-emerald-600">{formatPKR(sundayBonus)}</td>
                                    <td className="px-3 py-1.5 text-amber-600 text-[10px] font-medium">Sunday Overtime</td>
                                    <td className="px-2 py-1.5"></td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <AddEmployeeDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {editEmp && <EditEmployeeDialog emp={editEmp} onClose={() => setEditEmp(null)} />}
    </>
  );
}

// ── Add Day Form ──────────────────────────────────────────────────────────────
function AddDayForm({ employeeId, yearMonth, hourlyRate, onSaved, onCancel }: {
  employeeId: number; yearMonth: string; hourlyRate: number;
  onSaved: (day: any) => void; onCancel: () => void;
}) {
  const [date, setDate]     = useState(`${yearMonth}-01`);
  const [inTime, setIn]     = useState("08:00:00 AM");
  const [outTime, setOut]   = useState("07:00:00 PM");
  const [breakT, setBreak]  = useState("1");
  const [hours, setHours]   = useState("");
  const [advance, setAdv]   = useState("");
  const [notes, setNotes]   = useState("");
  const [loading, setLoading] = useState(false);
  const net = ((parseFloat(hours) || 0) * hourlyRate) - (parseFloat(advance) || 0);

  async function save() {
    if (!hours) { toast.error("Enter hours"); return; }
    setLoading(true);
    try {
      await addAttendanceEntry({ employeeId, date, inTime, outTime, breakTime: parseFloat(breakT) || 0, hours: parseFloat(hours), hourlyRate, advance: parseFloat(advance) || 0, notes: notes || undefined });
      toast.success("Day added");
      onSaved({ id: Date.now(), date, in_time: inTime, out_time: outTime, break_time: parseFloat(breakT) || 0, hours: parseFloat(hours), hourly_rate: hourlyRate, daily_salary: net, advance: parseFloat(advance) || 0, notes: notes || null });
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New Entry</p>
      <div className="grid grid-cols-3 gap-2">
        <div><Label className="text-xs">Date</Label><Input type="date" className="h-8 text-xs" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><Label className="text-xs">In Time</Label><Input className="h-8 text-xs" value={inTime} onChange={e => setIn(e.target.value)} /></div>
        <div><Label className="text-xs">Out Time</Label><Input className="h-8 text-xs" value={outTime} onChange={e => setOut(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label className="text-xs">Break (h)</Label><Input type="number" className="h-8 text-xs" value={breakT} onChange={e => setBreak(e.target.value)} /></div>
        <div><Label className="text-xs">Hours *</Label><Input type="number" className="h-8 text-xs" value={hours} onChange={e => setHours(e.target.value)} placeholder="10" /></div>
        <div><Label className="text-xs">Advance</Label><Input type="number" className="h-8 text-xs" value={advance} onChange={e => setAdv(e.target.value)} placeholder="0" /></div>
      </div>
      <div><Label className="text-xs">Notes</Label><Input className="h-8 text-xs" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Eid holiday, Sunday bonus" /></div>
      {hours && <p className="text-xs text-muted-foreground">Net: <span className={net >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>PKR {formatPKR(net)}</span></p>}
      <div className="flex gap-2">
        <Button size="sm" variant="gold" onClick={save} disabled={loading} className="h-7 text-xs">{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}</Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-7 text-xs">Cancel</Button>
      </div>
    </div>
  );
}

// ── Add / Edit Employee Dialogs ───────────────────────────────────────────────
function AddEmployeeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState(""); const [wage, setWage] = useState(""); const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false); const router = useRouter();
  async function save() {
    if (!name.trim()) { toast.error("Name required"); return; }
    setLoading(true);
    try { await createEmployee({ name, monthlyWage: parseFloat(wage) || 0, notes: notes || undefined }); toast.success(`Added ${name}`); onClose(); setName(""); setWage(""); setNotes(""); router.refresh(); }
    catch (e: any) { toast.error(e?.message || "Failed"); } finally { setLoading(false); }
  }
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Monthly Wage (PKR)</Label><Input type="number" value={wage} onChange={e => setWage(e.target.value)} placeholder="20000" /></div>
          <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="gold" onClick={save} disabled={loading}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeeDialog({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const [name, setName] = useState(emp.name); const [wage, setWage] = useState(String(emp.monthly_wage ?? ""));
  const [active, setActive] = useState(emp.active ? "true" : "false"); const [notes, setNotes] = useState(emp.notes ?? "");
  const [loading, setLoading] = useState(false); const [confirmDel, setConfirmDel] = useState(false);
  const router = useRouter();
  async function save() {
    setLoading(true);
    try { await updateEmployee(emp.id, { name, monthlyWage: parseFloat(wage) || 0, active: active === "true", notes: notes || null }); toast.success("Updated"); onClose(); router.refresh(); }
    catch (e: any) { toast.error(e?.message || "Failed"); } finally { setLoading(false); }
  }
  async function handleDelete() {
    setLoading(true);
    try { await deleteEmployee(emp.id); toast.success(`Deleted ${emp.name}`); onClose(); router.refresh(); }
    catch (e: any) { toast.error(e?.message || "Failed"); } finally { setLoading(false); }
  }
  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit: {emp.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Monthly Wage (PKR)</Label><Input type="number" value={wage} onChange={e => setWage(e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={active} onValueChange={setActive}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter className="justify-between">
          <div>
            {confirmDel ? (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-red-600">Sure?</span>
                <Button variant="destructive" size="sm" onClick={handleDelete}>Yes</Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDel(false)}>No</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setConfirmDel(true)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            )}
          </div>
          <div className="flex gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="gold" onClick={save} disabled={loading}>Save</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
