import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { toast } from 'sonner';

export const Categories: React.FC = () => {
  const { session, user, isAdmin } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [editingSub, setEditingSub] = useState<any>(null);

  const [catForm, setCatForm] = useState({ name: '', type: 'expense' });
  const [subForm, setSubForm] = useState({ name: '', categoryId: '' });

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
    if (!confirm('Delete this category?')) return;
    try {
      await api.deleteCategory(session.access_token, id);
      toast.success('Category deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteSub = async (id: string) => {
    if (!confirm('Delete this subcategory?')) return;
    try {
      await api.deleteSubcategory(session.access_token, id);
      toast.success('Subcategory deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetCatForm = () => { setEditingCat(null); setCatForm({ name: '', type: 'expense' }); };
  const resetSubForm = () => { setEditingSub(null); setSubForm({ name: '', categoryId: '' }); };

  const CategoryFormDialog = ({ open, onOpenChange, onSubmit, editing, form, setForm, title }: any) => (
    <DialogContent className="max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl">
      <DialogHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
        <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">{editing ? 'Edit' : 'Add'} {title}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={`Enter ${title.toLowerCase()} name`}
            className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" required />
        </div>
        {title === 'Category' && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {title === 'Subcategory' && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Parent Category</Label>
            <Select value={form.categoryId?.toString() || ''} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => onOpenChange(false)}
            className="flex-1 h-9 text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 h-9 text-sm font-medium bg-[#1d6aef] text-white rounded-lg hover:bg-[#1558cc] transition-colors">
            {editing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </DialogContent>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#1d6aef] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Categories</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Organize your transactions by category</p>
      </div>

      <Tabs defaultValue="categories">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg h-auto">
            <TabsTrigger value="categories" className="rounded-md text-sm py-1.5 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">
              Categories <span className="ml-1.5 text-xs text-gray-400">({categories.length})</span>
            </TabsTrigger>
            <TabsTrigger value="subcategories" className="rounded-md text-sm py-1.5 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">
              Subcategories <span className="ml-1.5 text-xs text-gray-400">({subcategories.length})</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {isAdmin && (
              <>
                <TabsContent value="categories" className="mt-0">
                  <Dialog open={catDialogOpen} onOpenChange={(open) => { setCatDialogOpen(open); if (!open) resetCatForm(); }}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1d6aef] text-white text-sm font-medium rounded-lg hover:bg-[#1558cc] transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Category
                      </button>
                    </DialogTrigger>
                    <CategoryFormDialog open={catDialogOpen} onOpenChange={setCatDialogOpen} onSubmit={handleCatSubmit}
                      editing={editingCat} form={catForm} setForm={setCatForm} title="Category" />
                  </Dialog>
                </TabsContent>
                <TabsContent value="subcategories" className="mt-0">
                  <Dialog open={subDialogOpen} onOpenChange={(open) => { setSubDialogOpen(open); if (!open) resetSubForm(); }}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1d6aef] text-white text-sm font-medium rounded-lg hover:bg-[#1558cc] transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Subcategory
                      </button>
                    </DialogTrigger>
                    <CategoryFormDialog open={subDialogOpen} onOpenChange={setSubDialogOpen} onSubmit={handleSubSubmit}
                      editing={editingSub} form={subForm} setForm={setSubForm} title="Subcategory" />
                  </Dialog>
                </TabsContent>
              </>
            )}
          </div>
        </div>

        <TabsContent value="categories" className="mt-0">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 gap-3">
              <Tags className="w-8 h-8 text-gray-300 dark:text-gray-700" />
              <p className="text-sm text-gray-400">No categories found. Add your first category.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subcategories</th>
                    {isAdmin && <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${cat.type === 'expense' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                          <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          cat.type === 'expense'
                            ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                        }`}>
                          {cat.type.charAt(0).toUpperCase() + cat.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500 dark:text-gray-400">
                        {subcategories.filter(s => s.categoryId == cat.id).length} subcategories
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 rounded-md text-gray-400 hover:text-[#1d6aef] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, type: cat.type }); setCatDialogOpen(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => deleteCat(cat.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="subcategories" className="mt-0">
          {subcategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 gap-3">
              <Tags className="w-8 h-8 text-gray-300 dark:text-gray-700" />
              <p className="text-sm text-gray-400">No subcategories found. Add your first subcategory.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Parent Category</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</th>
                    {isAdmin && <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {subcategories.map((sub) => {
                    const parentCat = categories.find(c => c.id == sub.categoryId);
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors group">
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{sub.name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] text-gray-600 dark:text-gray-400">{parentCat?.name || 'N/A'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {parentCat && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                              parentCat.type === 'expense'
                                ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-800'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                            }`}>
                              {parentCat.type.charAt(0).toUpperCase() + parentCat.type.slice(1)}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 rounded-md text-gray-400 hover:text-[#1d6aef] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                onClick={() => { setEditingSub(sub); setSubForm({ name: sub.name, categoryId: sub.categoryId }); setSubDialogOpen(true); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => deleteSub(sub.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
