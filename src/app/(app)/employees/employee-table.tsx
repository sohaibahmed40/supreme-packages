"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPKR } from "@/lib/utils";
import { Search } from "lucide-react";

interface Employee {
  id: number;
  name: string;
  monthly_wage: number | null;
  active: boolean | null;
  notes: string | null;
}

export default function EmployeeTable({ employees }: { employees: Employee[] }) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();
  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(q) ||
    (e.notes ?? "").toLowerCase().includes(q)
  );

  return (
    <Card>
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search employees…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-right px-4 py-3">Monthly Wage</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-semibold">{e.name}</td>
                <td className="px-4 py-3 text-right">PKR {formatPKR(e.monthly_wage ?? 0)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${e.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {e.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{e.notes ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  {search ? `No employees matching "${search}"` : "No employees yet. Use the seed script or add manually."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
