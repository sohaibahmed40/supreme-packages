import { requireAuth } from "@/lib/auth";
import Sidebar from "@/components/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-w-0">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
