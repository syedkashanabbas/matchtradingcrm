'use client';

import { ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '@/lib/hooks';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Decorative brand glow */}
      <div aria-hidden className="pointer-events-none absolute -top-48 left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-52 -right-28 h-80 w-80 rounded-full bg-brand-gradient opacity-[0.07] blur-3xl" />

      {/* Theme Toggle */}
      <button
        onClick={toggle}
        className="fixed right-6 top-6 rounded-xl border border-border/80 bg-card p-2.5 text-muted-foreground elevation-1 transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun className="h-[18px] w-[18px]" />
        ) : (
          <Moon className="h-[18px] w-[18px]" />
        )}
      </button>

      {/* Auth Form Container */}
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="mb-8 text-center animate-fade-in-up">
          <div className="mb-5 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-lg shadow-primary/25">
              <span className="font-display text-xl font-bold text-white">E</span>
            </div>
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Form */}
        <div className="relative rounded-2xl border border-border/80 bg-card/95 p-8 backdrop-blur-sm elevation-1 animate-fade-in-up stagger-1">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground animate-fade-in-up stagger-2">
          Part of the EIDOS ecosystem
        </p>
      </div>
    </div>
  );
}
