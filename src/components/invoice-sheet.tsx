"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPKR, formatDate } from "@/lib/utils";
import {
  createInvoice, recordPayment, markInvoicePaid, deleteInvoice,
  getClientInvoices, searchClientTransactions,
} from "@/lib/invoice-actions";
import { toast } from "sonner";
import { Plus, CheckCircle, Trash2, CreditCard, Loader2, X, Banknote, Search, Link2, Download } from "lucide-react";

interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoicePayment {
  id: number;
  invoice_id: number;
  amount: number;
  date: string;
  payment_type: string;
  notes: string | null;
  transaction_id: number | null;
  txn_description: string | null;
  txn_credit: number | null;
  txn_date: string | null;
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
  payments?: InvoicePayment[];
}

interface TxnResult {
  id: number;
  date: string;
  description: string;
  credit: number;
  debit: number;
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

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid", partial: "Partial", pending: "Pending",
};

export default function InvoiceSheet({ open, onClose, clientId, clientName, initialInvoices }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [showAdd, setShowAdd] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // New invoice form
  const [invNum, setInvNum] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [invDesc, setInvDesc] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ description: "", qty: "1", price: "" }]);

  // Payment form
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payType, setPayType] = useState<"bank_transfer" | "cash">("bank_transfer");
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payTxnId, setPayTxnId] = useState<number | null>(null);
  const [payTxnLabel, setPayTxnLabel] = useState("");
  const [txnSearch, setTxnSearch] = useState("");
  const [txnResults, setTxnResults] = useState<TxnResult[]>([]);
  const [txnSearching, setTxnSearching] = useState(false);
  const [showTxnPicker, setShowTxnPicker] = useState(false);

  const itemsTotal = items.reduce((sum, item) =>
    sum + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0), 0);

  const totalInvoiced    = invoices.reduce((s, i) => s + i.invoiced_amount, 0);
  const totalPaid        = invoices.reduce((s, i) => s + (i.paid_amount ?? 0), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  // ── item form helpers ──
  function addItem() { setItems(prev => [...prev, { description: "", qty: "1", price: "" }]); }
  function removeItem(idx: number) { setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof ItemRow, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }
  function resetInvForm() {
    setInvNum(""); setInvDesc(""); setInvNotes("");
    setInvDate(new Date().toISOString().slice(0, 10));
    setItems([{ description: "", qty: "1", price: "" }]);
  }

  // ── payment form helpers ──
  function openPayForm(id: number) {
    setPayingId(id);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayType("bank_transfer");
    setPayAmount("");
    setPayNotes("");
    setPayTxnId(null);
    setPayTxnLabel("");
    setTxnSearch("");
    setTxnResults([]);
    setShowTxnPicker(false);
  }
  function closePayForm() {
    setPayingId(null);
    setShowTxnPicker(false);
    setTxnResults([]);
  }

  async function handleTxnSearch(q: string) {
    setTxnSearch(q);
    if (!q.trim()) { setTxnResults([]); return; }
    setTxnSearching(true);
    try {
      const rows = await searchClientTransactions(clientId, q);
      setTxnResults(rows as TxnResult[]);
    } finally { setTxnSearching(false); }
  }

  function selectTxn(txn: TxnResult) {
    setPayTxnId(txn.id);
    setPayTxnLabel(`${txn.date} — ${txn.description.slice(0, 50)} (PKR ${formatPKR(txn.credit)})`);
    if (!payAmount) setPayAmount(String(txn.credit));
    setShowTxnPicker(false);
    setTxnSearch("");
    setTxnResults([]);
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
      resetInvForm();
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

  async function handleRecordPayment(inv: Invoice) {
    const amt = parseFloat(payAmount);
    if (!payAmount || isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const remaining = inv.invoiced_amount - (inv.paid_amount ?? 0);
    if (amt > remaining) { toast.error(`Amount exceeds remaining balance (PKR ${formatPKR(remaining)})`); return; }
    setLoading(true);
    try {
      await recordPayment({
        invoiceId: inv.id,
        amount: amt,
        date: payDate,
        paymentType: payType,
        transactionId: payTxnId ?? undefined,
        notes: payNotes || undefined,
      });
      toast.success("Payment recorded");
      closePayForm();
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
      <SheetContent className="w-full sm:w-[640px] sm:max-w-full p-4 sm:p-6 overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base sm:text-lg">{clientName} — Invoices</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
            <span>Invoiced: <span className="font-semibold text-foreground">PKR {formatPKR(totalInvoiced)}</span></span>
            <span>Received: <span className="font-semibold text-emerald-600">PKR {formatPKR(totalPaid)}</span></span>
            <span>Outstanding: <span className={`font-semibold ${totalOutstanding > 0 ? "text-red-600" : "text-emerald-600"}`}>PKR {formatPKR(totalOutstanding)}</span></span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3">

          {/* ── New Invoice Form ── */}
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
                <Label>Description (optional)</Label>
                <Input value={invDesc} onChange={e => setInvDesc(e.target.value)} placeholder="e.g. Box packaging — April batch" />
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_56px_90px_64px_28px] gap-1 text-xs text-muted-foreground px-1">
                  <span>Description *</span><span>Qty</span><span>Unit Price</span>
                  <span className="text-right">Total</span><span />
                </div>
                {items.map((item, idx) => {
                  const rowTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
                  return (
                    <div key={idx} className="grid grid-cols-[1fr_56px_90px_64px_28px] gap-1 items-center">
                      <Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)}
                        placeholder="Item name" className="h-8 text-xs" />
                      <Input type="number" value={item.qty} onChange={e => updateItem(idx, "qty", e.target.value)}
                        placeholder="1" className="h-8 text-xs" min="0" />
                      <Input type="number" value={item.price} onChange={e => updateItem(idx, "price", e.target.value)}
                        placeholder="0" className="h-8 text-xs" min="0" />
                      <div className="text-xs text-right font-medium tabular-nums">
                        {rowTotal > 0 ? formatPKR(rowTotal) : "—"}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                        onClick={() => removeItem(idx)} disabled={items.length === 1}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addItem}>
                    <Plus className="h-3 w-3" /> Add Item
                  </Button>
                  <div className="text-sm font-semibold">Total: PKR {formatPKR(itemsTotal)}</div>
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
                <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); resetInvForm(); }}>Cancel</Button>
              </div>
            </div>
          )}

          {/* ── Invoice List ── */}
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No invoices yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {[...invoices].sort((a, b) => b.date.localeCompare(a.date)).map(inv => {
                const outstanding = inv.invoiced_amount - (inv.paid_amount ?? 0);
                const isPaid = inv.status === "paid";
                const isPayingThis = payingId === inv.id;

                return (
                  <div key={inv.id} className={`border rounded-lg p-3 space-y-2 ${isPaid ? "opacity-60" : ""}`}>
                    {/* Invoice header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {inv.invoice_number && (
                            <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{inv.invoice_number}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDate(inv.date)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[inv.status ?? "pending"]}`}>
                            {STATUS_LABELS[inv.status ?? "pending"]}
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
                          <div className="text-xs text-red-600 font-medium">Due: {formatPKR(outstanding)}</div>
                        )}
                      </div>
                    </div>

                    {/* Payment history */}
                    {inv.payments && inv.payments.length > 0 && (
                      <div className="bg-muted/40 rounded-md px-2.5 py-2 space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment History</p>
                        {inv.payments.map(p => (
                          <div key={p.id} className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {p.payment_type === "cash"
                                ? <Banknote className="h-3 w-3 text-muted-foreground shrink-0" />
                                : <CreditCard className="h-3 w-3 text-muted-foreground shrink-0" />}
                              <div className="min-w-0">
                                <span className="text-xs text-muted-foreground">{formatDate(p.date)}</span>
                                <span className="text-xs text-muted-foreground mx-1">·</span>
                                <span className="text-xs capitalize">{p.payment_type === "bank_transfer" ? "Bank Transfer" : "Cash"}</span>
                                {p.txn_description && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Link2 className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                    <span className="text-xs text-muted-foreground truncate">{p.txn_description}</span>
                                  </div>
                                )}
                                {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 tabular-nums shrink-0">
                              +PKR {formatPKR(p.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {!isPaid && !isPayingThis && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                          onClick={() => openPayForm(inv.id)}>
                          <CreditCard className="h-3 w-3" /> Record Payment
                        </Button>
                        <Button size="sm" variant="outline"
                          className="h-8 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => handleMarkPaid(inv.id)} disabled={loading}>
                          <CheckCircle className="h-3 w-3" /> Mark Paid
                        </Button>
                        <a href={`/api/invoice/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-navy-700">
                            <Download className="h-3 w-3" /> PDF
                          </Button>
                        </a>
                        <Button size="sm" variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 ml-auto"
                          onClick={() => handleDelete(inv.id)} disabled={loading}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    {/* ── Record Payment Form ── */}
                    {isPayingThis && (
                      <div className="border rounded-md p-3 space-y-3 bg-background mt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Record Payment — Due: PKR {formatPKR(outstanding)}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Date *</Label>
                            <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="h-8 text-xs" />
                          </div>
                          <div>
                            <Label className="text-xs">Amount (PKR) *</Label>
                            <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                              placeholder={String(outstanding)} className="h-8 text-xs" min="0" autoFocus />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Payment Type *</Label>
                          <Select value={payType} onValueChange={v => {
                            setPayType(v as "bank_transfer" | "cash");
                            if (v === "cash") { setPayTxnId(null); setPayTxnLabel(""); setShowTxnPicker(false); }
                          }}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Transaction attachment — only for bank transfer */}
                        {payType === "bank_transfer" && (
                          <div>
                            <Label className="text-xs">Link Transaction (optional)</Label>
                            {payTxnId ? (
                              <div className="flex items-center gap-2 mt-1 p-2 rounded border bg-muted/30">
                                <Link2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span className="text-xs flex-1 truncate">{payTxnLabel}</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground"
                                  onClick={() => { setPayTxnId(null); setPayTxnLabel(""); }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="mt-1 space-y-1">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                  <Input
                                    value={txnSearch}
                                    onChange={e => handleTxnSearch(e.target.value)}
                                    onFocus={() => setShowTxnPicker(true)}
                                    placeholder="Search by description…"
                                    className="h-8 text-xs pl-7"
                                  />
                                </div>
                                {showTxnPicker && (txnResults.length > 0 || txnSearching) && (
                                  <div className="border rounded-md bg-background shadow-sm max-h-40 overflow-y-auto">
                                    {txnSearching ? (
                                      <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                      </div>
                                    ) : txnResults.map(txn => (
                                      <button key={txn.id}
                                        className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0"
                                        onClick={() => selectTxn(txn)}>
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium truncate">{txn.description}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(txn.date)}</p>
                                          </div>
                                          <span className="text-xs font-semibold text-emerald-600 tabular-nums shrink-0">
                                            PKR {formatPKR(txn.credit)}
                                          </span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <Label className="text-xs">Notes (optional)</Label>
                          <Input value={payNotes} onChange={e => setPayNotes(e.target.value)}
                            placeholder="e.g. Cheque no. 12345" className="h-8 text-xs" />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Button variant="gold" size="sm" onClick={() => handleRecordPayment(inv)} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Payment"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={closePayForm}>Cancel</Button>
                          <a href={`/api/invoice/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" className="ml-auto">
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                              <Download className="h-3 w-3" /> PDF
                            </Button>
                          </a>
                          <Button size="sm" variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(inv.id)} disabled={loading}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {isPaid && (
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/api/invoice/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                            <Download className="h-3 w-3" /> PDF
                          </Button>
                        </a>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(inv.id)} disabled={loading}>
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
