import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatCurrency } from "../../lib/utils";

export const Incomes: React.FC = () => {
  const { session, isAdmin } = useAuth();
  const [incomes, setIncomes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    categoryId: "",
    subcategoryId: "",
    amount: "",
    remarks: "",
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
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incomesData, categoriesData, subcategoriesData] = await Promise.all([
        api.getIncomes(session.access_token, { page, limit }),
        api.getCategories(session.access_token),
        api.getSubcategories(session.access_token),
      ]);

      setIncomes(incomesData.incomes || []);
      setTotal(incomesData.total || 0);
      setCategories((categoriesData.categories || []).filter((c: any) => c.type === "income"));
      setSubcategories(subcategoriesData.subcategories || []);
    } catch (error) {
      toast.error("Failed to load incomes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = { ...formData, amount: parseFloat(formData.amount) };
      if (editingIncome) {
        await api.updateIncome(session.access_token, editingIncome.id, dataToSubmit);
        toast.success("Income updated successfully");
      } else {
        await api.createIncome(session.access_token, dataToSubmit);
        toast.success("Income created successfully");
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to save income");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.deleteIncome(session.access_token, id);
      toast.success("Income deleted successfully");
      fetchData();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete income");
    }
  };

  const handleEdit = (income: any) => {
    setEditingIncome(income);
    setFormData({
      date: typeof income.date === "string" ? income.date.split("T")[0] : format(new Date(income.date), "yyyy-MM-dd"),
      categoryId: income.categoryId || "",
      subcategoryId: income.subcategoryId || "",
      amount: income.amount.toString(),
      remarks: income.remarks || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingIncome(null);
    setFormData({ date: format(new Date(), "yyyy-MM-dd"), categoryId: "", subcategoryId: "", amount: "", remarks: "" });
  };

  const getCategoryName = (id: string) => categories.find((c) => c.id == id)?.name || "N/A";
  const getSubcategoryName = (id: string) => subcategories.find((s) => s.id == id)?.name || "N/A";
  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Incomes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage and track your income records</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-[#1d6aef] text-white text-sm font-medium rounded-lg hover:bg-[#1558cc] transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Add Income
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl">
            <DialogHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                {editingIncome ? "Edit Income" : "Add New Income"}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                {editingIncome ? "Update the income details below." : "Fill in the details to record a new income."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</Label>
                <Input id="date" type="date" value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" required />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Category</Label>
                <Select
                  value={formData.categoryId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value, subcategoryId: "" })}
                >
                  <SelectTrigger className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Subcategory <span className="text-gray-400">(optional)</span></Label>
                <Select
                  key={formData.categoryId}
                  value={formData.subcategoryId || undefined}
                  onValueChange={(value) => setFormData({ ...formData, subcategoryId: value })}
                  disabled={!formData.categoryId}
                >
                  <SelectTrigger className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50">
                    <SelectValue placeholder={formData.categoryId ? "Select subcategory" : "Select a category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const filtered = subcategories.filter((s) => String(s.categoryId) === String(formData.categoryId));
                      if (filtered.length === 0) return (
                        <div className="px-3 py-2 text-xs text-gray-400 text-center">No subcategories for this category</div>
                      );
                      return filtered.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-medium text-gray-600 dark:text-gray-400">Amount (₹)</Label>
                <Input id="amount" type="number" step="0.01" placeholder="0.00" value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="h-9 text-sm border-gray-200 dark:border-gray-700 rounded-lg" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="remarks" className="text-xs font-medium text-gray-600 dark:text-gray-400">Remarks <span className="text-gray-400">(optional)</span></Label>
                <Textarea id="remarks" placeholder="Add any notes..." value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="text-sm border-gray-200 dark:border-gray-700 rounded-lg resize-none" rows={3} />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setDialogOpen(false); resetForm(); }}
                  className="flex-1 h-9 text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 h-9 text-sm font-medium bg-[#1d6aef] text-white rounded-lg hover:bg-[#1558cc] transition-colors">
                  {editingIncome ? "Update" : "Save"} Income
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="w-7 h-7 bg-emerald-50 dark:bg-emerald-900/20 rounded-md flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-none mb-0.5">Total Income</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search incomes..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full h-8 pl-9 pr-3 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d6aef]/20 focus:border-[#1d6aef] transition-colors"
              disabled
            />
          </div>
          {total > 0 && <span className="text-xs text-gray-500 flex-shrink-0">Showing {startItem}–{endItem} of {total}</span>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#1d6aef] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading incomes...</p>
            </div>
          </div>
        ) : incomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No incomes found</p>
              <p className="text-xs text-gray-400 mt-0.5">Add your first income to get started</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
                    {isAdmin && <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">User</th>}
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subcategory</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Remarks</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {incomes.map((income) => (
                    <tr key={income.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors group">
                      <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300 text-[13px] whitespace-nowrap">
                        {format(new Date(income.date), "MMM dd, yyyy")}
                      </td>
                      {isAdmin && <td className="px-5 py-3.5 text-[13px] text-gray-700 dark:text-gray-300">{income.userName || "-"}</td>}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                          {getCategoryName(income.categoryId)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500 dark:text-gray-400">
                        {income.subcategoryId ? getSubcategoryName(income.subcategoryId) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(income.amount)}</span>
                      </td>
                      <td className="px-5 py-3.5 max-w-[160px]">
                        <span className="text-[13px] text-gray-500 dark:text-gray-400 truncate block">{income.remarks || <span className="text-gray-300 dark:text-gray-600">—</span>}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-md text-gray-400 hover:text-[#1d6aef] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" onClick={() => handleEdit(income)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => handleDelete(income.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <span className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {Math.max(1, totalPages)}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || totalPages === 0}
                  className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
