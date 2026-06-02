import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

async function login(formData: FormData) {
  "use server";
  const password = formData.get("password") as string;
  if (password === process.env.APP_PASSWORD) {
    const session = await getSession();
    session.authenticated = true;
    await session.save();
    redirect("/dashboard");
  }
  redirect("/login?error=1");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const session = await getSession();
  if (session.authenticated) redirect("/dashboard");

  return (
    <div className="min-h-screen brand-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto h-20 w-20 rounded-2xl brand-gradient flex items-center justify-center shadow-lg">
            <Package className="h-12 w-12 text-brand-gold" strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="text-3xl">
              <span className="gold-text">SUPREME</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground tracking-widest mt-1">PACKAGES</p>
          </div>
          <CardDescription>Sign in to access your business finance tracker</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="Enter password" required autoFocus />
            </div>
            {sp.error && (
              <p className="text-sm text-destructive">Incorrect password.</p>
            )}
            <Button type="submit" variant="gold" className="w-full" size="lg">
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
