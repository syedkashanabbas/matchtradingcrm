'use client';

import { useState, useMemo, useEffect } from 'react';
import { Zap, Search, MoreVertical } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusDropdown } from '@/components/admin/StatusDropdown';
import { apiClient } from '@/lib/api';

interface PropFirmAccount {
  id: string;
  userId: string;
  userName: string;
  firmName: string;
  mt5AccountNumber: string;
  mt5Server: string;
  phase: 'CHALLENGE' | 'FUNDED';
  isActive: boolean;
  status?: string; // Optional status field for dropdown
  createdAt: string;
}

export default function AdminPropFirmsPage() {
  const [propFirmAccounts, setPropFirmAccounts] = useState<PropFirmAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'userName' | 'propFirmName' | 'status'>('userName');

  useEffect(() => {
    loadPropFirmAccounts();
  }, []);

  const loadPropFirmAccounts = async () => {
    try {
      // Get all prop firm configurations directly from admin endpoint
      const propResponse = await apiClient.getAllPropFirms();
      const propConfigs = (propResponse.data as any[]) || [];
      
      // Transform the data to match the expected format
      const transformedProps = propConfigs.map((prop: any) => ({
        id: prop.id,
        userId: prop.userId,
        userName: `${prop.user.firstName} ${prop.user.lastName}`,
        firmName: prop.firmName,
        mt5AccountNumber: prop.mt5AccountNumber,
        mt5Server: prop.mt5Server,
        phase: prop.phase,
        isActive: prop.isActive,
        status: prop.status || 'PENDING', // Use actual status from database
        createdAt: prop.createdAt
      }));
      
      setPropFirmAccounts(transformedProps);
    } catch (error) {
      console.error('Failed to load prop firm accounts:', error);
      setPropFirmAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPropFirms = useMemo(() => {
    return propFirmAccounts
      .filter(pf =>
        (pf.userName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (pf.firmName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (pf.mt5AccountNumber || '').includes(searchQuery)
      )
      .sort((a, b) => {
        if (sortField === 'userName') {
          return (a.userName || '').localeCompare(b.userName || '');
        } else if (sortField === 'propFirmName') {
          return (a.firmName || '').localeCompare(b.firmName || '');
        } else {
          return (a.isActive ? 'active' : 'inactive').localeCompare(b.isActive ? 'active' : 'inactive');
        }
      });
  }, [propFirmAccounts, searchQuery, sortField]);

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
          <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          Prop Firms Management
        </h1>
        <p className="text-muted-foreground mt-2">
          {propFirmAccounts.length} prop firm accounts
        </p>
      </div>

      {/* Prop Firms Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft-md overflow-hidden">
        {/* Search Bar */}
        <div className="border-b border-border p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user name, prop firm or account number..."
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
                <th className="py-3 px-6 cursor-pointer hover:text-foreground" onClick={() => setSortField('propFirmName')}>Prop Firm</th>
                <th className="py-3 px-6">Account Number</th>
                <th className="py-3 px-6">Phase</th>
                <th className="py-3 px-6 cursor-pointer hover:text-foreground" onClick={() => setSortField('status')}>Status</th>
                <th className="py-3 px-6">Action</th>
                <th className="py-3 px-6">Connected Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPropFirms.map((pf) => (
                <tr
                  key={pf.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-foreground">{pf.userName}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex rounded-full bg-orange-100 dark:bg-orange-900/30 px-3 py-1 text-xs font-medium text-orange-700 dark:text-orange-400">
                      {pf.firmName}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <code className="text-sm font-mono text-muted-foreground">{pf.mt5AccountNumber}</code>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                      {pf.phase}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span 
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium`}
                      style={{ 
                        backgroundColor: 
                          (pf.status || 'PENDING') === 'REVIEW' ? '#f59e0b' :
                          (pf.status || 'PENDING') === 'PENDING' ? '#3b82f6' :
                          (pf.status || 'PENDING') === 'CERTIFIED' ? '#10b981' :
                          (pf.status || 'PENDING') === 'ACTIVE' ? '#22c55e' : '#6b7280',
                        color: (pf.status || 'PENDING') === 'ACTIVE' ? 'white' : 'inherit'
                      }}
                    >
                      {pf.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <StatusDropdown
                      currentStatus={pf.status || 'PENDING'}
                      itemId={pf.id}
                      moduleType="propFirm"
                    />
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">
                      {new Date(pf.createdAt).toLocaleDateString('en-US', {
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

        {filteredPropFirms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No prop firm accounts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
