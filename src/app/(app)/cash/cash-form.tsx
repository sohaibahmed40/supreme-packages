"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addCashExpense } from "./actions";
import { CASH_CATEGORIES } from "@/lib/utils";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function CashForm() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CASH_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save() {
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      await addCashExpense({ date, amount: parseFloat(amount), category, description, paid_to: paidTo });
      toast.success("Cash expense added");
      setAmount(""); setDescription(""); setPaidTo("");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-gold" /> Add Cash Expense
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Amount (PKR)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CASH_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this for?" />
          </div>
          <div>
            <Label>Paid To</Label>
            <Input value={paidTo} onChange={e => setPaidTo(e.target.value)} placeholder="Who?" />
          </div>
          <div className="flex items-end">
            <Button variant="gold" onClick={save} disabled={loading} className="w-full">Add</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
