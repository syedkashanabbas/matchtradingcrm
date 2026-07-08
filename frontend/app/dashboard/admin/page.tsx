'use client';

import { useAuthContext } from '@/lib/auth-context';
import { useAdmin } from '@/lib/admin-hook';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { AdminStats } from '@/components/admin/AdminStats';
import { UsersTable } from '@/components/admin/UsersTable';
import { StatusDropdown } from '@/components/admin/StatusDropdown';
import { BarChart3 } from 'lucide-react';

export default function AdminDashboardPage() {
  const { isLoading: authLoading } = useAuthContext();
  const { stats, users, vpsData, brokersData, propFirmsData, isLoading: adminLoading, refreshData } = useAdmin();

  const handleVpsStatusUpdate = (vpsId: string, newStatus: string) => {
    // Update local VPS data immediately
    const updatedVpsData = vpsData.map(vps => 
      vps.id === vpsId ? { ...vps, status: newStatus } : vps
    );
    // Note: In a real implementation, you'd update the state here
    console.log(`VPS ${vpsId} status updated to ${newStatus}`);
  };

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
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          System overview and user management
        </p>
      </div>

      {/* Stats Cards */}
      <AdminStats
        totalUsers={stats.totalUsers}
        activeUsers={stats.activeUsers}
        newUsersThisMonth={stats.newUsersThisMonth}
        suspendedUsers={stats.suspendedUsers}
        totalSubscriptions={stats.totalSubscriptions}
        activeSubscriptions={stats.activeSubscriptions}
        totalVpsConfigs={stats.totalVpsConfigs}
        activeVpsConfigs={stats.activeVpsConfigs}
        totalBrokerAccounts={stats.totalBrokerAccounts}
        activeBrokerAccounts={stats.activeBrokerAccounts}
        totalPropAccounts={stats.totalPropAccounts}
        activePropAccounts={stats.activePropAccounts}
      />

      {/* Users Table */}
      {/* <div className="rounded-2xl border border-border bg-card p-6 shadow-soft-md">
        <h2 className="text-xl font-semibold text-foreground mb-6">
          User Management
        </h2>
        <UsersTable />
      </div> */}

      {/* VPS Table */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 lg:p-6 shadow-soft-md">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground mb-3 sm:mb-4 lg:mb-6">
          VPS Configurations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs sm:text-sm font-medium text-muted-foreground">
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">User</th>
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">Provider</th>
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">IP Address</th>
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">Status</th>
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">Action</th>
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">Created</th>
              </tr>
            </thead>
            <tbody>
              {vpsData.slice(0, 100).map((vps: any) => (
                <tr key={vps.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-6">
                    <span className="font-medium text-xs sm:text-sm">{vps.user?.firstName} {vps.user?.lastName}</span>
                  </td>
                  <td className="py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-6">
                    <span className="inline-flex rounded-full bg-green-100 dark:bg-green-900/30 px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] lg:text-xs font-medium text-green-700 dark:text-green-400">
                      {vps.provider}
                    </span>
                  </td>
                  <td className="py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-6">
                    <code className="text-[10px] sm:text-xs lg:text-sm font-mono break-all">{vps.ipAddress}</code>
                  </td>
                  <td className="py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-6">
                    <span 
                      className={`inline-flex rounded-full px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] lg:text-xs font-medium`}
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
                  <td className="py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-6">
                    <StatusDropdown
                      currentStatus={vps.status}
                      itemId={vps.id}
                      moduleType="vps"
                      onStatusUpdate={(newStatus) => handleVpsStatusUpdate(vps.id, newStatus)}
                    />
                  </td>
                  <td className="py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-6">
                    <span className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
                      {new Date(vps.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brokers Table */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 lg:p-6 shadow-soft-md">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground mb-3 sm:mb-4 lg:mb-6">
          Broker Accounts
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs sm:text-sm font-medium text-muted-foreground">
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">User</th>
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">Broker</th>
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">Account Number</th>
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">Status</th>
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">Action</th>
                <th className="py-1.5 sm:py-2 lg:py-3 px-2 sm:px-3 lg:px-6 whitespace-nowrap">Created</th>
              </tr>
            </thead>
            <tbody>
              {brokersData.slice(0, 100).map((broker: any) => (
                <tr key={broker.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-4 px-6">
                    <span className="font-medium">{broker.user?.firstName} {broker.user?.lastName}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                      {broker.brokerName}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <code className="text-sm font-mono">{broker.mt5AccountNumber}</code>
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
                      onStatusUpdate={(newStatus) => handleBrokerStatusUpdate(broker.id, newStatus)}
                    />
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">
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
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft-md">
        <h2 className="text-xl font-semibold text-foreground mb-6">
          Prop Firm Accounts
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
                <th className="py-3 px-6">User</th>
                <th className="py-3 px-6">Prop Firm</th>
                <th className="py-3 px-6">Account Number</th>
                <th className="py-3 px-6">Phase</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Action</th>
                <th className="py-3 px-6">Created</th>
              </tr>
            </thead>
            <tbody>
              {propFirmsData.slice(0, 100).map((prop: any) => (
                <tr key={prop.id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-4 px-6">
                    <span className="font-medium">{prop.user?.firstName} {prop.user?.lastName}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex rounded-full bg-orange-100 dark:bg-orange-900/30 px-3 py-1 text-xs font-medium text-orange-700 dark:text-orange-400">
                      {prop.firmName}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <code className="text-sm font-mono">{prop.mt5AccountNumber}</code>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                      {prop.phase}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span 
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium`}
                      style={{ 
                        backgroundColor: 
                          (prop.status || 'PENDING') === 'REVIEW' ? '#f59e0b' :
                          (prop.status || 'PENDING') === 'PENDING' ? '#3b82f6' :
                          (prop.status || 'PENDING') === 'CERTIFIED' ? '#10b981' :
                          (prop.status || 'PENDING') === 'ACTIVE' ? '#22c55e' : '#6b7280',
                        color: (prop.status || 'PENDING') === 'ACTIVE' ? 'white' : 'inherit'
                      }}
                    >
                      {prop.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <StatusDropdown
                      currentStatus={prop.status || 'PENDING'}
                      itemId={prop.id}
                      moduleType="propFirm"
                      onStatusUpdate={(newStatus) => handlePropFirmStatusUpdate(prop.id, newStatus)}
                    />
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">
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
