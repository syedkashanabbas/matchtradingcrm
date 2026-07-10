'use client';

import { useAuthContext } from '@/lib/auth-context';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function AdminProfilePage() {
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="page-title">Admin Profile</h1>
        </div>
        <p className="page-subtitle">
          Manage your admin account information and preferences
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <UserAvatar name={user.name} src={user.avatar} size="lg" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-muted-foreground mt-1">{user.email}</p>
              <div className="flex items-center gap-3 mt-4">
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                  Administrator
                </div>
                <span className="text-sm text-muted-foreground">
                  Super Admin Access
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
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
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account ID</label>
              <p className="text-foreground font-mono text-sm mt-1">{user.accountId || user.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <p className="text-foreground mt-1 capitalize font-semibold text-indigo-600 dark:text-indigo-400">Administrator</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Status</label>
              <p className="text-foreground mt-1 capitalize">{user.status}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created Date</label>
              <p className="text-foreground mt-1">
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

      {/* Security Info */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add an extra layer of security to your account
                </p>
              </div>
              <button className="px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Configure
              </button>
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="font-medium text-foreground">Last Login</h3>
              <p className="text-foreground mt-2">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
