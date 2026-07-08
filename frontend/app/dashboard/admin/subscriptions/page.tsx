'use client';

import { useState, useMemo, useEffect } from 'react';
import { CreditCard, Search, MoreVertical } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { apiClient } from '@/lib/api';

interface Subscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  price: string;
  status: string;
  nextBillingDate?: string;
  paymentMethod?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'userName' | 'plan' | 'status'>('userName');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      // Get all users with their subscription info
      const usersResponse = await apiClient.getAllUsers();
      const users = usersResponse.users || [];

      // For each user, get their subscription info
      const subscriptionPromises = users.map(async (user: any) => {
        try {
          const subscriptionInfo = await apiClient.getSubscriptionInfo();
          
          // DEBUG: Log API response to validate correct data
          console.log('🔍 DEBUG - Admin Subscriptions API Response:');
          console.log('User:', user.name, '(', user.email, ')');
          console.log('Subscription Info:', subscriptionInfo);
          console.log('Plan from API:', (subscriptionInfo as any).plan);
          console.log('Price from API:', (subscriptionInfo as any).price);
          
          return {
            id: user.id,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            plan: (subscriptionInfo as any).plan,
            price: (subscriptionInfo as any).price || '$0/month', // Use price from API response
            status: (subscriptionInfo as any).status,
            nextBillingDate: (subscriptionInfo as any).nextBillingDate,
            paymentMethod: 'Stripe',
            stripeSubscriptionId: (subscriptionInfo as any).stripeSubscriptionId || 'N/A',
            createdAt: user.signupDate
          };
        } catch (error) {
          // User might not have subscription, return default
          return {
            id: user.id,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            plan: 'FREE',
            price: '$0/month', // Default for users without subscription
            status: 'inactive',
            paymentMethod: 'N/A',
            stripeSubscriptionId: 'N/A',
            createdAt: user.signupDate
          };
        }
      });

      const subscriptionData = await Promise.all(subscriptionPromises);
      setSubscriptions(subscriptionData);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter(sub =>
        (sub.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (sub.userEmail?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (sub.plan?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortField === 'userName') {
          return (a.userName || '').localeCompare(b.userName || '');
        } else if (sortField === 'plan') {
          return (a.plan || '').localeCompare(b.plan || '');
        } else {
          return (a.status || '').localeCompare(b.status || '');
        }
      });
  }, [subscriptions, searchQuery, sortField]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          Subscriptions Management
        </h1>
        <p className="text-muted-foreground mt-2">
          {subscriptions.length} total subscriptions
        </p>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft-md overflow-hidden">
        {/* Search Bar */}
        <div className="border-b border-border p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user name, email or plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm font-medium text-muted-foreground bg-muted/30">
                <th className="py-3 px-6">User</th>
                <th className="py-3 px-6 cursor-pointer hover:text-foreground" onClick={() => setSortField('plan')}>Plan</th>
                <th className="py-3 px-6">Price</th>
                <th className="py-3 px-6 cursor-pointer hover:text-foreground" onClick={() => setSortField('status')}>Status</th>
                <th className="py-3 px-6">Next Billing</th>
                <th className="py-3 px-6">Payment Method</th>
                <th className="py-3 px-6">Stripe ID</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((subscription) => (
                <tr
                  key={subscription.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-foreground">{subscription.userName}</p>
                      <p className="text-sm text-muted-foreground">{subscription.userEmail}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                      {subscription.plan}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-foreground">{subscription.price}</span>
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge
                      status={subscription.status === 'active' ? 'active' : subscription.status === 'cancelled' ? 'suspended' : 'pending'}
                      variant="subtle"
                    />
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">
                      {subscription.nextBillingDate 
                        ? new Date(subscription.nextBillingDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'
                      }
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">{subscription.paymentMethod}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-mono text-muted-foreground">{subscription.stripeSubscriptionId}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No subscriptions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
