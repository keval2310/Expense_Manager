import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '../../lib/utils';

export const Expenses: React.FC = () => {
  const { session } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  
  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
    subcategoryId: '',
    projectId: '',
    amount: '',
    remarks: '',
  });

  useEffect(() => {
    if (session) {
      fetchData();
      fetchStats();
    }
  }, [session, page]); // Re-fetch when page changes

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchStats = async () => {
    try {
      const stats = await api.getDashboardStats(session.access_token);
      setTotalAmount(stats.totalExpenses);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesData, categoriesData, subcategoriesData, projectsData] = await Promise.all([
        api.getExpenses(session.access_token, { page, limit, search: searchTerm }),
        api.getCategories(session.access_token),
        api.getSubcategories(session.access_token),
        api.getProjects(session.access_token),
      ]);

      setExpenses(expensesData.expenses || []);
      setTotal(expensesData.total || 0);
      setCategories((categoriesData.categories || []).filter((c: any) => c.type === 'expense'));
      setSubcategories(subcategoriesData.subcategories || []);
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editingExpense) {
        await api.updateExpense(session.access_token, editingExpense.id, dataToSubmit);
        toast.success('Expense updated successfully');
      } else {
        await api.createExpense(session.access_token, dataToSubmit);
        toast.success('Expense created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await api.deleteExpense(session.access_token, id);
      toast.success('Expense deleted successfully');
      fetchData();
      fetchStats();
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast.error(error.message || 'Failed to delete expense');
    }
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setFormData({
      date: typeof expense.date === 'string' ? expense.date.split('T')[0] : format(new Date(expense.date), 'yyyy-MM-dd'),
      categoryId: expense.categoryId || '',
      subcategoryId: expense.subcategoryId || '',
      projectId: expense.projectId || '',
      amount: expense.amount.toString(),
      remarks: expense.remarks || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingExpense(null);
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      categoryId: '',
      subcategoryId: '',
      projectId: '',
      amount: '',
      remarks: '',
    });
  };

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id == id)?.name || 'N/A';
  };

  const getSubcategoryName = (id: string) => {
    return subcategories.find(s => s.id == id)?.name || 'N/A';
  };

  const getProjectName = (id: string) => {
    const project = projects.find(p => String(p.ProjectID) === String(id) || String(p.id) === String(id));
    return project ? (project.ProjectName || project.name) : '-';
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track your expenses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit' : 'Add'} Expense</DialogTitle>
              <DialogDescription>
                {editingExpense ? 'Update' : 'Create a new'} expense record
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.categoryId.toString()} onValueChange={(value) => setFormData({ ...formData, categoryId: value, subcategoryId: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select value={formData.subcategoryId?.toString() || ''} onValueChange={(value) => setFormData({ ...formData, subcategoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.filter(s => String(s.categoryId) === String(formData.categoryId)).map(sub => (
                      <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={formData.projectId?.toString()} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(proj => (
                      <SelectItem key={proj.ProjectID || proj.id} value={String(proj.ProjectID || proj.id)}>
                        {proj.ProjectName || proj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Add any notes..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full">
                {editingExpense ? 'Update' : 'Create'} Expense
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Total Expenses: <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No expenses found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subcategory</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{getCategoryName(expense.categoryId)}</TableCell>
                      <TableCell>{expense.subcategoryId ? getSubcategoryName(expense.subcategoryId) : '-'}</TableCell>
                      <TableCell>{expense.projectId ? getProjectName(expense.projectId) : '-'}</TableCell>

                      <TableCell className="font-semibold text-red-600">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="max-w-xs truncate">{expense.remarks || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end px-4 py-4 space-x-2 border-t dark:border-gray-700">
               <div className="text-sm text-gray-500 dark:text-gray-400 mr-4">
                  Page {page} of {Math.max(1, totalPages)}
               </div>
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page === 1}
               >
                 <ChevronLeft className="w-4 h-4" />
               </Button>
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page >= totalPages || totalPages === 0}
               >
                 <ChevronRight className="w-4 h-4" />
               </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
