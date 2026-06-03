import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { db, schema } from "@/db";
import { eq, inArray } from "drizzle-orm";
import path from "path";
import fs from "fs";
import React from "react";
import { InvoicePDF } from "@/components/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoiceId = parseInt(params.id, 10);
  if (isNaN(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
  }

  // Fetch invoice + client name
  const [row] = await db
    .select({
      id:              schema.invoices.id,
      invoice_number:  schema.invoices.invoice_number,
      date:            schema.invoices.date,
      description:     schema.invoices.description,
      invoiced_amount: schema.invoices.invoiced_amount,
      paid_amount:     schema.invoices.paid_amount,
      status:          schema.invoices.status,
      notes:           schema.invoices.notes,
      client_name:     schema.entities.name,
    })
    .from(schema.invoices)
    .innerJoin(schema.entities, eq(schema.invoices.client_id, schema.entities.id))
    .where(eq(schema.invoices.id, invoiceId));

  if (!row) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Fetch items and payments in parallel
  const [items, payments] = await Promise.all([
    db.select().from(schema.invoice_items)
      .where(eq(schema.invoice_items.invoice_id, invoiceId)),

    db.select({
        id:              schema.invoice_payments.id,
        invoice_id:      schema.invoice_payments.invoice_id,
        amount:          schema.invoice_payments.amount,
        date:            schema.invoice_payments.date,
        payment_type:    schema.invoice_payments.payment_type,
        notes:           schema.invoice_payments.notes,
        transaction_id:  schema.invoice_payments.transaction_id,
        txn_description: schema.transactions.description,
        txn_credit:      schema.transactions.credit,
        txn_date:        schema.transactions.date,
      })
      .from(schema.invoice_payments)
      .leftJoin(schema.transactions, eq(schema.invoice_payments.transaction_id, schema.transactions.id))
      .where(eq(schema.invoice_payments.invoice_id, invoiceId))
      .orderBy(schema.invoice_payments.date),
  ]);

  // Encode logo as base64
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfStream = await renderToStream(
    React.createElement(InvoicePDF, {
      inv: {
        ...row,
        items,
        payments: payments.map(p => ({
          amount:          p.amount,
          date:            p.date,
          payment_type:    p.payment_type,
          notes:           p.notes,
          txn_description: p.txn_description ?? null,
          txn_credit:      p.txn_credit ?? null,
        })),
        logoBase64,
      },
    }) as any
  );

  const filename = row.invoice_number
    ? `invoice-${row.invoice_number}.pdf`
    : `invoice-${invoiceId}.pdf`;

  return new NextResponse(pdfStream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
