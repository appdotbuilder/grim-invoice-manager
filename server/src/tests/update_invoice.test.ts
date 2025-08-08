import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type UpdateInvoiceInput, type CreateInvoiceInput } from '../schema';
import { updateInvoice } from '../handlers/update_invoice';
import { eq } from 'drizzle-orm';

// Helper function to create a test invoice
const createTestInvoice = async (): Promise<number> => {
  const testInvoiceData = {
    invoice_number: 'INV-TEST-001',
    client_name: 'Original Client',
    client_email: 'original@example.com',
    amount_due: '100.00', // String for database insertion
    issue_date: new Date('2023-01-01'),
    due_date: new Date('2023-01-31'),
    services_rendered: 'Original services',
    paid: false
  };

  const result = await db.insert(invoicesTable)
    .values(testInvoiceData)
    .returning()
    .execute();

  return result[0].id;
};

describe('updateInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of an invoice', async () => {
    // Create test invoice
    const invoiceId = await createTestInvoice();

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      invoice_number: 'INV-UPDATED-001',
      client_name: 'Updated Client',
      client_email: 'updated@example.com',
      amount_due: 250.50,
      issue_date: new Date('2023-02-01'),
      due_date: new Date('2023-02-28'),
      services_rendered: 'Updated services description',
      paid: true
    };

    const result = await updateInvoice(updateInput);

    // Verify all fields are updated
    expect(result.id).toEqual(invoiceId);
    expect(result.invoice_number).toEqual('INV-UPDATED-001');
    expect(result.client_name).toEqual('Updated Client');
    expect(result.client_email).toEqual('updated@example.com');
    expect(result.amount_due).toEqual(250.50);
    expect(result.issue_date).toEqual(new Date('2023-02-01'));
    expect(result.due_date).toEqual(new Date('2023-02-28'));
    expect(result.services_rendered).toEqual('Updated services description');
    expect(result.paid).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.amount_due).toBe('number');
  });

  it('should update only specified fields', async () => {
    // Create test invoice
    const invoiceId = await createTestInvoice();

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      client_name: 'Partially Updated Client',
      amount_due: 150.75,
      paid: true
    };

    const result = await updateInvoice(updateInput);

    // Verify only specified fields are updated
    expect(result.id).toEqual(invoiceId);
    expect(result.client_name).toEqual('Partially Updated Client');
    expect(result.amount_due).toEqual(150.75);
    expect(result.paid).toEqual(true);
    
    // Verify unchanged fields remain the same
    expect(result.invoice_number).toEqual('INV-TEST-001');
    expect(result.client_email).toEqual('original@example.com');
    expect(result.services_rendered).toEqual('Original services');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Create test invoice
    const invoiceId = await createTestInvoice();

    // Get original timestamp
    const originalInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();
    
    const originalTimestamp = originalInvoice[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      client_name: 'Updated Client'
    };

    const result = await updateInvoice(updateInput);

    // Verify updated_at timestamp was updated
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should persist changes to the database', async () => {
    // Create test invoice
    const invoiceId = await createTestInvoice();

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      client_name: 'Database Updated Client',
      amount_due: 300.25
    };

    await updateInvoice(updateInput);

    // Verify changes are persisted in database
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();

    expect(invoices).toHaveLength(1);
    expect(invoices[0].client_name).toEqual('Database Updated Client');
    expect(parseFloat(invoices[0].amount_due)).toEqual(300.25);
    expect(invoices[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle numeric precision correctly', async () => {
    // Create test invoice
    const invoiceId = await createTestInvoice();

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      amount_due: 123.45 // Test decimal precision
    };

    const result = await updateInvoice(updateInput);

    // Verify numeric precision is maintained
    expect(result.amount_due).toEqual(123.45);
    expect(typeof result.amount_due).toBe('number');

    // Verify in database
    const dbInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();

    expect(parseFloat(dbInvoice[0].amount_due)).toEqual(123.45);
  });

  it('should throw error when invoice does not exist', async () => {
    const updateInput: UpdateInvoiceInput = {
      id: 99999, // Non-existent ID
      client_name: 'Updated Client'
    };

    await expect(updateInvoice(updateInput)).rejects.toThrow(/Invoice with ID 99999 not found/i);
  });

  it('should handle date updates correctly', async () => {
    // Create test invoice
    const invoiceId = await createTestInvoice();

    const newIssueDate = new Date('2023-06-15');
    const newDueDate = new Date('2023-07-15');

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      issue_date: newIssueDate,
      due_date: newDueDate
    };

    const result = await updateInvoice(updateInput);

    // Verify dates are updated correctly
    expect(result.issue_date).toEqual(newIssueDate);
    expect(result.due_date).toEqual(newDueDate);
    expect(result.issue_date).toBeInstanceOf(Date);
    expect(result.due_date).toBeInstanceOf(Date);
  });

  it('should handle boolean field updates correctly', async () => {
    // Create test invoice (starts as unpaid)
    const invoiceId = await createTestInvoice();

    // Update to paid
    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      paid: true
    };

    const result = await updateInvoice(updateInput);

    expect(result.paid).toEqual(true);

    // Update back to unpaid
    const updateInput2: UpdateInvoiceInput = {
      id: invoiceId,
      paid: false
    };

    const result2 = await updateInvoice(updateInput2);

    expect(result2.paid).toEqual(false);
  });
});