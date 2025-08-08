import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Invoice, CreateInvoiceInput, UpdateInvoiceInput } from '../../server/src/schema';

function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state for creating invoices
  const [createForm, setCreateForm] = useState<CreateInvoiceInput>({
    invoice_number: '',
    client_name: '',
    client_email: '',
    amount_due: 0,
    issue_date: new Date(),
    due_date: new Date(),
    services_rendered: '',
    paid: false
  });

  // Form state for editing invoices
  const [editForm, setEditForm] = useState<Partial<UpdateInvoiceInput>>({});

  const loadInvoices = useCallback(async () => {
    try {
      const result = await trpc.getInvoices.query();
      setInvoices(result);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createInvoice.mutate(createForm);
      setInvoices((prev: Invoice[]) => [response, ...prev]);
      setCreateForm({
        invoice_number: '',
        client_name: '',
        client_email: '',
        amount_due: 0,
        issue_date: new Date(),
        due_date: new Date(),
        services_rendered: '',
        paid: false
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    
    setIsLoading(true);
    try {
      const updateData: UpdateInvoiceInput = {
        id: editingInvoice.id,
        ...editForm
      };
      const response = await trpc.updateInvoice.mutate(updateData);
      setInvoices((prev: Invoice[]) => 
        prev.map(invoice => invoice.id === editingInvoice.id ? response : invoice)
      );
      setIsEditDialogOpen(false);
      setEditingInvoice(null);
      setEditForm({});
    } catch (error) {
      console.error('Failed to update invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteInvoice.mutate({ id });
      setInvoices((prev: Invoice[]) => prev.filter(invoice => invoice.id !== id));
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditForm({
      invoice_number: invoice.invoice_number,
      client_name: invoice.client_name,
      client_email: invoice.client_email,
      amount_due: invoice.amount_due,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      services_rendered: invoice.services_rendered,
      paid: invoice.paid
    });
    setIsEditDialogOpen(true);
  };

  const isOverdue = (dueDate: Date, paid: boolean) => {
    return !paid && new Date() > new Date(dueDate);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate stats
  const totalOutstanding = invoices
    .filter(inv => !inv.paid)
    .reduce((sum, inv) => sum + inv.amount_due, 0);
  
  const overdueInvoices = invoices.filter(inv => isOverdue(inv.due_date, inv.paid));

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-100 font-mono">
                ⚫ INVOICE MANAGEMENT
              </h1>
              <p className="text-gray-400 mt-1 font-mono text-sm">
                Software consulting invoices • Minimalist operations
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-grim px-6">
                  + NEW INVOICE
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700 text-gray-100">
                <DialogHeader>
                  <DialogTitle className="font-mono text-gray-100">CREATE INVOICE</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-mono text-gray-400 mb-2 block">INVOICE NUMBER</label>
                      <Input
                        className="input-grim"
                        value={createForm.invoice_number}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateForm((prev: CreateInvoiceInput) => ({ ...prev, invoice_number: e.target.value }))
                        }
                        placeholder="INV-2024-001"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-mono text-gray-400 mb-2 block">AMOUNT DUE</label>
                      <Input
                        className="input-grim"
                        type="number"
                        value={createForm.amount_due}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateForm((prev: CreateInvoiceInput) => ({ ...prev, amount_due: parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="5000.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-mono text-gray-400 mb-2 block">CLIENT NAME</label>
                    <Input
                      className="input-grim"
                      value={createForm.client_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm((prev: CreateInvoiceInput) => ({ ...prev, client_name: e.target.value }))
                      }
                      placeholder="ACME Corporation"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-mono text-gray-400 mb-2 block">CLIENT EMAIL</label>
                    <Input
                      className="input-grim"
                      type="email"
                      value={createForm.client_email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm((prev: CreateInvoiceInput) => ({ ...prev, client_email: e.target.value }))
                      }
                      placeholder="billing@acme.com"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-mono text-gray-400 mb-2 block">ISSUE DATE</label>
                      <Input
                        className="input-grim"
                        type="date"
                        value={createForm.issue_date.toISOString().split('T')[0]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateForm((prev: CreateInvoiceInput) => ({ ...prev, issue_date: new Date(e.target.value) }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-mono text-gray-400 mb-2 block">DUE DATE</label>
                      <Input
                        className="input-grim"
                        type="date"
                        value={createForm.due_date.toISOString().split('T')[0]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateForm((prev: CreateInvoiceInput) => ({ ...prev, due_date: new Date(e.target.value) }))
                        }
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-mono text-gray-400 mb-2 block">SERVICES RENDERED</label>
                    <Textarea
                      className="input-grim min-h-[80px]"
                      value={createForm.services_rendered}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCreateForm((prev: CreateInvoiceInput) => ({ ...prev, services_rendered: e.target.value }))
                      }
                      placeholder="Web application development, API integration..."
                      required
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={createForm.paid}
                      onCheckedChange={(checked: boolean) =>
                        setCreateForm((prev: CreateInvoiceInput) => ({ ...prev, paid: checked }))
                      }
                    />
                    <label className="text-sm font-mono text-gray-300">MARK AS PAID</label>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      CANCEL
                    </Button>
                    <Button type="submit" disabled={isLoading} className="btn-grim">
                      {isLoading ? 'CREATING...' : 'CREATE'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-8">
            <div className="bg-gray-900 border border-gray-700 p-4">
              <div className="text-xs font-mono text-gray-400 mb-1">TOTAL INVOICES</div>
              <div className="text-2xl font-bold font-mono">{invoices.length}</div>
            </div>
            <div className="bg-gray-900 border border-gray-700 p-4">
              <div className="text-xs font-mono text-gray-400 mb-1">OUTSTANDING</div>
              <div className="text-2xl font-bold font-mono text-yellow-400">{formatCurrency(totalOutstanding)}</div>
            </div>
            <div className="bg-gray-900 border border-gray-700 p-4">
              <div className="text-xs font-mono text-gray-400 mb-1">OVERDUE</div>
              <div className="text-2xl font-bold font-mono text-red-400">{overdueInvoices.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {invoices.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚫</div>
            <p className="text-gray-400 font-mono">NO INVOICES YET</p>
            <p className="text-gray-600 text-sm font-mono mt-2">Create your first invoice to get started</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {invoices.map((invoice: Invoice) => {
              const overdue = isOverdue(invoice.due_date, invoice.paid);
              const cardClass = overdue 
                ? 'invoice-card-overdue' 
                : invoice.paid 
                ? 'invoice-card-paid' 
                : 'invoice-card';
              
              return (
                <Card key={invoice.id} className={cardClass}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="font-mono text-lg text-gray-100">
                          {invoice.invoice_number}
                        </CardTitle>
                        <div className="text-sm text-gray-400 font-mono mt-1">
                          {invoice.client_name} • {invoice.client_email}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {invoice.paid ? (
                          <Badge className="bg-green-900 text-green-100 border-green-700 font-mono">PAID</Badge>
                        ) : overdue ? (
                          <Badge className="bg-red-900 text-red-100 border-red-700 font-mono">OVERDUE</Badge>
                        ) : (
                          <Badge className="bg-yellow-900 text-yellow-100 border-yellow-700 font-mono">PENDING</Badge>
                        )}
                        <div className="text-xl font-bold font-mono text-gray-100">
                          {formatCurrency(invoice.amount_due)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs font-mono text-gray-400 mb-1">ISSUED</div>
                        <div className="text-sm font-mono">{formatDate(invoice.issue_date)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-mono text-gray-400 mb-1">DUE</div>
                        <div className="text-sm font-mono">{formatDate(invoice.due_date)}</div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-xs font-mono text-gray-400 mb-1">SERVICES</div>
                      <div className="text-sm text-gray-300">{invoice.services_rendered}</div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={() => openEditDialog(invoice)}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800 font-mono text-xs"
                      >
                        EDIT
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="btn-danger font-mono text-xs"
                          >
                            DELETE
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-900 border-gray-700 text-gray-100">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-mono">DELETE INVOICE</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                              Permanently delete invoice {invoice.invoice_number}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">
                              CANCEL
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(invoice.id)}
                              className="btn-danger"
                            >
                              DELETE
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-100">
          <DialogHeader>
            <DialogTitle className="font-mono text-gray-100">
              EDIT INVOICE {editingInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-gray-400 mb-2 block">INVOICE NUMBER</label>
                <Input
                  className="input-grim"
                  value={editForm.invoice_number || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev) => ({ ...prev, invoice_number: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-400 mb-2 block">AMOUNT DUE</label>
                <Input
                  className="input-grim"
                  type="number"
                  value={editForm.amount_due || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev) => ({ ...prev, amount_due: parseFloat(e.target.value) || 0 }))
                  }
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-mono text-gray-400 mb-2 block">CLIENT NAME</label>
              <Input
                className="input-grim"
                value={editForm.client_name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev) => ({ ...prev, client_name: e.target.value }))
                }
              />
            </div>
            
            <div>
              <label className="text-xs font-mono text-gray-400 mb-2 block">CLIENT EMAIL</label>
              <Input
                className="input-grim"
                type="email"
                value={editForm.client_email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev) => ({ ...prev, client_email: e.target.value }))
                }
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-gray-400 mb-2 block">ISSUE DATE</label>
                <Input
                  className="input-grim"
                  type="date"
                  value={editForm.issue_date ? new Date(editForm.issue_date).toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev) => ({ ...prev, issue_date: new Date(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-400 mb-2 block">DUE DATE</label>
                <Input
                  className="input-grim"
                  type="date"
                  value={editForm.due_date ? new Date(editForm.due_date).toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev) => ({ ...prev, due_date: new Date(e.target.value) }))
                  }
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-mono text-gray-400 mb-2 block">SERVICES RENDERED</label>
              <Textarea
                className="input-grim min-h-[80px]"
                value={editForm.services_rendered || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditForm((prev) => ({ ...prev, services_rendered: e.target.value }))
                }
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <Switch
                checked={editForm.paid || false}
                onCheckedChange={(checked: boolean) =>
                  setEditForm((prev) => ({ ...prev, paid: checked }))
                }
              />
              <label className="text-sm font-mono text-gray-300">MARK AS PAID</label>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                CANCEL
              </Button>
              <Button type="submit" disabled={isLoading} className="btn-grim">
                {isLoading ? 'UPDATING...' : 'UPDATE'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;