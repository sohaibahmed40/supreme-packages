"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ENTITY_TYPES } from "@/lib/utils";
import { assignUnknownAccount } from "./actions";
import { toast } from "sonner";
import { Tag } from "lucide-react";

interface Props {
  unknown: { id: number; kind: string; value: string; sample_name: string | null };
  entities: { id: number; name: string; type: string }[];
}

export default function AssignDialog({ unknown, entities }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [entityId, setEntityId] = useState("");
  const [newName, setNewName] = useState(unknown.sample_name || "");
  const [newType, setNewType] = useState("supplier");
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save() {
    setLoading(true);
    try {
      await assignUnknownAccount({
        unknownId: unknown.id,
        kind: unknown.kind as "acct" | "raast",
        value: unknown.value,
        mode,
        existingEntityId: mode === "existing" ? parseInt(entityId) : undefined,
        newName: mode === "new" ? newName : undefined,
        newType: mode === "new" ? newType as any : undefined,
        newCategory: mode === "new" ? newCategory : undefined,
      });
      toast.success("Assigned successfully");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold" size="sm"><Tag className="h-3 w-3 mr-1" /> Assign</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign: {unknown.kind === "acct" ? "🏦" : "⚡"} {unknown.value}</DialogTitle>
          <DialogDescription>{unknown.sample_name ? `Seen as "${unknown.sample_name}"` : "Name unknown"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === "existing" ? "gold" : "outline"} size="sm" onClick={() => setMode("existing")}>Existing</Button>
            <Button variant={mode === "new" ? "gold" : "outline"} size="sm" onClick={() => setMode("new")}>Create New</Button>
          </div>
          {mode === "existing" ? (
            <div>
              <Label>Select Entity</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>{entities.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name} ({e.type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
              <div><Label>Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Category</Label><Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. Raw Material" /></div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="gold" onClick={save} disabled={loading}>Assign & Retag</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
