'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, CalendarClock } from 'lucide-react';

/**
 * Travel promos (spec v1.1 §7.8/§7.11): threshold goals with a non-monetary
 * prize. Progress bar towards the threshold + personal state flag.
 */

export interface TravelPromoData {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  deadline: string;
  current: number;
  progressRatio: number;
  status: 'NOT_REACHED' | 'REACHED' | 'CONFIRMED' | 'REDEEMED';
}

const METRIC_LABELS: Record<string, string> = {
  active_directs: 'active directs',
  revenue: 'revenue',
};

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  NOT_REACHED: { label: 'In progress', cls: 'bg-primary/10 text-primary border-primary/20' },
  REACHED: { label: 'Goal reached!', cls: 'bg-exo-verdigris-soft text-exo-verdigris border-exo-verdigris-soft' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-exo-ottone-soft text-exo-ottone border-exo-ottone-soft' },
  REDEEMED: { label: 'Redeemed', cls: 'bg-success/15 text-success border-success/25' },
};

export function TravelPromosCard({ promos }: { promos: TravelPromoData[] }) {
  if (promos.length === 0) return null;

  return (
    <Card className="animate-fade-in-up stagger-4">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-exo-verdigris-soft text-exo-verdigris">
            <Plane className="h-[18px] w-[18px]" />
          </div>
          <CardTitle className="font-display text-lg">Travel promos</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {promos.map(promo => {
          const badge = STATUS_BADGES[promo.status] ?? STATUS_BADGES.NOT_REACHED;
          const reached = promo.status !== 'NOT_REACHED';
          const pct = Math.round(promo.progressRatio * 100);
          return (
            <div key={promo.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display font-semibold text-foreground">{promo.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Reach {promo.threshold} {METRIC_LABELS[promo.metric] ?? promo.metric} by{' '}
                    {new Date(promo.deadline).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className={`shrink-0 ${badge.cls}`}>
                  {badge.label}
                </Badge>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-foreground tabular-nums">
                    {promo.current} / {promo.threshold}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      reached
                        ? 'bg-exo-ottone animate-shimmer bg-gradient-to-r from-[#b08a40] via-[#d4b06a] to-[#b08a40]'
                        : 'bg-exo-verdigris'
                    }`}
                    style={{ width: `${Math.max(pct, 4)}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
