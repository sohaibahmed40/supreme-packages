const MONTHS: Record<string, string> = {
  January: "01", February: "02", March: "03", April: "04",
  May: "05", June: "06", July: "07", August: "08",
  September: "09", October: "10", November: "11", December: "12",
};

// These labels in the employee column are special/global rows, not individual employees
const REAL_EMPLOYEE_SKIP = new Set(["", "sunday"]);

// Known fixed-date Pakistani public holidays: label → YYYY-MM-DD resolver
const FIXED_HOLIDAYS: Record<string, (year: number, month: number) => string | null> = {
  "labour day":        (y, m) => m === 5  ? `${y}-05-01` : null,
  "labor day":         (y, m) => m === 5  ? `${y}-05-01` : null,
  "pakistan day":      (y, m) => m === 3  ? `${y}-03-23` : null,
  "independence day":  (y, m) => m === 8  ? `${y}-08-14` : null,
  "defence day":       (y, m) => m === 9  ? `${y}-09-06` : null,
  "iqbal day":         (y, m) => m === 11 ? `${y}-11-09` : null,
  "quaid day":         (y, m) => m === 12 ? `${y}-12-25` : null,
  "christmas":         (y, m) => m === 12 ? `${y}-12-25` : null,
};

export interface AttendanceRow {
  date: string;
  employee: string;
  inTime: string | null;
  outTime: string | null;
  breakTime: number;
  hours: number;
  hourlyRate: number;
  advance: number;
  dailySalary: number;
  monthlyWage: number;
}

export interface GlobalHoliday {
  label: string;       // "Eid", "Labour Day", etc.
  resolvedDate: string | null;  // YYYY-MM-DD if known, null if variable (Eid)
}

function parseDate(raw: string): string | null {
  const m = raw.match(/(\w+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (!month) return null;
  return `${m[3]}-${month}-${m[2].padStart(2, "0")}`;
}

function parseMoney(raw: string): number {
  if (!raw || !raw.trim()) return 0;
  const negative = raw.includes("-");
  const cleaned = raw.replace(/PKR\s*/gi, "").replace(/,/g, "").replace(/-/g, "").replace(/"/g, "").trim();
  return (parseFloat(cleaned) || 0) * (negative ? -1 : 1);
}

function parseWage(raw: string): number {
  return parseFloat(raw.replace(/,/g, "").replace(/"/g, "").trim()) || 0;
}

export function getSundaysInMonth(yearMonth: string): string[] {
  const [y, m] = yearMonth.split("-").map(Number);
  const sundays: string[] = [];
  const d = new Date(y, m - 1, 1);
  while (d.getMonth() === m - 1) {
    if (d.getDay() === 0) {
      sundays.push(`${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return sundays;
}

export function parseAttendanceCSV(csvText: string): {
  rows: AttendanceRow[];
  globalHolidays: GlobalHoliday[];
  skipped: number;
  yearMonth: string | null;
} {
  const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
  const rows: AttendanceRow[] = [];
  const globalHolidays: GlobalHoliday[] = [];
  const seenHolidays = new Set<string>();
  let skipped = 0;
  let yearMonth: string | null = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 5) { skipped++; continue; }

    const rawDate  = cols[0]?.replace(/^"|"$/g, "").trim();
    const employee = cols[1]?.replace(/^"|"$/g, "").trim();
    const rawIn    = cols[2]?.trim();
    const rawOut   = cols[3]?.trim();
    const rawBreak = cols[4]?.trim();
    const rawHours = cols[5]?.trim();
    const rawWage  = cols[6]?.trim();
    const rawRate  = cols[7]?.trim();
    const rawAdv   = cols[8]?.trim();
    const rawSalary = cols[9]?.trim();

    const label = employee.toLowerCase();

    // Global/special row: no date, or employee is a holiday label
    if (!rawDate || REAL_EMPLOYEE_SKIP.has(label)) {
      // "Sunday" rows are handled automatically — skip entirely
      if (label === "sunday") { skipped++; continue; }

      // Named holiday row — capture it once per label
      if (employee && !seenHolidays.has(label)) {
        seenHolidays.add(label);
        // Try to resolve date using yearMonth if available
        const resolver = FIXED_HOLIDAYS[label];
        let resolvedDate: string | null = null;
        if (resolver && yearMonth) {
          const [y, m] = yearMonth.split("-").map(Number);
          resolvedDate = resolver(y, m);
        }
        globalHolidays.push({ label: employee, resolvedDate });
      }
      skipped++;
      continue;
    }

    const date = parseDate(rawDate);
    if (!date) { skipped++; continue; }

    if (!yearMonth) yearMonth = date.slice(0, 7);

    // If we now have yearMonth, resolve any holidays captured before seeing a date
    for (const h of globalHolidays) {
      if (h.resolvedDate === null && FIXED_HOLIDAYS[h.label.toLowerCase()]) {
        const [y, m] = yearMonth.split("-").map(Number);
        h.resolvedDate = FIXED_HOLIDAYS[h.label.toLowerCase()]!(y, m);
      }
    }

    rows.push({
      date, employee,
      inTime:      rawIn  || null,
      outTime:     rawOut || null,
      breakTime:   parseFloat(rawBreak) || 0,
      hours:       parseFloat(rawHours) || 0,
      monthlyWage: parseWage(rawWage),
      hourlyRate:  parseMoney(rawRate),
      advance:     parseMoney(rawAdv),
      dailySalary: parseMoney(rawSalary),
    });
  }

  return { rows, globalHolidays, skipped, yearMonth };
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      fields.push(cur); cur = "";
    } else { cur += ch; }
  }
  fields.push(cur);
  return fields;
}
