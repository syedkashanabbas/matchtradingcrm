'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import {
  Trophy,
  Plane,
  BadgeDollarSign,
  Plus,
  Loader2,
  Snowflake,
  Crown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

/**
 * Admin management for the Exonoma incentive tools (spec v1.1 §7.12):
 * challenges (CRUD + freeze + winners log), travel promos (CRUD +
 * per-collaborator state transitions) and the $40 membership view.
 */

interface AdminChallenge {
  id: string;
  name: string;
  metric: string;
  prize: string;
  startsAt: string;
  endsAt: string;
  status: 'ACTIVE' | 'FROZEN';
  leaderboard: Array<{ userId: string; name: string; score: number; rank: number }>;
}

interface AdminPromo {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  deadline: string;
  progresses: Array<{ userId: string; name: string; email: string; status: string; updatedAt: string }>;
}

interface MembershipRow {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  directReferrals: number;
  provider: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

const CHALLENGE_METRICS = [
  { value: 'new_active_directs', label: 'New active directs' },
  { value: 'revenue_generated', label: 'Revenue generated' },
  { value: 'new_l2_unlocked', label: 'New Level 2 unlocks' },
];

const PROMO_METRICS = [
  { value: 'active_directs', label: 'Active directs' },
  { value: 'revenue', label: 'Revenue' },
];

const PROMO_STATES = ['NOT_REACHED', 'REACHED', 'CONFIRMED', 'REDEEMED'] as const;

const PROMO_STATE_BADGES: Record<string, string> = {
  NOT_REACHED: 'bg-muted text-muted-foreground',
  REACHED: 'bg-exo-verdigris-soft text-exo-verdigris border-exo-verdigris-soft',
  CONFIRMED: 'bg-exo-ottone-soft text-exo-ottone border-exo-ottone-soft',
  REDEEMED: 'bg-success/15 text-success border-success/25',
};

const SUBSCRIPTION_BADGES: Record<string, string> = {
  ACTIVE: 'bg-success/15 text-success border-success/25',
  PAST_DUE: 'bg-warning/15 text-warning border-warning/25',
  UNPAID: 'bg-destructive/10 text-destructive border-destructive/20',
  CANCELED: 'bg-muted text-muted-foreground',
};

export default function AdminProgramsPage() {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Challenge form
  const [challengeForm, setChallengeForm] = useState({
    name: '',
    metric: 'new_active_directs',
    prize: '',
    startsAt: '',
    endsAt: '',
  });
  // Promo form
  const [promoForm, setPromoForm] = useState({ name: '', metric: 'active_directs', threshold: '', deadline: '' });

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const load = useCallback(async () => {
    const [challengesRes, promosRes, membershipsRes] = await Promise.allSettled([
      apiClient.adminGetChallenges(),
      apiClient.adminGetPromos(),
      apiClient.adminGetMemberships(),
    ]);
    if (challengesRes.status === 'fulfilled') {
      setChallenges(((challengesRes.value as any).data ?? []) as AdminChallenge[]);
    }
    if (promosRes.status === 'fulfilled') {
      setPromos(((promosRes.value as any).data ?? []) as AdminPromo[]);
    }
    if (membershipsRes.status === 'fulfilled') {
      setMemberships(((membershipsRes.value as any).data ?? []) as MembershipRow[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveChallenge = async () => {
    if (!challengeForm.name || !challengeForm.startsAt || !challengeForm.endsAt) {
      flash('error', 'Name, start and end dates are required');
      return;
    }
    setSaving(true);
    try {
      await apiClient.adminSaveChallenge({
        name: challengeForm.name,
        metric: challengeForm.metric,
        prize: challengeForm.prize,
        startsAt: new Date(challengeForm.startsAt).toISOString(),
        endsAt: new Date(challengeForm.endsAt).toISOString(),
      });
      setChallengeForm({ name: '', metric: 'new_active_directs', prize: '', startsAt: '', endsAt: '' });
      flash('success', 'Challenge created');
      await load();
    } catch (error: any) {
      flash('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const freezeChallenge = async (id: string) => {
    setActionId(id);
    try {
      await apiClient.adminFreezeChallenge(id);
      flash('success', 'Challenge frozen - winners log saved');
      await load();
    } catch (error: any) {
      flash('error', error.message);
    } finally {
      setActionId(null);
    }
  };

  const savePromo = async () => {
    if (!promoForm.name || !promoForm.threshold || !promoForm.deadline) {
      flash('error', 'Name, threshold and deadline are required');
      return;
    }
    setSaving(true);
    try {
      await apiClient.adminSavePromo({
        name: promoForm.name,
        metric: promoForm.metric,
        threshold: Number(promoForm.threshold),
        deadline: new Date(promoForm.deadline).toISOString(),
      });
      setPromoForm({ name: '', metric: 'active_directs', threshold: '', deadline: '' });
      flash('success', 'Travel promo created');
      await load();
    } catch (error: any) {
      flash('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const setPromoState = async (promoId: string, userId: string, status: string) => {
    setActionId(`${promoId}:${userId}`);
    try {
      await apiClient.adminSetPromoProgress(promoId, userId, status);
      flash('success', `State set to ${status}`);
      await load();
    } catch (error: any) {
      flash('error', error.message);
    } finally {
      setActionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <p className="eyebrow">Network</p>
        <h1 className="page-title">Programs</h1>
        <p className="page-subtitle">
          Challenges, travel promos and collaborator memberships - the Exonoma incentive engine.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-medium animate-fade-in-up ${
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
          {message.text}
        </div>
      )}

      <Tabs defaultValue="challenges" className="animate-fade-in-up stagger-1">
        <TabsList>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="promos">Travel promos</TabsTrigger>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
        </TabsList>

        {/* ---------------- Challenges ---------------- */}
        <TabsContent value="challenges" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-exo-ottone-soft text-exo-ottone">
                  <Trophy className="h-[18px] w-[18px]" />
                </div>
                <CardTitle className="font-display text-lg">New challenge</CardTitle>
              </div>
              <CardDescription>
                Time-boxed leaderboard competition. The board updates in real time and freezes
                automatically at expiry with a winners log.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="challengeName">Name</Label>
                  <Input
                    id="challengeName"
                    placeholder="Summer Sprint"
                    value={challengeForm.name}
                    onChange={e => setChallengeForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="challengeMetric">Ranking metric</Label>
                  <select
                    id="challengeMetric"
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={challengeForm.metric}
                    onChange={e => setChallengeForm(f => ({ ...f, metric: e.target.value }))}
                  >
                    {CHALLENGE_METRICS.map(metric => (
                      <option key={metric.value} value={metric.value}>
                        {metric.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="challengePrize">Prize</Label>
                  <Input
                    id="challengePrize"
                    placeholder="500 EUR bonus"
                    value={challengeForm.prize}
                    onChange={e => setChallengeForm(f => ({ ...f, prize: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="challengeStart">Starts</Label>
                  <Input
                    id="challengeStart"
                    type="date"
                    value={challengeForm.startsAt}
                    onChange={e => setChallengeForm(f => ({ ...f, startsAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="challengeEnd">Ends</Label>
                  <Input
                    id="challengeEnd"
                    type="date"
                    value={challengeForm.endsAt}
                    onChange={e => setChallengeForm(f => ({ ...f, endsAt: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={saveChallenge} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                    Create challenge
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {challenges.map(challenge => (
            <Card key={challenge.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-lg">{challenge.name}</CardTitle>
                      <Badge
                        variant="outline"
                        className={
                          challenge.status === 'ACTIVE'
                            ? 'bg-success/15 text-success border-success/25'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {challenge.status === 'ACTIVE' ? 'Live' : 'Frozen'}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {CHALLENGE_METRICS.find(m => m.value === challenge.metric)?.label ?? challenge.metric} ·{' '}
                      {new Date(challenge.startsAt).toLocaleDateString()} →{' '}
                      {new Date(challenge.endsAt).toLocaleDateString()} · Prize:{' '}
                      <span className="font-semibold text-exo-ottone">{challenge.prize || '—'}</span>
                    </CardDescription>
                  </div>
                  {challenge.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => freezeChallenge(challenge.id)}
                      disabled={actionId === challenge.id}
                    >
                      {actionId === challenge.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Snowflake className="mr-1 h-4 w-4" />
                      )}
                      Freeze now
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {challenge.leaderboard.length > 0 ? (
                  <ol className="space-y-1">
                    {challenge.leaderboard.map(entry => (
                      <li key={entry.userId} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm">
                        <span className="w-6 text-center font-bold tabular-nums text-muted-foreground">
                          {entry.rank}
                        </span>
                        {entry.rank === 1 && <Crown className="h-4 w-4 text-exo-ottone" aria-hidden />}
                        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                        <span className="font-semibold tabular-nums">{entry.score}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No scores yet.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ---------------- Travel promos ---------------- */}
        <TabsContent value="promos" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-exo-verdigris-soft text-exo-verdigris">
                  <Plane className="h-[18px] w-[18px]" />
                </div>
                <CardTitle className="font-display text-lg">New travel promo</CardTitle>
              </div>
              <CardDescription>
                Threshold goal with a non-monetary prize. Collaborators reach the threshold, you
                confirm and mark redemption. Different thresholds can run in parallel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="promoName">Name</Label>
                  <Input
                    id="promoName"
                    placeholder="Dubai Experience"
                    value={promoForm.name}
                    onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promoMetric">Metric</Label>
                  <select
                    id="promoMetric"
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={promoForm.metric}
                    onChange={e => setPromoForm(f => ({ ...f, metric: e.target.value }))}
                  >
                    {PROMO_METRICS.map(metric => (
                      <option key={metric.value} value={metric.value}>
                        {metric.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promoThreshold">Threshold</Label>
                  <Input
                    id="promoThreshold"
                    type="number"
                    min={1}
                    placeholder="5"
                    value={promoForm.threshold}
                    onChange={e => setPromoForm(f => ({ ...f, threshold: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promoDeadline">Deadline</Label>
                  <Input
                    id="promoDeadline"
                    type="date"
                    value={promoForm.deadline}
                    onChange={e => setPromoForm(f => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
              </div>
              <Button className="mt-5" onClick={savePromo} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                Create promo
              </Button>
            </CardContent>
          </Card>

          {promos.map(promo => (
            <Card key={promo.id}>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg">{promo.name}</CardTitle>
                <CardDescription>
                  Reach {promo.threshold} {PROMO_METRICS.find(m => m.value === promo.metric)?.label.toLowerCase()}{' '}
                  by {new Date(promo.deadline).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {promo.progresses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Collaborator
                          </th>
                          <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            State
                          </th>
                          <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Set state
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {promo.progresses.map(progress => (
                          <tr key={progress.userId} className="border-b border-border/50">
                            <td className="py-3 pr-4">
                              <p className="font-medium">{progress.name}</p>
                              <p className="text-xs text-muted-foreground">{progress.email}</p>
                            </td>
                            <td className="py-3 pr-4">
                              <Badge variant="outline" className={PROMO_STATE_BADGES[progress.status] ?? ''}>
                                {progress.status.replace('_', ' ').toLowerCase()}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {PROMO_STATES.filter(state => state !== progress.status).map(state => (
                                  <Button
                                    key={state}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    disabled={actionId === `${promo.id}:${progress.userId}`}
                                    onClick={() => setPromoState(promo.id, progress.userId, state)}
                                  >
                                    {state.replace('_', ' ').toLowerCase()}
                                  </Button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nobody has reached this promo yet - states appear as collaborators progress.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ---------------- Memberships ---------------- */}
        <TabsContent value="memberships" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BadgeDollarSign className="h-[18px] w-[18px]" />
                </div>
                <CardTitle className="font-display text-lg">Non-client collaborators</CardTitle>
              </div>
              <CardDescription>
                Members on the $40/month membership: network access and a demo account, no product.
                Their payments generate commissions like subscriptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memberships.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Collaborator
                        </th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Directs
                        </th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Payment
                        </th>
                        <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Renews
                        </th>
                        <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Member since
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberships.map(member => (
                        <tr key={member.userId} className="border-b border-border/50 transition-colors hover:bg-muted/50">
                          <td className="py-3 pr-4">
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </td>
                          <td className="py-3 pr-4 tabular-nums">{member.directReferrals}</td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline" className={SUBSCRIPTION_BADGES[member.status] ?? ''}>
                              {member.status}
                            </Badge>
                            {member.cancelAtPeriodEnd && (
                              <span className="ml-1.5 text-xs text-warning">cancels</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {new Date(member.currentPeriodEnd).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No membership collaborators yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
