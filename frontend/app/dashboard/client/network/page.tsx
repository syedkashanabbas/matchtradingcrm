'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import {
  Copy,
  Check,
  QrCode,
  Users,
  UserCheck,
  Wallet,
  Trophy,
  Sparkles,
  ArrowRight,
  Send,
  Mail,
  MessageCircle,
  Share2,
  Target,
  Activity,
  Network,
  List,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { NetworkTree, type TreeNode } from '@/components/network/NetworkTree';
import { QualificationCard, type QualificationData } from '@/components/network/QualificationCard';
import { ChallengesCard, type ChallengeData, type PastChallenge } from '@/components/network/ChallengesCard';
import { TravelPromosCard, type TravelPromoData } from '@/components/network/TravelPromosCard';

// ------------------------------------------------------------------
// Data shapes
// ------------------------------------------------------------------
interface DownlineClient {
  id: string;
  name: string;
  level: number;
  status: 'active' | 'onboarding' | 'suspended' | 'expired';
  joinedAt: string;
}

interface Balances {
  accruedUnpaid: number;
  totalPaid: number;
  allTime: number;
  monthly: Array<{ month: string; total: number }>;
}

interface ActivityEvent {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
}

// Milestone ladder - the growth game
const MILESTONES = [
  { size: 1, label: 'First referral', icon: '🥉' },
  { size: 3, label: 'Inner circle', icon: '🥈' },
  { size: 5, label: 'High five', icon: '🥇' },
  { size: 10, label: 'Networker', icon: '🏆' },
  { size: 25, label: 'Rainmaker', icon: '💎' },
  { size: 50, label: 'Legend', icon: '👑' },
];

const LIFECYCLE_STYLES: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/25',
  onboarding: 'bg-primary/10 text-primary border-primary/20',
  suspended: 'bg-warning/15 text-warning border-warning/25',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
};

// ------------------------------------------------------------------
// Count-up hook (respects reduced motion)
// ------------------------------------------------------------------
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    if (started.current && value === target) return;
    started.current = true;
    let frame: number;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

