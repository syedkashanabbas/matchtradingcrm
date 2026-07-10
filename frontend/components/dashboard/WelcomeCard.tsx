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
    <div className="animate-fade-in-up rounded-2xl border border-border/80 bg-card elevation-1 p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar
            src={user.avatar}
            name={user.name}
            size="lg"
          />
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {getGreeting()}, {user.firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here&apos;s where your account stands today.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={user.status} />
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {user.tier} Plan
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-sm text-muted-foreground">Member since</p>
          <p className="font-display text-lg font-semibold text-foreground tabular-nums">
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
