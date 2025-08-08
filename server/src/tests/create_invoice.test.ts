import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type CreateInvoiceInput } from '../schema';
import { createInvoice } from '../handlers/create_invoice';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateInvoiceInput = {
  invoice_number: 'INV-2024-001',
  client_name: 'Test Client',
  client_email: 'client@test.com',
  amount_due: 1500.75,
  issue_date: new Date('2024-01-01'),
  due_date: new Date('2024-01-31'),
  services_rendered: 'Web development services',
  paid: false
};

describe('createInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an invoice', async () => {
    const result = await createInvoice(testInput);

    // Basic field validation
    expect(result.invoice_number).toEqual('INV-2024-001');
    expect(result.client_name).toEqual('Test Client');
    expect(result.client_email).toEqual('client@test.com');
    expect(result.amount_due).toEqual(1500.75);
    expect(typeof result.amount_due).toEqual('number'); // Verify numeric conversion
    expect(result.issue_date).toEqual(testInput.issue_date);
    expect(result.due_date).toEqual(testInput.due_date);
    expect(result.services_rendered).toEqual('Web development services');
    expect(result.paid).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save invoice to database', async () => {
    const result = await createInvoice(testInput);

    // Query using proper drizzle syntax
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, result.id))
      .execute();

    expect(invoices).toHaveLength(1);
    expect(invoices[0].invoice_number).toEqual('INV-2024-001');
    expect(invoices[0].client_name).toEqual('Test Client');
    expect(invoices[0].client_email).toEqual('client@test.com');
    expect(parseFloat(invoices[0].amount_due)).toEqual(1500.75);
    expect(invoices[0].services_rendered).toEqual('Web development services');
    expect(invoices[0].paid).toEqual(false);
    expect(invoices[0].created_at).toBeInstanceOf(Date);
    expect(invoices[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle paid invoice correctly', async () => {
    const paidInvoiceInput: CreateInvoiceInput = {
      ...testInput,
      invoice_number: 'INV-2024-002',
      paid: true
    };

    const result = await createInvoice(paidInvoiceInput);

    expect(result.paid).toEqual(true);

    // Verify in database
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, result.id))
      .execute();

    expect(invoices[0].paid).toEqual(true);
  });

  it('should handle decimal amounts correctly', async () => {
    const decimalInput: CreateInvoiceInput = {
      ...testInput,
      invoice_number: 'INV-2024-003',
      amount_due: 99.99
    };

    const result = await createInvoice(decimalInput);

    expect(result.amount_due).toEqual(99.99);
    expect(typeof result.amount_due).toEqual('number');

    // Verify precision is maintained in database
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, result.id))
      .execute();

    expect(parseFloat(invoices[0].amount_due)).toEqual(99.99);
  });

  it('should reject duplicate invoice numbers', async () => {
    // Create first invoice
    await createInvoice(testInput);

    // Try to create invoice with same number
    const duplicateInput: CreateInvoiceInput = {
      ...testInput,
      client_name: 'Different Client'
    };

    await expect(createInvoice(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle different date formats', async () => {
    const dateInput: CreateInvoiceInput = {
      ...testInput,
      invoice_number: 'INV-2024-004',
      issue_date: new Date('2024-02-15T10:30:00Z'),
      due_date: new Date('2024-03-15T23:59:59Z')
    };

    const result = await createInvoice(dateInput);

    expect(result.issue_date).toEqual(dateInput.issue_date);
    expect(result.due_date).toEqual(dateInput.due_date);

    // Verify dates are stored correctly in database
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, result.id))
      .execute();

    expect(invoices[0].issue_date).toEqual(dateInput.issue_date);
    expect(invoices[0].due_date).toEqual(dateInput.due_date);
  });

  it('should handle large amounts correctly', async () => {
    const largeAmountInput: CreateInvoiceInput = {
      ...testInput,
      invoice_number: 'INV-2024-005',
      amount_due: 99999.99
    };

    const result = await createInvoice(largeAmountInput);

    expect(result.amount_due).toEqual(99999.99);

    // Verify precision is maintained for large amounts
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, result.id))
      .execute();

    expect(parseFloat(invoices[0].amount_due)).toEqual(99999.99);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createInvoice(testInput);
    const afterCreation = new Date();

    // Check that timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});