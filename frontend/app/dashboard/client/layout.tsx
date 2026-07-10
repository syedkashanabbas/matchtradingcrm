'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/lib/auth-context';
import { useOnboardingStatus } from '@/lib/use-onboarding-status';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import type { ReactNode } from 'react';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { onboardingData, isLoading: onboardingLoading } = useOnboardingStatus();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only check onboarding after auth is complete
    if (!authLoading && isAuthenticated && onboardingData) {
      const isOnboardingPage = pathname.startsWith('/dashboard/client/onboarding');
      const isNetworkPage = pathname.startsWith('/dashboard/client/network');
      const isCommissionsPage = pathname.startsWith('/dashboard/client/commissions');

      // Until onboarding is complete only the wizard, network and commissions pages are accessible
      if (!onboardingData.isComplete && !isOnboardingPage && !isNetworkPage && !isCommissionsPage) {
        router.push('/dashboard/client/onboarding');
        return;
      }

      // Once complete, the wizard redirects back to the dashboard
      if (onboardingData.isComplete && isOnboardingPage) {
        router.push('/dashboard/client');
        return;
      }
    }
  }, [authLoading, isAuthenticated, onboardingData, pathname, router]);

  if (authLoading || onboardingLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-border border-t-primary animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">Please log in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <Sidebar
        isAdmin={false}
        isOnboardingLocked={!onboardingData?.isComplete}
      />
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isAdmin={false}
        isOnboardingLocked={!onboardingData?.isComplete}
      />
      <Navbar
        onMenuClick={() => setMobileMenuOpen(true)}
        isAdmin={false}
      />

      {/* Main Content */}
      <main className="min-h-screen pt-16 pb-20 lg:pb-0 lg:pl-64">
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      <MobileBottomNav isAdmin={false} />
    </div>
  );
}
