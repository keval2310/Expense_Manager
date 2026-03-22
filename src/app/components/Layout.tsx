import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  FolderKanban,
  Tags,
  BarChart3,
  Users,
  History,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  User as UserIcon,
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ChevronRight,
  Settings,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'user'] },
  { path: '/expenses', label: 'Expenses', icon: Receipt, roles: ['super_admin', 'admin', 'user'] },
  { path: '/incomes', label: 'Incomes', icon: TrendingUp, roles: ['super_admin', 'admin', 'user'] },
  { path: '/projects', label: 'Projects', icon: FolderKanban, roles: ['super_admin', 'admin', 'user'] },
  { path: '/categories', label: 'Categories', icon: Tags, roles: ['super_admin', 'admin', 'user'] },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'admin', 'user'] },
  { path: '/users', label: 'User Management', icon: Users, roles: ['super_admin'] },
];

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);

  const fetchNotifs = async () => {
    if (user?.role !== 'super_admin') return;
    try {
      const data = await api.getActivityLogs(token || '');
      setNotifs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markAsRead(token || '', id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAsRead(token || '');
      setNotifs([]);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchNotifs();

      // Use the same API_URL logic as api.ts for the Socket connection
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const socketUrl = isLocal ? 'http://localhost:3001' : 'https://kd-financial-backend.onrender.com';
      const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
      socket.on('connect', () => {
        socket.emit('join', 'super_admins');
        console.log('✅ Connected to Cloud Notifications');
      });

      socket.on('activity_notification', (data: any) => {
        // Refresh the notification list
        fetchNotifs();

        // Map raw action names to friendly labels
        const actionLabels: Record<string, string> = {
          CREATE_EXPENSE:  '💸 New Expense Added',
          UPDATE_EXPENSE:  '✏️ Expense Updated',
          DELETE_EXPENSE:  '🗑️ Expense Deleted',
          CREATE_INCOME:   '💰 New Income Added',
          UPDATE_INCOME:   '✏️ Income Updated',
          DELETE_INCOME:   '🗑️ Income Deleted',
          CREATE_PROJECT:  '📁 Project Created',
          UPDATE_PROJECT:  '✏️ Project Updated',
          DELETE_PROJECT:  '🗑️ Project Deleted',
          CREATE_CATEGORY: '🏷️ Category Added',
          UPDATE_CATEGORY: '✏️ Category Updated',
          DELETE_CATEGORY: '🗑️ Category Deleted',
        };

        const label = actionLabels[data.action] || data.action.replace(/_/g, ' ');
        const userName = data.userName
          ? data.userName.charAt(0).toUpperCase() + data.userName.slice(1)
          : 'Unknown';

        toast.info(label, {
          description: `by ${userName} (${data.userRole}) · ${data.details}`,
          duration: 5000,
          icon: (
            <div className="w-7 h-7 rounded-md bg-white border border-gray-100 shadow-sm overflow-hidden flex items-center justify-center">
              <img src="/logo.png" alt="Expense Manager" className="w-full h-full object-contain p-0.5" />
            </div>
          )
        });
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || 'user')
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPageTitle = () => {
    const item = menuItems.find(m => m.path === location.pathname);
    return item?.label || 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-gray-950 overflow-hidden font-sans">
      <div className="fixed inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none z-0" />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 glass border-r border-white/20 dark:border-white/5 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center h-20 px-5 border-b border-white/20 dark:border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white dark:bg-slate-50 rounded-[14px] flex items-center justify-center shadow-lg shadow-primary/10 border border-white/50 dark:border-white/10 p-1 overflow-hidden group hover:scale-105 transition-all duration-300 flex-shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain brightness-105 contrast-105" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[17px] font-black tracking-tight leading-none bg-clip-text text-transparent bg-linear-to-r from-slate-900 to-slate-600 dark:from-white dark:to-white/70 truncate">
                KD Financial
              </span>
              <span className="text-[10px] font-bold text-primary tracking-[0.06em] uppercase mt-1.5 opacity-90 truncate">
                 Manager
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-2 rounded-xl text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 no-scrollbar">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 text-[14px] font-medium rounded-xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 mr-3 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full ml-auto animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="p-4 border-t border-white/20 dark:border-white/5 flex-shrink-0">
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all active:scale-95 group"
          >
            <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-primary/20 group-hover:border-primary transition-colors">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                {user ? getInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate leading-tight">
                {user?.name}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase opacity-70 truncate mt-0.5">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <Settings className="w-4 h-4 text-muted-foreground group-hover:rotate-90 transition-transform" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0 relative z-10">
        {/* Header */}
        <header className="glass h-16 flex items-center px-6 border-b border-white/20 dark:border-white/5 flex-shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center">
             <h1 className="text-xl font-bold tracking-tight text-foreground">{getPageTitle()}</h1>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-90"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-primary" />}
            </button>

            {/* Notifications */}
            {user?.role === 'super_admin' && (
              <Popover onOpenChange={(open) => open && fetchNotifs()}>
                <PopoverTrigger asChild>
                  <button className="relative p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg overflow-hidden mr-4" align="end">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                      {unreadCount > 0 && <span className="px-1.5 py-0.5 bg-[#1d6aef] text-white text-[10px] font-bold rounded-full">{unreadCount}</span>}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }}
                        className="text-[11px] font-medium text-[#1d6aef] hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="h-3 w-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  <ScrollArea className={`${notifs.filter(n => !n.is_read).length > 4 ? 'h-[360px]' : 'h-auto max-h-[360px]'}`}>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {notifs.filter(n => !n.is_read).map((n) => (
                        <div key={n.id} className="p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-0.5 flex-1">
                              <p className="text-[10px] font-semibold text-[#1d6aef] dark:text-blue-400 uppercase tracking-wide">{n.action.replace(/_/g, ' ')}</p>
                              <p className="text-[13px] text-gray-700 dark:text-gray-200 leading-snug">{n.details}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="w-4 h-4 rounded-full bg-[#1d6aef] flex items-center justify-center text-[8px] text-white font-bold">{n.user_name?.[0]}</div>
                                <span className="text-[11px] text-gray-500">{n.user_name}</span>
                                <span className="text-[11px] text-gray-400">· {format(new Date(n.created_at), 'HH:mm')}</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id); }}
                              className="p-1 rounded text-gray-400 hover:text-green-600 dark:hover:text-green-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {notifs.filter(n => !n.is_read).length === 0 && (
                        <div className="py-12 px-4 text-center">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <History className="h-5 w-5 text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">All caught up!</p>
                          <p className="text-[12px] text-gray-400">No new notifications.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-[#1d6aef] text-white text-xs font-semibold">
                      {user ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200 hidden sm:block">{user?.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 hidden sm:block rotate-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg p-1">
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-800 my-1" />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-md px-3 py-2 cursor-pointer text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <UserIcon className="w-3.5 h-3.5 mr-2.5 text-gray-500" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="rounded-md px-3 py-2 cursor-pointer text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <LogOut className="w-3.5 h-3.5 mr-2.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className="p-5 sm:p-6 max-w-[1400px] mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
