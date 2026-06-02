"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, X } from "lucide-react";
import { useState } from "react";

interface Props {
  categories: string[];
  current: { q?: string; cat?: string; from?: string; to?: string; type?: string };
}

export default function TransactionsFilters({ categories, current }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(current.q || "");
  const [cat, setCat] = useState(current.cat || "all");
  const [from, setFrom] = useState(current.from || "");
  const [to, setTo] = useState(current.to || "");
  const [type, setType] = useState(current.type || "all");

  function apply() {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat !== "all") p.set("cat", cat);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (type !== "all") p.set("type", type);
    router.push(`/transactions?${p.toString()}`);
  }

  function reset() {
    setQ(""); setCat("all"); setFrom(""); setTo(""); setType("all");
    router.push("/transactions");
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search description or category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <Button variant="outline" size="sm" onClick={reset}>
          <X className="h-3 w-3 mr-1" /> Reset
        </Button>
        <Button variant="gold" size="sm" onClick={apply}>
          <Search className="h-3 w-3 mr-1" /> Apply
        </Button>
      </div>
    </Card>
  );
}
