import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { formatPKR, formatDate } from "@/lib/utils";
import AddInvoiceDialog from "./add-invoice-dialog";

const STATUS_STYLES: Record<string, string> = {
  paid:    "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  pending: "bg-red-100 text-red-700",
};

export default async function InvoicesPage() {
  const clients = await db
    .select({ id: schema.entities.id, name: schema.entities.name })
    .from(schema.entities)
    .where(eq(schema.entities.type, "client"))
    .orderBy(schema.entities.name);

  const rows = await db
    .select({
      id:               schema.invoices.id,
      invoice_number:   schema.invoices.invoice_number,
      date:             schema.invoices.date,
      description:      schema.invoices.description,
      invoiced_amount:  schema.invoices.invoiced_amount,
      paid_amount:      schema.invoices.paid_amount,
      status:           schema.invoices.status,
      notes:            schema.invoices.notes,
      client_name:      schema.entities.name,
    })
    .from(schema.invoices)
    .innerJoin(schema.entities, eq(schema.invoices.client_id, schema.entities.id))
    .orderBy(desc(schema.invoices.date));

  const totalInvoiced    = rows.reduce((s, r) => s + r.invoiced_amount, 0);
  const totalPaid        = rows.reduce((s, r) => s + (r.paid_amount ?? 0), 0);
  const totalOutstanding = totalInvoiced - totalPaid;
  const pendingCount     = rows.filter(r => r.status !== "paid").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Invoice Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">All client invoices across the business</p>
        </div>
        <AddInvoiceDialog clients={clients} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Invoices</div>
          <div className="text-xl sm:text-2xl font-bold mt-1">{rows.length}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Invoiced</div>
          <div className="text-xl sm:text-2xl font-bold mt-1">PKR {formatPKR(totalInvoiced)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Received</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">PKR {formatPKR(totalPaid)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xs text-muted-foreground uppercase">Outstanding ({pendingCount})</div>
          <div className="text-xl sm:text-2xl font-bold text-red-600 mt-1">PKR {formatPKR(totalOutstanding)}</div>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 sm:px-4 py-3">Client</th>
                <th className="text-left px-3 sm:px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="text-left px-3 sm:px-4 py-3 hidden md:table-cell">Invoice #</th>
                <th className="text-left px-3 sm:px-4 py-3 hidden lg:table-cell">Description</th>
                <th className="text-right px-3 sm:px-4 py-3 hidden sm:table-cell">Invoiced</th>
                <th className="text-right px-3 sm:px-4 py-3 hidden md:table-cell">Received</th>
                <th className="text-right px-3 sm:px-4 py-3">Outstanding</th>
                <th className="text-center px-3 sm:px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No invoices yet. Add them from the Clients page.
                  </td>
                </tr>
              ) : rows.map(r => {
                const outstanding = r.invoiced_amount - (r.paid_amount ?? 0);
                return (
                  <tr key={r.id} className={`hover:bg-muted/30 ${r.status === "paid" ? "opacity-60" : ""}`}>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="font-semibold text-xs sm:text-sm">{r.client_name}</div>
                      {/* Mobile: show date below name */}
                      <div className="sm:hidden text-xs text-muted-foreground">{formatDate(r.date)}</div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-muted-foreground text-xs hidden sm:table-cell">{formatDate(r.date)}</td>
                    <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                      {r.invoice_number
                        ? <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{r.invoice_number}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-muted-foreground max-w-[150px] truncate hidden lg:table-cell">{r.description ?? "—"}</td>
                    <td className="px-3 sm:px-4 py-3 text-right font-semibold text-xs sm:text-sm hidden sm:table-cell">PKR {formatPKR(r.invoiced_amount)}</td>
                    <td className="px-3 sm:px-4 py-3 text-right text-emerald-600 text-xs sm:text-sm hidden md:table-cell">
                      {(r.paid_amount ?? 0) > 0 ? `PKR ${formatPKR(r.paid_amount ?? 0)}` : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm">
                      {outstanding > 0
                        ? <span className="text-red-600 font-semibold">PKR {formatPKR(outstanding)}</span>
                        : <span className="text-emerald-600 text-xs">✅</span>}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status ?? "pending"]}`}>
                        {r.status === "partial" ? "Partial" : r.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
