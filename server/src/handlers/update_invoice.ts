import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type UpdateInvoiceInput, type Invoice } from '../schema';
import { eq } from 'drizzle-orm';

export const updateInvoice = async (input: UpdateInvoiceInput): Promise<Invoice> => {
  try {
    // First, check if the invoice exists
    const existingInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, input.id))
      .execute();

    if (existingInvoice.length === 0) {
      throw new Error(`Invoice with ID ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof invoicesTable.$inferInsert> = {
      updated_at: new Date() // Always update the timestamp
    };

    if (input.invoice_number !== undefined) {
      updateData.invoice_number = input.invoice_number;
    }
    if (input.client_name !== undefined) {
      updateData.client_name = input.client_name;
    }
    if (input.client_email !== undefined) {
      updateData.client_email = input.client_email;
    }
    if (input.amount_due !== undefined) {
      updateData.amount_due = input.amount_due.toString(); // Convert number to string for numeric column
    }
    if (input.issue_date !== undefined) {
      updateData.issue_date = input.issue_date;
    }
    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date;
    }
    if (input.services_rendered !== undefined) {
      updateData.services_rendered = input.services_rendered;
    }
    if (input.paid !== undefined) {
      updateData.paid = input.paid;
    }

    // Update the invoice
    const result = await db.update(invoicesTable)
      .set(updateData)
      .where(eq(invoicesTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedInvoice = result[0];
    return {
      ...updatedInvoice,
      amount_due: parseFloat(updatedInvoice.amount_due) // Convert string back to number
    };
  } catch (error) {
    console.error('Invoice update failed:', error);
    throw error;
  }
};