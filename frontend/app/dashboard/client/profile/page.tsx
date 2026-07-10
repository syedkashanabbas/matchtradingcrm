'use client';

import { useAuthContext } from '@/lib/auth-context';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleUser, SquarePen, Info } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading } = useAuthContext();

  if (isLoading || !user) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <p className="eyebrow">Account</p>
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">
          Keep your details current so we can reach you when it matters.
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card className="animate-fade-in-up stagger-1">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CircleUser className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Account Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <UserAvatar name={user.name} src={user.avatar} size="lg" />
            <div className="flex-1">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <p className="mt-1 text-muted-foreground">{user.email}</p>
              {user.phone && (
                <p className="mt-1 text-muted-foreground tabular-nums">{user.phone}</p>
              )}
              <div className="mt-4 flex items-center gap-2">
                <StatusBadge status={user.status} />
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {user.tier} Plan
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Member since {new Date(user.joinDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="animate-fade-in-up stagger-2">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SquarePen className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Edit Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="animate-fade-in-up stagger-3">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Info className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Account Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account ID</p>
              <p className="mt-1 font-mono text-sm text-foreground">{user.accountId || user.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="mt-1 capitalize text-foreground">{user.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created Date</p>
              <p className="mt-1 text-foreground">
                {new Date(user.joinDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
