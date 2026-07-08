'use client';

import { Bell, Moon, Sun, Menu } from 'lucide-react';
import { useState } from 'react';
import { useDarkMode, useNotifications, useLogout } from '@/lib/hooks';
import { useAuthContext } from '@/lib/auth-context';
import { UserAvatar } from '@/components/shared/UserAvatar';
import Link from 'next/link';

interface NavbarProps {
  onMenuClick?: () => void;
  isAdmin?: boolean;
}

export function Navbar({ onMenuClick, isAdmin = false }: NavbarProps) {
  const { isDark, toggle } = useDarkMode();
  const { unreadCount, notifications } = useNotifications();
  const { user } = useAuthContext();
  const { logout } = useLogout();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <>
      <nav className="fixed top-0 right-0 left-0  z-30 border-b border-border bg-card/80 backdrop-blur-sm lg:left-306">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={onMenuClick}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-semibold">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggle}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-lg p-2 hover:bg-muted transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">
                    Recent Notifications
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className="p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notif.description}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={
                      isAdmin ? "/admin" : "/dashboard/client/notifications"
                    }
                    className="mt-3 block text-center text-xs text-primary hover:underline"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                aria-label="User menu"
              >
                <UserAvatar
                  src={user?.avatar}
                  name={user?.name || "User"}
                  size="sm"
                />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  <div className="border-b border-border p-4">
                    <p className="font-semibold text-sm text-foreground">
                      {user?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                  <div className="p-2 space-y-1">
                    {!isAdmin && (
                      <Link
                        href="/dashboard/client/profile"
                        className="block px-4 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Profile Settings
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={async () => {
                        setShowUserMenu(false);
                        await logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
