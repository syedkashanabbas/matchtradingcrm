'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './api';
import type { Notification } from './types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await apiClient.getNotifications();
      // Transform backend response to frontend format
      const transformedNotifications: Notification[] = response.notifications.map((notif: any) => ({
        id: notif.id,
        title: notif.title,
        description: notif.message,
        read: notif.isRead,
        timestamp: new Date(notif.createdAt).toISOString(),
        type: notif.type || 'info' as any,
      }));
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      // Mark all notifications as read
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(notif => apiClient.markNotificationAsRead(notif.id))
      );
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  }, [notifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    isLoading,
  };
}
