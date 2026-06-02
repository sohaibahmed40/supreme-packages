"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Receipt, Upload, Users, Package, UserCog,
  Wallet, HelpCircle, LogOut, Settings as SettingsIcon, Box, FileText,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Statement", icon: Upload },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/suppliers", label: "Suppliers", icon: Package },
  { href: "/employees", label: "Employees", icon: UserCog },
  { href: "/cash", label: "Cash Expenses", icon: Wallet },
  { href: "/unknown", label: "Unknown Accounts", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 brand-gradient text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
            <Box className="h-6 w-6 text-brand-gold" strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-bold tracking-wider gold-text text-lg leading-none">SUPREME</div>
            <div className="text-[10px] text-white/60 tracking-[0.2em] mt-0.5">PACKAGES</div>
          </div>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-6 py-2.5 text-sm transition-colors border-l-2 border-transparent",
                active
                  ? "bg-brand-gold/10 text-brand-gold border-brand-gold"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
