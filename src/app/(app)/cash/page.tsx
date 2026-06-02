import { db, schema } from "@/db";
import { desc, sql } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { formatPKR, formatDate } from "@/lib/utils";
import CashForm from "./cash-form";

export default async function CashPage() {
  const expenses = await db.select().from(schema.cash_expenses)
    .orderBy(desc(schema.cash_expenses.date)).limit(200);
  const totals = await db.select({
    total: sql<number>`coalesce(sum(${schema.cash_expenses.amount}), 0)`,
    count: sql<number>`count(*)`,
  }).from(schema.cash_expenses);
  const t = totals[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Cash Expense Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record every ATM withdrawal purpose. Factory expenses, wages paid in cash, etc.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Cash Logged</div>
          <div className="text-xl sm:text-3xl font-bold text-amber-600 mt-1">PKR {formatPKR(t.total)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xs text-muted-foreground uppercase">Entries</div>
          <div className="text-xl sm:text-3xl font-bold mt-1">{t.count}</div>
        </Card>
      </div>
      <CashForm />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 sm:px-4 py-3">Date</th>
                <th className="text-right px-3 sm:px-4 py-3">Amount</th>
                <th className="text-left px-3 sm:px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="text-left px-3 sm:px-4 py-3 hidden md:table-cell">Description</th>
                <th className="text-left px-3 sm:px-4 py-3 hidden md:table-cell">Paid To</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-3 sm:px-4 py-2.5">
                    <div className="whitespace-nowrap text-xs sm:text-sm">{formatDate(e.date)}</div>
                    <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                      <span className="px-1.5 py-0.5 rounded-full bg-secondary">{e.category}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 text-right font-semibold text-red-600 whitespace-nowrap text-xs sm:text-sm">
                    PKR {formatPKR(e.amount, 2)}
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 text-xs hidden sm:table-cell">
                    <span className="px-2 py-0.5 rounded-full bg-secondary">{e.category}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-2.5 text-muted-foreground hidden md:table-cell">{e.description || "—"}</td>
                  <td className="px-3 sm:px-4 py-2.5 hidden md:table-cell">{e.paid_to || "—"}</td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No cash expenses logged yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
