import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetInvoiceInput, type Invoice } from '../schema';

export const getInvoice = async (input: GetInvoiceInput): Promise<Invoice> => {
  try {
    // Query invoice by ID
    const result = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, input.id))
      .execute();

    // Check if invoice exists
    if (result.length === 0) {
      throw new Error(`Invoice with ID ${input.id} not found`);
    }

    const invoice = result[0];
    
    // Convert numeric fields back to numbers before returning
    return {
      ...invoice,
      amount_due: parseFloat(invoice.amount_due) // Convert string back to number
    };
  } catch (error) {
    console.error('Invoice retrieval failed:', error);
    throw error;
  }
};