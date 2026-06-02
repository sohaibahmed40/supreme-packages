"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { retagAllTransactions } from "@/lib/actions";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export default function RetagButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function retag() {
    setLoading(true);
    try {
      const r = await retagAllTransactions();
      toast.success(`Re-tagged ${r.updated} transactions`);
      router.refresh();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setLoading(false); }
  }
  return (
    <Button variant="outline" onClick={retag} disabled={loading}>
      <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Re-tag All
    </Button>
  );
}
