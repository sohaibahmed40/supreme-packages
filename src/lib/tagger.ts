import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";

export interface IdentifierMatch {
  entity_id: number;
  entity_name: string;
  entity_type: string;
  entity_category: string | null;
  matched_kind: "acct" | "raast" | "name";
  matched_value: string;
}

/**
 * Build an in-memory index of all account identifiers for fast lookup.
 */
export async function buildIdentifierIndex(): Promise<{
  acctMap: Map<string, IdentifierMatch>;
  raastMap: Map<string, IdentifierMatch>;
  nameList: { keyword: string; match: IdentifierMatch }[];
}> {
  const rows = await db
    .select({
      entity_id: schema.entities.id,
      entity_name: schema.entities.name,
      entity_type: schema.entities.type,
      entity_category: schema.entities.category,
      kind: schema.account_identifiers.kind,
      value: schema.account_identifiers.value,
    })
    .from(schema.account_identifiers)
    .innerJoin(schema.entities, eq(schema.account_identifiers.entity_id, schema.entities.id));

  const acctMap = new Map<string, IdentifierMatch>();
  const raastMap = new Map<string, IdentifierMatch>();
  const nameList: { keyword: string; match: IdentifierMatch }[] = [];

  for (const r of rows) {
    const m: IdentifierMatch = {
      entity_id: r.entity_id,
      entity_name: r.entity_name,
      entity_type: r.entity_type,
      entity_category: r.entity_category,
      matched_kind: r.kind,
      matched_value: r.value,
    };
    if (r.kind === "acct") acctMap.set(r.value, m);
    else if (r.kind === "raast") raastMap.set(r.value, m);
    else if (r.kind === "name") nameList.push({ keyword: r.value.toUpperCase(), match: m });
  }
  // longest-first matching for name keywords
  nameList.sort((a, b) => b.keyword.length - a.keyword.length);

  return { acctMap, raastMap, nameList };
}

/**
 * Match a single transaction description to an entity.
 * Priority: bank acct # → Raast ID → name keyword.
 */
export function matchEntity(
  desc: string,
  index: Awaited<ReturnType<typeof buildIdentifierIndex>>
): IdentifierMatch | null {
  const descUpper = desc.toUpperCase();

  // 1. XXXX#### account numbers — capture LAST 4 digits so ABL long-form
  //    accounts like XXXX001002528307001 get "7001" not "0010".
  const acctMatches = [...desc.matchAll(/XXXX\d*?(\d{4})(?!\d)/g)].map(m => m[1]);
  const pkMatches = [...desc.matchAll(/PK\d{2}\w+xxx\d*?(\d{4})(?!\d)/g)].map(m => m[1]);
  for (const a of [...acctMatches, ...pkMatches]) {
    const hit = index.acctMap.get(a);
    if (hit) return hit;
  }

  // 2. Raast PYxxxNNNN
  const raastMatches = [...desc.matchAll(/PYxxx(\d{4})/gi)].map(m => m[1]);
  for (const r of raastMatches) {
    const hit = index.raastMap.get(r);
    if (hit) return hit;
  }

  // 3. Name keyword (longest first)
  for (const { keyword, match } of index.nameList) {
    if (descUpper.includes(keyword)) return match;
  }

  return null;
}

/**
 * Determine category from description (fallback for unmapped transactions).
 */
export function fallbackCategory(desc: string, debit: number, credit: number): {
  category: string;
  type: string;
} {
  const d = desc.toLowerCase();
  if (d.includes("atm cash withdrawal")) return { category: "ATM Cash Withdrawal", type: "expense" };
  if (d.includes("lesco")) return { category: "Utilities", type: "expense" };
  if (/\b(jazz|zong|ufone|telenor)\b/.test(d)) return { category: "Telecom", type: "expense" };
  if (d.includes("charges taxes") || d.includes("fed -") || d.includes("chg:pkr") || d.includes("fbrtax"))
    return { category: "Taxes & Govt Charges", type: "expense" };
  if (d.includes("withholding tax")) return { category: "Taxes & Govt Charges", type: "expense" };
  if (d.includes("bank charges")) return { category: "Bank Charges", type: "expense" };
  if (d.includes("pos purchase") || d.includes("online purchase") || d.includes("paymob"))
    return { category: "Shopping/Personal", type: "expense" };
  if (d.includes("transfer from ac")) return { category: "Income - Transfer", type: "income" };
  if (credit > 0) return { category: "Income - Unidentified", type: "income" };
  return { category: "Other", type: "expense" };
}

