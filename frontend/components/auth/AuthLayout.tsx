'use client';

import { ReactNode } from 'react';
import { useDarkMode } from '@/lib/hooks';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center px-4 py-12">
      {/* Theme Toggle */}
      <button
        onClick={toggle}
        className="fixed top-6 right-6 rounded-lg border border-border bg-card p-2.5 hover:bg-muted transition-colors"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.536a1 1 0 10-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zm2.121-10.364a1 1 0 10-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zm-10.606 0a1 1 0 10-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zm10.606 10.364a1 1 0 10-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM3 11a1 1 0 110-2H2a1 1 0 011 1v1zm18 0a1 1 0 110-2h1a1 1 0 011 1v1z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      {/* Auth Form Container */}
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
              <span className="text-lg font-bold text-white">MT</span>
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft-lg">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Part of the MatchTrading ecosystem
        </p>
      </div>
    </div>
  );
}
