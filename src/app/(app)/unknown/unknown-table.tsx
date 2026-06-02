"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPKR, formatDate } from "@/lib/utils";
import { Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import AssignDialog from "./assign-dialog";
import TruncatedCell from "@/components/truncated-cell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { getTransactionsForIdentifier } from "./actions";

interface UnknownAccount {
  id: number;
  kind: string;
  value: string;
  sample_name: string | null;
  sample_description: string | null;
  total_credit: number | null;
  total_debit: number | null;
  txn_count: number | null;
  last_txn_date: string | null;
}

interface Entity {
  id: number;
  name: string;
  type: string;
}

interface Txn {
  id: number;
  date: string;
  description: string;
  debit: number;
  credit: number;
  category: string | null;
}

export default function UnknownTable({
  unknowns,
  entities,
}: {
  unknowns: UnknownAccount[];
  entities: Entity[];
}) {
  const [search, setSearch] = useState("");
  type SortCol = "txns" | "date" | "credit" | "debit";
  const [sortCol, setSortCol] = useState<SortCol | null>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<UnknownAccount | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);

  const q = search.toLowerCase();
  const filtered = unknowns
    .filter(u =>
      (u.sample_name ?? "").toLowerCase().includes(q) ||
      u.value.toLowerCase().includes(q) ||
      (u.sample_description ?? "").toLowerCase().includes(q)
    )
    .sort((a, b) => {
      if (!sortCol) return 0;
      let diff = 0;
      if (sortCol === "date") {
        diff = (a.last_txn_date ?? "").localeCompare(b.last_txn_date ?? "");
      } else if (sortCol === "txns") {
        diff = (a.txn_count ?? 0) - (b.txn_count ?? 0);
      } else if (sortCol === "credit") {
        diff = (a.total_credit ?? 0) - (b.total_credit ?? 0);
      } else if (sortCol === "debit") {
        diff = (a.total_debit ?? 0) - (b.total_debit ?? 0);
      }
      return sortDir === "desc" ? -diff : diff;
    });

  function handleSort(col: SortCol) {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortCol(null);
    }
  }

  function sortIcon(col: SortCol) {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
  }

  async function openRow(u: UnknownAccount) {
    setSelected(u);
    setTxns([]);
    setLoading(true);
    try {
      const data = await getTransactionsForIdentifier(u.kind, u.value);
      setTxns(data as Txn[]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, ID, or description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-right px-4 py-3">
                  <button onClick={() => handleSort("credit")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                    Credit {sortIcon("credit")}
                  </button>
                </th>
                <th className="text-right px-4 py-3">
                  <button onClick={() => handleSort("debit")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                    Debit {sortIcon("debit")}
                  </button>
                </th>
                <th className="text-right px-4 py-3">
                  <button onClick={() => handleSort("txns")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                    Txns {sortIcon("txns")}
                  </button>
                </th>
                <th className="text-right px-4 py-3">
                  <button onClick={() => handleSort("date")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                    Last TXN {sortIcon("date")}
                  </button>
                </th>
                <th className="text-right px-4 py-3 w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(u => (
                <tr
                  key={u.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={e => {
                    // Don't open drawer when clicking the Assign button
                    if ((e.target as HTMLElement).closest("button, [role=dialog]")) return;
                    openRow(u);
                  }}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs">
                      {u.kind === "acct" ? "🏦" : "⚡"} {u.value}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{u.sample_name || "—"}</td>
                  <td className="px-4 py-3 max-w-xs text-xs text-muted-foreground">
                    <TruncatedCell text={u.sample_description} />
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {(u.total_credit ?? 0) > 0 ? formatPKR(u.total_credit ?? 0) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    {(u.total_debit ?? 0) > 0 ? formatPKR(u.total_debit ?? 0) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{u.txn_count}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                    {u.last_txn_date ? formatDate(u.last_txn_date) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <AssignDialog unknown={u} entities={entities} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? `No accounts matching "${search}"` : "No unknown accounts."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Transactions drawer */}
      <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.kind === "acct" ? "🏦" : "⚡"} {selected.value}
                  {selected.sample_name && (
                    <span className="ml-2 text-muted-foreground font-normal text-base">— {selected.sample_name}</span>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {selected.txn_count} transaction{selected.txn_count !== 1 ? "s" : ""}
                  {(selected.total_credit ?? 0) > 0 && (
                    <span className="ml-3 text-emerald-600">+{formatPKR(selected.total_credit ?? 0)}</span>
                  )}
                  {(selected.total_debit ?? 0) > 0 && (
                    <span className="ml-3 text-red-600">−{formatPKR(selected.total_debit ?? 0)}</span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
                  </div>
                ) : txns.length === 0 ? (
                  <p className="px-6 py-8 text-center text-muted-foreground text-sm">No transactions found.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wide sticky top-0">
                      <tr>
                        <th className="text-left px-6 py-2">Date</th>
                        <th className="text-left px-3 py-2">Description</th>
                        <th className="text-right px-6 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {txns.map(t => {
                        const isCredit = t.credit > 0;
                        const amount = isCredit ? t.credit : t.debit;
                        return (
                          <tr key={t.id} className="hover:bg-muted/30">
                            <td className="px-6 py-3 whitespace-nowrap text-xs text-muted-foreground">
                              {formatDate(t.date)}
                            </td>
                            <td className="px-3 py-3 text-xs max-w-[200px]">
                              <div className="truncate" title={t.description}>{t.description}</div>
                              {t.category && (
                                <span className="mt-0.5 inline-block px-1.5 py-0 rounded-full bg-secondary text-secondary-foreground text-[10px]">
                                  {t.category}
                                </span>
                              )}
                            </td>
                            <td className={`px-6 py-3 text-right font-semibold whitespace-nowrap ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                              {isCredit ? "+" : "−"}{formatPKR(amount, 2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