/**
 * Determine the final category for a tagged transaction.
 */
export function categorizeWithEntity(
  match: IdentifierMatch | null,
  desc: string,
  debit: number,
  credit: number
): { category: string; entity_name: string | null } {
  if (!match) {
    const fb = fallbackCategory(desc, debit, credit);
    return { category: fb.category, entity_name: null };
  }

  const baseCat = match.entity_category || match.entity_type;
  const t = match.entity_type;

  if (credit > 0) {
    if (t === "client") return { category: "Income - Client Payment", entity_name: match.entity_name };
    if (["supplier", "transport", "rent", "staff", "service", "one_time_expense"].includes(t))
      return { category: `Refund from ${match.entity_name}`, entity_name: match.entity_name };
    if (t === "personal_loan") return { category: "Loan Received", entity_name: match.entity_name };
    if (t === "personal_investment") return { category: "Investment Income", entity_name: match.entity_name };
    if (t === "own_account") {
      const c = (match.entity_category || "").toLowerCase();
      if (c.includes("loan")) return { category: "Loan from Self (Owner Funds)", entity_name: match.entity_name };
      return { category: "From Own Account", entity_name: match.entity_name };
    }
    if (t === "personal_non_business") return { category: "Personal — Non-Business", entity_name: match.entity_name };
    if (t === "personal_family_settled") return { category: "Personal — Family/Friend", entity_name: match.entity_name };
    return { category: baseCat, entity_name: match.entity_name };
  } else {
    if (t === "client") return { category: `Refund to ${match.entity_name}`, entity_name: match.entity_name };
    if (t === "supplier") return { category: "Supplier Payment", entity_name: match.entity_name };
    if (t === "transport") return { category: "Transport", entity_name: match.entity_name };
    if (t === "rent") return { category: "Factory Rent", entity_name: match.entity_name };
    if (t === "staff") return { category: "Salary/Wages", entity_name: match.entity_name };
    if (t === "service") return { category: baseCat, entity_name: match.entity_name };
    if (t === "one_time_expense") return { category: baseCat, entity_name: match.entity_name };
    if (t === "online_shopping") return { category: "Online Shopping", entity_name: match.entity_name };
    if (t === "own_account") return { category: "To Own Account", entity_name: match.entity_name };
    if (t === "personal_loan") return { category: "Loan Repayment", entity_name: match.entity_name };
    if (t === "personal_non_business") return { category: "Personal — Non-Business", entity_name: match.entity_name };
    if (t === "personal_family_settled") return { category: "Personal — Family/Friend", entity_name: match.entity_name };
    return { category: baseCat, entity_name: match.entity_name };
  }
}

/**
 * Extract identifier candidates from a description (for unknown-account queue).
 */
export function extractCandidateIdentifiers(desc: string): { kind: "acct" | "raast"; value: string }[] {
  const out: { kind: "acct" | "raast"; value: string }[] = [];
  const acctMatches = [...desc.matchAll(/XXXX\d*?(\d{4})(?!\d)/g)].map(m => m[1]);
  const pkMatches = [...desc.matchAll(/PK\d{2}\w+xxx\d*?(\d{4})(?!\d)/g)].map(m => m[1]);
  for (const v of [...acctMatches, ...pkMatches]) out.push({ kind: "acct", value: v });
  const raastMatches = [...desc.matchAll(/PYxxx\d*?(\d{4})(?!\d)/gi)].map(m => m[1]);
  for (const v of raastMatches) out.push({ kind: "raast", value: v });
  return out;
}

/**
 * Extract a human-readable name from a transaction description.
 */
export function extractCandidateName(desc: string): string | null {
  // "Money Received from XYZ-XXXX1234"
  const m1 = desc.match(/(?:from|to|From|To)\s+([A-Z][A-Z\s.&-]+?)(?:\s*-?\s*XXXX|\s+RAAST|\s+\d{4}-|\s+PK\d|$)/);
  if (m1) return m1[1].trim();
  // Standalone capitalized names
  const m2 = desc.match(/([A-Z][A-Z\s.&]{3,40})/);
  if (m2) return m2[1].trim();
  return null;
}
