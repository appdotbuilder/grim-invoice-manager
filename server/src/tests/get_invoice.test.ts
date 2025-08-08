import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type GetInvoiceInput, type CreateInvoiceInput } from '../schema';
import { getInvoice } from '../handlers/get_invoice';

// Test invoice data
const testInvoiceData = {
  invoice_number: 'INV-2024-001',
  client_name: 'Test Client Corp',
  client_email: 'client@testcorp.com',
  amount_due: 1500.75,
  issue_date: new Date('2024-01-15'),
  due_date: new Date('2024-02-15'),
  services_rendered: 'Web development services for Q1 2024',
  paid: false
};

// Helper function to create a test invoice
const createTestInvoice = async (data = testInvoiceData) => {
  const result = await db.insert(invoicesTable)
    .values({
      ...data,
      amount_due: data.amount_due.toString() // Convert to string for DB storage
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('getInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve an existing invoice by ID', async () => {
    // Create test invoice
    const createdInvoice = await createTestInvoice();
    
    const input: GetInvoiceInput = {
      id: createdInvoice.id
    };

    const result = await getInvoice(input);

    // Validate all fields
    expect(result.id).toEqual(createdInvoice.id);
    expect(result.invoice_number).toEqual('INV-2024-001');
    expect(result.client_name).toEqual('Test Client Corp');
    expect(result.client_email).toEqual('client@testcorp.com');
    expect(result.amount_due).toEqual(1500.75);
    expect(typeof result.amount_due).toBe('number'); // Verify numeric conversion
    expect(result.issue_date).toBeInstanceOf(Date);
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.services_rendered).toEqual('Web development services for Q1 2024');
    expect(result.paid).toBe(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should retrieve a paid invoice correctly', async () => {
    // Create paid invoice
    const paidInvoiceData = {
      ...testInvoiceData,
      invoice_number: 'INV-2024-002',
      paid: true
    };
    const createdInvoice = await createTestInvoice(paidInvoiceData);
    
    const input: GetInvoiceInput = {
      id: createdInvoice.id
    };

    const result = await getInvoice(input);

    expect(result.paid).toBe(true);
    expect(result.invoice_number).toEqual('INV-2024-002');
  });

  it('should handle different amount values correctly', async () => {
    // Test with large amount
    const largeAmountData = {
      ...testInvoiceData,
      invoice_number: 'INV-2024-003',
      amount_due: 99999.99
    };
    const createdInvoice = await createTestInvoice(largeAmountData);
    
    const input: GetInvoiceInput = {
      id: createdInvoice.id
    };

    const result = await getInvoice(input);

    expect(result.amount_due).toEqual(99999.99);
    expect(typeof result.amount_due).toBe('number');
  });

  it('should handle small decimal amounts correctly', async () => {
    // Test with small decimal amount
    const smallAmountData = {
      ...testInvoiceData,
      invoice_number: 'INV-2024-004',
      amount_due: 0.01
    };
    const createdInvoice = await createTestInvoice(smallAmountData);
    
    const input: GetInvoiceInput = {
      id: createdInvoice.id
    };

    const result = await getInvoice(input);

    expect(result.amount_due).toEqual(0.01);
    expect(typeof result.amount_due).toBe('number');
  });

  it('should throw an error when invoice does not exist', async () => {
    const input: GetInvoiceInput = {
      id: 999999 // Non-existent ID
    };

    await expect(getInvoice(input)).rejects.toThrow(/not found/i);
  });

  it('should throw an error for negative ID', async () => {
    const input: GetInvoiceInput = {
      id: -1
    };

    await expect(getInvoice(input)).rejects.toThrow(/not found/i);
  });

  it('should handle date fields correctly', async () => {
    // Create invoice with specific dates
    const specificDateData = {
      ...testInvoiceData,
      invoice_number: 'INV-2024-005',
      issue_date: new Date('2024-03-01T10:00:00Z'),
      due_date: new Date('2024-04-01T23:59:59Z')
    };
    const createdInvoice = await createTestInvoice(specificDateData);
    
    const input: GetInvoiceInput = {
      id: createdInvoice.id
    };

    const result = await getInvoice(input);

    expect(result.issue_date).toBeInstanceOf(Date);
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.issue_date.getDate()).toEqual(1);
    expect(result.issue_date.getMonth()).toEqual(2); // March is month 2 (0-indexed)
    expect(result.due_date.getDate()).toEqual(1);
    expect(result.due_date.getMonth()).toEqual(3); // April is month 3 (0-indexed)
  });

  it('should preserve special characters in text fields', async () => {
    // Test with special characters
    const specialCharData = {
      ...testInvoiceData,
      invoice_number: 'INV-2024-006',
      client_name: 'Client & Associates, LLC',
      services_rendered: 'Services: "Premium Support" & maintenance (50% discount applied)'
    };
    const createdInvoice = await createTestInvoice(specialCharData);
    
    const input: GetInvoiceInput = {
      id: createdInvoice.id
    };

    const result = await getInvoice(input);

    expect(result.client_name).toEqual('Client & Associates, LLC');
    expect(result.services_rendered).toEqual('Services: "Premium Support" & maintenance (50% discount applied)');
  });
});