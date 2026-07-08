'use client';

import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Search, MoreVertical } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
          <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          Brokers Management
        </h1>
        <p className="text-muted-foreground mt-2">
          {brokerAccounts.length} broker accounts
        </p>
      </div>

      {/* Brokers Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft-md overflow-hidden">
        {/* Search Bar */}
        <div className="border-b border-border p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user name, broker or account number..."
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
                <th className="py-3 px-6 cursor-pointer hover:text-foreground" onClick={() => setSortField('brokerName')}>Broker</th>
                <th className="py-3 px-6">MT5 Account</th>
                <th className="py-3 px-6">MT5 Server</th>
                <th className="py-3 px-6 cursor-pointer hover:text-foreground" onClick={() => setSortField('status')}>Status</th>
                <th className="py-3 px-6">Action</th>
                <th className="py-3 px-6">Connected Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBrokers.map((broker) => (
                <tr
                  key={broker.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-foreground">{broker.userName}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {broker.brokerName}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <code className="text-sm font-mono text-muted-foreground">{broker.mt5AccountNumber}</code>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">{broker.mt5Server}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span 
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium`}
                      style={{ 
                        backgroundColor: 
                          broker.status === 'REVIEW' ? '#f59e0b' :
                          broker.status === 'PENDING' ? '#3b82f6' :
                          broker.status === 'CERTIFIED' ? '#10b981' :
                          broker.status === 'ACTIVE' ? '#22c55e' : '#6b7280',
                        color: broker.status === 'ACTIVE' ? 'white' : 'inherit'
                      }}
                    >
                      {broker.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <StatusDropdown
                      currentStatus={broker.status}
                      itemId={broker.id}
                      moduleType="broker"
                    />
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">
                      {new Date(broker.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
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

        {filteredBrokers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No broker accounts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
