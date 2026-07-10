'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, AlertTriangle, PauseCircle, Server } from 'lucide-react';
import { apiClient, type ProvisioningStatus } from '@/lib/api';

const STEP_LABELS: Record<string, string> = {
  PENDING: 'Setup queued',
  KEY_CREATED: 'Access configured',
  PROP_ACCOUNT_CREATED: 'Prop account connected',
  BROKER_ACCOUNT_CREATED: 'Broker account connected',
  COMPLETED: 'Hedge setup active',
};

/**
 * Client dashboard "Service status" card (spec §5.7):
 * Setup in progress (with current step) / Active / Error - contact support.
 */
export function ServiceStatusCard() {
  const [status, setStatus] = useState<ProvisioningStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await apiClient.getProvisioningStatus();
      setStatus(response.data ?? null);
    } catch (error) {
      console.error('Failed to load provisioning status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // While setup is in progress, poll for updates
  useEffect(() => {
    if (status?.status !== 'IN_PROGRESS') return;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [status?.status, load]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-32 animate-pulse" />
      </Card>
    );
  }

  if (!status || status.status === 'NOT_STARTED') {
    return null; // nothing to show until onboarding triggers provisioning
  }

  return (
    <Card
      className={`animate-fade-in-up ${
        status.status === 'ACTIVE'
          ? 'border-success/25'
          : status.status === 'ERROR'
            ? 'border-destructive/25'
            : ''
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Server className="h-[18px] w-[18px]" />
          </div>
          <CardTitle className="font-display text-lg">Service Status</CardTitle>
        </div>
        {status.status === 'ACTIVE' && status.hedgeStatus === 'active' && (
          <Badge className="border-success/25 bg-success/15 text-success">Active</Badge>
        )}
        {status.status === 'ACTIVE' && status.hedgeStatus === 'paused' && (
          <Badge className="border-warning/25 bg-warning/15 text-warning">Suspended</Badge>
        )}
        {status.status === 'IN_PROGRESS' && (
          <Badge className="border-primary/20 bg-primary/10 text-primary">Setup in progress</Badge>
        )}
        {status.status === 'ERROR' && (
          <Badge className="border-destructive/20 bg-destructive/10 text-destructive">
            Attention needed
          </Badge>
        )}
        {status.status === 'DECOMMISSIONED' && <Badge variant="secondary">Deactivated</Badge>}
      </CardHeader>
      <CardContent>
        {status.status === 'IN_PROGRESS' && (
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                We&apos;re setting up your trading service
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {STEP_LABELS[status.completedSteps[status.completedSteps.length - 1] ?? 'PENDING'] ??
                  'Setup queued'}
                {' — '}this usually completes within a couple of minutes.
              </p>
            </div>
          </div>
        )}

        {status.status === 'ACTIVE' && status.hedgeStatus === 'active' && (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Your hedge setup is active
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Both MT5 accounts are connected and managed automatically.
              </p>
            </div>
          </div>
        )}

        {status.status === 'ACTIVE' && status.hedgeStatus === 'paused' && (
          <div className="flex items-start gap-3">
            <PauseCircle className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <p className="text-sm font-medium text-foreground">Your service is suspended</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This usually happens when a payment is overdue. Renew your subscription to
                reactivate the service automatically.
              </p>
            </div>
          </div>
        )}

        {status.status === 'ERROR' && (
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">
                We hit a problem while setting up your service
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Our team has been notified and is on it. If this persists, please contact support.
              </p>
            </div>
          </div>
        )}

        {status.status === 'DECOMMISSIONED' && (
          <p className="text-sm text-muted-foreground">
            Your service has been deactivated. Contact support if you&apos;d like to restart it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
