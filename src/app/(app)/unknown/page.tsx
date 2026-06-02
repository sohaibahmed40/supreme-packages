import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import UnknownTable from "./unknown-table";
import { HelpCircle } from "lucide-react";
import RetagButton from "./retag-button";
import RebuildButton from "./rebuild-button";

export default async function UnknownPage() {
  const unknowns = await db.select().from(schema.unknown_accounts)
    .orderBy(desc(schema.unknown_accounts.last_txn_date));
  const allEntities = await db.select({ id: schema.entities.id, name: schema.entities.name, type: schema.entities.type })
    .from(schema.entities).orderBy(schema.entities.name);
  const seen = new Set<string>();
  const entities = allEntities.filter(e => {
    const key = `${e.name}||${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Unknown Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Accounts in your statement not yet assigned. Assign them to auto-tag matching transactions.
          </p>
        </div>
        <div className="flex gap-2">
          <RebuildButton />
          <RetagButton />
        </div>
      </div>
      {unknowns.length === 0 ? (
        <Card className="p-12 text-center">
          <HelpCircle className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
          <h2 className="text-xl font-semibold text-emerald-600">All accounts identified!</h2>
          <p className="text-muted-foreground mt-1">No unknown accounts. Upload a new statement to check for new ones.</p>
        </Card>
      ) : (
        <UnknownTable unknowns={unknowns} entities={entities} />
      )}
    </div>
  );
}
