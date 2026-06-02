"use server";
import { db, schema } from "@/db";
import { sql, eq, and, gte, lte, desc, asc, isNotNull } from "drizzle-orm";
import { monthKey } from "./utils";

export async function getDashboardData() {
  const txns = await db.select().from(schema.transactions).orderBy(asc(schema.transactions.date));
  if (txns.length === 0) {
    return {
      totalIncome: 0, totalExpense: 0, net: 0, margin: 0,
      atmCash: 0, salaries: 0, rent: 0, txnCount: 0,
      monthly: [], categoryBreakdown: [], topIncome: [], topExpense: [],
      cashPosition: [], openingBalance: 0, closingBalance: 0,
    };
  }

  const totalIncome  = txns.reduce((a, t) => a + (t.credit || 0), 0);
  const totalExpense = txns.reduce((a, t) => a + (t.debit  || 0), 0);
  const net = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? net / totalIncome : 0;

  const sumCat = (cat: string) => txns
    .filter(t => t.category === cat)
    .reduce((a, t) => a + (t.debit || 0) + (t.credit || 0), 0);

  const atmCash   = sumCat("ATM Cash Withdrawal");
  const salaries  = sumCat("Salary/Wages");
  const rent      = sumCat("Factory Rent");

  // Monthly aggregation
  const monthlyMap = new Map<string, { income: number; expense: number; sortKey: string }>();
  for (const t of txns) {
    const mk = monthKey(t.date);
    const sortKey = t.date.slice(0, 7);
    if (!monthlyMap.has(mk)) monthlyMap.set(mk, { income: 0, expense: 0, sortKey });
    const m = monthlyMap.get(mk)!;
    m.income  += t.credit || 0;
    m.expense += t.debit  || 0;
  }
  const monthly = [...monthlyMap.entries()]
    .map(([month, v]) => ({ month, income: v.income, expense: v.expense, net: v.income - v.expense, sortKey: v.sortKey }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Top income sources & expenses by entity
  const entityCr = new Map<string, number>();
  const entityDb = new Map<string, number>();
  const txnsWithEntities = await db.select({
    entity_name: schema.entities.name,
    credit: schema.transactions.credit,
    debit: schema.transactions.debit,
  })
  .from(schema.transactions)
  .leftJoin(schema.entities, eq(schema.transactions.entity_id, schema.entities.id));

  for (const t of txnsWithEntities) {
    const name = t.entity_name || "Unidentified";
    if ((t.credit || 0) > 0) entityCr.set(name, (entityCr.get(name) || 0) + (t.credit || 0));
    if ((t.debit  || 0) > 0) entityDb.set(name, (entityDb.get(name) || 0) + (t.debit  || 0));
  }

  const topIncome = [...entityCr.entries()]
    .map(([name, value]) => ({ name: name.length > 30 ? name.slice(0, 30) + "..." : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const topExpense = [...entityDb.entries()]
    .map(([name, value]) => ({ name: name.length > 30 ? name.slice(0, 30) + "..." : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Category breakdown for expense pie
  const catMap = new Map<string, number>();
  for (const t of txns) {
    if ((t.debit || 0) > 0 && t.category) {
      catMap.set(t.category, (catMap.get(t.category) || 0) + (t.debit || 0));
    }
  }
  const categoryBreakdown = [...catMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Cash position — last balance per date
  const cashPosition: { date: string; balance: number }[] = [];
  let lastDate = "";
  for (const t of txns) {
    if (t.balance != null) {
      if (t.date !== lastDate) {
        cashPosition.push({ date: t.date.slice(5), balance: t.balance });
        lastDate = t.date;
      } else {
        cashPosition[cashPosition.length - 1].balance = t.balance;
      }
    }
  }

  return {
    totalIncome, totalExpense, net, margin,
    atmCash, salaries, rent, txnCount: txns.length,
    monthly, categoryBreakdown, topIncome, topExpense,
    cashPosition,
    openingBalance: txns[0]?.balance ?? 0,
    closingBalance: txns[txns.length - 1]?.balance ?? 0,
  };
}
