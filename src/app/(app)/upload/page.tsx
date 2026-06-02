import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import UploadForm from "./upload-form";
import { Upload, AlertCircle, Info } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Upload Statement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your Meezan Bank CSV statement. Duplicates are automatically filtered.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-brand-gold" />
            Upload Meezan CSV
          </CardTitle>
          <CardDescription>
            Download a CSV statement from Meezan internet banking (Accounts → Statement → CSV).
            You can upload overlapping date ranges — only new transactions will be added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold">How deduplication works</p>
              <p className="text-muted-foreground">
                Each transaction has a unique fingerprint (date + amount + description).
                Uploading the same statement twice or overlapping date ranges will not create duplicates.
              </p>
              <p className="font-semibold mt-3">What happens automatically</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Transactions get tagged with the right client/supplier/staff if account is in the system</li>
                <li>Unrecognized accounts go to the <strong>Unknown Accounts</strong> tab — review them there</li>
                <li>Categories like ATM, LESCO, Jazz are auto-detected</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold">Reset transactions</p>
              <p className="text-muted-foreground">
                Need to start over? Go to <strong>Settings</strong> → <strong>Reset Transactions</strong>.
                This wipes all transactions but keeps your client/supplier mappings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
