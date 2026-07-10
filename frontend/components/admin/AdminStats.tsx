import { StatsCard } from '@/components/dashboard/StatsCard';
import { Users, UserCheck, UserPlus, UserX, Server, Briefcase } from 'lucide-react';

interface AdminStatsProps {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  suspendedUsers: number;
  totalSubscriptions?: number;
  activeSubscriptions?: number;
  totalBrokerAccounts?: number;
  activeBrokerAccounts?: number;
  totalPropAccounts?: number;
  activePropAccounts?: number;
}

export function AdminStats({
  totalUsers,
  activeUsers,
  newUsersThisMonth,
  suspendedUsers,
  totalSubscriptions = 0,
  activeSubscriptions = 0,
  totalBrokerAccounts = 0,
  activeBrokerAccounts = 0,
  totalPropAccounts = 0,
  activePropAccounts = 0,
}: AdminStatsProps) {
  const activePercentage = Math.round((activeUsers / totalUsers) * 100);

  return (
    <div className="space-y-8">
      {/* User Stats */}
      <div>
        <p className="eyebrow mb-4">User statistics</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={<Users className="h-6 w-6" />}
            label="Total Users"
            value={totalUsers.toLocaleString()}
            subtext={`${activePercentage}% active`}
            color="blue"
            trend={{ value: 8, direction: 'up' }}
          />
          <StatsCard
            icon={<UserCheck className="h-6 w-6" />}
            label="Active Users"
            value={activeUsers.toLocaleString()}
            subtext={`${((activeUsers / totalUsers) * 100).toFixed(1)}% of total`}
            color="emerald"
            trend={{ value: 5, direction: 'up' }}
          />
          <StatsCard
            icon={<UserPlus className="h-6 w-6" />}
            label="New This Month"
            value={newUsersThisMonth.toLocaleString()}
            subtext="Signups this month"
            color="purple"
            trend={{ value: 12, direction: 'up' }}
          />
          <StatsCard
            icon={<UserX className="h-6 w-6" />}
            label="Suspended Users"
            value={suspendedUsers.toLocaleString()}
            subtext={`${((suspendedUsers / totalUsers) * 100).toFixed(1)}% of total`}
            color="amber"
            trend={{ value: 2, direction: 'down' }}
          />
        </div>
      </div>

      {/* Service Stats */}
      <div>
        <p className="eyebrow mb-4">Service statistics</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            icon={<Briefcase className="h-6 w-6" />}
            label="Broker Accounts"
            value={`${totalBrokerAccounts}`}
            subtext="Total"
            color="blue"
          />
          <StatsCard
            icon={<Server className="h-6 w-6" />}
            label="Prop Accounts"
            value={`${totalPropAccounts}`}
            subtext="Total"
            color="amber"
          />
          <StatsCard
            icon={<Users className="h-6 w-6" />}
            label="Subscriptions"
            value={`${totalSubscriptions}`}
            subtext="Total"
            color="emerald"
          />
        </div>
      </div>
    </div>
  );
}
