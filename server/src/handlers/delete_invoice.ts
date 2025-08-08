import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type DeleteInvoiceInput } from '../schema';

export const deleteInvoice = async (input: DeleteInvoiceInput): Promise<{ success: boolean }> => {
  try {
    // First check if the invoice exists
    const existingInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, input.id))
      .execute();

    if (existingInvoice.length === 0) {
      throw new Error(`Invoice with ID ${input.id} not found`);
    }

    // Delete the invoice
    const result = await db.delete(invoicesTable)
      .where(eq(invoicesTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Invoice deletion failed:', error);
    throw error;
  }
};