'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown, Search, Users } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAdmin } from '@/lib/admin-hook';
import type { User } from '@/lib/types';

type SortField = 'name' | 'email' | 'status' | 'tier' | 'signupDate';
type SortDirection = 'asc' | 'desc';

const provisioningChipClass = (status: string | undefined) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-success/15 text-success border-success/25';
    case 'FAILED':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'NOT_STARTED':
    case undefined:
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-primary/10 text-primary border-primary/20';
  }
};

export function UsersTable() {
  const { users, updateUserStatus } = useAdmin();
  const [sortField, setSortField] = useState<SortField>('signupDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    try {
      await updateUserStatus(userId, newStatus);
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'signupDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search users by name or email"
          className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th
                className="cursor-pointer pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => handleSort('name')}
              >
                Name <SortIcon field="name" />
              </th>
              <th
                className="cursor-pointer pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => handleSort('email')}
              >
                Email <SortIcon field="email" />
              </th>
              <th
                className="cursor-pointer pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => handleSort('status')}
              >
                Status <SortIcon field="status" />
              </th>
              <th
                className="cursor-pointer pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => handleSort('tier')}
              >
                Tier <SortIcon field="tier" />
              </th>
              <th
                className="cursor-pointer pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => handleSort('signupDate')}
              >
                Signup Date <SortIcon field="signupDate" />
              </th>
              <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provisioning</th>
              <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedUsers.map(user => (
              <tr
                key={user.id}
                className="border-b border-border/50 transition-colors hover:bg-muted/50"
              >
                <td className="py-3.5 pr-4">
                  <Link href={`/dashboard/admin/users/${user.id}`} className="flex items-center gap-3 hover:underline">
                    <UserAvatar
                      src={user.avatar}
                      name={user.name}
                      size="sm"
                    />
                    <span className="font-medium text-foreground">{user.name}</span>
                  </Link>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <StatusBadge status={user.status} variant="subtle" />
                </td>
                <td className="py-3.5 pr-4">
                  <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {user.tier}
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {new Date(user.signupDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${provisioningChipClass(user.provisioningStatus)}`}
                  >
                    {(user.provisioningStatus ?? 'NOT_STARTED').replaceAll('_', ' ')}
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <select
                    value={user.status}
                    onChange={(e) => handleStatusUpdate(user.id, e.target.value)}
                    aria-label={`Update status for ${user.name}`}
                    className="h-8 cursor-pointer rounded-lg border border-input bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedUsers.length === 0 && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <p className="font-semibold text-foreground">No users found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Try a different name or email — new signups appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
}
