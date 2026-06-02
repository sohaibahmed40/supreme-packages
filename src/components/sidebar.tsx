"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Receipt, Upload, Users, Package, UserCog,
  Wallet, HelpCircle, LogOut, Settings as SettingsIcon, Box, FileText,
  Menu, X,
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

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <>
      <div className="p-4 sm:p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavClick}>
          <div className="h-9 w-9 rounded-lg bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center shrink-0">
            <Box className="h-5 w-5 text-brand-gold" strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-bold tracking-wider gold-text text-base leading-none">SUPREME</div>
            <div className="text-[10px] text-white/60 tracking-[0.2em] mt-0.5">PACKAGES</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2 border-transparent",
                active
                  ? "bg-brand-gold/10 text-brand-gold border-brand-gold"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 brand-gradient flex items-center px-4 border-b border-white/10">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white/80 hover:text-white p-1.5 rounded-md hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 ml-3">
          <Box className="h-5 w-5 text-brand-gold" strokeWidth={1.8} />
          <span className="font-bold tracking-wider gold-text text-sm">SUPREME PACKAGES</span>
        </Link>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] brand-gradient text-white flex flex-col shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-1"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:flex md:flex-col brand-gradient text-white z-30">
        <SidebarContent />
      </aside>
    </>
  );
}
