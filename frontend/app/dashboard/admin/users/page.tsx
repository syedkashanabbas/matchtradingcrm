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
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <p className="eyebrow">Administration</p>
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">
          Every account, its status and provisioning — search, sort and act.
        </p>
      </div>

      {/* Users Table */}
      <div className="animate-fade-in-up stagger-1 rounded-2xl border border-border/80 bg-card elevation-1 p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-[18px] w-[18px]" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">All Users</h2>
        </div>
        <UsersTable />
      </div>
    </div>
  );
}
