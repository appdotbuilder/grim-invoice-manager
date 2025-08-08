import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type DeleteInvoiceInput, type CreateInvoiceInput } from '../schema';
import { deleteInvoice } from '../handlers/delete_invoice';
import { eq } from 'drizzle-orm';

// Test input for creating an invoice to delete
const testCreateInput: CreateInvoiceInput = {
  invoice_number: 'INV-001',
  client_name: 'Test Client',
  client_email: 'test@example.com',
  amount_due: 1000.00,
  issue_date: new Date('2024-01-01'),
  due_date: new Date('2024-01-31'),
  services_rendered: 'Web development services',
  paid: false
};

describe('deleteInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing invoice', async () => {
    // First create an invoice to delete
    const createdInvoices = await db.insert(invoicesTable)
      .values({
        ...testCreateInput,
        amount_due: testCreateInput.amount_due.toString() // Convert to string for numeric column
      })
      .returning()
      .execute();

    const createdInvoice = createdInvoices[0];
    const deleteInput: DeleteInvoiceInput = { id: createdInvoice.id };

    // Delete the invoice
    const result = await deleteInvoice(deleteInput);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify invoice no longer exists in database
    const remainingInvoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, createdInvoice.id))
      .execute();

    expect(remainingInvoices).toHaveLength(0);
  });

  it('should throw error when trying to delete non-existent invoice', async () => {
    const deleteInput: DeleteInvoiceInput = { id: 999 };

    await expect(deleteInvoice(deleteInput)).rejects.toThrow(/Invoice with ID 999 not found/i);
  });

  it('should not affect other invoices when deleting one', async () => {
    // Create multiple invoices
    const invoice1Data = {
      ...testCreateInput,
      invoice_number: 'INV-001',
      amount_due: testCreateInput.amount_due.toString()
    };

    const invoice2Data = {
      ...testCreateInput,
      invoice_number: 'INV-002',
      client_name: 'Second Client',
      amount_due: '2000.00'
    };

    const createdInvoices = await db.insert(invoicesTable)
      .values([invoice1Data, invoice2Data])
      .returning()
      .execute();

    const [invoice1, invoice2] = createdInvoices;
    const deleteInput: DeleteInvoiceInput = { id: invoice1.id };

    // Delete first invoice
    const result = await deleteInvoice(deleteInput);
    expect(result.success).toBe(true);

    // Verify first invoice is deleted
    const deletedInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice1.id))
      .execute();
    expect(deletedInvoice).toHaveLength(0);

    // Verify second invoice still exists
    const remainingInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice2.id))
      .execute();

    expect(remainingInvoice).toHaveLength(1);
    expect(remainingInvoice[0].invoice_number).toEqual('INV-002');
    expect(remainingInvoice[0].client_name).toEqual('Second Client');
  });

  it('should handle deletion of paid invoice', async () => {
    // Create a paid invoice
    const paidInvoiceData = {
      ...testCreateInput,
      paid: true,
      amount_due: testCreateInput.amount_due.toString()
    };

    const createdInvoices = await db.insert(invoicesTable)
      .values(paidInvoiceData)
      .returning()
      .execute();

    const createdInvoice = createdInvoices[0];
    const deleteInput: DeleteInvoiceInput = { id: createdInvoice.id };

    // Delete the paid invoice
    const result = await deleteInvoice(deleteInput);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify invoice no longer exists
    const remainingInvoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, createdInvoice.id))
      .execute();

    expect(remainingInvoices).toHaveLength(0);
  });
});