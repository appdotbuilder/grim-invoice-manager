import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type CreateInvoiceInput } from '../schema';
import { getInvoices } from '../handlers/get_invoices';

// Test invoice inputs
const testInvoice1: Omit<CreateInvoiceInput, 'paid'> & { paid: boolean } = {
  invoice_number: 'INV-001',
  client_name: 'John Doe',
  client_email: 'john@example.com',
  amount_due: 150.75,
  issue_date: new Date('2024-01-01'),
  due_date: new Date('2024-01-31'),
  services_rendered: 'Web development services',
  paid: false
};

const testInvoice2: Omit<CreateInvoiceInput, 'paid'> & { paid: boolean } = {
  invoice_number: 'INV-002',
  client_name: 'Jane Smith',
  client_email: 'jane@example.com',
  amount_due: 275.50,
  issue_date: new Date('2024-01-02'),
  due_date: new Date('2024-02-01'),
  services_rendered: 'Design consultation',
  paid: true
};

const testInvoice3: Omit<CreateInvoiceInput, 'paid'> & { paid: boolean } = {
  invoice_number: 'INV-003',
  client_name: 'Bob Wilson',
  client_email: 'bob@example.com',
  amount_due: 99.99,
  issue_date: new Date('2024-01-03'),
  due_date: new Date('2024-02-02'),
  services_rendered: 'Bug fixes and maintenance',
  paid: false
};

describe('getInvoices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no invoices exist', async () => {
    const result = await getInvoices();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should fetch all invoices from database', async () => {
    // Insert test invoices
    await db.insert(invoicesTable).values([
      {
        ...testInvoice1,
        amount_due: testInvoice1.amount_due.toString()
      },
      {
        ...testInvoice2,
        amount_due: testInvoice2.amount_due.toString()
      }
    ]).execute();

    const result = await getInvoices();

    expect(result).toHaveLength(2);
    
    // Verify all invoice fields are returned correctly
    const invoice1 = result.find(inv => inv.invoice_number === 'INV-001');
    const invoice2 = result.find(inv => inv.invoice_number === 'INV-002');

    expect(invoice1).toBeDefined();
    expect(invoice1!.client_name).toEqual('John Doe');
    expect(invoice1!.client_email).toEqual('john@example.com');
    expect(invoice1!.amount_due).toEqual(150.75);
    expect(typeof invoice1!.amount_due).toBe('number');
    expect(invoice1!.paid).toBe(false);

    expect(invoice2).toBeDefined();
    expect(invoice2!.client_name).toEqual('Jane Smith');
    expect(invoice2!.amount_due).toEqual(275.50);
    expect(typeof invoice2!.amount_due).toBe('number');
    expect(invoice2!.paid).toBe(true);
  });

  it('should return invoices ordered by creation date (newest first)', async () => {
    // Insert invoices with slight delay to ensure different timestamps
    await db.insert(invoicesTable).values({
      ...testInvoice1,
      amount_due: testInvoice1.amount_due.toString()
    }).execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(invoicesTable).values({
      ...testInvoice2,
      amount_due: testInvoice2.amount_due.toString()
    }).execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(invoicesTable).values({
      ...testInvoice3,
      amount_due: testInvoice3.amount_due.toString()
    }).execute();

    const result = await getInvoices();

    expect(result).toHaveLength(3);
    
    // Verify ordering by creation date (newest first)
    expect(result[0].invoice_number).toEqual('INV-003');
    expect(result[1].invoice_number).toEqual('INV-002');
    expect(result[2].invoice_number).toEqual('INV-001');

    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should handle numeric conversion correctly for decimal amounts', async () => {
    // Test with various decimal values
    const invoiceWithDecimals = {
      ...testInvoice1,
      amount_due: 1234.56
    };

    await db.insert(invoicesTable).values({
      ...invoiceWithDecimals,
      amount_due: invoiceWithDecimals.amount_due.toString()
    }).execute();

    const result = await getInvoices();

    expect(result).toHaveLength(1);
    expect(result[0].amount_due).toEqual(1234.56);
    expect(typeof result[0].amount_due).toBe('number');
  });

  it('should return all invoice fields with correct types', async () => {
    await db.insert(invoicesTable).values({
      ...testInvoice1,
      amount_due: testInvoice1.amount_due.toString()
    }).execute();

    const result = await getInvoices();

    expect(result).toHaveLength(1);
    const invoice = result[0];

    // Verify all fields exist and have correct types
    expect(typeof invoice.id).toBe('number');
    expect(typeof invoice.invoice_number).toBe('string');
    expect(typeof invoice.client_name).toBe('string');
    expect(typeof invoice.client_email).toBe('string');
    expect(typeof invoice.amount_due).toBe('number');
    expect(invoice.issue_date).toBeInstanceOf(Date);
    expect(invoice.due_date).toBeInstanceOf(Date);
    expect(typeof invoice.services_rendered).toBe('string');
    expect(typeof invoice.paid).toBe('boolean');
    expect(invoice.created_at).toBeInstanceOf(Date);
    expect(invoice.updated_at).toBeInstanceOf(Date);
  });

  it('should handle invoices with zero amount', async () => {
    const zeroAmountInvoice = {
      ...testInvoice1,
      amount_due: 0
    };

    await db.insert(invoicesTable).values({
      ...zeroAmountInvoice,
      amount_due: zeroAmountInvoice.amount_due.toString()
    }).execute();

    const result = await getInvoices();

    expect(result).toHaveLength(1);
    expect(result[0].amount_due).toEqual(0);
    expect(typeof result[0].amount_due).toBe('number');
  });
});