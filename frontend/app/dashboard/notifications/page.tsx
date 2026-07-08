'use client';

import { useState, useMemo } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { useNotifications } from '@/lib/notifications-hook';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Bell, Check, CheckSquare, Trash2 } from 'lucide-react';
import type { Notification } from '@/lib/types';

const notificationIcons = {
  info: '📢',
  warning: '⚠️',
  success: '✓',
  error: '✗',
};

export default function NotificationsPage() {
  const { isLoading } = useAuthContext();
  const { notifications, unreadCount, markAsRead, clearAll, isLoading: notificationsLoading } = useNotifications();
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');

  const filteredNotifications = useMemo(() => {
    if (filterType === 'unread') {
      return notifications.filter(n => !n.read);
    }
    if (filterType === 'read') {
      return notifications.filter(n => n.read);
    }
    return notifications;
  }, [notifications, filterType]);

  if (isLoading || notificationsLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Bell className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            Notifications
          </h1>
          <p className="text-muted-foreground mt-2">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-2 rounded-lg border border-input px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-muted"
          >
            <CheckSquare className="h-5 w-5" />
            Clear All
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['all', 'unread', 'read'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              filterType === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-2">
          {filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`rounded-lg border p-4 transition-all hover:shadow-soft-md cursor-pointer ${
                notification.read
                  ? 'border-border bg-card/50'
                  : 'border-primary/30 bg-primary/5 dark:bg-primary/10'
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl mt-0.5">
                  {notificationIcons[notification.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.description}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="h-3 w-3 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notification.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="No Notifications"
          description={
            filterType === 'unread'
              ? 'You have no unread notifications'
              : filterType === 'read'
                ? 'You have no read notifications'
                : 'You have no notifications yet'
          }
        />
      )}
    </div>
  );
}
