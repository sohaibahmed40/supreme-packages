import { db, schema } from "@/db";
import { eq, sql, and, inArray } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { formatPKR } from "@/lib/utils";
import EntityList from "@/components/entity-list";

export default async function ClientsPage() {
  const clients = await db.select().from(schema.entities)
    .where(eq(schema.entities.type, "client")).orderBy(schema.entities.name);

  const clientIds = clients.map(c => c.id);

  const [identifiers, payments, invoiceSums] = await Promise.all([
    clientIds.length > 0
      ? db.select().from(schema.account_identifiers)
          .where(inArray(schema.account_identifiers.entity_id, clientIds))
      : Promise.resolve([]),

    clientIds.length > 0
      ? db.select({
            entity_id: schema.transactions.entity_id,
            totalPaid: sql<number>`coalesce(sum(${schema.transactions.credit}), 0)`,
            txnCount:  sql<number>`count(*)`,
          })
          .from(schema.transactions)
          .where(and(
            inArray(schema.transactions.entity_id, clientIds),
            sql`${schema.transactions.credit} > 0`
          ))
          .groupBy(schema.transactions.entity_id)
      : Promise.resolve([]),

    // Outstanding derived from invoices: sum(invoiced - paid) per client
    clientIds.length > 0
      ? db.select({
            client_id: schema.invoices.client_id,
            totalInvoiced: sql<number>`coalesce(sum(${schema.invoices.invoiced_amount}), 0)`,
            totalPaidInv:  sql<number>`coalesce(sum(${schema.invoices.paid_amount}), 0)`,
          })
          .from(schema.invoices)
          .where(inArray(schema.invoices.client_id, clientIds))
          .groupBy(schema.invoices.client_id)
      : Promise.resolve([]),
  ]);

  const payMap = new Map(payments.map(p => [p.entity_id, p]));
  const invMap = new Map(invoiceSums.map(i => [i.client_id, i]));

  const enriched = clients.map(c => {
    const inv = invMap.get(c.id);
    // Use invoice-derived outstanding if any invoices exist, else fall back to manual pending_amount
    const outstanding = inv
      ? Math.max(0, inv.totalInvoiced - inv.totalPaidInv)
      : (c.pending_amount ?? 0);
    return {
      ...c,
      identifiers: identifiers.filter(i => i.entity_id === c.id),
      totalPaid: payMap.get(c.id)?.totalPaid ?? 0,
      txnCount:  payMap.get(c.id)?.txnCount  ?? 0,
      outstanding,
    };
  });

  const totalReceived    = enriched.reduce((s, c) => s + c.totalPaid, 0);
  const totalOutstanding = enriched.reduce((s, c) => s + c.outstanding, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Clients</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your clients and track receivables</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Clients</div>
          <div className="text-xl sm:text-2xl font-bold mt-1">{clients.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Received</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">PKR {formatPKR(totalReceived)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Outstanding</div>
          <div className="text-xl sm:text-2xl font-bold text-red-600 mt-1">PKR {formatPKR(totalOutstanding)}</div>
        </Card>
      </div>

      <EntityList entities={enriched} entityType="client" showPending />
    </div>
  );
}