function KpiTile({
  icon,
  label,
  value,
  suffix,
  decimals = 0,
  hint,
  tone,
  stagger,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  hint?: string;
  tone: 'indigo' | 'emerald' | 'violet' | 'amber';
  stagger: string;
}) {
  const animated = useCountUp(value);
  const tones = {
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-soft hover-lift animate-fade-in-up ${stagger}`}>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-3xl font-bold tracking-tight tabular-nums text-foreground">
        {animated.toFixed(decimals)}
        {suffix && <span className="ml-1 text-base font-semibold text-muted-foreground">{suffix}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------
export default function NetworkerHubPage() {
  const [referralLink, setReferralLink] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [downline, setDownline] = useState<DownlineClient[]>([]);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [qualification, setQualification] = useState<QualificationData | null>(null);
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [pastChallenges, setPastChallenges] = useState<PastChallenge[]>([]);
  const [promos, setPromos] = useState<TravelPromoData[]>([]);
  const [peopleView, setPeopleView] = useState<'tree' | 'list'>('tree');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [linkRes, downlineRes, commissionsRes, activityRes, treeRes, qualificationRes, challengesRes, promosRes] =
        await Promise.allSettled([
          apiClient.getMyReferralLink(),
          apiClient.getDownlineClients(),
          apiClient.getAgentCommissions(),
          apiClient.getNetworkActivityFeed(),
          apiClient.getMyNetworkTree(),
          apiClient.getQualification(),
          apiClient.getChallenges(),
          apiClient.getTravelPromos(),
        ]);

      if (linkRes.status === 'fulfilled') {
        const data = (linkRes.value as any).data ?? linkRes.value;
        setReferralLink(data.referralLink ?? '');
        setReferralCode(data.referralCode ?? '');
      }
      if (downlineRes.status === 'fulfilled') {
        setDownline(((downlineRes.value as any).data ?? []) as DownlineClient[]);
      }
      if (commissionsRes.status === 'fulfilled') {
        setBalances(((commissionsRes.value as any).data?.balances ?? null) as Balances | null);
      }
      if (activityRes.status === 'fulfilled') {
        const data = (activityRes.value as any).data ?? activityRes.value;
        setActivity(Array.isArray(data) ? data.slice(0, 5) : []);
      }
      if (treeRes.status === 'fulfilled') {
        const data = (treeRes.value as any).data ?? treeRes.value;
        setTree((data && data.id ? data : null) as TreeNode | null);
      }
      if (qualificationRes.status === 'fulfilled') {
        setQualification(((qualificationRes.value as any).data ?? null) as QualificationData | null);
      }
      if (challengesRes.status === 'fulfilled') {
        const data = (challengesRes.value as any).data ?? {};
        setChallenges((data.active ?? []) as ChallengeData[]);
        setPastChallenges((data.past ?? []) as PastChallenge[]);
      }
      if (promosRes.status === 'fulfilled') {
        setPromos(((promosRes.value as any).data ?? []) as TravelPromoData[]);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink]);

  // ---------------- derived game state ----------------
  const networkSize = downline.length;
  const activeClients = downline.filter(client => client.status === 'active').length;
  const onboardingClients = downline.filter(client => client.status === 'onboarding');

  const nextMilestone = MILESTONES.find(m => networkSize < m.size);
  const currentMilestone = [...MILESTONES].reverse().find(m => networkSize >= m.size);
  const prevSize = currentMilestone?.size ?? 0;
  const progressPct = nextMilestone
    ? Math.round(((networkSize - prevSize) / (nextMilestone.size - prevSize)) * 100)
    : 100;

  // ---------------- next best action ----------------
  const shareText = encodeURIComponent(
    `Join me on EIDOS - automated trading setup for prop traders. Sign up with my link: ${referralLink}`
  );
  const nextAction =
    networkSize === 0
      ? {
          title: 'Invite your first trader',
          body: 'Share your link once and your network starts here. You earn a commission on every payment they make - first sale and every renewal.',
          cta: 'Copy your link',
          onClick: copyLink,
        }
      : onboardingClients.length > 0
        ? {
            title: `${onboardingClients[0].name} hasn't finished setup`,
            body: `${onboardingClients.length} member${onboardingClients.length === 1 ? ' is' : 's are'} still onboarding. A friendly nudge gets them active - and turns into recurring commissions for you.`,
            cta: 'Copy link to resend',
            onClick: copyLink,
          }
        : nextMilestone
          ? {
              title: `${nextMilestone.size - networkSize} more to "${nextMilestone.label}"`,
              body: 'Your whole network is active - great work. Keep sharing to reach the next milestone and grow your monthly income.',
              cta: 'Copy your link',
              onClick: copyLink,
            }
          : {
              title: 'You are a Legend',
              body: 'Every milestone unlocked. Your network keeps paying you every month - keep it warm.',
              cta: 'Copy your link',
              onClick: copyLink,
            };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------------- Hero: the one action that matters ---------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 sm:p-8 text-white shadow-lg animate-fade-in-up">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Earn on every payment, forever
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Share your link. <span className="opacity-90">Get paid monthly.</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-white/85">
              Every trader who joins with your link earns you a commission on their first payment{' '}
              <strong>and every renewal</strong>.
            </p>
          </div>

          {/* Share block */}
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 rounded-2xl bg-white/15 p-2 backdrop-blur">
              <p className="min-w-0 flex-1 truncate px-3 font-mono text-sm">{referralLink || '…'}</p>
              <Button
                onClick={copyLink}
                size="sm"
                className="shrink-0 bg-white text-primary hover:bg-white/90 font-semibold shadow"
              >
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <a
                href={`https://wa.me/?text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors backdrop-blur"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on Telegram"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors backdrop-blur"
              >
                <Send className="h-5 w-5" />
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('Join me on EIDOS')}&body=${shareText}`}
                aria-label="Share via email"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors backdrop-blur"
              >
                <Mail className="h-5 w-5" />
              </a>
              <button
                onClick={() => setShowQr(!showQr)}
                aria-label="Show QR code"
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors backdrop-blur ${
                  showQr ? 'bg-white text-primary' : 'bg-white/15 hover:bg-white/25'
                }`}
              >
                <QrCode className="h-5 w-5" />
              </button>
              <span className="ml-auto rounded-lg bg-white/15 px-2.5 py-1 font-mono text-xs backdrop-blur">
                {referralCode}
              </span>
            </div>

            {showQr && (
              <div className="mt-3 flex justify-center rounded-2xl bg-white p-4 animate-fade-in-up">
                <QRCodeSVG value={referralLink} size={160} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- KPI row: your network in 5 seconds ---------------- */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiTile
          icon={<Users className="h-5 w-5" />}
          label="Network members"
          value={networkSize}
          hint={networkSize === 0 ? 'Share your link to start' : 'People who joined with your link'}
          tone="indigo"
          stagger="stagger-1"
        />
        <KpiTile
          icon={<UserCheck className="h-5 w-5" />}
          label="Active clients"
          value={activeClients}
          hint="Paying you every month"
          tone="emerald"
          stagger="stagger-2"
        />
        <KpiTile
          icon={<Wallet className="h-5 w-5" />}
          label="Pending payout"
          value={balances?.accruedUnpaid ?? 0}
          suffix="EUR"
          decimals={2}
          hint="Awaiting next payout run"
          tone="violet"
          stagger="stagger-3"
        />
        <KpiTile
          icon={<Trophy className="h-5 w-5" />}
          label="Earned all-time"
          value={balances?.allTime ?? 0}
          suffix="EUR"
          decimals={2}
          hint="Since you joined"
          tone="amber"
          stagger="stagger-4"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---------------- Milestones & achievements ---------------- */}
        <Card className="lg:col-span-2 animate-fade-in-up stagger-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Your journey</CardTitle>
              </div>
              {currentMilestone && (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {currentMilestone.icon} {currentMilestone.label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Progress to next milestone */}
            <div>
              <div className="mb-2 flex items-baseline justify-between text-sm">
                {nextMilestone ? (
                  <>
                    <span className="font-medium text-foreground">
                      Next: {nextMilestone.icon} {nextMilestone.label}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {networkSize} / {nextMilestone.size} members
                    </span>
                  </>
                ) : (
                  <span className="font-medium text-foreground">All milestones unlocked 🎉</span>
                )}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand-gradient transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(progressPct, networkSize > 0 ? 8 : 0)}%` }}
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              {nextMilestone && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {nextMilestone.size - networkSize} more{' '}
                  {nextMilestone.size - networkSize === 1 ? 'referral' : 'referrals'} to unlock
                </p>
              )}
            </div>

            {/* Achievement chips */}
            <div className="flex flex-wrap gap-2">
              {MILESTONES.map(milestone => {
                const unlocked = networkSize >= milestone.size;
                return (
                  <div
                    key={milestone.size}
                    title={`${milestone.label} - ${milestone.size} member${milestone.size === 1 ? '' : 's'}`}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      unlocked
                        ? 'border-primary/25 bg-primary/10 text-primary'
                        : 'border-border bg-muted/50 text-muted-foreground opacity-60'
                    }`}
                  >
                    <span aria-hidden>{milestone.icon}</span>
                    {milestone.label}
                    {unlocked && <Check className="h-3 w-3" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ---------------- Next best action ---------------- */}
        <Card className="border-primary/25 bg-primary/[0.03] animate-fade-in-up stagger-3">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Do this next</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold text-foreground">{nextAction.title}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{nextAction.body}</p>
            </div>
            <Button onClick={nextAction.onClick} className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              {copied ? 'Link copied!' : nextAction.cta}
            </Button>
            <Link
              href="/dashboard/client/commissions"
              className="flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View commission history <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Exonoma engine: qualification, challenges, promos ---------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <QualificationCard data={qualification} />
        <ChallengesCard challenges={challenges} past={pastChallenges} />
        <TravelPromosCard promos={promos} />
      </div>

      {/* ---------------- Your network tree (la ramificazione) ---------------- */}
      <Card className="animate-fade-in-up stagger-3">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-exo-verdigris-soft text-exo-verdigris">
                <Network className="h-[18px] w-[18px]" />
              </div>
              <CardTitle className="font-display text-lg">Your network</CardTitle>
              <span className="text-sm text-muted-foreground tabular-nums">({networkSize})</span>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
              <button
                onClick={() => setPeopleView('tree')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  peopleView === 'tree'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={peopleView === 'tree'}
              >
                <Network className="h-3.5 w-3.5" /> Tree
              </button>
              <button
                onClick={() => setPeopleView('list')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  peopleView === 'list'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={peopleView === 'list'}
              >
                <List className="h-3.5 w-3.5" /> List
              </button>
            </div>
          </div>
          {networkSize > 0 && peopleView === 'tree' && (
            <p className="mt-1 text-xs text-muted-foreground">
              Every branch below you. You earn <span className="font-semibold text-exo-verdigris">20% · 18% · 12%</span>{' '}
              on levels 1-3. Tap a person to open their branch.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {peopleView === 'tree' ? (
            downline.length > 0 || (tree && tree.children.length > 0) ? (
              <NetworkTree tree={tree} />
            ) : (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-exo-verdigris-soft">
                  <Users className="h-7 w-7 text-exo-verdigris" />
                </div>
                <p className="font-medium text-foreground">Nobody here yet - be the spark</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Your future network is one share away. Copy your link and send it to a trader you know.
                </p>
                <Button onClick={copyLink} className="mt-4">
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy your link'}
                </Button>
              </div>
            )
          ) : downline.length > 0 ? (
            <div className="divide-y divide-border/60">
              {downline.map(client => (
                <div key={client.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                      {client.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Level {client.level} · joined {new Date(client.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={LIFECYCLE_STYLES[client.status] ?? ''}>
                    {client.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium text-foreground">Nobody here yet - be the spark</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Your future network is one share away. Copy your link and send it to a trader you know.
              </p>
              <Button onClick={copyLink} className="mt-4">
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy your link'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Recent activity ---------------- */}
      {activity.length > 0 && (
        <Card className="animate-fade-in-up stagger-4">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Recent activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {activity.map(event => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60 transition-colors">
                <p className="text-sm text-foreground">{event.message}</p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
