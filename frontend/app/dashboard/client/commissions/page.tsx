'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Wallet, PiggyBank, Coins, Users, Globe, Filter } from 'lucide-react';
import { apiClient } from '@/lib/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface CommissionRow {
  id: string;
  sourceClient: string;
  level: number;
  baseAmount: number;
  rate: number;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  wasCompressed?: boolean;
  createdAt: string;
}

interface Balances {
  accruedUnpaid: number;
  totalPaid: number;
  allTime: number;
  negativeCarryOver: number;
  monthly: Array<{ month: string; total: number }>;
}

interface DownlineClient {
  id: string;
  name: string;
  level: number;
  status: string;
  joinedAt: string;
}

const STATUS_BADGES: Record<string, string> = {
  EARNED: 'bg-primary/10 text-primary border-primary/20',
  PAID: 'bg-success/15 text-success border-success/25',
  REVERSED: 'bg-destructive/10 text-destructive border-destructive/20',
};

const LIFECYCLE_BADGES: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/25',
  onboarding: 'bg-primary/10 text-primary border-primary/20',
  suspended: 'bg-warning/15 text-warning border-warning/25',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function AgentCommissionsPage() {
  const [balances, setBalances] = useState<Balances | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [downline, setDownline] = useState<DownlineClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const [commissionsRes, downlineRes] = await Promise.all([
        apiClient.getAgentCommissions({
          status: statusFilter || undefined,
          from: fromFilter || undefined,
          to: toFilter || undefined,
        }),
        apiClient.getDownlineClients(),
      ]);
      const data = commissionsRes.data as any;
      setBalances(data?.balances ?? null);
      setCommissions(data?.commissions ?? []);
      setDownline((downlineRes.data as DownlineClient[]) ?? []);
    } catch (error) {
      console.error('Failed to load commissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, fromFilter, toFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading && !balances) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" count={3} />
        <LoadingSkeleton variant="chart" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end animate-fade-in-up">
        <div>
          <p className="eyebrow">Grow</p>
          <h1 className="page-title">Commissions</h1>
          <p className="page-subtitle">
            Earnings from your network's subscriptions and renewals.
          </p>
        </div>
        <Link href="/dashboard/client/network">
          <Button variant="outline" size="sm">
            <Globe className="mr-1 h-4 w-4" /> Network & referral link
          </Button>
        </Link>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          icon={<Wallet className="h-6 w-6" />}
          label="Accrued (unpaid)"
          value={`${balances?.accruedUnpaid?.toFixed(2) ?? '0.00'}`}
          subtext={
            balances && balances.negativeCarryOver > 0
              ? `includes -${balances.negativeCarryOver.toFixed(2)} carry-over`
              : 'Awaiting next payout'
          }
          color="blue"
        />
        <StatsCard
          icon={<PiggyBank className="h-6 w-6" />}
          label="Total paid"
          value={`${balances?.totalPaid?.toFixed(2) ?? '0.00'}`}
          subtext="Paid out to date"
          color="emerald"
        />
        <StatsCard
          icon={<Coins className="h-6 w-6" />}
          label="All-time"
          value={`${balances?.allTime?.toFixed(2) ?? '0.00'}`}
          subtext="Earned since joining"
          color="purple"
        />
      </div>

      {/* Per-period chart */}
      <Card className="animate-fade-in-up stagger-2">
        <CardHeader>
          <CardTitle className="font-display text-lg">Earnings per month</CardTitle>
        </CardHeader>
        <CardContent>
          {balances && balances.monthly.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={balances.monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No commissions yet - share your referral link to start earning.</p>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="font-display text-lg">Commission History</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-input bg-card px-2.5 text-sm"
              >
                <option value="">All statuses</option>
                <option value="EARNED">Earned</option>
                <option value="PAID">Paid</option>
                <option value="REVERSED">Reversed</option>
              </select>
              <input
                type="date"
                value={fromFilter}
                onChange={e => setFromFilter(e.target.value)}
                className="h-9 rounded-xl border border-input bg-card px-2.5 text-sm"
              />
              <span className="text-muted-foreground">→</span>
              <input
                type="date"
                value={toFilter}
                onChange={e => setToFilter(e.target.value)}
                className="h-9 rounded-xl border border-input bg-card px-2.5 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {commissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Level</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate</th>
                    <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commission</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(commission => (
                    <tr key={commission.id} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                      <td className="py-3.5 pr-4 text-muted-foreground">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 pr-4 font-medium">{commission.sourceClient}</td>
                      <td className="py-3.5 pr-4">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold">L{commission.level}</span>
                        {commission.wasCompressed && (
                          <span
                            className="ml-1.5 rounded-md bg-exo-verdigris-soft px-1.5 py-0.5 text-xs font-semibold text-exo-verdigris"
                            title="Received via dynamic compression: the natural beneficiary was not qualified for this level"
                          >
                            compressed
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4 text-right tabular-nums">
                        {commission.baseAmount.toFixed(2)} {commission.currency}
                      </td>
                      <td className="py-3.5 pr-4 text-right tabular-nums">{commission.rate}%</td>
                      <td className="py-3.5 pr-4 text-right font-semibold tabular-nums">
                        {commission.amount.toFixed(2)} {commission.currency}
                      </td>
                      <td className="py-3.5">
                        <Badge className={STATUS_BADGES[commission.status] ?? ''} variant="outline">
                          {commission.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No commissions match the current filters.</p>
          )}
        </CardContent>
      </Card>

      {/* Downline clients */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <CardTitle className="font-display text-lg">Network Clients</CardTitle>
          </div>
          <CardDescription>
            Your downline with lifecycle status - keep an eye on upcoming renewals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {downline.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Level</th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {downline.map(client => (
                    <tr key={client.id} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                      <td className="py-3.5 pr-4 font-medium">{client.name}</td>
                      <td className="py-3.5 pr-4">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold">L{client.level}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <Badge className={LIFECYCLE_BADGES[client.status] ?? ''} variant="outline">
                          {client.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-muted-foreground">
                        {new Date(client.joinedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No one in your network yet - share your referral link from the Network page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
