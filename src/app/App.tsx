import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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


// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    }>
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incomes"
        element={
          <ProtectedRoute>
            <Incomes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
    </Routes>
    </React.Suspense>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
          <Toaster position="top-right" />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
