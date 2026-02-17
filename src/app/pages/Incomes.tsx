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

export const Incomes: React.FC = () => {
  const { session } = useAuth();
  const [incomes, setIncomes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  
  // Pagination & Search
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
    subcategoryId: '',
    amount: '',
    remarks: '',
  });

  useEffect(() => {
    if (session) {
      fetchData();
      fetchStats();
    }
  }, [session, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchStats = async () => {
    try {
      const stats = await api.getDashboardStats(session.access_token);
      setTotalAmount(stats.totalIncomes);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incomesData, categoriesData, subcategoriesData] = await Promise.all([
        api.getIncomes(session.access_token, { page, limit }), // Backend doesn't support search on Incomes yet, but we can add later. Assuming basic pagination for now.
        api.getCategories(session.access_token),
        api.getSubcategories(session.access_token),
      ]);

      setIncomes(incomesData.incomes || []);
      setTotal(incomesData.total || 0);

      setCategories((categoriesData.categories || []).filter((c: any) => c.type === 'income'));
      setSubcategories(subcategoriesData.subcategories || []);
    } catch (error) {
      toast.error('Failed to load incomes');
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

      if (editingIncome) {
        await api.updateIncome(session.access_token, editingIncome.id, dataToSubmit);
        toast.success('Income updated successfully');
      } else {
        await api.createIncome(session.access_token, dataToSubmit);
        toast.success('Income created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save income');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.deleteIncome(session.access_token, id);
      toast.success('Income deleted successfully');
      fetchData();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete income');
    }
  };

  const handleEdit = (income: any) => {
    setEditingIncome(income);
    setFormData({
      date: typeof income.date === 'string' ? income.date.split('T')[0] : format(new Date(income.date), 'yyyy-MM-dd'),
      categoryId: income.categoryId || '',
      subcategoryId: income.subcategoryId || '',
      amount: income.amount.toString(),
      remarks: income.remarks || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingIncome(null);
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      categoryId: '',
      subcategoryId: '',
      amount: '',
      remarks: '',
    });
  };

  const getCategoryName = (id: string) => categories.find(c => c.id == id)?.name || 'N/A';
  const getSubcategoryName = (id: string) => subcategories.find(s => s.id == id)?.name || 'N/A';

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Incomes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track your incomes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Income</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingIncome ? 'Edit' : 'Add'} Income</DialogTitle>
              <DialogDescription>{editingIncome ? 'Update' : 'Create a new'} income record</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.categoryId.toString()} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select value={formData.subcategoryId?.toString()} onValueChange={(value) => setFormData({ ...formData, subcategoryId: value })}>
                  <SelectTrigger><SelectValue placeholder="Select subcategory (optional)" /></SelectTrigger>
                  <SelectContent>{subcategories.filter(s => s.categoryId == formData.categoryId).map(sub => <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" placeholder="Add any notes..." value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">{editingIncome ? 'Update' : 'Create'} Income</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search incomes (Not Implemented yet in API)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" disabled />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Incomes: <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(totalAmount)}</span></div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading incomes...</div>
        ) : incomes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No incomes found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subcategory</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomes.map((income) => (
                    <TableRow key={income.id}>
                      <TableCell>{format(new Date(income.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{getCategoryName(income.categoryId)}</TableCell>
                      <TableCell>{income.subcategoryId ? getSubcategoryName(income.subcategoryId) : '-'}</TableCell>
                      <TableCell className="font-semibold text-green-600">{formatCurrency(income.amount)}</TableCell>
                      <TableCell className="max-w-xs truncate">{income.remarks || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(income)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(income.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
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
