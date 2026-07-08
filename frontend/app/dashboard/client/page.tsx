'use client';

import { useAuthContext } from '@/lib/auth-context';
import { useClientDashboard } from '@/lib/client-dashboard-hook';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Users, Activity, Zap, Calendar } from 'lucide-react';

export default function ClientDashboardPage() {
  const { user, isLoading: authLoading } = useAuthContext();
  const { dashboardData, isLoading: dashboardLoading, error } = useClientDashboard();

  if (authLoading || dashboardLoading || !user || !dashboardData) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Error loading dashboard: {error}
        </div>
      </div>
    );
  }

  const { stats, recentActivity } = dashboardData;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Card */}
      <WelcomeCard user={user} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <StatsCard
          icon={<Zap className="h-6 w-6" />}
          label="Account Status"
          value={stats.accountStatus}
          subtext="All systems operational"
          color="emerald"
        />
        <StatsCard
          icon={<Activity className="h-6 w-6" />}
          label="VPS Status"
          value={stats.vpsStatus}
          subtext={stats.vpsStatus === 'Connected' ? 'VPS is running' : 'VPS not connected'}
          color={stats.vpsStatus === 'Connected' ? 'blue' : 'amber'}
        />
        <StatsCard
          icon={<Calendar className="h-6 w-6" />}
          label="Broker"
          value={stats.broker}
          subtext={stats.broker === 'Not Connected' ? 'Not connected' : 'Connected'}
          color={stats.broker === 'Not Connected' ? 'amber' : 'purple'}
        />
        <StatsCard
          icon={<Users className="h-6 w-6" />}
          label="Prop Firm"
          value={stats.propFirm}
          subtext={stats.propFirm === 'Not Connected' ? 'Not connected' : 'Active account'}
          color={stats.propFirm === 'Not Connected' ? 'amber' : 'amber'}
        />
        <StatsCard
          icon={<Zap className="h-6 w-6" />}
          label="Subscription Plan"
          value={stats.subscriptionPlan}
          subtext={`Status: ${stats.subscriptionStatus}`}
          color={stats.subscriptionStatus === 'active' ? 'indigo' : 'rose'}
        />
        <StatsCard
          icon={<Calendar className="h-6 w-6" />}
          label="Last Sync"
          value={new Date(stats.lastSync).toLocaleDateString()}
          subtext={new Date(stats.lastSync).toLocaleTimeString()}
          color="rose"
        />
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 lg:p-6 shadow-soft-md">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground mb-3 sm:mb-4 lg:mb-6">
          Recent Activity
        </h2>
        <div className="space-y-2 sm:space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 sm:p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No recent activity
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
