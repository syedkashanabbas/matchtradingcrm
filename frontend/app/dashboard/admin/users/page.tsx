'use client';

import { useAuth } from '@/lib/hooks';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { UsersTable } from '@/components/admin/UsersTable';
import { Users } from 'lucide-react';

export default function AdminUsersPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          User Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage all user accounts and permissions
        </p>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft-md overflow-hidden p-6">
        <UsersTable />
      </div>
    </div>
  );
}
