import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ResetButton from "./reset-button";
import { db, schema } from "@/db";
import { sql } from "drizzle-orm";
import { Settings, AlertTriangle, Database, Tag } from "lucide-react";

export default async function SettingsPage() {
  const [txnCount] = await db.select({ c: sql<number>`count(*)` }).from(schema.transactions);
  const [entityCount] = await db.select({ c: sql<number>`count(*)` }).from(schema.entities);
  const [identCount] = await db.select({ c: sql<number>`count(*)` }).from(schema.account_identifiers);

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Database Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-2xl font-bold">{txnCount.c}</div><div className="text-xs text-muted-foreground uppercase">Transactions</div></div>
            <div><div className="text-2xl font-bold">{entityCount.c}</div><div className="text-xs text-muted-foreground uppercase">Entities</div></div>
            <div><div className="text-2xl font-bold">{identCount.c}</div><div className="text-xs text-muted-foreground uppercase">Identifiers</div></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription>
            Reset all transactions. This will delete every imported transaction but keep all entity mappings
            (clients, suppliers, staff, identifiers) intact. You can re-import statements after resetting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetButton />
        </CardContent>
      </Card>
    </div>
  );
}
