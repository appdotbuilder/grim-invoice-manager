import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type Invoice } from '../schema';
import { desc } from 'drizzle-orm';

export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    // Fetch all invoices ordered by creation date (newest first)
    const results = await db.select()
      .from(invoicesTable)
      .orderBy(desc(invoicesTable.created_at))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(invoice => ({
      ...invoice,
      amount_due: parseFloat(invoice.amount_due) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    throw error;
  }
};