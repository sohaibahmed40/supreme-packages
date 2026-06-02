"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { createEntity, updateEntity, deleteEntity, addIdentifier, IdentifierInput } from "@/lib/entity-actions";
import { formatPKR, formatDate, ENTITY_TYPES } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, CircleDot, CreditCard, User, Package, Truck, Home, Search, FileText } from "lucide-react";
import InvoiceSheet from "@/components/invoice-sheet";
import { getClientInvoices } from "@/lib/invoice-actions";

interface EntityData {
  id: number;
  name: string;
  type: string;
  category: string | null;
  notes: string | null;
  pending_amount: number | null;
  identifiers: { id: number; kind: string; value: string; account_holder_name: string | null }[];
  totalPaid: number;
  txnCount: number;
  outstanding?: number;
  lastDate?: string | null;
}

const typeIcons: Record<string, any> = {
  client: User, supplier: Package, transport: Truck, rent: Home,
  staff: User, service: CreditCard, default: Tag,
};

export default function EntityList({
  entities, entityType, showPending = false,
}: {
  entities: EntityData[];
  entityType: string;
  showPending?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [invoiceClient, setInvoiceClient] = useState<{ id: number; name: string } | null>(null);
  const [invoiceData, setInvoiceData] = useState<any[]>([]);

  async function openInvoices(e: EntityData) {
    const data = await getClientInvoices(e.id);
    setInvoiceData(data);
    setInvoiceClient({ id: e.id, name: e.name });
  }
  const router = useRouter();

  const q = search.toLowerCase();
  const filtered = entities.filter(e =>
    e.name.toLowerCase().includes(q) ||
    (e.category ?? "").toLowerCase().includes(q) ||
    (e.notes ?? "").toLowerCase().includes(q) ||
    e.identifiers.some(id => id.value.toLowerCase().includes(q))
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={`Search ${entityType === "client" ? "clients" : "entities"}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button variant="gold" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add {entityType === "client" ? "Client" : "Entity"}
        </Button>
      </div>

      {/* Entity table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Identifiers</th>
                  <th className="text-right px-4 py-3 font-medium">
                    {entityType === "client" ? "Received" : "Paid"}
                  </th>
                  <th className="text-right px-4 py-3 font-medium">Txns</th>
                  {showPending && (
                    <th className="text-right px-4 py-3 font-medium">Outstanding</th>
                  )}
                  <th className="text-right px-4 py-3 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={showPending ? 7 : 6} className="px-4 py-12 text-center text-muted-foreground">
                      {search ? `No results matching "${search}"` : `No entities yet. Click "Add" to create one.`}
                    </td>
                  </tr>
                ) : filtered.map(e => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{e.name}</div>
                      {e.notes && <div className="text-xs text-muted-foreground mt-0.5">{e.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-secondary">{e.category || e.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {e.identifiers.map(id => (
                          <span key={id.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-gold/10 text-brand-gold text-xs font-mono">
                            {id.kind === "acct" ? "🏦" : id.kind === "raast" ? "⚡" : "📛"}
                            {id.value}
                          </span>
                        ))}
                        {e.identifiers.length === 0 && (
                          <span className="text-xs text-muted-foreground">No identifiers</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${entityType === "client" ? "text-emerald-600" : "text-red-600"}`}>
                      {formatPKR(e.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{e.txnCount}</td>
                    {showPending && (
                      <td className="px-4 py-3 text-right">
                        {(e.pending_amount ?? 0) > 0 ? (
                          <span className="font-bold text-red-600">PKR {formatPKR(e.pending_amount ?? 0)}</span>
                        ) : (
                          <span className="text-emerald-600 text-xs">✅ Settled</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {entityType === "client" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Invoices"
                                  onClick={() => openInvoices(e)}>
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => setEditId(e.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Entity Dialog */}
      <AddEntityDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultType={entityType}
        showPending={showPending}
      />

      {/* Edit Entity Dialog */}
      {editId && (
        <EditEntityDialog
          entity={entities.find(e => e.id === editId)!}
          open={!!editId}
          onClose={() => setEditId(null)}
          showPending={showPending}
        />
      )}

      {/* Invoice Sheet */}
      {invoiceClient && (
        <InvoiceSheet
          open={!!invoiceClient}
          onClose={() => setInvoiceClient(null)}
          clientId={invoiceClient.id}
          clientName={invoiceClient.name}
          initialInvoices={invoiceData}
        />
      )}
    </>
  );
}

function AddEntityDialog({ open, onClose, defaultType, showPending }: {
  open: boolean; onClose: () => void; defaultType: string; showPending: boolean;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState(defaultType);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState("");
  const [identifiers, setIdentifiers] = useState<IdentifierInput[]>([
    { kind: "acct", value: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function addIdRow() {
    setIdentifiers([...identifiers, { kind: "acct", value: "" }]);
  }

  async function save() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setLoading(true);
    try {
      await createEntity({
        name: name.trim(),
        type: type as any,
        category: category || undefined,
        notes: notes || undefined,
        pending_amount: pending ? parseFloat(pending) : 0,
        identifiers: identifiers.filter(i => i.value.trim()),
      });
      toast.success(`Created ${name}`);
      onClose();
      setName(""); setCategory(""); setNotes(""); setPending("");
      setIdentifiers([{ kind: "acct", value: "" }]);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Entity</DialogTitle>
          <DialogDescription>Add a client, supplier, employee, or any counterparty.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Entity name" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Raw Material - Paper" />
          </div>
          {showPending && (
            <div>
              <Label>Outstanding Amount (PKR)</Label>
              <Input type="number" value={pending} onChange={e => setPending(e.target.value)} placeholder="0" />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          <div className="space-y-2">
            <Label>Account Identifiers</Label>
            <p className="text-xs text-muted-foreground">Bank account last 4 digits, Raast IDs, or name keywords used for matching</p>
            {identifiers.map((id, i) => (
              <div key={i} className="flex gap-2">
                <Select value={id.kind} onValueChange={v => {
                  const copy = [...identifiers];
                  copy[i].kind = v as any;
                  setIdentifiers(copy);
                }}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acct">🏦 Account</SelectItem>
                    <SelectItem value="raast">⚡ Raast</SelectItem>
                    <SelectItem value="name">📛 Name</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="flex-1" placeholder={id.kind === "acct" ? "e.g. 1234" : id.kind === "raast" ? "e.g. 4520" : "e.g. HAROON ALI"}
                  value={id.value} onChange={e => {
                    const copy = [...identifiers];
                    copy[i].value = e.target.value;
                    setIdentifiers(copy);
                  }} />
                <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0"
                  onClick={() => setIdentifiers(identifiers.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addIdRow}>
              <Plus className="h-3 w-3 mr-1" /> Add Identifier
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gold" onClick={save} disabled={loading}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditEntityDialog({ entity, open, onClose, showPending }: {
  entity: EntityData; open: boolean; onClose: () => void; showPending: boolean;
}) {
  const [name, setName] = useState(entity.name);
  const [category, setCategory] = useState(entity.category ?? "");
  const [notes, setNotes] = useState(entity.notes ?? "");
  const [pending, setPending] = useState(String(entity.pending_amount ?? 0));
  const [newId, setNewId] = useState<IdentifierInput>({ kind: "acct", value: "" });
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  async function save() {
    setLoading(true);
    try {
      await updateEntity(entity.id, {
        name, category: category || null, notes: notes || null,
        pending_amount: pending ? parseFloat(pending) : 0,
      });
      toast.success("Updated");
      onClose();
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddId() {
    if (!newId.value.trim()) return;
    try {
      await addIdentifier(entity.id, newId);
      toast.success(`Added identifier ${newId.value}`);
      setNewId({ kind: "acct", value: "" });
      router.refresh();
    } catch (e: any) {
      toast.error("Failed: " + (e?.message || ""));
    }
  }

  async function handleDelete() {
    await deleteEntity(entity.id);
    toast.success("Deleted");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit: {entity.name}</DialogTitle>
          <DialogDescription>Update details, identifiers, or outstanding balance</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          {showPending && (
            <div>
              <Label>Outstanding Amount (PKR)</Label>
              <Input type="number" value={pending} onChange={e => setPending(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {/* Existing identifiers */}
          <div className="space-y-2">
            <Label>Account Identifiers</Label>
            <div className="flex flex-wrap gap-1">
              {entity.identifiers.map(id => (
                <span key={id.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-gold/10 text-brand-gold text-xs font-mono">
                  {id.kind === "acct" ? "🏦" : id.kind === "raast" ? "⚡" : "📛"} {id.value}
                </span>
              ))}
            </div>
            {/* Add new identifier */}
            <div className="flex gap-2 mt-2">
              <Select value={newId.kind} onValueChange={v => setNewId({ ...newId, kind: v as any })}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acct">🏦 Account</SelectItem>
                  <SelectItem value="raast">⚡ Raast</SelectItem>
                  <SelectItem value="name">📛 Name</SelectItem>
                </SelectContent>
              </Select>
              <Input className="flex-1" placeholder="Value" value={newId.value}
                onChange={e => setNewId({ ...newId, value: e.target.value })} />
              <Button variant="outline" size="sm" onClick={handleAddId}>Add</Button>
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <div>
            {confirmDelete ? (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-red-600">Are you sure?</span>
                <Button variant="destructive" size="sm" onClick={handleDelete}>Yes, delete</Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>No</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="gold" onClick={save} disabled={loading}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
