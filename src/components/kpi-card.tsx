import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: "navy" | "gold" | "green" | "red" | "blue" | "purple" | "amber";
}

const accentMap = {
  navy:   { bg: "bg-brand-navy/10",  text: "text-brand-navy",  ring: "ring-brand-navy/20" },
  gold:   { bg: "bg-brand-gold/15",  text: "text-brand-gold",  ring: "ring-brand-gold/30" },
  green:  { bg: "bg-emerald-500/10", text: "text-emerald-600", ring: "ring-emerald-500/20" },
  red:    { bg: "bg-red-500/10",     text: "text-red-600",     ring: "ring-red-500/20" },
  blue:   { bg: "bg-blue-500/10",    text: "text-blue-600",    ring: "ring-blue-500/20" },
  purple: { bg: "bg-purple-500/10",  text: "text-purple-600",  ring: "ring-purple-500/20" },
  amber:  { bg: "bg-amber-500/10",   text: "text-amber-600",   ring: "ring-amber-500/20" },
};

export function KpiCard({ label, value, icon: Icon, trend, accent = "navy" }: KpiCardProps) {
  const a = accentMap[accent];
  return (
    <div className="kpi-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-2 truncate">{value}</p>
          {trend && (
            <p className={cn("text-xs mt-1", trend.positive ? "text-emerald-600" : "text-red-600")}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center ring-1", a.bg, a.ring)}>
          <Icon className={cn("h-5 w-5", a.text)} />
        </div>
      </div>
    </div>
  );
}
