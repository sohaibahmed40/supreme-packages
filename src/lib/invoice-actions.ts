"use server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createInvoice(data: {
  clientId: number;
  invoiceNumber?: string;
  date: string;
  description?: string;
  invoicedAmount: number;
  notes?: string;
}) {
  await db.insert(schema.invoices).values({
    client_id: data.clientId,
    invoice_number: data.invoiceNumber || null,
    date: data.date,
    description: data.description || null,
    invoiced_amount: data.invoicedAmount,
    paid_amount: 0,
    status: "pending",
    notes: data.notes || null,
  });
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
  return db.select().from(schema.invoices)
    .where(eq(schema.invoices.client_id, clientId))
    .orderBy(schema.invoices.date);
}
