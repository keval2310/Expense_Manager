import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#1d6aef', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const Reports: React.FC = () => {
  const { session } = useAuth();
  const [expenseCategoryData, setExpenseCategoryData] = useState<any[]>([]);
  const [incomeCategoryData, setIncomeCategoryData] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [projectBreakdown, setProjectBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expCat, incCat, trends, projects] = await Promise.all([
        api.getCategoryBreakdown(session.access_token, 'expense'),
        api.getCategoryBreakdown(session.access_token, 'income'),
        api.getMonthlyTrends(session.access_token, 12),
        api.getProjectBreakdown(session.access_token),
      ]);
      setExpenseCategoryData((expCat.breakdown || []).map((item: any) => ({ ...item, total: Number(item.total) })));
      setIncomeCategoryData((incCat.breakdown || []).map((item: any) => ({ ...item, total: Number(item.total) })));
      setMonthlyTrends(trends.trends || []);
      setProjectBreakdown(projects.breakdown || []);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyTrends), 'Monthly Trends');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseCategoryData), 'Expense Categories');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projectBreakdown), 'Projects');
    XLSX.writeFile(wb, `expense-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel report downloaded');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.setTextColor(15, 23, 42);
    doc.text('Financial Report', 14, 22);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 30);
    doc.setDrawColor(226, 232, 240); doc.line(14, 36, 196, 36);

    let currentY = 46;
    doc.setFontSize(13); doc.setTextColor(15, 23, 42);
    doc.text('Monthly Trends', 14, currentY);
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Month', 'Expenses', 'Incomes', 'Balance']],
      body: monthlyTrends.map(t => [t.month, formatCurrency(t.expenses), formatCurrency(t.incomes), formatCurrency(t.balance)]),
      headStyles: { fillColor: [29, 106, 239] }, theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 }, alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
    if (currentY > 250) { doc.addPage(); currentY = 20; }

    doc.setFontSize(13); doc.setTextColor(15, 23, 42);
    doc.text('Expense by Category', 14, currentY);
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Category', 'Total Amount']],
      body: expenseCategoryData.map(c => [c.categoryName, formatCurrency(c.total)]),
      headStyles: { fillColor: [239, 68, 68] }, theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 }, alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
    if (currentY > 250) { doc.addPage(); currentY = 20; }

    doc.setFontSize(13); doc.setTextColor(15, 23, 42);
    doc.text('Income by Category', 14, currentY);
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Category', 'Total Amount']],
      body: incomeCategoryData.map(c => [c.categoryName, formatCurrency(c.total)]),
      headStyles: { fillColor: [16, 185, 129] }, theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 }, alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${pageCount} · Expense Manager Financial Report`, 14, 285);
    }
    doc.save(`expense-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF report downloaded');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-[#1d6aef] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading reports...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Financial insights and data exports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>
          <button onClick={exportToPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1d6aef] text-white text-sm font-medium rounded-lg hover:bg-[#1558cc] transition-colors">
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      </div>

      <Tabs defaultValue="trends">
        <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg h-auto mb-4">
          <TabsTrigger value="trends" className="rounded-md text-sm py-1.5 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">Monthly Trends</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-md text-sm py-1.5 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">By Category</TabsTrigger>
          <TabsTrigger value="projects" className="rounded-md text-sm py-1.5 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all">By Project</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-0">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly Income vs Expenses</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">12-month trend analysis</p>
            </div>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#9ca3af' }} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#9ca3af' }} tickFormatter={(v) => `₹${v}`} width={65} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                  <Bar dataKey="incomes" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-red-50 dark:bg-red-900/20 rounded-md flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Expense by Category</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Distribution of spending</p>
                </div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseCategoryData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="total"
                      label={({ categoryName, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {expenseCategoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                    <Legend formatter={(value, entry: any) => entry.payload.categoryName || value} wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-emerald-50 dark:bg-emerald-900/20 rounded-md flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Income by Category</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Distribution of earnings</p>
                </div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomeCategoryData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="total"
                      label={({ categoryName, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {incomeCategoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                    <Legend formatter={(value, entry: any) => entry.payload.categoryName || value} wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-0">
          {projectBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 gap-3">
              <BarChart3 className="w-8 h-8 text-gray-300 dark:text-gray-700" />
              <p className="text-sm text-gray-400">No project data available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projectBreakdown.map((proj) => (
                <div key={proj.projectId} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{proj.projectName}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{proj.expenseCount + proj.incomeCount} transactions</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Income</p>
                      <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(proj.totalIncomes)}</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Expenses</p>
                      <p className="text-base font-bold text-red-700 dark:text-red-300">{formatCurrency(proj.totalExpenses)}</p>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${proj.balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                      <p className={`text-xs font-medium mb-1 ${proj.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Balance</p>
                      <p className={`text-base font-bold ${proj.balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>{formatCurrency(proj.balance)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
