import { db, schema } from "@/db";
import { eq, sql, and, inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPKR } from "@/lib/utils";
import EntityList from "@/components/entity-list";

export default async function ClientsPage() {
  const clients = await db.select().from(schema.entities)
    .where(eq(schema.entities.type, "client")).orderBy(schema.entities.name);

  const clientIds = clients.map(c => c.id);
  const identifiers = clientIds.length > 0
    ? await db.select().from(schema.account_identifiers)
        .where(inArray(schema.account_identifiers.entity_id, clientIds))
    : [];

  // Get paid amounts per client from transactions
  const payments = clientIds.length > 0
    ? await db.select({
        entity_id: schema.transactions.entity_id,
        totalPaid: sql<number>`coalesce(sum(${schema.transactions.credit}), 0)`,
        txnCount: sql<number>`count(*)`,
      })
      .from(schema.transactions)
      .where(and(
        inArray(schema.transactions.entity_id, clientIds),
        sql`${schema.transactions.credit} > 0`
      ))
      .groupBy(schema.transactions.entity_id)
    : [];

  const payMap = new Map(payments.map(p => [p.entity_id, { totalPaid: p.totalPaid, txnCount: p.txnCount }]));

  const enriched = clients.map(c => ({
    ...c,
    identifiers: identifiers.filter(i => i.entity_id === c.id),
    totalPaid: payMap.get(c.id)?.totalPaid ?? 0,
    txnCount: payMap.get(c.id)?.txnCount ?? 0,
    outstanding: (c.pending_amount ?? 0),
  }));

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your clients and track receivables
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Clients</div>
          <div className="text-3xl font-bold mt-1">{clients.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Received</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">
            PKR {formatPKR(enriched.reduce((a, c) => a + c.totalPaid, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Outstanding</div>
          <div className="text-3xl font-bold text-red-600 mt-1">
            PKR {formatPKR(enriched.reduce((a, c) => a + c.outstanding, 0))}
          </div>
        </Card>
      </div>

      <EntityList entities={enriched} entityType="client" showPending />
    </div>
  );
}
