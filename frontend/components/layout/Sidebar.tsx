'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bell,
  User,
  Shield,
  LogOut,
  Settings,
  ChevronDown,
  CreditCard,
  TrendingUp,
  Zap,
  Rocket,
  Globe,
  Users,
  Coins,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';
import { useLogout } from '@/lib/hooks';
import { useOnboardingStatus } from '@/lib/use-onboarding-status';
import { useAuthContext } from '@/lib/auth-context';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface SidebarProps {
  isAdmin?: boolean;
  isOnboardingLocked?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  submenu?: Array<{ label: string; href: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function Sidebar({ isAdmin = false, isOnboardingLocked = false }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useLogout();
  const { user } = useAuthContext();
  const [settingsOpen, setSettingsOpen] = useState(pathname.includes('/settings'));
  const { onboardingData, isLoading } = useOnboardingStatus();

  const onboardingComplete = onboardingData?.isComplete ?? false;

  const sections: NavSection[] = isAdmin
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
            {
              label: 'Settings',
              href: '#',
              icon: Settings,
              submenu: [
                { label: 'Account', href: '/dashboard/settings/account' },
                { label: 'Subscription', href: '/dashboard/settings/subscription' },
                { label: 'Broker', href: '/dashboard/settings/broker' },
                { label: 'Prop Firm', href: '/dashboard/settings/prop-firm' },
              ],
            },
          ],
        },
      ];

  const isActive = (href: string) => {
    // Root dashboards match exactly - they must not stay highlighted on subpages
    if (href === '/dashboard/admin' || href === '/dashboard/client') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isItemLocked = (href: string) => {
    if (isAdmin || user?.role === 'ADMIN') return false;
    if (isLoading || !onboardingData) return false;
    if (onboardingData.isComplete) return false;

    // Only onboarding, network and commissions are accessible while onboarding is incomplete
    return (
      href !== '/dashboard/client/onboarding' &&
      href !== '/dashboard/client/network' &&
      href !== '/dashboard/client/commissions'
    );
  };

  const linkClasses = (active: boolean, locked: boolean) =>
    `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
      active
        ? 'bg-sidebar-primary/15 text-white'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
    } ${locked ? 'opacity-25 pointer-events-none cursor-not-allowed' : ''}`;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Link
          href={isAdmin ? '/dashboard/admin' : '/dashboard/client'}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-black/30">
            <span className="text-sm font-bold text-white">E</span>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-white">EIDOS</span>
          {isAdmin && (
            <span className="ml-1 rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground">
              Admin
            </span>
          )}
        </Link>
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

                if (item.submenu) {
                  const settingsActive = pathname.includes('/settings');
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => !locked && setSettingsOpen(!settingsOpen)}
                        className={`${linkClasses(settingsActive, locked)} w-full`}
                      >
                        <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                        <span>{item.label}</span>
                        <ChevronDown
                          className={`ml-auto h-4 w-4 opacity-60 transition-transform duration-200 ${
                            settingsOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {settingsOpen && (
                        <div className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                          {item.submenu.map(subitem => (
                            <Link
                              key={subitem.href}
                              href={subitem.href}
                              onClick={e => locked && e.preventDefault()}
                              className={`block rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${
                                pathname === subitem.href
                                  ? 'bg-sidebar-primary/15 text-white'
                                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'
                              } ${locked ? 'opacity-25 pointer-events-none' : ''}`}
                            >
                              {subitem.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={e => locked && e.preventDefault()}
                    className={linkClasses(active, locked)}
                  >
                    {/* Active indicator */}
                    <span
                      aria-hidden
                      className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-opacity duration-200 ${
                        active ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <Icon
                      className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${
                        active ? 'text-sidebar-primary' : ''
                      }`}
                    />
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
            }}
            className="rounded-lg p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-white"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
