'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Building, History, PlusCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface PropAccount {
  id: string;
  firmName: string;
  mt5AccountNumber: string;
  mt5Server: string;
  phase: string;
  status: string;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
}

export default function PropFirmSettingsPage() {
  const [accounts, setAccounts] = useState<PropAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    firmName: '',
    mt5AccountNumber: '',
    mt5Password: '',
    mt5Server: '',
    phase: 'CHALLENGE' as 'CHALLENGE' | 'FUNDED',
  });

  const load = useCallback(async () => {
    try {
      const response = await apiClient.getPropList(true);
      const list = (Array.isArray(response) ? response : (response.data ?? [])) as PropAccount[];
      setAccounts(list);
    } catch (error) {
      console.error('Failed to load prop accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeAccount = accounts.find(account => account.isActive);
  const history = accounts.filter(account => !account.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!form.firmName || !form.mt5AccountNumber || !form.mt5Password || !form.mt5Server) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.createProp({
        firmName: form.firmName,
        mt5AccountNumber: form.mt5AccountNumber,
        mt5Password: form.mt5Password,
        mt5Server: form.mt5Server,
        phase: form.phase,
      });
      setMessage({
        type: 'success',
        text: 'New prop account registered. Your previous account was archived and your hedge setup is being updated.',
      });
      setShowForm(false);
      setForm({ firmName: '', mt5AccountNumber: '', mt5Password: '', mt5Server: '', phase: 'CHALLENGE' });
      await load();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to register the new account' });
    } finally {
      setIsSaving(false);
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
        <h1 className="page-title">Prop Firm</h1>
        <p className="page-subtitle">
          Register new challenge credentials as cycles close - the old account is archived
          automatically.
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

      {/* Active account */}
      <Card className="animate-fade-in-up stagger-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Current Account</CardTitle>
            {activeAccount && (
              <Badge
                className={
                  activeAccount.phase === 'FUNDED'
                    ? 'bg-success/15 text-success border-success/25'
                    : 'bg-primary/10 text-primary border-primary/20'
                }
              >
                {activeAccount.phase}
              </Badge>
            )}
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <PlusCircle className="h-4 w-4 mr-1" />
            New challenge / Update credentials
          </Button>
        </CardHeader>
        <CardContent>
          {activeAccount ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Firm
                </p>
                <p className="mt-1.5 text-sm font-medium text-foreground">{activeAccount.firmName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Account
                </p>
                <p className="mt-1.5 font-mono text-sm font-medium text-foreground tabular-nums">
                  {activeAccount.mt5AccountNumber}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Server
                </p>
                <p className="mt-1.5 text-sm font-medium text-foreground">{activeAccount.mt5Server}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Registered
                </p>
                <p className="mt-1.5 text-sm font-medium text-foreground tabular-nums">
                  {new Date(activeAccount.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building className="h-6 w-6" />
              </div>
              <p className="mt-4 font-semibold text-foreground">No active prop account</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Register your prop firm credentials to connect them to the trading platform.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New challenge form */}
      {showForm && (
        <Card className="animate-fade-in-up stagger-2">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PlusCircle className="h-[18px] w-[18px]" />
              </div>
              <CardTitle className="font-display text-lg">Register New Prop Account</CardTitle>
            </div>
            <CardDescription>
              Use this for every challenge cycle close (failure and repurchase, new challenge) or
              CHALLENGE → FUNDED transition. Your current account will be archived and the new one
              registered on the trading platform automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="firmName">Prop Firm Name *</Label>
                  <Input
                    id="firmName"
                    className="h-10 rounded-xl"
                    placeholder="e.g. FTMO"
                    value={form.firmName}
                    onChange={e => setForm(prev => ({ ...prev, firmName: e.target.value }))}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mt5Server">MT5 Server *</Label>
                  <Input
                    id="mt5Server"
                    className="h-10 rounded-xl"
                    placeholder="e.g. FTMO-Server"
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
                    placeholder="e.g. 7654321"
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
                  <Label htmlFor="phase">Phase *</Label>
                  <Select
                    value={form.phase}
                    onValueChange={(value: 'CHALLENGE' | 'FUNDED') =>
                      setForm(prev => ({ ...prev, phase: value }))
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger id="phase" className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHALLENGE">Challenge</SelectItem>
                      <SelectItem value="FUNDED">Funded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Registering...' : 'Register Account'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Challenge history */}
      <Card className="animate-fade-in-up stagger-3">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <History className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Challenge History</CardTitle>
          </div>
          <CardDescription>All your previous prop accounts, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Firm
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Account
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Server
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Phase
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
                      <td className="py-3.5 pr-4 font-medium">{account.firmName}</td>
                      <td className="py-3.5 pr-4 font-mono tabular-nums">{account.mt5AccountNumber}</td>
                      <td className="py-3.5 pr-4">{account.mt5Server}</td>
                      <td className="py-3.5 pr-4">
                        <Badge variant="secondary">{account.phase}</Badge>
                      </td>
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
              <p className="mt-4 font-semibold text-foreground">No archived accounts yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Past challenge accounts will be listed here for your records.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
