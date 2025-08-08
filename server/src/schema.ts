import { z } from 'zod';

// Invoice schema with proper type handling
export const invoiceSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  client_name: z.string(),
  client_email: z.string().email(),
  amount_due: z.number(), // Stored as numeric in DB, but we use number in TS
  issue_date: z.coerce.date(), // Automatically converts string timestamps to Date objects
  due_date: z.coerce.date(),
  services_rendered: z.string(),
  paid: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invoice = z.infer<typeof invoiceSchema>;

// Input schema for creating invoices
export const createInvoiceInputSchema = z.object({
  invoice_number: z.string().min(1, "Invoice number is required"),
  client_name: z.string().min(1, "Client name is required"),
  client_email: z.string().email("Valid email is required"),
  amount_due: z.number().positive("Amount due must be positive"),
  issue_date: z.coerce.date(),
  due_date: z.coerce.date(),
  services_rendered: z.string().min(1, "Services description is required"),
  paid: z.boolean().default(false)
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

// Input schema for updating invoices
export const updateInvoiceInputSchema = z.object({
  id: z.number(),
  invoice_number: z.string().min(1).optional(),
  client_name: z.string().min(1).optional(),
  client_email: z.string().email().optional(),
  amount_due: z.number().positive().optional(),
  issue_date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional(),
  services_rendered: z.string().min(1).optional(),
  paid: z.boolean().optional()
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;

// Input schema for deleting invoices
export const deleteInvoiceInputSchema = z.object({
  id: z.number()
});

export type DeleteInvoiceInput = z.infer<typeof deleteInvoiceInputSchema>;

// Input schema for getting a single invoice
export const getInvoiceInputSchema = z.object({
  id: z.number()
});

export type GetInvoiceInput = z.infer<typeof getInvoiceInputSchema>;