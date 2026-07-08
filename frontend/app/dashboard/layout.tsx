'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This layout is now handled by the specific client/layout.tsx
    // Just pass through the children
  }, [pathname]);

  return <>{children}</>;
}
