'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserPlus, TrendingUp, ShieldCheck, Coins } from 'lucide-react';
import { apiClient } from '@/lib/api';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  const [inviter, setInviter] = useState<{ fullName: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // No referral code: go straight to registration
    if (!refCode) {
      router.replace('/register');
      return;
    }

    localStorage.setItem('refCode', refCode);

    apiClient
      .getInviterInfo(refCode)
      .then(response => {
        const data = (response.data ?? response) as any;
        if (data?.fullName) setInviter({ fullName: data.fullName });
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [refCode, router]);

  if (!refCode || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="space-y-6 rounded-3xl border border-border/80 bg-card/95 p-8 elevation-2 backdrop-blur-sm animate-fade-in-up">
          {/* Brand */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
              <span className="text-lg font-bold text-white">E</span>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">EIDOS</span>
          </div>

          {/* Invitation */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {inviter ? `${inviter.fullName} invited you` : "You've been invited"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Join EIDOS and get your automated trading setup: we connect your prop firm and broker
              accounts and manage the hedge configuration for you.
            </p>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Automated hedge setup</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <ShieldCheck className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Credentials stored encrypted</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <Coins className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Earn by referring</p>
            </div>
          </div>

          {/* Referral code */}
          <div className="text-center text-sm text-muted-foreground">
            Your invitation code:{' '}
            <code className="bg-muted px-2 py-0.5 rounded font-mono text-foreground">{refCode}</code>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => router.push(`/register?ref=${encodeURIComponent(refCode)}`)}
            >
              Create your account
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
