'use client';

import { useAuthContext } from '@/lib/auth-context';
import { useAdmin } from '@/lib/admin-hook';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { AdminStats } from '@/components/admin/AdminStats';
import { StatusDropdown } from '@/components/admin/StatusDropdown';
import { Briefcase, Server } from 'lucide-react';

const statusBadgeClass = (status: string) => {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'certified':
      return 'bg-success/15 text-success border-success/25';
    case 'review':
      return 'bg-warning/15 text-warning border-warning/25';
    case 'failed':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'archived':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-primary/10 text-primary border-primary/20';
  }
};

export default function AdminDashboardPage() {
  const { isLoading: authLoading } = useAuthContext();
  const { stats, users, brokersData, propFirmsData, isLoading: adminLoading, refreshData } = useAdmin();

  const handleBrokerStatusUpdate = (brokerId: string, newStatus: string) => {
    // Update local broker data immediately
    const updatedBrokersData = brokersData.map(broker =>
      broker.id === brokerId ? { ...broker, status: newStatus } : broker
    );
    // Note: In a real implementation, you'd update the state here
    console.log(`Broker ${brokerId} status updated to ${newStatus}`);
  };

  const handlePropFirmStatusUpdate = (propId: string, newStatus: string) => {
    // Update local prop firm data immediately
    const updatedPropFirmsData = propFirmsData.map(prop =>
      prop.id === propId ? { ...prop, status: newStatus } : prop
    );
    // Note: In a real implementation, you'd update the state here
    console.log(`Prop Firm ${propId} status updated to ${newStatus}`);
  };

  if (authLoading || adminLoading || !stats) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="chart" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <p className="eyebrow">Administration</p>
        <h1 className="page-title">Control Room</h1>
        <p className="page-subtitle">
          Everything happening across users, accounts and services — at a glance.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="animate-fade-in-up stagger-1">
        <AdminStats
          totalUsers={stats.totalUsers}
          activeUsers={stats.activeUsers}
          newUsersThisMonth={stats.newUsersThisMonth}
          suspendedUsers={stats.suspendedUsers}
          totalSubscriptions={stats.totalSubscriptions}
          activeSubscriptions={stats.activeSubscriptions}
          totalBrokerAccounts={stats.totalBrokerAccounts}
          activeBrokerAccounts={stats.activeBrokerAccounts}
          totalPropAccounts={stats.totalPropAccounts}
          activePropAccounts={stats.activePropAccounts}
        />
      </div>

      {/* Brokers Table */}
      <div className="animate-fade-in-up stagger-2 rounded-2xl border border-border/80 bg-card elevation-1 p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Briefcase className="h-[18px] w-[18px]" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">Broker Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Broker</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Number</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {brokersData.slice(0, 100).map((broker: any) => (
                <tr key={broker.id} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                  <td className="py-3.5 pr-4">
                    <span className="font-medium text-foreground">{broker.user?.firstName} {broker.user?.lastName}</span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {broker.brokerName}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <code className="font-mono text-sm tabular-nums">{broker.mt5AccountNumber}</code>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(broker.status)}`}>
                      {broker.status}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <StatusDropdown
                      currentStatus={broker.status}
                      itemId={broker.id}
                      moduleType="broker"
                      onStatusUpdate={(newStatus) => handleBrokerStatusUpdate(broker.id, newStatus)}
                    />
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {new Date(broker.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prop Firms Table */}
      <div className="animate-fade-in-up stagger-3 rounded-2xl border border-border/80 bg-card elevation-1 p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Server className="h-[18px] w-[18px]" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">Prop Firm Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prop Firm</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Number</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phase</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {propFirmsData.slice(0, 100).map((prop: any) => (
                <tr key={prop.id} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                  <td className="py-3.5 pr-4">
                    <span className="font-medium text-foreground">{prop.user?.firstName} {prop.user?.lastName}</span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="inline-flex rounded-full border border-warning/25 bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                      {prop.firmName}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <code className="font-mono text-sm tabular-nums">{prop.mt5AccountNumber}</code>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {prop.phase}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(prop.status || 'PENDING')}`}>
                      {prop.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <StatusDropdown
                      currentStatus={prop.status || 'PENDING'}
                      itemId={prop.id}
                      moduleType="propFirm"
                      onStatusUpdate={(newStatus) => handlePropFirmStatusUpdate(prop.id, newStatus)}
                    />
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {new Date(prop.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
