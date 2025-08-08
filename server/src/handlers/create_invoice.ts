import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type CreateInvoiceInput, type Invoice } from '../schema';
import { eq } from 'drizzle-orm';

export const createInvoice = async (input: CreateInvoiceInput): Promise<Invoice> => {
  try {
    // Check if invoice number already exists
    const existingInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.invoice_number, input.invoice_number))
      .execute();

    if (existingInvoice.length > 0) {
      throw new Error(`Invoice number ${input.invoice_number} already exists`);
    }

    // Insert invoice record
    const result = await db.insert(invoicesTable)
      .values({
        invoice_number: input.invoice_number,
        client_name: input.client_name,
        client_email: input.client_email,
        amount_due: input.amount_due.toString(), // Convert number to string for numeric column
        issue_date: input.issue_date,
        due_date: input.due_date,
        services_rendered: input.services_rendered,
        paid: input.paid
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const invoice = result[0];
    return {
      ...invoice,
      amount_due: parseFloat(invoice.amount_due) // Convert string back to number
    };
  } catch (error) {
    console.error('Invoice creation failed:', error);
    throw error;
  }
};