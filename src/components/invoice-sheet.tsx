"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPKR, formatDate } from "@/lib/utils";
import { createInvoice, recordPayment, markInvoicePaid, deleteInvoice, getClientInvoices } from "@/lib/invoice-actions";
import { toast } from "sonner";
import { Plus, CheckCircle, Trash2, CreditCard, Loader2, X } from "lucide-react";

interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: number;
  invoice_number: string | null;
  date: string;
  description: string | null;
  invoiced_amount: number;
  paid_amount: number | null;
  status: string | null;
  notes: string | null;
  items?: InvoiceItem[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
  initialInvoices: Invoice[];
}

type ItemRow = { description: string; qty: string; price: string };

const STATUS_STYLES: Record<string, string> = {
  paid:    "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  pending: "bg-red-100 text-red-700",
};

export default function InvoiceSheet({ open, onClose, clientId, clientName, initialInvoices }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [showAdd, setShowAdd] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [invNum, setInvNum] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [invDesc, setInvDesc] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ description: "", qty: "1", price: "" }]);

  const itemsTotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
  }, 0);

  const totalInvoiced    = invoices.reduce((s, i) => s + i.invoiced_amount, 0);
  const totalPaid        = invoices.reduce((s, i) => s + (i.paid_amount ?? 0), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  function addItem() {
    setItems(prev => [...prev, { description: "", qty: "1", price: "" }]);
  }
  function removeItem(idx: number) {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, field: keyof ItemRow, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function resetForm() {
    setInvNum(""); setInvDesc(""); setInvNotes("");
    setInvDate(new Date().toISOString().slice(0, 10));
    setItems([{ description: "", qty: "1", price: "" }]);
  }

  async function refresh() {
    const fresh = await getClientInvoices(clientId);
    setInvoices(fresh as Invoice[]);
    router.refresh();
  }

  async function handleCreate() {
    const validItems = items.filter(item => item.description.trim() && parseFloat(item.price) > 0);
    if (validItems.length === 0) { toast.error("Add at least one item with a description and price"); return; }
    setLoading(true);
    try {
      await createInvoice({
        clientId, date: invDate,
        invoiceNumber: invNum || undefined,
        description: invDesc || undefined,
        notes: invNotes || undefined,
        items: validItems.map(item => ({
          description: item.description.trim(),
          quantity: parseFloat(item.qty) || 1,
          unit_price: parseFloat(item.price),
        })),
      });
      toast.success("Invoice created");
      setShowAdd(false);
      resetForm();
      await refresh();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setLoading(false); }
  }

  async function handleMarkPaid(id: number) {
    setLoading(true);
    try {
      await markInvoicePaid(id);
      toast.success("Marked as paid");
      await refresh();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setLoading(false); }
  }

  async function handleRecordPayment(id: number) {
    const amt = parseFloat(payAmount);
    if (!payAmount || isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      await recordPayment(id, amt);
      toast.success("Payment recorded");
      setPayingId(null); setPayAmount("");
      await refresh();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: number) {
    setLoading(true);
    try {
      await deleteInvoice(id);
      toast.success("Invoice deleted");
      await refresh();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:w-[620px] sm:max-w-full p-4 sm:p-6 overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base sm:text-lg">{clientName} — Invoices</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
            <span>Invoiced: <span className="font-semibold text-foreground">PKR {formatPKR(totalInvoiced)}</span></span>
            <span>Received: <span className="font-semibold text-emerald-600">PKR {formatPKR(totalPaid)}</span></span>
            <span>Outstanding: <span className={`font-semibold ${totalOutstanding > 0 ? "text-red-600" : "text-emerald-600"}`}>PKR {formatPKR(totalOutstanding)}</span></span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3">

          {!showAdd ? (
            <Button variant="gold" size="sm" className="self-start" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Invoice
            </Button>
          ) : (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="font-semibold text-sm">New Invoice</p>

              {/* Header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Invoice # (optional)</Label>
                  <Input value={invNum} onChange={e => setInvNum(e.target.value)} placeholder="INV-001" />
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input value={invDesc} onChange={e => setInvDesc(e.target.value)} placeholder="e.g. Box packaging — April batch" />
              </div>

              {/* Line items */}
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_56px_90px_64px_28px] gap-1 text-xs text-muted-foreground px-1">
                  <span>Description *</span>
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
                <Input value={invNotes} onChange={e => setInvNotes(e.target.value)} placeholder="Optional" />
              </div>

              <div className="flex gap-2">
                <Button variant="gold" size="sm" onClick={handleCreate} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
              </div>
            </div>
          )}

          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No invoices yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {[...invoices].sort((a, b) => b.date.localeCompare(a.date)).map(inv => {
                const outstanding = inv.invoiced_amount - (inv.paid_amount ?? 0);
                const isPaid = inv.status === "paid";
                return (
                  <div key={inv.id} className={`border rounded-lg p-3 space-y-2 ${isPaid ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {inv.invoice_number && (
                            <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{inv.invoice_number}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDate(inv.date)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[inv.status ?? "pending"]}`}>
                            {inv.status === "partial" ? "Partial" : inv.status === "paid" ? "Paid" : "Pending"}
                          </span>
                        </div>
                        {inv.description && <p className="text-sm mt-1">{inv.description}</p>}

                        {/* Line items */}
                        {inv.items && inv.items.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {inv.items.map(item => (
                              <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{item.description}{item.quantity !== 1 ? ` ×${item.quantity}` : ""}</span>
                                <span className="tabular-nums ml-2 shrink-0">PKR {formatPKR(item.total)}</span>
                              </div>
                            ))}
                            {inv.items.length > 1 && (
                              <div className="flex justify-between text-xs font-medium border-t pt-0.5 mt-0.5">
                                <span>Total</span>
                                <span className="tabular-nums">PKR {formatPKR(inv.invoiced_amount)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {inv.notes && <p className="text-xs text-muted-foreground mt-1">{inv.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-sm">PKR {formatPKR(inv.invoiced_amount)}</div>
                        {(inv.paid_amount ?? 0) > 0 && (
                          <div className="text-xs text-emerald-600">Paid: {formatPKR(inv.paid_amount ?? 0)}</div>
                        )}
                        {!isPaid && outstanding > 0 && (
                          <div className="text-xs text-red-600">Due: {formatPKR(outstanding)}</div>
                        )}
                      </div>
                    </div>

                    {!isPaid && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {payingId === inv.id ? (
                          <>
                            <Input
                              type="number"
                              className="h-8 w-28 text-xs"
                              placeholder="Amount"
                              value={payAmount}
                              onChange={e => setPayAmount(e.target.value)}
                              autoFocus
                            />
                            <Button size="sm" variant="gold" className="h-8 text-xs" onClick={() => handleRecordPayment(inv.id)} disabled={loading}>
                              Record
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setPayingId(null); setPayAmount(""); }}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => { setPayingId(inv.id); setPayAmount(""); }}>
                              <CreditCard className="h-3 w-3" /> Record Payment
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleMarkPaid(inv.id)} disabled={loading}>
                              <CheckCircle className="h-3 w-3" /> Mark Paid
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 ml-auto" onClick={() => handleDelete(inv.id)} disabled={loading}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    {isPaid && (
                      <div className="flex justify-end">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => handleDelete(inv.id)} disabled={loading}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
