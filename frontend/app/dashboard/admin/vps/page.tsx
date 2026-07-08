'use client';

import { useState, useMemo, useEffect } from 'react';
import { Server, Search, MoreVertical } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusDropdown } from '@/components/admin/StatusDropdown';
import { apiClient } from '@/lib/api';

interface VPSAccount {
  id: string;
  userId: string;
  userName: string;
  provider: string;
  ipAddress: string;
  operatingSystem: string;
  status: string;
  connectedDate: string;
  lastSync: string;
}

export default function AdminVPSPage() {
  const [vpsAccounts, setVpsAccounts] = useState<VPSAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'userName' | 'provider' | 'status'>('userName');

  useEffect(() => {
    loadVpsAccounts();
  }, []);

  const loadVpsAccounts = async () => {
    try {
      // Get all VPS configurations directly from admin endpoint
      const vpsResponse = await apiClient.getAllVps();
      const vpsConfigs = (vpsResponse.data as any[]) || [];
      
      // Transform the data to match the expected format
      const transformedVps = vpsConfigs.map((vps: any) => ({
        id: vps.id,
        userId: vps.userId,
        userName: `${vps.user.firstName} ${vps.user.lastName}`,
        provider: vps.provider,
        ipAddress: vps.ipAddress,
        operatingSystem: vps.operatingSystem || 'Windows Server 2022',
        status: vps.status,
        connectedDate: vps.createdAt,
        lastSync: vps.updatedAt
      }));
      
      setVpsAccounts(transformedVps);
    } catch (error) {
      console.error('Failed to load VPS accounts:', error);
      setVpsAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVPS = useMemo(() => {
    return vpsAccounts
      .filter(vps =>
        (vps.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (vps.provider?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (vps.ipAddress || '').includes(searchQuery)
      )
      .sort((a, b) => {
        if (sortField === 'userName') {
          return (a.userName || '').localeCompare(b.userName || '');
        } else if (sortField === 'provider') {
          return (a.provider || '').localeCompare(b.provider || '');
        } else {
          return (a.status || '').localeCompare(b.status || '');
        }
      });
  }, [vpsAccounts, searchQuery, sortField]);

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
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          VPS Management
        </h1>
        <p className="text-muted-foreground mt-2">
          {vpsAccounts.length} VPS accounts
        </p>
      </div>

      {/* VPS Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft-md overflow-hidden">
        {/* Search Bar */}
        <div className="border-b border-border p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user name, provider or IP address..."
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
                <th className="py-3 px-6 cursor-pointer hover:text-foreground" onClick={() => setSortField('provider')}>Provider</th>
                <th className="py-3 px-6">IP Address</th>
                <th className="py-3 px-6">Operating System</th>
                <th className="py-3 px-6 cursor-pointer hover:text-foreground" onClick={() => setSortField('status')}>Status</th>
                <th className="py-3 px-6">Action</th>
                <th className="py-3 px-6">Connected Date</th>
                <th className="py-3 px-6">Last Sync</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVPS.map((vps) => (
                <tr
                  key={vps.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-foreground">{vps.userName}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                      {vps.provider}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <code className="text-sm font-mono text-muted-foreground">{vps.ipAddress}</code>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">{vps.operatingSystem}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span 
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium`}
                      style={{ 
                        backgroundColor: 
                          vps.status === 'REVIEW' ? '#f59e0b' :
                          vps.status === 'PENDING' ? '#3b82f6' :
                          vps.status === 'CERTIFIED' ? '#10b981' :
                          vps.status === 'ACTIVE' ? '#22c55e' : '#6b7280',
                        color: vps.status === 'ACTIVE' ? 'white' : 'inherit'
                      }}
                    >
                      {vps.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <StatusDropdown
                      currentStatus={vps.status}
                      itemId={vps.id}
                      moduleType="vps"
                    />
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">
                      {new Date(vps.connectedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">
                      {new Date(vps.lastSync).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
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

        {filteredVPS.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No VPS accounts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
