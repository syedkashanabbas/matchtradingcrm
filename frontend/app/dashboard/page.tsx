'use client';

import { useAuthContext } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { useClientDashboard } from '@/lib/client-dashboard-hook';
import { Users, Activity, Zap, Calendar } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();
  const { dashboardData } = useClientDashboard();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect to role-specific dashboard
      if (user.role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard/client');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <WelcomeCard user={user} />

      {/* Stats Grid - Show real data if available */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={<Users className="h-6 w-6" />}
            label="API Keys"
            value={dashboardData.stats.apiKeysCount.toString()}
            subtext="Total keys"
            color="blue"
          />
          <StatsCard
            icon={<Zap className="h-6 w-6" />}
            label="Account Status"
            value={dashboardData.stats.accountStatus}
            subtext="All systems operational"
            color="emerald"
          />
          <StatsCard
            icon={<Activity className="h-6 w-6" />}
            label="Subscription"
            value={dashboardData.stats.subscriptionPlan}
            subtext={`Status: ${dashboardData.stats.subscriptionStatus}`}
            color="purple"
          />
          <StatsCard
            icon={<Calendar className="h-6 w-6" />}
            label="Unread Notifications"
            value={dashboardData.stats.unreadNotifications.toString()}
            subtext="New messages"
            color="amber"
          />
        </div>
      )}

      {/* Recent Activity */}
      {dashboardData && dashboardData.recentActivity.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft-md">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {dashboardData.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
