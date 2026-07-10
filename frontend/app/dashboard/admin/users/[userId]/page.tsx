'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  RefreshCw,
  RotateCcw,
  Play,
  Pause,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Server,
  User as UserIcon,
  CreditCard,
  KeyRound,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface UserDetail {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    country: string | null;
    status: string;
    onboardingProgress: string;
    referralCode: string | null;
    createdAt: string;
  };
  subscription: { plan: string; status: string; currentPeriodEnd: string } | null;
  brokerAccounts: Array<{
    id: string;
    brokerName: string;
    mt5AccountNumber: string;
    mt5Server: string;
    status: string;
    archivedAt: string | null;
    epAccountId: string | null;
    createdAt: string;
  }>;
  propAccounts: Array<{
    id: string;
    firmName: string;
    mt5AccountNumber: string;
    mt5Server: string;
    phase: string;
    status: string;
    isActive: boolean;
    archivedAt: string | null;
    epAccountId: string | null;
    createdAt: string;
  }>;
  provision: {
    status: string;
    failedStep: string | null;
    lastError: string | null;
    attemptCount: number;
    nextRetryAt: string | null;
    updatedAt: string;
  } | null;
  hedge: { status: string } | null;
}

interface TimelineEvent {
  id: string;
  action: string;
  details: any;
  timestamp: string;
  severity: string;
}

const provisionBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <Badge className="bg-success/15 text-success border-success/25">Completed</Badge>;
    case 'FAILED':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Failed</Badge>;
    case 'DECOMMISSIONED':
      return <Badge variant="secondary">Decommissioned</Badge>;
    case 'NOT_STARTED':
      return <Badge variant="outline">Not started</Badge>;
    default:
      return <Badge className="bg-primary/10 text-primary border-primary/20">{status}</Badge>;
  }
};

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revealed, setRevealed] = useState<Record<string, any>>({});
  const [deleteConfirmStage, setDeleteConfirmStage] = useState(0);

  const load = useCallback(async () => {
    try {
      const [detailRes, provisionRes, serviceRes] = await Promise.all([
        apiClient.getAdminUserDetail(userId),
        apiClient.adminProvisionDetail(userId).catch(() => null),
        apiClient.adminServiceStatus(userId).catch(() => null),
      ]);
      setDetail((detailRes.data ?? null) as UserDetail | null);
      setTimeline(((provisionRes?.data as any)?.timeline ?? []) as TimelineEvent[]);
      setServiceStatus((serviceRes?.data as any) ?? null);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load user' });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (name: string, fn: () => Promise<any>, successText: string) => {
    setActionLoading(name);
    setMessage(null);
    try {
      await fn();
      setMessage({ type: 'success', text: successText });
      await load();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || `${name} failed` });
    } finally {
      setActionLoading(null);
    }
  };

  const reveal = async (accountType: 'broker' | 'prop', accountId: string) => {
    const key = `${accountType}:${accountId}`;
    if (revealed[key]) {
      setRevealed(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setActionLoading(key);
    try {
      const response = await apiClient.adminRevealCredentials(userId, accountType, accountId);
      setRevealed(prev => ({ ...prev, [key]: response.data }));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Reveal failed' });
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
        User not found.
      </div>
    );
  }

  const { user, subscription, brokerAccounts, propAccounts, provision, hedge } = detail;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-muted-foreground mt-1">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Basic info + subscription */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{user.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Onboarding</p>
              <p className="font-medium">{user.onboardingProgress}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{user.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Country</p>
              <p className="font-medium">{user.country ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Referral code</p>
              <p className="font-medium font-mono">{user.referralCode ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Registered</p>
              <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Subscription</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <p className="font-medium">{subscription.plan}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{subscription.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Period end</p>
                  <p className="font-medium">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provisioning */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">EasierProp Provisioning</CardTitle>
            {provisionBadge(provision?.status ?? 'NOT_STARTED')}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!provision || actionLoading !== null}
              onClick={() =>
                runAction('retry', () => apiClient.adminRetryProvision(userId), 'Retry scheduled')
              }
            >
              {actionLoading === 'retry' ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!provision || actionLoading !== null}
              onClick={() =>
                runAction('reprovision', () => apiClient.adminReprovision(userId), 'Reprovision scheduled')
              }
            >
              {actionLoading === 'reprovision' ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1" />
              )}
              Reprovision
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {provision?.lastError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200 text-sm">
              <p className="font-medium">
                Failed at step: {provision.failedStep ?? 'unknown'} (attempt {provision.attemptCount})
              </p>
              <p className="mt-1 font-mono text-xs break-all">{provision.lastError}</p>
            </div>
          )}

          {timeline.length > 0 ? (
            <ol className="relative border-l border-border ml-2 space-y-4">
              {timeline.map(event => (
                <li key={event.id} className="ml-4">
                  <div
                    className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border ${
                      event.action.includes('FAILED')
                        ? 'bg-red-500 border-red-500'
                        : event.action.includes('COMPLETED')
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'bg-primary border-primary'
                    }`}
                  />
                  <p className="text-sm font-medium text-foreground">
                    {event.action.replace(/^PROVISIONING_/, '').replaceAll('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                    {event.details?.error ? ` — ${event.details.error}` : ''}
                    {event.details?.step ? ` (step: ${event.details.step})` : ''}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No provisioning events yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Service control */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Service Control</CardTitle>
            {hedge && (
              <Badge
                className={
                  hedge.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                    : hedge.status === 'paused'
                      ? 'bg-amber-500/15 text-amber-600 border-amber-500/20'
                      : ''
                }
                variant={hedge.status === 'archived' ? 'secondary' : undefined}
              >
                {hedge.status}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={actionLoading !== null || !hedge}
              onClick={() =>
                runAction('start', () => apiClient.adminServiceStart(userId), 'Start operation queued')
              }
            >
              <Play className="h-4 w-4 mr-1" /> Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading !== null || !hedge}
              onClick={() =>
                runAction('stop', () => apiClient.adminServiceStop(userId), 'Stop operation queued')
              }
            >
              <Pause className="h-4 w-4 mr-1" /> Suspend
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={actionLoading !== null || !hedge}
              onClick={() => setDeleteConfirmStage(1)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Live session state */}
          {serviceStatus?.sessions?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {serviceStatus.sessions.map((session: any) => (
                <div
                  key={session.accountId}
                  className="flex items-center justify-between p-3 rounded-lg border border-border text-sm"
                >
                  <span className="font-medium capitalize">{session.kind} account</span>
                  {session.connected === null ? (
                    <Badge variant="secondary">Unknown</Badge>
                  ) : session.connected ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">Connected</Badge>
                  ) : (
                    <Badge variant="secondary">Disconnected</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No live session data (service not provisioned).</p>
          )}

          {/* Recent commands */}
          {serviceStatus?.recentCommands?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Recent operations</p>
              <div className="space-y-1">
                {serviceStatus.recentCommands.slice(0, 5).map((command: any) => (
                  <div key={command.id} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {command.type} — {new Date(command.createdAt).toLocaleString()}
                    </span>
                    <span
                      className={
                        command.status === 'COMPLETED'
                          ? 'text-emerald-600'
                          : command.status === 'FAILED'
                            ? 'text-red-600'
                            : ''
                      }
                    >
                      {command.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credentials (masked; reveal is audited) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">MT5 Credentials</CardTitle>
            <span className="text-xs text-muted-foreground">every reveal is audit-logged</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...propAccounts.map(account => ({ kind: 'prop' as const, account })),
            ...brokerAccounts.map(account => ({ kind: 'broker' as const, account }))].map(
            ({ kind, account }) => {
              const key = `${kind}:${account.id}`;
              const revealedData = revealed[key];
              const name = kind === 'prop' ? (account as any).firmName : (account as any).brokerName;
              const isArchived = kind === 'prop' ? !(account as any).isActive : !!account.archivedAt;
              return (
                <div key={key} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">
                        {kind === 'prop' ? 'Prop' : 'Broker'}: {name}
                      </span>
                      <span className="text-muted-foreground">#{account.mt5AccountNumber}</span>
                      <span className="text-muted-foreground">{account.mt5Server}</span>
                      {kind === 'prop' && <Badge variant="outline">{(account as any).phase}</Badge>}
                      {isArchived && <Badge variant="secondary">Archived</Badge>}
                      {account.epAccountId && (
                        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/20">On EasierProp</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={actionLoading === key}
                      onClick={() => reveal(kind, account.id)}
                    >
                      {actionLoading === key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : revealedData ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" /> Reveal
                        </>
                      )}
                    </Button>
                  </div>
                  {revealedData && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-mono bg-muted/50 rounded p-2">
                      <span>Password: {revealedData.mt5Password ?? '—'}</span>
                      {revealedData.brokerPortalPassword && (
                        <span>Portal: {revealedData.brokerPortalPassword}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}
          {propAccounts.length === 0 && brokerAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground">No MT5 accounts saved yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Delete double-confirmation modal (spec §5.5) */}
      {deleteConfirmStage > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-semibold">
                {deleteConfirmStage === 1 ? 'Delete service on EasierProp?' : 'Are you absolutely sure?'}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {deleteConfirmStage === 1
                ? 'This permanently removes both MT5 accounts on EasierProp and disconnects active sessions. CRM data and history are kept.'
                : `This action cannot be undone. The service for ${user.firstName} ${user.lastName} will be removed from EasierProp.`}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmStage(0)}>
                Cancel
              </Button>
              {deleteConfirmStage === 1 ? (
                <Button variant="destructive" onClick={() => setDeleteConfirmStage(2)}>
                  Continue
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  disabled={actionLoading !== null}
                  onClick={() => {
                    setDeleteConfirmStage(0);
                    runAction('delete', () => apiClient.adminServiceDelete(userId), 'Delete operation queued');
                  }}
                >
                  {actionLoading === 'delete' ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Delete permanently
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
