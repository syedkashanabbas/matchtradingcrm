'use client';

import { useState } from 'react';
import { useNotifications } from '@/lib/notifications-hook';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Bell, AlertCircle, CheckCircle, Info } from 'lucide-react';

// Backend types (PAYMENT_FAILURE, PROVISIONING, ...) -> icon buckets
const iconFor = (type: string) => {
  const t = String(type).toUpperCase();
  if (t.includes('FAILURE') || t.includes('EXPIRED')) return <AlertCircle className="h-5 w-5 text-destructive" />;
  if (t.includes('COMMISSION') || t.includes('PROVISIONING')) return <CheckCircle className="h-5 w-5 text-success" />;
  if (t.includes('SERVICE') || t.includes('ADMIN')) return <AlertCircle className="h-5 w-5 text-warning" />;
  return <Info className="h-5 w-5 text-primary" />;
};

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const { notifications, isLoading, markAsRead } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <p className="eyebrow">Account</p>
        <h1 className="page-title">Notifications</h1>
        <p className="page-subtitle">
          Alerts about payments, your service and your account — all in one place.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="animate-fade-in-up stagger-1 inline-flex items-center gap-1 rounded-full bg-muted p-1">
        {(['all', 'unread', 'read'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === tab
                ? 'bg-card text-foreground elevation-1'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'all' ? 'All' : tab === 'unread' ? 'Unread' : 'Read'}
            <span className="tabular-nums">
              {tab === 'all' && ` (${notifications.length})`}
              {tab === 'unread' && ` (${notifications.filter(n => !n.read).length})`}
              {tab === 'read' && ` (${notifications.filter(n => n.read).length})`}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="animate-fade-in-up stagger-2 space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.read && markAsRead(notification.id)}
              className={`rounded-xl border p-4 transition-colors ${
                notification.read
                  ? 'border-border/80 bg-card'
                  : 'cursor-pointer border-l-2 border-primary/20 border-l-primary bg-primary/5 hover:bg-primary/10 dark:bg-primary/10'
              }`}
            >
              <div className="flex gap-4">
                <div className="mt-1">{iconFor(notification.type)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-display font-semibold ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.description}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="ml-2 mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" aria-hidden />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
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
          <div className="rounded-2xl border border-border/80 bg-card elevation-1 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="h-6 w-6" />
            </div>
            <p className="font-display font-semibold text-foreground">You&apos;re all caught up</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              New alerts and messages will land here as they arrive.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
