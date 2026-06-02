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
import { Plus, CheckCircle, Trash2, CreditCard, Loader2 } from "lucide-react";

interface Invoice {
  id: number;
  invoice_number: string | null;
  date: string;
  description: string | null;
  invoiced_amount: number;
  paid_amount: number | null;
  status: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
  initialInvoices: Invoice[];
}

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
  const [invAmount, setInvAmount] = useState("");
  const [invNotes, setInvNotes] = useState("");

  const totalInvoiced    = invoices.reduce((s, i) => s + i.invoiced_amount, 0);
  const totalPaid        = invoices.reduce((s, i) => s + (i.paid_amount ?? 0), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  async function refresh() {
    const fresh = await getClientInvoices(clientId);
    setInvoices(fresh as Invoice[]);
    router.refresh();
  }

  async function handleCreate() {
    if (!invAmount || isNaN(parseFloat(invAmount))) { toast.error("Enter a valid amount"); return; }
    setLoading(true);
    try {
      await createInvoice({
        clientId, date: invDate,
        invoiceNumber: invNum || undefined,
        description: invDesc || undefined,
        invoicedAmount: parseFloat(invAmount),
        notes: invNotes || undefined,
      });
      toast.success("Invoice created");
      setShowAdd(false);
      setInvNum(""); setInvDesc(""); setInvAmount(""); setInvNotes("");
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
      <SheetContent className="w-full sm:w-[600px] sm:max-w-full p-4 sm:p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base sm:text-lg">{clientName} — Invoices</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
            <span>Invoiced: <span className="font-semibold text-foreground">PKR {formatPKR(totalInvoiced)}</span></span>
            <span>Received: <span className="font-semibold text-emerald-600">PKR {formatPKR(totalPaid)}</span></span>
            <span>Outstanding: <span className={`font-semibold ${totalOutstanding > 0 ? "text-red-600" : "text-emerald-600"}`}>PKR {formatPKR(totalOutstanding)}</span></span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto flex flex-col gap-3">

          {!showAdd ? (
            <Button variant="gold" size="sm" className="self-start" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Invoice
            </Button>
          ) : (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="font-semibold text-sm">New Invoice</p>
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
                <Label>Description</Label>
                <Input value={invDesc} onChange={e => setInvDesc(e.target.value)} placeholder="e.g. Box packaging — April batch" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Amount (PKR) *</Label>
                  <Input type="number" value={invAmount} onChange={e => setInvAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={invNotes} onChange={e => setInvNotes(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="gold" size="sm" onClick={handleCreate} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
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
                        {inv.notes && <p className="text-xs text-muted-foreground">{inv.notes}</p>}
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
