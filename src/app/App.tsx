import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Layout } from './components/Layout';
import { Toaster } from './components/ui/sonner';

// Lazy load pages
const Login = React.lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Expenses = React.lazy(() => import('./pages/Expenses').then(module => ({ default: module.Expenses })));
const Incomes = React.lazy(() => import('./pages/Incomes').then(module => ({ default: module.Incomes })));
const Categories = React.lazy(() => import('./pages/Categories').then(module => ({ default: module.Categories })));
const Projects = React.lazy(() => import('./pages/Projects').then(module => ({ default: module.Projects })));
const Reports = React.lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const Users = React.lazy(() => import('./pages/Users').then(module => ({ default: module.Users })));
const Profile = React.lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
import { NotificationManager } from './components/NotificationManager';


// Protected Layout Component
const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1d6aef] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout><Outlet /></Layout>;
};

// Public Route Component (redirect if authenticated)
const PublicLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1d6aef] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

// Super Admin Route Component
const RequireSuperAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1d6aef] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-[#1d6aef] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/incomes" element={<Incomes />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/users"
          element={
            <RequireSuperAdmin>
              <Users />
            </RequireSuperAdmin>
          }
        />
      </Route>
    </Routes>
    </React.Suspense>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
          <Toaster 
            position="top-center" 
            richColors 
            expand={true} 
            closeButton
            toastOptions={{
              className: 'mt-2 mobile:mt-16',
            }}
          />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const { user } = useAuth();
  return (
    <>
      <NotificationManager user={user} />
      <AppRoutes />
    </>
  );
}
