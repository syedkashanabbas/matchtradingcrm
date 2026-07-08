'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api';
import type { CurrentUser } from './types';

export function getDashboardPath(user: CurrentUser | null): string {
  if (!user) return '/login';
  return user.role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/client';
}

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateApiKeys: (newKey: any) => void;
  updateUser: (userData: CurrentUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in (from sessionStorage)
    const storedUser = sessionStorage.getItem('auth-user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (e) {
        console.log('[v0] Failed to parse stored user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await apiClient.login(email, password);
      
      // Transform backend response to frontend format
      const userData: CurrentUser = {
        id: response.user.id,
        name: `${response.user.firstName} ${response.user.lastName}`,
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        role: response.user.role,
        status: response.user.status === 'ACTIVE' ? 'active' : 
                response.user.status === 'SUSPENDED' ? 'suspended' : 'pending',
        tier: 'Pro', // Default tier - can be updated based on subscription
        signupDate: response.user.createdAt,
        joinDate: response.user.createdAt,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.user.firstName}`,
        phone: '',
        company: '',
        apiKeys: [], // Will be loaded separately
        accountId: response.user.id,
        // Store tokens for API calls
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      };
      
      setUser(userData);
      sessionStorage.setItem('auth-user', JSON.stringify(userData));
      
      // Redirect to appropriate dashboard
      const dashboardPath = getDashboardPath(userData);
      router.push(dashboardPath);
      
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    setUser(null);
    sessionStorage.removeItem('auth-user');
    router.push('/login');
  }, [router]);

  const updateApiKeys = useCallback((newKey: any) => {
    if (user) {
      const updatedUser = {
        ...user,
        apiKeys: [...(user.apiKeys || []), newKey]
      };
      setUser(updatedUser);
      sessionStorage.setItem('auth-user', JSON.stringify(updatedUser));
    }
  }, [user]);

  const updateUser = useCallback((userData: CurrentUser) => {
    setUser(userData);
    sessionStorage.setItem('auth-user', JSON.stringify(userData));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateApiKeys,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
