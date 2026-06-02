"use server";
import { db, schema } from "@/db";
import { revalidatePath } from "next/cache";

export async function addCashExpense(input: {
  date: string; amount: number; category: string;
  description?: string; paid_to?: string;
}) {
  await db.insert(schema.cash_expenses).values({
    date: input.date,
    amount: input.amount,
    category: input.category,
    description: input.description || null,
    paid_to: input.paid_to || null,
  });
  revalidatePath("/cash");
  revalidatePath("/dashboard");
}
