'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './api';
import { useAuthContext } from './auth-context';

export interface ClientDashboardData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    role: string;
    createdAt: string;
  };
  stats: {
    accountStatus: string;
    broker: string;
    propFirm: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    lastSync: string;
    unreadNotifications: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
  }>;
}

export function useClientDashboard() {
  const { user } = useAuthContext();
  const [dashboardData, setDashboardData] = useState<ClientDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.getClientDashboard();
      setDashboardData(response);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [user?.status]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Refresh dashboard when user status changes
  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user?.status, loadDashboard]);

  return {
    dashboardData,
    isLoading,
    error,
    refreshDashboard: loadDashboard,
  };
}
