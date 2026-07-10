'use client';

import { useState, useMemo, useEffect } from 'react';
import { Zap, Search, MoreVertical } from 'lucide-react';
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

const STATUS_TINTS: Record<string, string> = {
  REVIEW: 'bg-warning/15 text-warning border-warning/25',
  PENDING: 'bg-primary/10 text-primary border-primary/20',
  CERTIFIED: 'bg-success/15 text-success border-success/25',
  ACTIVE: 'bg-success/15 text-success border-success/25',
};

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
        <h1 className="page-title">Prop Firms</h1>
        <p className="page-subtitle">
          {propFirmAccounts.length} prop firm account{propFirmAccounts.length === 1 ? '' : 's'} connected across your clients
        </p>
      </div>

      {/* Prop Firms Table */}
      <div className="animate-fade-in-up stagger-1 overflow-hidden rounded-2xl border border-border/80 bg-card elevation-1">
        {/* Search Bar */}
        <div className="border-b border-border/80 p-6">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user name, prop firm or account number..."
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
                <th className="cursor-pointer px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground" onClick={() => setSortField('propFirmName')}>Prop Firm</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Number</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phase</th>
                <th className="cursor-pointer px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground" onClick={() => setSortField('status')}>Status</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPropFirms.map((pf) => (
                <tr
                  key={pf.id}
                  className="border-b border-border/50 transition-colors hover:bg-muted/50"
                >
                  <td className="px-6 py-3.5">
                    <div>
                      <p className="font-medium text-foreground">{pf.userName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {pf.firmName}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <code className="font-mono text-sm tabular-nums text-muted-foreground">{pf.mt5AccountNumber}</code>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        pf.phase === 'FUNDED'
                          ? 'border-success/25 bg-success/15 text-success'
                          : 'border-primary/20 bg-primary/10 text-primary'
                      }`}
                    >
                      {pf.phase}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_TINTS[pf.status || 'PENDING'] ?? 'border-border bg-muted text-muted-foreground'
                      }`}
                    >
                      {pf.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusDropdown
                      currentStatus={pf.status || 'PENDING'}
                      itemId={pf.id}
                      moduleType="propFirm"
                    />
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {new Date(pf.createdAt).toLocaleDateString('en-US', {
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

        {filteredPropFirms.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Zap className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground">No prop firm accounts found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Try a different user, firm or account number.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
