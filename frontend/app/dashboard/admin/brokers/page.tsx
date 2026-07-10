'use client';

import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Search, MoreVertical } from 'lucide-react';
import { StatusDropdown } from '@/components/admin/StatusDropdown';
import { apiClient } from '@/lib/api';

interface BrokerAccount {
  id: string;
  userId: string;
  userName: string;
  brokerName: string;
  mt5AccountNumber: string;
  mt5Server: string;
  status: string;
  createdAt: string;
}

const STATUS_TINTS: Record<string, string> = {
  REVIEW: 'bg-warning/15 text-warning border-warning/25',
  PENDING: 'bg-primary/10 text-primary border-primary/20',
  CERTIFIED: 'bg-success/15 text-success border-success/25',
  ACTIVE: 'bg-success/15 text-success border-success/25',
};

export default function AdminBrokersPage() {
  const [brokerAccounts, setBrokerAccounts] = useState<BrokerAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'userName' | 'brokerName' | 'status'>('userName');

  useEffect(() => {
    loadBrokerAccounts();
  }, []);

  const loadBrokerAccounts = async () => {
    try {
      // Get all broker configurations directly from admin endpoint
      const brokerResponse = await apiClient.getAllBrokers();
      const brokerConfigs = (brokerResponse.data as any[]) || [];

      // Transform the data to match the expected format
      const transformedBrokers = brokerConfigs.map((broker: any) => ({
        id: broker.id,
        userId: broker.userId,
        userName: `${broker.user.firstName} ${broker.user.lastName}`,
        brokerName: broker.brokerName,
        mt5AccountNumber: broker.mt5AccountNumber,
        mt5Server: broker.mt5Server,
        status: broker.status,
        createdAt: broker.createdAt
      }));

      setBrokerAccounts(transformedBrokers);
    } catch (error) {
      console.error('Failed to load broker accounts:', error);
      setBrokerAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBrokers = useMemo(() => {
    return brokerAccounts
      .filter(broker =>
        (broker.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (broker.brokerName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (broker.mt5AccountNumber || '').includes(searchQuery)
      )
      .sort((a, b) => {
        if (sortField === 'userName') {
          return (a.userName || '').localeCompare(b.userName || '');
        } else if (sortField === 'brokerName') {
          return (a.brokerName || '').localeCompare(b.brokerName || '');
        } else {
          return (a.status || '').localeCompare(b.status || '');
        }
      });
  }, [brokerAccounts, searchQuery, sortField]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <p className="eyebrow">Connections</p>
        <h1 className="page-title">Brokers</h1>
        <p className="page-subtitle">
          {brokerAccounts.length} broker account{brokerAccounts.length === 1 ? '' : 's'} connected across your clients
        </p>
      </div>

      {/* Brokers Table */}
      <div className="animate-fade-in-up stagger-1 overflow-hidden rounded-2xl border border-border/80 bg-card elevation-1">
        {/* Search Bar */}
        <div className="border-b border-border/80 p-6">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user name, broker or account number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                <th className="cursor-pointer px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground" onClick={() => setSortField('brokerName')}>Broker</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">MT5 Account</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">MT5 Server</th>
                <th className="cursor-pointer px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground" onClick={() => setSortField('status')}>Status</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBrokers.map((broker) => (
                <tr
                  key={broker.id}
                  className="border-b border-border/50 transition-colors hover:bg-muted/50"
                >
                  <td className="px-6 py-3.5">
                    <div>
                      <p className="font-medium text-foreground">{broker.userName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {broker.brokerName}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <code className="font-mono text-sm tabular-nums text-muted-foreground">{broker.mt5AccountNumber}</code>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-sm text-muted-foreground">{broker.mt5Server}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_TINTS[broker.status] ?? 'border-border bg-muted text-muted-foreground'
                      }`}
                    >
                      {broker.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusDropdown
                      currentStatus={broker.status}
                      itemId={broker.id}
                      moduleType="broker"
                    />
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {new Date(broker.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button className="rounded-lg p-2 transition-colors hover:bg-muted" aria-label="More actions">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBrokers.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground">No broker accounts found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Try a different user, broker or account number.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
