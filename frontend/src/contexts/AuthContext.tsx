import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token is still valid by making a test request
          await api.get('/users/me');
        } catch (error) {
          // Token is invalid, clear stored data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const loginResponse = await api.post('/auth/login', { email, password });
      const { access_token } = loginResponse.data;

      // Store token in localStorage immediately so axios interceptor can use it
      localStorage.setItem('token', access_token);

      // Fetch user data with the new token (explicit auth header to ensure it works)
      const userResponse = await api.get('/users/me', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      const userData = userResponse.data;

      // Set state after successful API calls
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      // Clean up if anything fails
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  };

  const register = async (email: string, password: string): Promise<void> => {
    try {
      // Register user
      await api.post('/auth/register', { email, password });
      
      // Login to get token (registration doesn't return token)
      const loginResponse = await api.post('/auth/login', { email, password });
      const { access_token } = loginResponse.data;

      // Store token in localStorage immediately so axios interceptor can use it
      localStorage.setItem('token', access_token);

      // Fetch user data with the new token (explicit auth header to ensure it works)
      const userResponse = await api.get('/users/me', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      const userData = userResponse.data;

      // Set state after successful API calls
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      // Clean up if anything fails
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};