import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─────────── ENTITIES (clients, suppliers, staff, etc.) ───────────
export const entities = sqliteTable("entities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", {
    enum: [
      "client", "supplier", "transport", "rent",
      "staff", "own_account", "personal_loan",
      "personal_investment", "personal_non_business",
      "personal_family_settled", "service",
      "one_time_expense", "online_shopping", "other",
    ],
  }).notNull(),
  category: text("category"),
  notes: text("notes"),
  pending_amount: real("pending_amount").default(0),
  created_at: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
}, (t) => ({
  nameIdx: index("entities_name_idx").on(t.name),
  typeIdx: index("entities_type_idx").on(t.type),
}));

// ─────────── ACCOUNT IDENTIFIERS (acct numbers, raast IDs, name keywords) ───────────
export const account_identifiers = sqliteTable("account_identifiers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entity_id: integer("entity_id").references(() => entities.id, { onDelete: "cascade" }).notNull(),
  // kind: 'acct' (XXXX1234), 'raast' (PYxxxNNNN), 'name' (substring keyword)
  kind: text("kind", { enum: ["acct", "raast", "name"] }).notNull(),
  value: text("value").notNull(),
  account_holder_name: text("account_holder_name"),
}, (t) => ({
  uniq: uniqueIndex("ident_unique").on(t.kind, t.value),
  entityIdx: index("ident_entity_idx").on(t.entity_id),
}));

// ─────────── TRANSACTIONS ───────────
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Deduplication hash: SHA1(date|debit|credit|desc_normalized)
  dedupe_hash: text("dedupe_hash").notNull(),
  date: text("date").notNull(),             // ISO YYYY-MM-DD
  raw_date: text("raw_date"),
  description: text("description").notNull(),
  debit: real("debit").default(0).notNull(),
  credit: real("credit").default(0).notNull(),
  balance: real("balance"),
  entity_id: integer("entity_id").references(() => entities.id, { onDelete: "set null" }),
  category: text("category"),
  account_digits: text("account_digits"),   // matched identifier value
  source: text("source", { enum: ["csv", "pdf", "manual"] }).notNull(),
  created_at: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
}, (t) => ({
  dedupeIdx: uniqueIndex("txn_dedupe").on(t.dedupe_hash),
  dateIdx: index("txn_date_idx").on(t.date),
  entityIdx: index("txn_entity_idx").on(t.entity_id),
  categoryIdx: index("txn_category_idx").on(t.category),
}));

// ─────────── UNKNOWN ACCOUNTS QUEUE (untagged identifiers awaiting user) ───────────
export const unknown_accounts = sqliteTable("unknown_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["acct", "raast", "name"] }).notNull(),
  value: text("value").notNull(),
  sample_description: text("sample_description"),
  sample_name: text("sample_name"),
  first_seen: integer("first_seen", { mode: "timestamp" }).default(sql`(unixepoch())`),
  txn_count: integer("txn_count").default(1),
  total_credit: real("total_credit").default(0),
  total_debit: real("total_debit").default(0),
  last_txn_date: text("last_txn_date"),
}, (t) => ({
  uniq: uniqueIndex("unknown_unique").on(t.kind, t.value),
}));

// ─────────── EMPLOYEES (factory workers) ───────────
export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  monthly_wage: real("monthly_wage").default(0),
  active: integer("active", { mode: "boolean" }).default(true),
  notes: text("notes"),
  created_at: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// ─────────── EMPLOYEE ATTENDANCE / DAILY SALARY ───────────
export const attendance = sqliteTable("attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employee_id: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(),          // YYYY-MM-DD
  in_time: text("in_time"),              // "08:00 AM"
  out_time: text("out_time"),            // "07:00 PM"
  break_time: real("break_time").default(0),
  hours: real("hours").default(0),
  hourly_rate: real("hourly_rate").default(0),
  daily_salary: real("daily_salary").default(0),
  advance: real("advance").default(0),
  notes: text("notes"),
}, (t) => ({
  uniq: uniqueIndex("att_unique").on(t.employee_id, t.date),
}));

// ─────────── CASH EXPENSES (manual entries) ───────────
export const cash_expenses = sqliteTable("cash_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  paid_to: text("paid_to"),
  has_receipt: integer("has_receipt", { mode: "boolean" }).default(false),
  atm_withdrawal_date: text("atm_withdrawal_date"),
  notes: text("notes"),
  created_at: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// ─────────── INVOICES (receivables — per client) ───────────
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoice_number: text("invoice_number"),
  client_id: integer("client_id").references(() => entities.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(),
  description: text("description"),
  invoiced_amount: real("invoiced_amount").notNull(),
  paid_amount: real("paid_amount").default(0),
  status: text("status", { enum: ["pending", "partial", "paid"] }).default("pending"),
  notes: text("notes"),
});

// ─────────── BILLS (payables — supplier bills you owe) ───────────
export const bills = sqliteTable("bills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bill_number: text("bill_number"),
  supplier_id: integer("supplier_id").references(() => entities.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(),
  description: text("description"),
  bill_amount: real("bill_amount").notNull(),
  paid_amount: real("paid_amount").default(0),
  status: text("status", { enum: ["pending", "partial", "paid"] }).default("pending"),
  notes: text("notes"),
});

// ─────────── SALARY MONTHS (payment status per employee per month) ───────────
export const salary_months = sqliteTable("salary_months", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employee_id: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  year_month: text("year_month").notNull(), // "2026-05"
  status: text("status", { enum: ["unpaid", "paid"] }).default("unpaid").notNull(),
  monthly_wage: real("monthly_wage"),
  paid_at: text("paid_at"),
  notes: text("notes"),
}, (t) => ({
  uniq: uniqueIndex("salary_month_emp_uniq").on(t.employee_id, t.year_month),
}));

// ─────────── APP SETTINGS ───────────
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type CashExpense = typeof cash_expenses.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Bill = typeof bills.$inferSelect;
