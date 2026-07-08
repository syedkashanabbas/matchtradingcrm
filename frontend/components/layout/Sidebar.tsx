'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Key, Bell, User, Shield, LogOut, ChevronLeft, Settings, ChevronDown, CreditCard, Server, TrendingUp, Zap, Rocket, Globe, Users } from 'lucide-react';
import { useState } from 'react';
import { useLogout } from '@/lib/hooks';
import { useOnboardingStatus } from '@/lib/use-onboarding-status';
import { useAuthContext } from '@/lib/auth-context';

interface SidebarProps {
  isAdmin?: boolean;
  isOnboardingLocked?: boolean;
}

export function Sidebar({ isAdmin = false, isOnboardingLocked = false }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useLogout();
  const { user } = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
        {
          label: 'Profile',
          href: '/dashboard/admin/profile',
          icon: User,
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
          label: 'Settings',
          href: '#',
          icon: Settings,
          submenu: [
            { label: 'Account', href: '/dashboard/settings/account' },
            { label: 'Subscription', href: '/dashboard/settings/subscription' },
            { label: 'VPS', href: '/dashboard/settings/vps' },
            { label: 'Broker', href: '/dashboard/settings/broker' },
            { label: 'Prop Firm', href: '/dashboard/settings/prop-firm' },
            { label: 'API Key', href: '/dashboard/settings/api-key' },
          ],
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
    if (href === '/dashboard/client/onboarding') {
      return pathname.startsWith('/dashboard/client/onboarding');
    }
    if (href === '/dashboard/client/api-keys') {
      return pathname.startsWith('/dashboard/client/api-keys');
    }
    return pathname.startsWith(href);
  };

  const isItemLocked = (href: string) => {
    if (isAdmin || user?.role === 'ADMIN') return false;
    if (isLoading || !onboardingData) return false;
    if (onboardingData.isComplete) return false;
    
    // Check if user status is "review" (from backend progress)
    const userProgress = onboardingData.progress;
    const isUserInReview = typeof userProgress === 'string' && userProgress === 'review';
    
    // Debug logging
    console.log('Sidebar Debug:', {
      userProgress,
      isUserInReview,
      href,
      shouldLock: isUserInReview ? (href !== '/dashboard/client/onboarding' && href !== '/dashboard/client/network') : (href !== '/dashboard/client/onboarding' && href !== '/dashboard/client/network')
    });
    
    // If user is in review status, lock everything except onboarding and network
    if (isUserInReview) {
      return href !== '/dashboard/client/onboarding' && href !== '/dashboard/client/network';
    }
    
    // Only onboarding and network items are accessible when onboarding is not complete
    return href !== '/dashboard/client/onboarding' && href !== '/dashboard/client/network';
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300 ease-out ${
        isCollapsed ? 'w-20' : 'w-64'
      } lg:block hidden`}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!isCollapsed && (
          <Link href={isAdmin ? '/dashboard/admin' : '/dashboard/client'} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
              <span className="text-sm font-bold text-white">MT</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">MatchTrading</span>
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-lg p-1.5 hover:bg-sidebar-accent transition-colors"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            className={`h-5 w-5 text-sidebar-foreground transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <nav className="space-y-2 overflow-y-auto p-4">
        {menuItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const hasSubmenu = 'submenu' in item;

          if (hasSubmenu) {
            const isLocked = isItemLocked(item.href);
            return (
              <div key={item.label}>
                <button
                  onClick={() => !isCollapsed && !isLocked && setSettingsOpen(!settingsOpen)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    settingsOpen || pathname.includes('/settings')
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  } ${
                    isLocked
                      ? 'opacity-25 blur-sm pointer-events-none cursor-not-allowed'
                      : ''
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span>{item.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 ml-auto transition-transform ${
                          settingsOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </>
                  )}
                </button>
                {!isCollapsed && settingsOpen && item.submenu && (
                  <div className="ml-2 mt-1 space-y-1">
                    {item.submenu.map(subitem => (
                      <Link
                        key={subitem.href}
                        href={subitem.href}
                        className={`flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                          pathname === subitem.href
                            ? 'bg-sidebar-primary/80 text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent'
                        } ${
                          isLocked
                            ? 'opacity-25 blur-sm pointer-events-none cursor-not-allowed'
                            : ''
                        }`}
                        onClick={(e) => {
                          if (isLocked) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
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
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              } ${
                isItemLocked(item.href)
                  ? 'opacity-25 blur-sm pointer-events-none cursor-not-allowed'
                  : ''
              }`}
              title={isCollapsed ? item.label : undefined}
              onClick={(e) => {
                if (isItemLocked(item.href)) {
                  e.preventDefault();
                }
              }}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4">
        <button
          onClick={async () => {
            await logout();
          }}
          className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
