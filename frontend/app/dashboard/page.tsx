'use client';

import { useAuthContext } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

/** Role-based redirect: /dashboard -> /dashboard/admin or /dashboard/client */
export default function DashboardPage() {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard/client');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="space-y-6 p-6">
      <LoadingSkeleton variant="card" />
      <LoadingSkeleton variant="card" count={4} />
    </div>
  );
}
