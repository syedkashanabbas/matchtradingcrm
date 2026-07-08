'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './api';
import type { AdminStats, User } from './types';

export function useAdmin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [vpsData, setVpsData] = useState<any[]>([]);
  const [brokersData, setBrokersData] = useState<any[]>([]);
  const [propFirmsData, setPropFirmsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAdminData = useCallback(async () => {
    try {
      const [dashboardResponse, usersResponse, vpsResponse, brokersResponse, propFirmsResponse] = await Promise.all([
        apiClient.getAdminDashboard(),
        apiClient.getAllUsers(),
        apiClient.getAllVps(),
        apiClient.getAllBrokers(),
        apiClient.getAllPropFirms(),
      ]);

      // Transform dashboard stats
      const transformedStats: AdminStats = {
        totalUsers: (dashboardResponse as any).data.totalUsers,
        activeUsers: (dashboardResponse as any).data.activeUsers,
        newUsersThisMonth: (dashboardResponse as any).data.newUsers,
        suspendedUsers: (dashboardResponse as any).data.suspendedUsers || 0,
        totalSubscriptions: (dashboardResponse as any).data.totalSubscriptions || 0,
        activeSubscriptions: (dashboardResponse as any).data.activeSubscriptions || 0,
        totalVpsConfigs: (dashboardResponse as any).data.totalVpsConfigs || 0,
        activeVpsConfigs: (dashboardResponse as any).data.activeVpsConfigs || 0,
        totalBrokerAccounts: (dashboardResponse as any).data.totalBrokerAccounts || 0,
        activeBrokerAccounts: (dashboardResponse as any).data.activeBrokerAccounts || 0,
        totalPropAccounts: (dashboardResponse as any).data.totalPropAccounts || 0,
        activePropAccounts: (dashboardResponse as any).data.activePropAccounts || 0,
      };
      setStats(transformedStats);

      // Transform users data
      const transformedUsers: User[] = usersResponse.users.map((user: any) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        status: user.status === 'ACTIVE' ? 'active' : 
                user.status === 'SUSPENDED' ? 'suspended' : 'pending',
        tier: 'Pro', // Default tier
        signupDate: user.createdAt,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}`,
      }));
      setUsers(transformedUsers);

      // Set VPS, Brokers, and Prop Firms data
      setVpsData((vpsResponse as any).data || []);
      setBrokersData((brokersResponse as any).data || []);
      setPropFirmsData((propFirmsResponse as any).data || []);

    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUserStatus = useCallback(async (userId: string, status: string) => {
    try {
      await apiClient.updateUserStatus(userId, status);
      
      // Update local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                status: status === 'ACTIVE' ? 'active' : 
                       status === 'SUSPENDED' ? 'suspended' : 'pending'
              } 
            : user
        )
      );
      
      // Update stats if needed
      if (stats) {
        setStats(prev => {
          if (!prev) return prev;
          
          const newStats = { ...prev };
          if (status === 'ACTIVE') {
            newStats.activeUsers += 1;
            if (stats.suspendedUsers > 0) {
              newStats.suspendedUsers -= 1;
            }
          } else if (status === 'SUSPENDED') {
            newStats.activeUsers -= 1;
            newStats.suspendedUsers += 1;
          }
          
          return newStats;
        });
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
      throw error;
    }
  }, [stats]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  return {
    stats,
    users,
    vpsData,
    brokersData,
    propFirmsData,
    isLoading,
    updateUserStatus,
    refreshData: loadAdminData,
  };
}
