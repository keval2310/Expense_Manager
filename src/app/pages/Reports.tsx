import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
    
    // Monthly trends sheet
    const trendsWS = XLSX.utils.json_to_sheet(monthlyTrends);
    XLSX.utils.book_append_sheet(wb, trendsWS, 'Monthly Trends');

    // Expense categories sheet
    const expCatWS = XLSX.utils.json_to_sheet(expenseCategoryData);
    XLSX.utils.book_append_sheet(wb, expCatWS, 'Expense Categories');

    // Project breakdown sheet
    const projWS = XLSX.utils.json_to_sheet(projectBreakdown);
    XLSX.utils.book_append_sheet(wb, projWS, 'Projects');

    XLSX.writeFile(wb, `expense-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel report downloaded');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Expense Manager Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    // Monthly trends table
    autoTable(doc, {
      startY: 35,
      head: [['Month', 'Expenses', 'Incomes', 'Balance']],
      body: monthlyTrends.map(t => [t.month, formatCurrency(t.expenses), formatCurrency(t.incomes), formatCurrency(t.balance)]),
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`expense-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF report downloaded');
  };



  if (loading) return <div className="flex items-center justify-center h-64">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Detailed insights and export options</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="projects">By Project</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Income vs Expenses</CardTitle>
              <CardDescription>12-month trend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="incomes" fill="#10b981" name="Income" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={expenseCategoryData} cx="50%" cy="50%" labelLine={false} label={({ categoryName, percent }) => `${categoryName}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="total">
                      {expenseCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Income by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={incomeCategoryData} cx="50%" cy="50%" labelLine={false} label={({ categoryName, percent }) => `${categoryName}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="total">
                      {incomeCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project-wise Summary</CardTitle>
              <CardDescription>Income, expenses and balance per project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectBreakdown.map((proj) => (
                  <div key={proj.projectId} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3">{proj.projectName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Income</p>
                        <p className="text-lg font-semibold text-green-600">{formatCurrency(proj.totalIncomes)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
                        <p className="text-lg font-semibold text-red-600">{formatCurrency(proj.totalExpenses)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
                        <p className={`text-lg font-semibold ${proj.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(proj.balance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
                        <p className="text-lg font-semibold">{proj.expenseCount + proj.incomeCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
