'use client';

import { useAuth } from '@/lib/hooks';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserRound } from 'lucide-react';

export default function AccountSettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <p className="eyebrow">Settings</p>
        <h1 className="page-title">Account</h1>
        <p className="page-subtitle">Your profile, contact details and account record.</p>
      </div>

      {/* Account Form */}
      <Card className="animate-fade-in-up stagger-1">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserRound className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Account Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  defaultValue={`${user.firstName} ${user.lastName}`}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user.email}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  defaultValue={user.company}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-border/50 pt-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Account ID
                </p>
                <p className="mt-1.5 font-mono text-sm text-foreground tabular-nums">
                  {user.accountId || user.id}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </p>
                <p className="mt-1.5 text-sm font-medium capitalize text-foreground">{user.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Member since
                </p>
                <p className="mt-1.5 text-sm font-medium text-foreground tabular-nums">
                  {new Date(user.joinDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-border/50 pt-6">
              <Button>Save Changes</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
