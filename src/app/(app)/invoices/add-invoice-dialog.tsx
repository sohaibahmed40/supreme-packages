"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvoice } from "@/lib/invoice-actions";
import { formatPKR } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface Client { id: number; name: string; }
type ItemRow = { description: string; qty: string; price: string };

export default function AddInvoiceDialog({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [invNum, setInvNum] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ description: "", qty: "1", price: "" }]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const itemsTotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
  }, 0);

  function addItem() {
    setItems(prev => [...prev, { description: "", qty: "1", price: "" }]);
  }
  function removeItem(idx: number) {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, field: keyof ItemRow, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function reset() {
    setClientId(""); setInvNum(""); setDate(new Date().toISOString().slice(0, 10));
    setDescription(""); setNotes("");
    setItems([{ description: "", qty: "1", price: "" }]);
  }

  async function save() {
    if (!clientId) { toast.error("Select a client"); return; }
    const validItems = items.filter(item => item.description.trim() && parseFloat(item.price) > 0);
    if (validItems.length === 0) { toast.error("Add at least one item with a description and price"); return; }
    setLoading(true);
    try {
      await createInvoice({
        clientId: parseInt(clientId),
        date,
        invoiceNumber: invNum || undefined,
        description: description || undefined,
        notes: notes || undefined,
        items: validItems.map(item => ({
          description: item.description.trim(),
          quantity: parseFloat(item.qty) || 1,
          unit_price: parseFloat(item.price),
        })),
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
        <DialogContent className="w-full sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Label>Description (optional)</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Box packaging — April batch" />
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <Label>Items *</Label>
              <div className="grid grid-cols-[1fr_56px_90px_64px_28px] gap-1 text-xs text-muted-foreground px-1">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span className="text-right">Total</span>
                <span />
              </div>
              {items.map((item, idx) => {
                const rowTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
                return (
                  <div key={idx} className="grid grid-cols-[1fr_56px_90px_64px_28px] gap-1 items-center">
                    <Input
                      value={item.description}
                      onChange={e => updateItem(idx, "description", e.target.value)}
                      placeholder="Item name"
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={e => updateItem(idx, "qty", e.target.value)}
                      placeholder="1"
                      className="h-8 text-xs"
                      min="0"
                    />
                    <Input
                      type="number"
                      value={item.price}
                      onChange={e => updateItem(idx, "price", e.target.value)}
                      placeholder="0"
                      className="h-8 text-xs"
                      min="0"
                    />
                    <div className="text-xs text-right font-medium tabular-nums">
                      {rowTotal > 0 ? formatPKR(rowTotal) : "—"}
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-1">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addItem}>
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
                <div className="text-sm font-semibold">
                  Total: PKR {formatPKR(itemsTotal)}
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
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
