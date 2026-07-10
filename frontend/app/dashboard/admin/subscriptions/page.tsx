'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Bitcoin, CreditCard, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { apiClient } from '@/lib/api';

interface AdminSubscription {
  id: string;
  provider: 'stripe' | 'coingate';
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  gracePeriodEnd: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-success/15 text-success border-success/25">Active</Badge>;
    case 'PAST_DUE':
      return <Badge className="bg-warning/15 text-warning border-warning/25">Past due</Badge>;
    case 'UNPAID':
    case 'CANCELED':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{status === 'UNPAID' ? 'Unpaid' : 'Canceled'}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    apiClient
      .getAdminSubscriptions()
      .then(response => setSubscriptions((response.data as AdminSubscription[]) ?? []))
      .catch(error => console.error('Failed to load subscriptions:', error))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return subscriptions.filter(
      subscription =>
        `${subscription.user.firstName} ${subscription.user.lastName}`.toLowerCase().includes(query) ||
        subscription.user.email.toLowerCase().includes(query) ||
        subscription.plan.toLowerCase().includes(query)
    );
  }, [subscriptions, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <p className="eyebrow">Billing</p>
        <h1 className="page-title">Subscriptions</h1>
        <p className="page-subtitle">
          {subscriptions.length} subscription{subscriptions.length === 1 ? '' : 's'} across all clients
        </p>
      </div>

      <div className="relative max-w-md animate-fade-in-up stagger-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by client, email or plan..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="animate-fade-in-up stagger-2 rounded-2xl border border-border/80 bg-card p-6 elevation-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Method</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period end</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto-renew</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(subscription => (
                <tr key={subscription.id} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                  <td className="py-3.5 pr-4">
                    <Link href={`/dashboard/admin/users/${subscription.user.id}`} className="hover:underline">
                      <p className="font-medium text-foreground">
                        {subscription.user.firstName} {subscription.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{subscription.user.email}</p>
                    </Link>
                  </td>
                  <td className="py-3.5 pr-4 font-medium">{subscription.plan}</td>
                  <td className="py-3.5 pr-4">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      {subscription.provider === 'coingate' ? (
                        <>
                          <Bitcoin className="h-[18px] w-[18px] text-warning" aria-hidden /> Crypto
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-[18px] w-[18px] text-primary" aria-hidden /> Card
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    {statusBadge(subscription.status)}
                    {subscription.status === 'PAST_DUE' && subscription.gracePeriodEnd && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        grace until {new Date(subscription.gracePeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 tabular-nums">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</td>
                  <td className="py-3.5">
                    {subscription.provider === 'coingate'
                      ? 'Manual'
                      : subscription.cancelAtPeriodEnd
                        ? 'Cancels at period end'
                        : 'On'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground">No subscriptions found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Try a different name, email or plan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
