"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoreHorizontal } from "lucide-react";
import { reassignTransaction } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  txnId: number;
  currentEntityId: number | null;
  entities: { id: number; name: string }[];
}

export default function TransactionRowActions({ txnId, currentEntityId, entities }: Props) {
  const [open, setOpen] = useState(false);
  const [entityId, setEntityId] = useState<string>(currentEntityId ? String(currentEntityId) : "none");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save() {
    setLoading(true);
    try {
      await reassignTransaction(txnId, entityId !== "none" ? parseInt(entityId) : null);
      toast.success("Transaction reassigned");
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
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Entity</Label>
          <Select value={entityId} onValueChange={setEntityId}>
            <SelectTrigger><SelectValue placeholder="Choose entity…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None (Unidentified) —</SelectItem>
              {entities.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="gold" onClick={save} disabled={loading}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
