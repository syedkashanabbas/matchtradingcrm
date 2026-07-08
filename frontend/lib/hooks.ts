'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockCurrentUser, mockNotifications } from './mock-data';
import type { CurrentUser, Notification } from './types';
import { useAuthContext } from './auth-context';

/**
 * useAuth - Mock authentication hook
 * Returns current user and auth state
 */
export function useAuth() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate auth check delay
    const timer = setTimeout(() => {
      setUser(mockCurrentUser);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const logout = () => {
    setUser(null);
  };

  const login = (email: string, password: string) => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setUser(mockCurrentUser);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  };

  return { user, isLoading, logout, login };
}

/**
 * useDarkMode - Dark mode toggle hook
 * Manages theme preference
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Check localStorage and system preference
    const stored = localStorage?.getItem('theme-dark');
    if (stored !== null) {
      setIsDark(stored === 'true');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(systemDark);
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage?.setItem('theme-dark', isDark.toString());
  }, [isDark, isMounted]);

  const toggle = () => {
    setIsDark(prev => !prev);
  };

  return { isDark, toggle, isMounted };
}

/**
 * useNotifications - Mock notifications hook
 * Returns notifications and notification actions
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(mockNotifications);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    clearAll,
  };
}

/**
 * useIsMobile - Check if viewport is mobile
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isMobile && isMounted;
}

/**
 * useLogout - Handle logout with redirect
 * Combines auth context logout with router navigation
 */
export function useLogout() {
  const { logout: contextLogout } = useAuthContext();
  const router = useRouter();

  const handleLogout = async () => {
    await contextLogout();
  };

  return { logout: handleLogout };
}
