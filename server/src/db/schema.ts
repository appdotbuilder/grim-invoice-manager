import { serial, text, pgTable, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';

export const invoicesTable = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoice_number: text('invoice_number').notNull().unique(), // Unique invoice numbers
  client_name: text('client_name').notNull(),
  client_email: text('client_email').notNull(),
  amount_due: numeric('amount_due', { precision: 10, scale: 2 }).notNull(), // Use numeric for monetary values with precision
  issue_date: timestamp('issue_date').notNull(),
  due_date: timestamp('due_date').notNull(),
  services_rendered: text('services_rendered').notNull(),
  paid: boolean('paid').notNull().default(false), // Default to unpaid
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// TypeScript type for the table schema
export type Invoice = typeof invoicesTable.$inferSelect; // For SELECT operations
export type NewInvoice = typeof invoicesTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { invoices: invoicesTable };