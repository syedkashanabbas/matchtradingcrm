'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  LayoutDashboard,
  Bell,
  User,
  Shield,
  LogOut,
  CreditCard,
  TrendingUp,
  Zap,
  Users,
  Rocket,
  Globe,
  Coins,
  Settings,
  Trophy,
} from 'lucide-react';
import { useLogout } from '@/lib/hooks';
import { useOnboardingStatus } from '@/lib/use-onboarding-status';
import { useAuthContext } from '@/lib/auth-context';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  isOnboardingLocked?: boolean;
}

export type { MobileDrawerProps };

export function MobileDrawer({ isOpen, onClose, isAdmin = false, isOnboardingLocked = false }: MobileDrawerProps) {
  const pathname = usePathname();
  const { logout } = useLogout();
  const { user } = useAuthContext();
  const { onboardingData, isLoading } = useOnboardingStatus();

  const onboardingComplete = onboardingData?.isComplete ?? false;

  const sections = isAdmin
    ? [
        {
          label: 'Overview',
          items: [
            { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
            { label: 'Users', href: '/dashboard/admin/users', icon: Shield },
          ],
        },
        {
          label: 'Trading',
          items: [
            { label: 'Brokers', href: '/dashboard/admin/brokers', icon: TrendingUp },
            { label: 'Prop Firms', href: '/dashboard/admin/prop-firms', icon: Zap },
          ],
        },
        {
          label: 'Revenue',
          items: [
            { label: 'Subscriptions', href: '/dashboard/admin/subscriptions', icon: CreditCard },
            { label: 'Network', href: '/dashboard/admin/network', icon: Users },
            { label: 'Commissions', href: '/dashboard/admin/commissions', icon: Coins },
            { label: 'Programs', href: '/dashboard/admin/programs', icon: Trophy },
          ],
        },
        {
          label: 'Account',
          items: [{ label: 'Profile', href: '/dashboard/admin/profile', icon: User }],
        },
      ]
    : [
        {
          label: 'Overview',
          items: [
            { label: 'Dashboard', href: '/dashboard/client', icon: LayoutDashboard },
            ...(!onboardingComplete
              ? [{ label: 'Onboarding', href: '/dashboard/client/onboarding', icon: Rocket }]
              : []),
            { label: 'Notifications', href: '/dashboard/client/notifications', icon: Bell },
          ],
        },
        {
          label: 'Grow',
          items: [
            { label: 'Network', href: '/dashboard/client/network', icon: Globe },
            { label: 'Commissions', href: '/dashboard/client/commissions', icon: Coins },
          ],
        },
        {
          label: 'Account',
          items: [
            { label: 'Profile', href: '/dashboard/client/profile', icon: User },
            { label: 'Settings', href: '/dashboard/settings/account', icon: Settings },
          ],
        },
      ];

  const isActive = (href: string) => {
    if (href === '/dashboard/admin' || href === '/dashboard/client') {
      return pathname === href;
    }
    if (href === '/dashboard/settings/account') {
      return pathname.startsWith('/dashboard/settings');
    }
    return pathname.startsWith(href);
  };

  const isItemLocked = (href: string) => {
    if (isAdmin || isLoading || !onboardingData) return false;
    if (onboardingData.isComplete) return false;
    return (
      href !== '/dashboard/client/onboarding' &&
      href !== '/dashboard/client/network' &&
      href !== '/dashboard/client/commissions'
    );
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <Link
            href={isAdmin ? '/dashboard/admin' : '/dashboard/client'}
            className="flex items-center gap-2.5"
            onClick={onClose}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-black/30">
              <span className="text-sm font-bold text-white">E</span>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">EIDOS</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {sections.map(section => (
            <div key={section.label} className="mb-6 last:mb-0">
              <p className="mb-2 px-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const locked = isItemLocked(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={e => {
                        if (locked) {
                          e.preventDefault();
                          return;
                        }
                        onClose();
                      }}
                      className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-sidebar-primary/15 text-white'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
                      } ${locked ? 'opacity-25 pointer-events-none cursor-not-allowed' : ''}`}
                    >
                      <span
                        aria-hidden
                        className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-opacity duration-200 ${
                          active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-sidebar-primary' : ''}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User card + logout */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/60 p-3">
            <UserAvatar src={user?.avatar} name={user?.name || 'User'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs text-sidebar-foreground/70">{user?.email}</p>
            </div>
            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="rounded-lg p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-white"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
