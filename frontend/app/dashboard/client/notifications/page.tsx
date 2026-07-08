'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { mockNotifications } from '@/lib/mock-data';
import { Bell, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { NotificationType } from '@/lib/types';

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredNotifications = mockNotifications.filter((notif) => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Stay updated with important alerts and messages
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 border-b border-border">
        {(['all', 'unread', 'read'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors capitalize ${
              filter === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'all' ? 'All' : tab === 'unread' ? 'Unread' : 'Read'}
            {tab === 'all' && ` (${mockNotifications.length})`}
            {tab === 'unread' && ` (${mockNotifications.filter(n => !n.read).length})`}
            {tab === 'read' && ` (${mockNotifications.filter(n => n.read).length})`}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border p-4 transition-all hover:shadow-md ${
                notification.read
                  ? 'border-border bg-card'
                  : 'border-primary/30 bg-primary/5 dark:bg-primary/10'
              }`}
            >
              <div className="flex gap-4">
                <div className="mt-1">
                  {notificationIcons[notification.type]}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-semibold ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.description}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-3 w-3 rounded-full bg-primary mt-1.5 ml-2 flex-shrink-0" />
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
          ))
        ) : (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
