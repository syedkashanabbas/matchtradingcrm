'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileDrawer } from './MobileDrawer';
import { MobileBottomNav } from './MobileBottomNav';
import { useAuth } from '@/lib/hooks';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-border border-t-primary animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
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
      <Sidebar isAdmin={true} />
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isAdmin={true}
      />
      <Navbar
        onMenuClick={() => setMobileMenuOpen(true)}
        isAdmin={true}
      />

      {/* Main Content */}
      <main className="min-h-screen pt-16 pb-20 lg:pb-0 lg:pl-64">
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      <MobileBottomNav isAdmin={true} />
    </div>
  );
}
