'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock, Check } from 'lucide-react';

/**
 * Exonoma qualification state (spec v1.1 §7.11): which commission levels are
 * unlocked and how far the collaborator is from the next threshold.
 */

export interface QualificationData {
  period: string;
  snapshot: { activeDirectCount: number; qualifiesLevel2: boolean; qualifiesLevel3: boolean };
  activeDirects: number;
  thresholds: { level2: number; level3: number };
  progressToLevel2: number;
  progressToLevel3: number;
}

function LevelRow({
  label,
  rate,
  unlocked,
  requirement,
  current,
  threshold,
}: {
  label: string;
  rate: string;
  unlocked: boolean;
  requirement: string;
  current?: number;
  threshold?: number;
}) {
  const pct = threshold ? Math.min(((current ?? 0) / threshold) * 100, 100) : 100;
  return (
    <div className={`rounded-xl border p-3.5 transition-colors ${
      unlocked ? 'border-exo-verdigris-soft bg-exo-verdigris-soft' : 'border-border bg-muted/40'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              unlocked ? 'bg-exo-verdigris text-white' : 'bg-muted text-muted-foreground'
            }`}
          >
            {unlocked ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{requirement}</p>
          </div>
        </div>
        <span className={`text-lg font-bold tabular-nums ${unlocked ? 'text-exo-verdigris' : 'text-muted-foreground'}`}>
          {rate}
        </span>
      </div>
      {!unlocked && threshold !== undefined && (
        <div className="mt-2.5">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-exo-verdigris transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">
            <span className="text-exo-verdigris font-semibold tabular-nums">
              {Math.max(threshold - (current ?? 0), 0)}
            </span>{' '}
            more active {threshold - (current ?? 0) === 1 ? 'direct' : 'directs'} to unlock
          </p>
        </div>
      )}
    </div>
  );
}

export function QualificationCard({ data }: { data: QualificationData | null }) {
  if (!data) return null;
  const { snapshot, activeDirects, thresholds } = data;

  const badge = snapshot.qualifiesLevel3
    ? { label: 'Level 3 unlocked', cls: 'bg-exo-ottone-soft text-exo-ottone border-exo-ottone-soft' }
    : snapshot.qualifiesLevel2
      ? { label: 'Level 2 unlocked', cls: 'bg-exo-verdigris-soft text-exo-verdigris border-exo-verdigris-soft' }
      : { label: 'Level 1', cls: 'bg-primary/10 text-primary border-primary/20' };

  return (
    <Card className="animate-fade-in-up stagger-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-exo-verdigris-soft text-exo-verdigris">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Your qualification</CardTitle>
          </div>
          <Badge variant="outline" className={badge.cls}>
            {badge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{activeDirects}</span> active paying{' '}
          {activeDirects === 1 ? 'direct' : 'directs'} right now · frozen for {data.period}:{' '}
          <span className="tabular-nums">{snapshot.activeDirectCount}</span>
        </p>
        <LevelRow label="Level 1 — your directs" rate="20%" unlocked requirement="Always active" />
        <LevelRow
          label="Level 2 — their directs"
          rate="18%"
          unlocked={snapshot.qualifiesLevel2}
          requirement={`Needs ${thresholds.level2} active directs`}
          current={activeDirects}
          threshold={thresholds.level2}
        />
        <LevelRow
          label="Level 3 — three deep"
          rate="12%"
          unlocked={snapshot.qualifiesLevel3}
          requirement={`Needs ${thresholds.level3} active directs`}
          current={activeDirects}
          threshold={thresholds.level3}
        />
      </CardContent>
    </Card>
  );
}
