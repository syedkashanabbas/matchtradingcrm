'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import {
  TrendingUp,
  History,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Crosshair,
  Landmark,
} from 'lucide-react';
import { apiClient, type ProvisioningStatus } from '@/lib/api';

interface BrokerAccount {
  id: string;
  brokerName: string;
  mt5AccountNumber: string;
  mt5Server: string;
  status: string;
  archivedAt: string | null;
  epAccountId?: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  brokerName: '',
  mt5AccountNumber: '',
  mt5Password: '',
  mt5Server: '',
  brokerPortalPassword: '',
};

export default function BrokerSettingsPage() {
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [provisioning, setProvisioning] = useState<ProvisioningStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formMode, setFormMode] = useState<'add' | { replaceId: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hedgeSaving, setHedgeSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const [brokersRes, provRes] = await Promise.all([
        apiClient.getBrokerList(),
        apiClient.getProvisioningStatus().catch(() => null),
      ]);
      const list = (Array.isArray(brokersRes) ? brokersRes : (brokersRes.data ?? [])) as BrokerAccount[];
      setAccounts(list);
      setProvisioning((provRes?.data as ProvisioningStatus) ?? null);
    } catch (error) {
      console.error('Failed to load broker accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = accounts.filter(account => !account.archivedAt);
  const history = accounts.filter(account => !!account.archivedAt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!form.brokerName || !form.mt5AccountNumber || !form.mt5Password || !form.mt5Server) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        brokerName: form.brokerName,
        mt5AccountNumber: form.mt5AccountNumber,
        mt5Password: form.mt5Password,
        mt5Server: form.mt5Server,
        brokerPortalPassword: form.brokerPortalPassword || undefined,
      };

      if (formMode === 'add') {
        await apiClient.createBroker(payload);
        setMessage({ type: 'success', text: 'Broker added. It will be registered on the trading platform shortly.' });
      } else if (formMode && 'replaceId' in formMode) {
        await apiClient.replaceBroker(formMode.replaceId, payload);
        setMessage({
          type: 'success',
          text: 'Broker replaced. The old account was archived and your hedge setup is being updated.',
        });
      }

      setFormMode(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Operation failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const chooseHedge = async (brokerAccountId: string) => {
    setHedgeSaving(brokerAccountId);
    setMessage(null);
    try {
      await apiClient.setHedgeBroker(brokerAccountId);
      setMessage({ type: 'success', text: 'Hedge broker change queued - it will apply within a minute.' });
      await load();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to set hedge broker' });
    } finally {
      setHedgeSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="animate-fade-in-up">
        <p className="eyebrow">Settings</p>
        <h1 className="page-title">Brokers</h1>
        <p className="page-subtitle">
          Keep your MT5 broker accounts current and choose which one powers your hedge.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'border-success/25 bg-success/10 text-success'
              : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Active brokers */}
      <Card className="animate-fade-in-up stagger-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Active Brokers</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setFormMode('add');
              setForm(EMPTY_FORM);
            }}
          >
            <PlusCircle className="h-4 w-4 mr-1" /> Add broker
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {active.length > 0 ? (
            active.map(account => (
              <div
                key={account.id}
                className="flex flex-col gap-4 rounded-xl border border-border/80 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Landmark className="h-[18px] w-[18px]" />
                  </div>
                  <div className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{account.brokerName}</span>
                      <span className="font-mono text-muted-foreground tabular-nums">
                        #{account.mt5AccountNumber}
                      </span>
                      {account.epAccountId && (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          Registered
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-muted-foreground">{account.mt5Server}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {active.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={hedgeSaving !== null}
                      onClick={() => chooseHedge(account.id)}
                    >
                      <Crosshair className="h-4 w-4 mr-1" />
                      {hedgeSaving === account.id ? 'Setting...' : 'Use for hedge'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormMode({ replaceId: account.id });
                      setForm(EMPTY_FORM);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> Replace credentials
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Landmark className="h-6 w-6" />
              </div>
              <p className="mt-4 font-semibold text-foreground">No active broker accounts</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Add your MT5 broker to connect it to the trading platform.
              </p>
            </div>
          )}

          {active.length > 1 && provisioning?.status === 'ACTIVE' && (
            <p className="text-xs text-muted-foreground">
              You have multiple active brokers - the hedge setup uses the one you designate with
              "Use for hedge".
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add / Replace form */}
      {formMode !== null && (
        <Card className="animate-fade-in-up stagger-2">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {formMode === 'add' ? (
                  <PlusCircle className="h-[18px] w-[18px]" />
                ) : (
                  <RefreshCw className="h-[18px] w-[18px]" />
                )}
              </div>
              <CardTitle className="font-display text-lg">
                {formMode === 'add' ? 'Add New Broker' : 'Replace Broker Credentials'}
              </CardTitle>
            </div>
            <CardDescription>
              {formMode === 'add'
                ? 'The new broker is registered on the trading platform alongside your existing one.'
                : 'The current account is archived and the new credentials are registered on the trading platform.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="brokerName">Broker Name *</Label>
                  <Input
                    id="brokerName"
                    className="h-10 rounded-xl"
                    placeholder="e.g. IC Markets"
                    value={form.brokerName}
                    onChange={e => setForm(prev => ({ ...prev, brokerName: e.target.value }))}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mt5Server">MT5 Server *</Label>
                  <Input
                    id="mt5Server"
                    className="h-10 rounded-xl"
                    placeholder="e.g. ICMarkets-Live01"
                    value={form.mt5Server}
                    onChange={e => setForm(prev => ({ ...prev, mt5Server: e.target.value }))}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mt5AccountNumber">MT5 Account Number *</Label>
                  <Input
                    id="mt5AccountNumber"
                    className="h-10 rounded-xl"
                    placeholder="e.g. 1234567"
                    value={form.mt5AccountNumber}
                    onChange={e => setForm(prev => ({ ...prev, mt5AccountNumber: e.target.value }))}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mt5Password">MT5 Password *</Label>
                  <Input
                    id="mt5Password"
                    type="password"
                    className="h-10 rounded-xl"
                    placeholder="MT5 password"
                    value={form.mt5Password}
                    onChange={e => setForm(prev => ({ ...prev, mt5Password: e.target.value }))}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="brokerPortalPassword">Broker Portal Password (optional)</Label>
                  <Input
                    id="brokerPortalPassword"
                    type="password"
                    className="h-10 rounded-xl"
                    placeholder="Portal password"
                    value={form.brokerPortalPassword}
                    onChange={e => setForm(prev => ({ ...prev, brokerPortalPassword: e.target.value }))}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setFormMode(null)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : formMode === 'add' ? 'Add Broker' : 'Replace Broker'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="animate-fade-in-up stagger-3">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <History className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Archived Brokers</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Broker
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Account
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Server
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Registered
                    </th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Archived
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(account => (
                    <tr
                      key={account.id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3.5 pr-4 font-medium">{account.brokerName}</td>
                      <td className="py-3.5 pr-4 font-mono tabular-nums">{account.mt5AccountNumber}</td>
                      <td className="py-3.5 pr-4">{account.mt5Server}</td>
                      <td className="py-3.5 pr-4 text-muted-foreground tabular-nums">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-muted-foreground tabular-nums">
                        {account.archivedAt ? new Date(account.archivedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <History className="h-6 w-6" />
              </div>
              <p className="mt-4 font-semibold text-foreground">No archived brokers yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Replaced broker accounts will be listed here for your records.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
