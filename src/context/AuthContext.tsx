import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  session: any; // Kept for compatibility if used elsewhere
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true);

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const { user } = await api.getCurrentUser(token);
          setUser(user);
        } catch (error) {
          console.error('Session expired or invalid:', error);
          localStorage.removeItem('accessToken');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.login({ email, password });
      if (response.success && response.token && response.user) {
        localStorage.setItem('accessToken', response.token);
        setToken(response.token);
        setUser(response.user);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const response = await api.register({ email, password, name, role: 'user' });
      if (response.success && response.token && response.user) {
        // Automatically login after register
        localStorage.setItem('accessToken', response.token);
        setToken(response.token);
        setUser(response.user);
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
  };

  const session = user
    ? {
        access_token: token,
        user: { ...user },
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin: user?.role === 'admin',
        signIn,
        signUp,
        signOut,
        token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
