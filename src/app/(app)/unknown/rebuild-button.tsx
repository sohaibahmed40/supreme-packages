"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { rebuildUnknownAccounts } from "@/lib/actions";
import { toast } from "sonner";
import { DatabaseZap } from "lucide-react";

export default function RebuildButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function rebuild() {
    setLoading(true);
    try {
      const r = await rebuildUnknownAccounts();
      toast.success(`Rebuilt ${r.rebuilt} unknown account entries`);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={rebuild} disabled={loading}>
      <DatabaseZap className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
      Rebuild Unknown
    </Button>
  );
}
