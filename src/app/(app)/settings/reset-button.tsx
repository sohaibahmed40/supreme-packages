"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resetTransactions } from "@/lib/actions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function ResetButton() {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleReset() {
    setLoading(true);
    try {
      const r = await resetTransactions();
      toast.success(`Deleted ${r.deleted} transactions. Mappings preserved.`);
      setConfirm(false);
      router.refresh();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setLoading(false); }
  }

  return confirm ? (
    <div className="flex items-center gap-3">
      <span className="text-sm text-red-600 font-medium">
        This will permanently delete ALL transactions. Mappings will be kept. Are you sure?
      </span>
      <Button variant="destructive" onClick={handleReset} disabled={loading}>
        {loading ? "Deleting…" : "Yes, delete all transactions"}
      </Button>
      <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
    </div>
  ) : (
    <Button variant="destructive" onClick={() => setConfirm(true)}>
      <Trash2 className="h-4 w-4 mr-1" /> Reset All Transactions
    </Button>
  );
}
