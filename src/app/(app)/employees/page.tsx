import { db, schema } from "@/db";
import { Card } from "@/components/ui/card";
import { formatPKR } from "@/lib/utils";

export default async function EmployeesPage() {
  const employees = await db.select().from(schema.employees).orderBy(schema.employees.name);
  const total = employees.reduce((a, e) => a + (e.monthly_wage ?? 0), 0);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employees</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Factory workers and their wages. Upload monthly attendance CSV for salary details.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Workers</div>
          <div className="text-3xl font-bold mt-1">{employees.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Combined Monthly Wage</div>
          <div className="text-3xl font-bold text-amber-600 mt-1">PKR {formatPKR(total)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Active</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">
            {employees.filter(e => e.active).length}
          </div>
        </Card>
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
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map(e => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-semibold">{e.name}</td>
                  <td className="px-4 py-3 text-right">PKR {formatPKR(e.monthly_wage ?? 0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${e.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {e.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{e.notes ?? "—"}</td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No employees yet. Use the seed script or add manually.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
