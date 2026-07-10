'use client';

import { useAuthContext } from '@/lib/auth-context';
import { useClientDashboard } from '@/lib/client-dashboard-hook';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { ServiceStatusCard } from '@/components/dashboard/ServiceStatusCard';
import { CryptoRenewalBanner } from '@/components/dashboard/CryptoRenewalBanner';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Users, Zap, Calendar, Activity, AlertCircle } from 'lucide-react';

export default function ClientDashboardPage() {
  const { user, isLoading: authLoading } = useAuthContext();
  const { dashboardData, isLoading: dashboardLoading, error } = useClientDashboard();

  if (authLoading || dashboardLoading || !user || !dashboardData) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          Error loading dashboard: {error}
        </div>
      </div>
    );
  }

  const { stats, recentActivity } = dashboardData;

  return (
    <div className="space-y-8">
      {/* Welcome greeting row */}
      <WelcomeCard user={user} />

      {/* Expiring crypto subscription (spec 3.7) */}
      <CryptoRenewalBanner />

      {/* Service / provisioning status (spec §5.7) */}
      <ServiceStatusCard />

      {/* Stats Grid */}
      <div className="animate-fade-in-up stagger-2 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          icon={<Zap className="h-6 w-6" />}
          label="Account Status"
          value={stats.accountStatus}
          subtext="All systems operational"
          color="emerald"
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
      <div className="animate-fade-in-up stagger-3 rounded-2xl border border-border/80 bg-card elevation-1 p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-[18px] w-[18px]" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Recent Activity
          </h2>
        </div>
        {recentActivity.length > 0 ? (
          <div className="divide-y divide-border/50">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                <p className="flex-1 text-sm font-medium text-foreground">
                  {activity.action}
                </p>
                <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {new Date(activity.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Activity className="h-6 w-6" />
            </div>
            <p className="font-display font-semibold text-foreground">Nothing yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Account events will show up here as they happen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
