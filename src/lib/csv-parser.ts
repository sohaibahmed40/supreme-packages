import Papa from "papaparse";
import crypto from "crypto";

export interface ParsedTransaction {
  date: string;            // ISO YYYY-MM-DD
  raw_date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number | null;
  dedupe_hash: string;
}

const MONTH_MAP: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseMeezanDate(raw: string): string | null {
  // "26 Mar 2026" → "2026-03-26"
  const m = raw.trim().match(/^(\d{1,2})\s+(\w{3})\w*\s+(\d{4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const month = MONTH_MAP[m[2]];
  const year = m[3];
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

export function computeDedupeHash(date: string, debit: number, credit: number, desc: string): string {
  const key = `${date}|${debit.toFixed(2)}|${credit.toFixed(2)}|${normalize(desc).slice(0, 100)}`;
  return crypto.createHash("sha1").update(key).digest("hex");
}

/**
 * Parse a Meezan CSV file.
 * Format (after 5 header lines):
 *   Booking Date,Value Date,Doc No,Description,Debit,Credit,Balance
 */
export function parseMeezanCSV(content: string): {
  transactions: ParsedTransaction[];
  opening?: number;
  closing?: number;
} {
  const lines = content.split("\n");
  let opening: number | undefined;
  let closing: number | undefined;

  for (const line of lines) {
    if (line.startsWith("Opening Balance")) {
      const m = line.match(/PKR\s*([\d,.]+)/);
      if (m) opening = parseFloat(m[1].replace(/,/g, ""));
    }
    if (line.startsWith("Closing Balance")) {
      const m = line.match(/PKR\s*([\d,.]+)/);
      if (m) closing = parseFloat(m[1].replace(/,/g, ""));
    }
  }

  const transactions: ParsedTransaction[] = [];

  // Skip the metadata header rows; we parse line-by-line
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = Papa.parse<string[]>(line, { skipEmptyLines: true }).data[0];
    if (!parts || parts.length < 6) continue;
    const rawDate = (parts[0] || "").trim();
    const date = parseMeezanDate(rawDate);
    if (!date) continue;
    const desc = (parts[3] || "").trim();
    if (!desc) continue;
    const debit = parseFloat((parts[4] || "0").replace(/,/g, "")) || 0;
    const credit = parseFloat((parts[5] || "0").replace(/,/g, "")) || 0;
    const balanceStr = (parts[6] || "").replace(/,/g, "").trim();
    const balance = balanceStr ? parseFloat(balanceStr) : null;
    if (debit === 0 && credit === 0) continue;
    transactions.push({
      date,
      raw_date: rawDate,
      description: desc,
      debit,
      credit,
      balance,
      dedupe_hash: computeDedupeHash(date, debit, credit, desc),
    });
  }

  return { transactions, opening, closing };
}
