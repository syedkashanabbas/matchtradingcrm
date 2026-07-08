'use client';

import { useAuthContext } from '@/lib/auth-context';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading } = useAuthContext();

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          Profile Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information
        </p>
      </div>

      {/* Profile Form Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft-md">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          Personal Information
        </h2>
        <ProfileForm user={user} />
      </div>

      {/* Account Status Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft-md">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          Account Status
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted transition-colors">
            <div>
              <p className="font-medium text-foreground">Account Status</p>
              <p className="text-sm text-muted-foreground">
                Your current account status
              </p>
            </div>
            <StatusBadge status={user.status} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted transition-colors">
            <div>
              <p className="font-medium text-foreground">Subscription Tier</p>
              <p className="text-sm text-muted-foreground">
                Your current plan level
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-sm font-medium text-blue-700 dark:text-blue-400">
              {user.tier} Plan
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted transition-colors">
            <div>
              <p className="font-medium text-foreground">Member Since</p>
              <p className="text-sm text-muted-foreground">
                Your account creation date
              </p>
            </div>
            <p className="font-medium text-foreground">
              {new Date(user.joinDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4">
          Danger Zone
        </h2>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">
          These actions cannot be undone. Please proceed with caution.
        </p>
        <button className="rounded-lg border border-red-200 dark:border-red-800 bg-transparent px-4 py-2.5 font-medium text-red-700 dark:text-red-400 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30">
          Delete Account
        </button>
      </div>
    </div>
  );
}
