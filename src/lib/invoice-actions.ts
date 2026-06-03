"use server";
import { db, schema } from "@/db";
import { eq, inArray, and, or, like, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unit_price: number;
};

export async function createInvoice(data: {
  clientId: number;
  invoiceNumber?: string;
  date: string;
  description?: string;
  invoicedAmount?: number;
  notes?: string;
  items?: InvoiceItemInput[];
}) {
  const items = data.items ?? [];
  const invoicedAmount =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
      : (data.invoicedAmount ?? 0);

  const [inv] = await db
    .insert(schema.invoices)
    .values({
      client_id: data.clientId,
      invoice_number: data.invoiceNumber || null,
      date: data.date,
      description: data.description || null,
      invoiced_amount: invoicedAmount,
      paid_amount: 0,
      status: "pending",
      notes: data.notes || null,
    })
    .returning({ id: schema.invoices.id });

  if (items.length > 0) {
    await db.insert(schema.invoice_items).values(
      items.map((item) => ({
        invoice_id: inv.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }))
    );
  }

  revalidatePath("/clients");
  revalidatePath("/invoices");
}

export async function recordPayment(data: {
  invoiceId: number;
  amount: number;
  date: string;
  paymentType: "bank_transfer" | "cash";
  transactionId?: number;
  notes?: string;
}) {
  const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, data.invoiceId));
  if (!inv) throw new Error("Invoice not found");

  const newPaid = Math.min((inv.paid_amount ?? 0) + data.amount, inv.invoiced_amount);
  const status: "pending" | "partial" | "paid" =
    newPaid >= inv.invoiced_amount ? "paid" : newPaid > 0 ? "partial" : "pending";

  await db.update(schema.invoices)
    .set({ paid_amount: newPaid, status })
    .where(eq(schema.invoices.id, data.invoiceId));

  await db.insert(schema.invoice_payments).values({
    invoice_id: data.invoiceId,
    amount: data.amount,
    date: data.date,
    payment_type: data.paymentType,
    transaction_id: data.transactionId ?? null,
    notes: data.notes ?? null,
  });

  revalidatePath("/clients");
  revalidatePath("/invoices");
}

export async function markInvoicePaid(invoiceId: number) {
  const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId));
  if (!inv) throw new Error("Invoice not found");

  const remaining = inv.invoiced_amount - (inv.paid_amount ?? 0);

  await db.update(schema.invoices)
    .set({ paid_amount: inv.invoiced_amount, status: "paid" })
    .where(eq(schema.invoices.id, invoiceId));

  if (remaining > 0) {
    await db.insert(schema.invoice_payments).values({
      invoice_id: invoiceId,
      amount: remaining,
      date: new Date().toISOString().slice(0, 10),
      payment_type: "cash",
      transaction_id: null,
      notes: "Marked as fully paid",
    });
  }

  revalidatePath("/clients");
  revalidatePath("/invoices");
}

export async function deleteInvoice(invoiceId: number) {
  await db.delete(schema.invoices).where(eq(schema.invoices.id, invoiceId));
  revalidatePath("/clients");
  revalidatePath("/invoices");
}

export async function getClientInvoices(clientId: number) {
  const invoices = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.client_id, clientId))
    .orderBy(schema.invoices.date);

  if (invoices.length === 0) return [];

  const invoiceIds = invoices.map((i) => i.id);

  const [items, payments] = await Promise.all([
    db.select().from(schema.invoice_items)
      .where(inArray(schema.invoice_items.invoice_id, invoiceIds)),
    db.select({
        id: schema.invoice_payments.id,
        invoice_id: schema.invoice_payments.invoice_id,
        amount: schema.invoice_payments.amount,
        date: schema.invoice_payments.date,
        payment_type: schema.invoice_payments.payment_type,
        notes: schema.invoice_payments.notes,
        transaction_id: schema.invoice_payments.transaction_id,
        txn_description: schema.transactions.description,
        txn_credit: schema.transactions.credit,
        txn_date: schema.transactions.date,
      })
      .from(schema.invoice_payments)
      .leftJoin(schema.transactions, eq(schema.invoice_payments.transaction_id, schema.transactions.id))
      .where(inArray(schema.invoice_payments.invoice_id, invoiceIds))
      .orderBy(schema.invoice_payments.date),
  ]);

  return invoices.map((inv) => ({
    ...inv,
    items: items.filter((item) => item.invoice_id === inv.id),
    payments: payments.filter((p) => p.invoice_id === inv.id),
  }));
}

export async function searchClientTransactions(clientId: number, query: string) {
  const rows = await db
    .select({
      id: schema.transactions.id,
      date: schema.transactions.date,
      description: schema.transactions.description,
      credit: schema.transactions.credit,
      debit: schema.transactions.debit,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.entity_id, clientId),
        query.trim()
          ? or(
              like(schema.transactions.description, `%${query}%`),
            )
          : undefined
      )
    )
    .orderBy(desc(schema.transactions.date))
    .limit(20);

  return rows;
}
