"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ingestCSV, IngestResult } from "@/lib/actions";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload() {
    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const text = await file.text();
      const res = await ingestCSV(text);
      setResult(res);
      if (res.inserted > 0) {
        toast.success(`Imported ${res.inserted} new transactions (${res.duplicates} duplicates skipped)`);
      } else if (res.duplicates > 0 && res.parsed > 0) {
        toast.info(`No new transactions — all ${res.duplicates} entries were already imported`);
      } else if (res.errors.length > 0) {
        toast.error(res.errors[0]);
      }
      router.refresh();
    } catch (e: any) {
      toast.error("Upload failed: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-brand-gold hover:bg-brand-gold/5 transition-colors"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-brand-gold" />
            <div className="text-left">
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Click to select Meezan CSV</p>
            <p className="text-xs text-muted-foreground mt-1">
              or drag and drop your statement here
            </p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleUpload} disabled={!file || loading} variant="gold" className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Process
            </>
          )}
        </Button>
        {file && (
          <Button variant="outline" onClick={() => { setFile(null); setResult(null); }}>
            Clear
          </Button>
        )}
      </div>

      {result && (
        <div className="rounded-xl border bg-secondary/50 p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Upload Complete
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Stat label="Parsed"      value={result.parsed} color="text-foreground" />
            <Stat label="New Added"   value={result.inserted} color="text-emerald-600" />
            <Stat label="Duplicates"  value={result.duplicates} color="text-muted-foreground" />
            <Stat label="Auto-Tagged" value={result.tagged} color="text-blue-600" />
            <Stat label="Unidentified" value={result.unidentified} color="text-amber-600" />
            <Stat label="New Unknowns" value={result.unknownIdentifiers} color="text-purple-600" />
          </div>
          {result.unidentified > 0 && (
            <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <p>
                <strong>{result.unidentified}</strong> transactions couldn't be matched to a known entity.{" "}
                <a href="/unknown" className="underline font-medium">Review Unknown Accounts →</a>
              </p>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="text-sm text-red-600 space-y-1">
              {result.errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-background rounded-lg p-3 border">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
