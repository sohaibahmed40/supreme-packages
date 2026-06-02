import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { formatPKR } from "@/lib/utils";
import AssignDialog from "./assign-dialog";
import { HelpCircle } from "lucide-react";
import RetagButton from "./retag-button";

export default async function UnknownPage() {
  const unknowns = await db.select().from(schema.unknown_accounts)
    .orderBy(desc(schema.unknown_accounts.total_credit), desc(schema.unknown_accounts.total_debit));
  const entities = await db.select({ id: schema.entities.id, name: schema.entities.name, type: schema.entities.type })
    .from(schema.entities).orderBy(schema.entities.name);

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Unknown Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Accounts in your statement not yet assigned. Assign them to auto-tag matching transactions.
          </p>
        </div>
        <RetagButton />
      </div>
      {unknowns.length === 0 ? (
        <Card className="p-12 text-center">
          <HelpCircle className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
          <h2 className="text-xl font-semibold text-emerald-600">All accounts identified!</h2>
          <p className="text-muted-foreground mt-1">No unknown accounts. Upload a new statement to check for new ones.</p>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">Name Seen</th>
                  <th className="text-left px-4 py-3">Sample</th>
                  <th className="text-right px-4 py-3">Credit</th>
                  <th className="text-right px-4 py-3">Debit</th>
                  <th className="text-right px-4 py-3">Txns</th>
                  <th className="text-right px-4 py-3 w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {unknowns.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs">
                        {u.kind === "acct" ? "🏦" : "⚡"} {u.value}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{u.sample_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{u.sample_description}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{(u.total_credit ?? 0) > 0 ? formatPKR(u.total_credit ?? 0) : "—"}</td>
                    <td className="px-4 py-3 text-right text-red-600">{(u.total_debit ?? 0) > 0 ? formatPKR(u.total_debit ?? 0) : "—"}</td>
                    <td className="px-4 py-3 text-right">{u.txn_count}</td>
                    <td className="px-4 py-3 text-right"><AssignDialog unknown={u} entities={entities} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
