import { db, schema } from "@/db";
import { eq, sql, desc, like, or, and, gte, lte } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { formatPKR, formatDate } from "@/lib/utils";
import TransactionsFilters from "./filters";
import TransactionRowActions from "./row-actions";
import { Receipt } from "lucide-react";
import TruncatedCell from "@/components/truncated-cell";

interface Props {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    from?: string;
    to?: string;
    type?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 100;

export default async function TransactionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const conditions = [];
  if (sp.q) {
    conditions.push(or(
      like(schema.transactions.description, `%${sp.q}%`),
      like(schema.transactions.category, `%${sp.q}%`),
    ));
  }
  if (sp.cat) conditions.push(eq(schema.transactions.category, sp.cat));
  if (sp.from) conditions.push(gte(schema.transactions.date, sp.from));
  if (sp.to)   conditions.push(lte(schema.transactions.date, sp.to));
  if (sp.type === "income")  conditions.push(sql`${schema.transactions.credit} > 0`);
  if (sp.type === "expense") conditions.push(sql`${schema.transactions.debit}  > 0`);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const page = parseInt(sp.page || "1");

  const txns = await db
    .select({
      id: schema.transactions.id,
      date: schema.transactions.date,
      description: schema.transactions.description,
      category: schema.transactions.category,
      debit: schema.transactions.debit,
      credit: schema.transactions.credit,
      account_digits: schema.transactions.account_digits,
      entity_id: schema.transactions.entity_id,
      entity_name: schema.entities.name,
    })
    .from(schema.transactions)
    .leftJoin(schema.entities, eq(schema.transactions.entity_id, schema.entities.id))
    .where(whereClause)
    .orderBy(desc(schema.transactions.date), desc(schema.transactions.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const totals = await db
    .select({
      totalIncome: sql<number>`coalesce(sum(${schema.transactions.credit}), 0)`,
      totalExpense: sql<number>`coalesce(sum(${schema.transactions.debit}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(schema.transactions)
    .where(whereClause);

  const t = totals[0];

  const categories = await db
    .selectDistinct({ category: schema.transactions.category })
    .from(schema.transactions)
    .where(sql`${schema.transactions.category} IS NOT NULL`);

  const allEntities = await db.select({ id: schema.entities.id, name: schema.entities.name })
    .from(schema.entities).orderBy(schema.entities.name);
  const entitySeen = new Set<string>();
  const entities = allEntities.filter(e => {
    if (entitySeen.has(e.name)) return false;
    entitySeen.add(e.name);
    return true;
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.count.toLocaleString()} transactions matching filters
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Income</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            PKR {formatPKR(t.totalIncome)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Expenses</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            PKR {formatPKR(t.totalExpense)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Net</div>
          <div className={`text-2xl font-bold mt-1 ${(t.totalIncome - t.totalExpense) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            PKR {formatPKR(t.totalIncome - t.totalExpense)}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <TransactionsFilters
        categories={categories.map(c => c.category).filter(Boolean) as string[]}
        current={sp}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {txns.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              No transactions matching filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-3 font-medium">Date</th>
                    <th className="text-left px-3 py-3 font-medium">Description</th>
                    <th className="text-left px-3 py-3 font-medium">Entity</th>
                    <th className="text-left px-3 py-3 font-medium">Category</th>
                    <th className="text-right px-3 py-3 font-medium">Amount</th>
                    <th className="text-right px-3 py-3 font-medium">Acct</th>
                    <th className="text-right px-3 py-3 font-medium w-12">⋮</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {txns.map(t => {
                    const amount = t.credit || -t.debit;
                    const isCredit = (t.credit || 0) > 0;
                    return (
                      <tr key={t.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="px-3 py-2 max-w-md"><TruncatedCell text={t.description} /></td>
                        <td className="px-3 py-2 font-medium">
                          {t.entity_name ?? <span className="text-amber-600">— Unidentified —</span>}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {t.category}
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                          {isCredit ? "+" : "−"} {formatPKR(Math.abs(amount), 2)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                          {t.account_digits ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <TransactionRowActions
                            txnId={t.id}
                            currentEntityId={t.entity_id}
                            entities={entities}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {t.count > PAGE_SIZE && (
        <Pagination page={page} total={t.count} pageSize={PAGE_SIZE} searchParams={sp} />
      )}
    </div>
  );
}

function Pagination({ page, total, pageSize, searchParams }: {
  page: number; total: number; pageSize: number; searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "page") params.set(k, v);
  }
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <a href={`?${new URLSearchParams({ ...Object.fromEntries(params), page: String(page - 1) })}`}
             className="px-3 py-1.5 text-sm border rounded hover:bg-secondary">Previous</a>
        )}
        {page < totalPages && (
          <a href={`?${new URLSearchParams({ ...Object.fromEntries(params), page: String(page + 1) })}`}
             className="px-3 py-1.5 text-sm border rounded hover:bg-secondary">Next</a>
        )}
      </div>
    </div>
  );
}
