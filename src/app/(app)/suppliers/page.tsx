import { db, schema } from "@/db";
import { eq, sql, and, inArray, or } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { formatPKR } from "@/lib/utils";
import EntityList from "@/components/entity-list";

export default async function SuppliersPage() {
  const types = ["supplier", "transport", "rent", "service", "one_time_expense", "online_shopping"] as const;
  const suppliers = await db.select().from(schema.entities)
    .where(or(...types.map(t => eq(schema.entities.type, t))))
    .orderBy(schema.entities.name);

  const ids = suppliers.map(s => s.id);
  const identifiers = ids.length > 0
    ? await db.select().from(schema.account_identifiers)
        .where(inArray(schema.account_identifiers.entity_id, ids))
    : [];

  const payments = ids.length > 0
    ? await db.select({
        entity_id: schema.transactions.entity_id,
        totalPaid: sql<number>`coalesce(sum(${schema.transactions.debit}), 0)`,
        txnCount: sql<number>`count(*)`,
        lastDate: sql<string>`max(${schema.transactions.date})`,
      })
      .from(schema.transactions)
      .where(and(inArray(schema.transactions.entity_id, ids), sql`${schema.transactions.debit} > 0`))
      .groupBy(schema.transactions.entity_id)
    : [];

  const payMap = new Map(payments.map(p => [p.entity_id, p]));

  const enriched = suppliers.map(s => ({
    ...s,
    identifiers: identifiers.filter(i => i.entity_id === s.id),
    totalPaid: payMap.get(s.id)?.totalPaid ?? 0,
    txnCount: payMap.get(s.id)?.txnCount ?? 0,
    lastDate: payMap.get(s.id)?.lastDate ?? null,
    outstanding: 0,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Suppliers & Vendors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Raw materials, transport, rent, services
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Suppliers</div>
          <div className="text-xl sm:text-2xl font-bold mt-1">{suppliers.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Paid</div>
          <div className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
            PKR {formatPKR(enriched.reduce((a, s) => a + s.totalPaid, 0))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Active</div>
          <div className="text-xl sm:text-2xl font-bold mt-1">
            {enriched.filter(s => s.totalPaid > 0).length}
          </div>
        </Card>
      </div>
      <EntityList entities={enriched} entityType="supplier" />
    </div>
  );
}
