import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPKR(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPercent(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(decimals)}%`;
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

export function monthKey(iso: string): string {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]}-${y.slice(2)}`;
}

export const ENTITY_TYPES = [
  { value: "client", label: "Client" },
  { value: "supplier", label: "Supplier" },
  { value: "transport", label: "Transport" },
  { value: "rent", label: "Rent" },
  { value: "staff", label: "Staff / Employee (Bank-paid)" },
  { value: "own_account", label: "Own Personal Account" },
  { value: "personal_loan", label: "Personal Loan (someone gave you)" },
  { value: "personal_investment", label: "Investment / Fund" },
  { value: "personal_family_settled", label: "Personal / Family (Settled)" },
  { value: "personal_non_business", label: "Personal (Non-Business)" },
  { value: "service", label: "Service (Internet, etc.)" },
  { value: "one_time_expense", label: "One-Time Expense" },
  { value: "online_shopping", label: "Online Shopping" },
  { value: "other", label: "Other" },
] as const;

export const CASH_CATEGORIES = [
  "Factory Expense",
  "Employee Salary (Cash)",
  "Raw Material (Cash)",
  "Transport / Fuel",
  "Food & Tea",
  "Repairs / Maintenance",
  "Office Supplies",
  "Utilities (Cash)",
  "Personal",
  "Other",
] as const;
