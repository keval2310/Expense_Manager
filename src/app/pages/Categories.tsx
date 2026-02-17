import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const Categories: React.FC = () => {
  const { session } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [editingSub, setEditingSub] = useState<any>(null);

  const [catForm, setCatForm] = useState({ name: '', type: 'expense', isActive: true });
  const [subForm, setSubForm] = useState({ name: '', categoryId: '', isActive: true });

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catData, subData] = await Promise.all([
        api.getCategories(session.access_token),
        api.getSubcategories(session.access_token),
      ]);
      setCategories(catData.categories || []);
      setSubcategories(subData.subcategories || []);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await api.updateCategory(session.access_token, editingCat.id, catForm);
        toast.success('Category updated');
      } else {
        await api.createCategory(session.access_token, catForm);
        toast.success('Category created');
      }
      setCatDialogOpen(false);
      resetCatForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
    }
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.categoryId) {
      toast.error('Please select a parent category');
      return;
    }
    try {
      if (editingSub) {
        await api.updateSubcategory(session.access_token, editingSub.id, subForm);
        toast.success('Subcategory updated');
      } else {
        await api.createSubcategory(session.access_token, subForm);
        toast.success('Subcategory created');
      }
      setSubDialogOpen(false);
      resetSubForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save subcategory');
    }
  };

  const deleteCat = async (id: string) => {
    if (!confirm('Delete category?')) return;
    try {
      await api.deleteCategory(session.access_token, id);
      toast.success('Category deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteSub = async (id: string) => {
    if (!confirm('Delete subcategory?')) return;
    try {
      await api.deleteSubcategory(session.access_token, id);
      toast.success('Subcategory deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetCatForm = () => {
    setEditingCat(null);
    setCatForm({ name: '', type: 'expense', isActive: true });
  };

  const resetSubForm = () => {
    setEditingSub(null);
    setSubForm({ name: '', categoryId: '', isActive: true });
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Categories & Subcategories</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Organize your transactions</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <div className="mb-4">
            <Dialog open={catDialogOpen} onOpenChange={(open) => { setCatDialogOpen(open); if (!open) resetCatForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Add Category</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCat ? 'Edit' : 'Add'} Category</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCatSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={catForm.type} onValueChange={(v) => setCatForm({ ...catForm, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch checked={catForm.isActive} onCheckedChange={(checked) => setCatForm({ ...catForm, isActive: checked })} />
                  </div>
                  <Button type="submit" className="w-full">{editingCat ? 'Update' : 'Create'}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{cat.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, type: cat.type, isActive: cat.isActive }); setCatDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteCat(cat.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded ${cat.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {cat.type}
                    </span>
                    <span className={cat.isActive ? 'text-green-600' : 'text-gray-400'}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subcategories" className="mt-6">
          <div className="mb-4">
            <Dialog open={subDialogOpen} onOpenChange={(open) => { setSubDialogOpen(open); if (!open) resetSubForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Add Subcategory</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSub ? 'Edit' : 'Add'} Subcategory</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Category</Label>
                    <Select value={subForm.categoryId?.toString() || ''} onValueChange={(v) => setSubForm({ ...subForm, categoryId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch checked={subForm.isActive} onCheckedChange={(checked) => setSubForm({ ...subForm, isActive: checked })} />
                  </div>
                  <Button type="submit" className="w-full">{editingSub ? 'Update' : 'Create'}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subcategories.map((sub) => (
              <Card key={sub.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{sub.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingSub(sub); setSubForm({ name: sub.name, categoryId: sub.categoryId, isActive: sub.isActive }); setSubDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteSub(sub.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Parent: {categories.find(c => c.id == sub.categoryId)?.name || 'N/A'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
