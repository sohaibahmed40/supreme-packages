"use server";
import { db, schema } from "@/db";
import { eq, inArray } from "drizzle-orm";
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

export async function recordPayment(invoiceId: number, paymentAmount: number) {
  const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId));
  if (!inv) throw new Error("Invoice not found");

  const newPaid = Math.min((inv.paid_amount ?? 0) + paymentAmount, inv.invoiced_amount);
  const status: "pending" | "partial" | "paid" =
    newPaid >= inv.invoiced_amount ? "paid" : newPaid > 0 ? "partial" : "pending";

  await db.update(schema.invoices)
    .set({ paid_amount: newPaid, status })
    .where(eq(schema.invoices.id, invoiceId));

  revalidatePath("/clients");
  revalidatePath("/invoices");
}

export async function markInvoicePaid(invoiceId: number) {
  const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId));
  if (!inv) throw new Error("Invoice not found");
  await db.update(schema.invoices)
    .set({ paid_amount: inv.invoiced_amount, status: "paid" })
    .where(eq(schema.invoices.id, invoiceId));
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

  const items = await db
    .select()
    .from(schema.invoice_items)
    .where(inArray(schema.invoice_items.invoice_id, invoices.map((i) => i.id)));

  return invoices.map((inv) => ({
    ...inv,
    items: items.filter((item) => item.invoice_id === inv.id),
  }));
}
