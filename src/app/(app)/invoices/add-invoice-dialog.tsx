"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvoice } from "@/lib/invoice-actions";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Client { id: number; name: string; }

export default function AddInvoiceDialog({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [invNum, setInvNum] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function reset() {
    setClientId(""); setInvNum(""); setDate(new Date().toISOString().slice(0, 10));
    setDescription(""); setAmount(""); setNotes("");
  }

  async function save() {
    if (!clientId) { toast.error("Select a client"); return; }
    if (!amount || isNaN(parseFloat(amount))) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      await createInvoice({
        clientId: parseInt(clientId),
        date,
        invoiceNumber: invNum || undefined,
        description: description || undefined,
        invoicedAmount: parseFloat(amount),
        notes: notes || undefined,
      });
      toast.success("Invoice created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="gold" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> New Invoice
      </Button>

      <Dialog open={open} onOpenChange={v => { if (!v) { setOpen(false); reset(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent side="bottom" avoidCollisions={false}>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Invoice # (optional)</Label>
                <Input value={invNum} onChange={e => setInvNum(e.target.value)} placeholder="INV-001" />
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Box packaging — April batch" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (PKR) *</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button variant="gold" onClick={save} disabled={loading}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
