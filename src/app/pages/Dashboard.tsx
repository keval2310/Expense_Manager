import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../components/ui/button';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, Plus, Activity, History, PlusCircle, Edit3, Trash2, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#1d6aef', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Dashboard: React.FC = () => {
  const { session, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      const [statsData, trendsData, expensesData] = await Promise.all([
        api.getDashboardStats(session.access_token),
        api.getMonthlyTrends(session.access_token),
        api.getCategoryBreakdown(session.access_token, 'expense')
      ]);
      setStats(statsData);
      setTrends(trendsData.trends || []);
      setExpenses((expensesData.breakdown || []).map((item: any) => ({
        ...item,
        total: Number(item.total)
      })).slice(0, 5));

      if (user?.role === 'super_admin') {
        const logsData = await api.getActivityLogs(session.access_token);
        setActivityLogs(logsData.logs || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#1d6aef] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  );

  const balance = stats?.balance || 0;
  const totalIncomes = stats?.totalIncomes || 0;
  const totalExpenses = stats?.totalExpenses || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Hi, <span className="text-gradient">{user?.name}</span> 👋
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Here's what's happening with your finance system today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/expenses" className="flex-1 sm:flex-none">
            <button className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl transition-all active:scale-95 border border-red-500/20">
              <PlusCircle className="w-4 h-4" />
              Add Expense
            </button>
          </Link>
          <Link to="/incomes" className="flex-1 sm:flex-none">
            <button className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4" />
              Add Income
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="glass card-hover rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-colors" />
          <div className="flex items-start justify-between relative z-10 mb-4">
            <div className="w-12 h-12 glass dark:bg-primary/20 rounded-xl flex items-center justify-center shadow-inner">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${balance >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
              {balance >= 0 ? 'Surplus' : 'Deficit'}
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-70">Current Balance</p>
            <div className="text-3xl font-black text-foreground tracking-tight">
              {formatCurrency(balance)}
            </div>
            <div className={`flex items-center gap-1 mt-3 text-sm font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {balance >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>Ready for investment</span>
            </div>
          </div>
        </div>

        {/* Income Card */}
        <div className="glass card-hover rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-colors" />
          <div className="flex items-start justify-between relative z-10 mb-4">
            <div className="w-12 h-12 glass dark:bg-emerald-500/20 rounded-xl flex items-center justify-center shadow-inner">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Earnings
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-70">Total Income</p>
            <div className="text-3xl font-black text-emerald-500 tracking-tight">
              {formatCurrency(totalIncomes)}
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm font-bold text-muted-foreground">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>Across all projects</span>
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="glass card-hover rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-red-500/20 transition-colors" />
          <div className="flex items-start justify-between relative z-10 mb-4">
            <div className="w-12 h-12 glass dark:bg-red-500/20 rounded-xl flex items-center justify-center shadow-inner">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
            <div className="px-2.5 py-1 bg-red-500/10 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Spending
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-70">Total Expenses</p>
            <div className="text-3xl font-black text-red-500 tracking-tight">
              {formatCurrency(totalExpenses)}
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm font-bold text-muted-foreground">
              <History className="w-4 h-4 text-red-500" />
              <span>Summary of transactions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Monthly Trends</h3>
              <p className="text-xs font-medium text-muted-foreground">Cash flow overview</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold text-muted-foreground uppercase">Income</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span className="text-[10px] font-bold text-muted-foreground uppercase">Expense</span></div>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-5" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'currentColor', opacity: 0.5 }} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'currentColor', opacity: 0.5 }} tickFormatter={(v) => `₹${v}`} width={60} />
                <Tooltip
                  cursor={{ fill: 'currentColor', opacity: 0.05 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass p-3 rounded-xl border-white/20 shadow-xl min-w-[120px]">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">{payload[0].payload.month}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-4 mt-1">
                              <span className="text-[11px] font-medium text-muted-foreground">{entry.name}</span>
                              <span className={`text-[12px] font-bold ${entry.name === 'Income' ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(Number(entry.value || 0))}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="incomes" name="Income" fill="oklch(0.627 0.194 149.214)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expenses" name="Expense" fill="oklch(0.577 0.245 27.325)" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Top Spending</h3>
              <p className="text-xs font-medium text-muted-foreground">Category distribution</p>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={expenses}>
                <PolarGrid gridType="polygon" stroke="currentColor" className="opacity-5" />
                <PolarAngleAxis dataKey="categoryName" tick={{ fill: 'currentColor', opacity: 0.6, fontSize: 10, fontWeight: 700 }} />
                <Radar
                   name="Expenses"
                   dataKey="total"
                   stroke="var(--primary)"
                   fill="var(--primary)"
                   fillOpacity={0.15}
                   strokeWidth={2}
                />
                <Tooltip
                   content={({ active, payload }) => {
                     if (active && payload && payload.length) {
                       return (
                         <div className="glass p-3 rounded-xl border-white/20 shadow-xl">
                            <p className="text-[11px] font-bold text-primary uppercase">{payload[0].payload.categoryName}</p>
                            <p className="text-sm font-black mt-1">{formatCurrency(Number(payload[0].value || 0))}</p>
                         </div>
                       );
                     }
                     return null;
                   }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Quick Actions (New styled segment) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Link to="/expenses" className="card-hover glass p-4 rounded-2xl flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all text-red-500">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div><h4 className="text-sm font-bold">New Expense</h4><p className="text-[11px] font-medium text-muted-foreground">Add transaction</p></div>
        </Link>
        <Link to="/incomes" className="card-hover glass p-4 rounded-2xl flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all text-emerald-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div><h4 className="text-sm font-bold">New Income</h4><p className="text-[11px] font-medium text-muted-foreground">Record earnings</p></div>
        </Link>
        <Link to="/reports" className="card-hover glass p-4 rounded-2xl flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all text-primary">
            <Activity className="w-6 h-6" />
          </div>
          <div><h4 className="text-sm font-bold">Analytics</h4><p className="text-[11px] font-medium text-muted-foreground">View reports</p></div>
        </Link>
        <Link to="/profile" className="card-hover glass p-4 rounded-2xl flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all text-indigo-500">
            <Settings className="w-6 h-6" />
          </div>
          <div><h4 className="text-sm font-bold">Account</h4><p className="text-[11px] font-medium text-muted-foreground">Settings</p></div>
        </Link>
      </div>

      {/* Activity Logs (Super Admin Only) */}
      {user?.role === 'super_admin' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">System Activity Logs</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Recent actions performed in the system</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {activityLogs.slice(0, 8).map((log: any) => {
              const isCreate = log.action.includes('CREATE') || log.action === 'REGISTER';
              const isUpdate = log.action.includes('UPDATE');
              const isDelete = log.action.includes('DELETE');

              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className={`mt-0.5 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                    isCreate ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                    isDelete ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                    isUpdate ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                    'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  }`}>
                    {isCreate ? <PlusCircle className="h-3.5 w-3.5" /> :
                     isUpdate ? <Edit3 className="h-3.5 w-3.5" /> :
                     isDelete ? <Trash2 className="h-3.5 w-3.5" /> :
                     <Activity className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{log.action.replace(/_/g, ' ')}</p>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{format(new Date(log.created_at), 'HH:mm')}</span>
                    </div>
                    <p className="text-[13px] text-gray-700 dark:text-gray-300 mt-0.5 leading-snug truncate">{log.details}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-4 h-4 rounded-full bg-[#1d6aef] flex items-center justify-center text-[8px] text-white font-bold uppercase">{log.user_name?.[0]}</div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">{log.user_name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {activityLogs.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400">No system activity logged yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
