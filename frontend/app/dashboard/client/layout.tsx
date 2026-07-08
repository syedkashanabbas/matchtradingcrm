'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/lib/auth-context';
import { useOnboardingStatus } from '@/lib/use-onboarding-status';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { OnboardingBanner } from '@/components/onboarding/OnboardingBanner';
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
      
      // CRITICAL: Dashboard access should ONLY depend on backend status
      // If status is NOT "active", user should NOT access full dashboard
      const isStatusActive = typeof onboardingData.progress === 'string' 
        ? onboardingData.progress === 'active' 
        : onboardingData.progress === 1; // fallback for number type
      
      // If onboarding is NOT complete and user is NOT on onboarding or network page
      if (!isStatusActive && !isOnboardingPage && !isNetworkPage) {
        router.push('/dashboard/client/onboarding');
        return;
      }

      // If onboarding IS complete (status is "active") and user IS on onboarding page
      if (isStatusActive && isOnboardingPage) {
        router.push('/dashboard/client');
        return;
      }
    }
  }, [authLoading, isAuthenticated, onboardingData, pathname, router]);

  // Check if user status is "review" - show onboarding banner
  const userProgress = onboardingData?.progress;
  const isUserInReview = typeof userProgress === 'string' && userProgress === 'review';
  
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

  // Show onboarding banner when user is in review status
  if (isUserInReview) {
    return <OnboardingBanner />;
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
      <main className="min-h-screen pt-16 lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
