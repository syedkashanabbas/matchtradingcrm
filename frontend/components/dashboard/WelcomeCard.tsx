import { UserAvatar } from '@/components/shared/UserAvatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { CurrentUser } from '@/lib/types';

interface WelcomeCardProps {
  user: CurrentUser;
}

export function WelcomeCard({ user }: WelcomeCardProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 p-8 shadow-soft-md">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <UserAvatar
            src={user.avatar}
            name={user.name}
            size="lg"
          />
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {getGreeting()}, {user.firstName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back to MatchTrading
            </p>
            <div className="mt-4 flex items-center gap-3">
              <StatusBadge status={user.status} />
              <span className="text-sm text-muted-foreground">
                {user.tier} Plan
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Member since</p>
          <p className="text-lg font-semibold text-foreground">
            {new Date(user.joinDate).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
