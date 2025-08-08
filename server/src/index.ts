import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createInvoiceInputSchema, 
  updateInvoiceInputSchema, 
  deleteInvoiceInputSchema, 
  getInvoiceInputSchema 
} from './schema';

// Import handlers
import { createInvoice } from './handlers/create_invoice';
import { getInvoices } from './handlers/get_invoices';
import { getInvoice } from './handlers/get_invoice';
import { updateInvoice } from './handlers/update_invoice';
import { deleteInvoice } from './handlers/delete_invoice';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Create a new invoice
  createInvoice: publicProcedure
    .input(createInvoiceInputSchema)
    .mutation(({ input }) => createInvoice(input)),

  // Get all invoices
  getInvoices: publicProcedure
    .query(() => getInvoices()),

  // Get a single invoice by ID
  getInvoice: publicProcedure
    .input(getInvoiceInputSchema)
    .query(({ input }) => getInvoice(input)),

  // Update an existing invoice
  updateInvoice: publicProcedure
    .input(updateInvoiceInputSchema)
    .mutation(({ input }) => updateInvoice(input)),

  // Delete an invoice
  deleteInvoice: publicProcedure
    .input(deleteInvoiceInputSchema)
    .mutation(({ input }) => deleteInvoice(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();