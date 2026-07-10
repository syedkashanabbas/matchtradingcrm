'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Globe, Coins, User, Shield } from 'lucide-react';

/**
 * App-like bottom tab bar, mobile only. The four destinations people reach
 * for daily; everything else stays in the drawer.
 */
export function MobileBottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const tabs = isAdmin
    ? [
        { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
        { label: 'Users', href: '/dashboard/admin/users', icon: Shield },
        { label: 'Commissions', href: '/dashboard/admin/commissions', icon: Coins },
        { label: 'Profile', href: '/dashboard/admin/profile', icon: User },
      ]
    : [
        { label: 'Dashboard', href: '/dashboard/client', icon: LayoutDashboard },
        { label: 'Network', href: '/dashboard/client/network', icon: Globe },
        { label: 'Commissions', href: '/dashboard/client/commissions', icon: Coins },
        { label: 'Profile', href: '/dashboard/client/profile', icon: User },
      ];

  const isActive = (href: string) => {
    if (href === '/dashboard/admin' || href === '/dashboard/client') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Primary"
    >
      <div className="grid grid-cols-4">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-0 h-0.5 w-8 rounded-b-full bg-primary transition-opacity duration-200 ${
                  active ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
