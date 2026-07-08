'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LayoutDashboard, Key, Bell, User, Shield, LogOut, CreditCard, Server, TrendingUp, Zap, Users, Rocket, Globe, Settings } from 'lucide-react';
import { useLogout } from '@/lib/hooks';
import { useOnboardingStatus } from '@/lib/use-onboarding-status';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  isOnboardingLocked?: boolean;
}

// Export the interface to ensure TypeScript recognizes it
export type { MobileDrawerProps };

export function MobileDrawer({ isOpen, onClose, isAdmin = false, isOnboardingLocked = false }: MobileDrawerProps) {
  const pathname = usePathname();
  const { logout } = useLogout();
  const { onboardingData, isLoading } = useOnboardingStatus();

  const menuItems = isAdmin
    ? [
        {
          label: 'Dashboard',
          href: '/dashboard/admin',
          icon: LayoutDashboard,
        },
        {
          label: 'Users',
          href: '/dashboard/admin/users',
          icon: Shield,
        },
        {
          label: 'Subscriptions',
          href: '/dashboard/admin/subscriptions',
          icon: CreditCard,
        },
        {
          label: 'VPS',
          href: '/dashboard/admin/vps',
          icon: Server,
        },
        {
          label: 'Brokers',
          href: '/dashboard/admin/brokers',
          icon: TrendingUp,
        },
        {
          label: 'Prop Firms',
          href: '/dashboard/admin/prop-firms',
          icon: Zap,
        },
        {
          label: 'Network',
          href: '/dashboard/admin/network',
          icon: Users,
        },
        {
          label: 'API Keys',
          href: '/dashboard/admin/api-keys',
          icon: Key,
        },
      ]
    : [
        {
          label: 'Dashboard',
          href: '/dashboard/client',
          icon: LayoutDashboard,
        },
        {
          label: 'Onboarding',
          href: '/dashboard/client/onboarding',
          icon: Rocket,
        },
        {
          label: 'Network',
          href: '/dashboard/client/network',
          icon: Globe,
        },
        {
          label: 'API Keys',
          href: '/dashboard/client/api-keys',
          icon: Key,
        },
        {
          label: 'Profile',
          href: '/dashboard/client/profile',
          icon: User,
        },
        {
          label: 'Notifications',
          href: '/dashboard/client/notifications',
          icon: Bell,
        },
      ];

  const isActive = (href: string) => {
    if (href === '/' || href === '/dashboard/admin' || href === '/dashboard/client') {
      return pathname === href || pathname.startsWith(href + '/');
    }
    return pathname.startsWith(href);
  };

  const isItemLocked = (href: string) => {
    if (isAdmin || isLoading || !onboardingData) return false;
    if (onboardingData.isComplete) return false;
    // Only onboarding and network items are accessible when onboarding is not complete
    return href !== '/dashboard/client/onboarding' && href !== '/dashboard/client/network';
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-sidebar transition-transform duration-300 ease-out lg:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Fixed Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 flex-shrink-0">
          <Link href={isAdmin ? '/dashboard/admin' : '/dashboard/client'} className="flex items-center gap-2" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
              <span className="text-sm font-bold text-white">MT</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">MatchTrading</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-sidebar-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-sidebar-foreground" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                } ${
                  isItemLocked(item.href)
                    ? 'opacity-25 blur-sm pointer-events-none cursor-not-allowed'
                    : ''
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Fixed Footer */}
        <div className="border-t border-sidebar-border p-4 flex-shrink-0">
          <button
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
