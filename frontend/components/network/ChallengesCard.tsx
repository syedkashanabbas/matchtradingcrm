'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Timer, Crown, History } from 'lucide-react';

/**
 * Time-boxed challenges (spec v1.1 §7.8/§7.11): live leaderboard, personal
 * position, expiry countdown, plus the frozen winners of past challenges.
 */

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
}

export interface ChallengeData {
  id: string;
  name: string;
  metric: string;
  prize: string;
  startsAt: string;
  endsAt: string;
  leaderboard: LeaderboardEntry[];
  myRank: number | null;
  myScore: number;
}

export interface PastChallenge {
  id: string;
  name: string;
  prize: string;
  endsAt: string;
  winners: LeaderboardEntry[];
}

const METRIC_LABELS: Record<string, string> = {
  new_active_directs: 'New active directs',
  revenue_generated: 'Revenue generated',
  new_l2_unlocked: 'New Level 2 unlocks',
};

function useCountdown(deadline: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);
  const msLeft = new Date(deadline).getTime() - now;
  if (msLeft <= 0) return 'Ended';
  const days = Math.floor(msLeft / 86_400_000);
  const hours = Math.floor((msLeft % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((msLeft % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m left`;
}

const RANK_DECOR = ['text-exo-ottone', 'text-muted-foreground', 'text-amber-700 dark:text-amber-600'];

function ChallengeBlock({ challenge, isFirst }: { challenge: ChallengeData; isFirst: boolean }) {
  const countdown = useCountdown(challenge.endsAt);
  return (
    <div className={`rounded-xl border border-border p-4 ${isFirst ? '' : 'mt-3'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display font-semibold text-foreground">{challenge.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {METRIC_LABELS[challenge.metric] ?? challenge.metric} · Prize:{' '}
            <span className="font-semibold text-exo-ottone">{challenge.prize}</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-exo-verdigris-soft px-2.5 py-1 text-xs font-semibold text-exo-verdigris">
          <Timer className="h-3.5 w-3.5 animate-exo-pulse" /> {countdown}
        </span>
      </div>

      {/* My position */}
      {challenge.myRank !== null && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-exo-verdigris-soft px-3 py-2">
          <span className="text-sm font-medium text-foreground">Your position</span>
          <span className="text-sm font-bold text-exo-verdigris tabular-nums">
            #{challenge.myRank} · {challenge.myScore}
          </span>
        </div>
      )}

      {/* Leaderboard */}
      <ol className="mt-3 space-y-1">
        {challenge.leaderboard.slice(0, 5).map(entry => (
          <li
            key={entry.userId}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
          >
            <span className={`w-6 text-center font-bold tabular-nums ${RANK_DECOR[entry.rank - 1] ?? 'text-muted-foreground'}`}>
              {entry.rank}
            </span>
            {entry.rank === 1 && <Crown className="h-4 w-4 shrink-0 text-exo-ottone" aria-hidden />}
            <span className="min-w-0 flex-1 truncate text-foreground">{entry.name}</span>
            <span className="font-semibold tabular-nums text-foreground">{entry.score}</span>
          </li>
        ))}
        {challenge.leaderboard.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-muted-foreground">No scores yet — be the first on the board.</li>
        )}
      </ol>
    </div>
  );
}

export function ChallengesCard({
  challenges,
  past,
}: {
  challenges: ChallengeData[];
  past: PastChallenge[];
}) {
  const [showPast, setShowPast] = useState(false);
  if (challenges.length === 0 && past.length === 0) return null;

  return (
    <Card className="animate-fade-in-up stagger-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-exo-ottone-soft text-exo-ottone">
              <Trophy className="h-[18px] w-[18px]" />
            </div>
            <CardTitle className="font-display text-lg">Challenges</CardTitle>
          </div>
          {past.length > 0 && (
            <button
              onClick={() => setShowPast(!showPast)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <History className="h-3.5 w-3.5" /> {showPast ? 'Hide past winners' : 'Past winners'}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {challenges.length > 0 ? (
          challenges.map((challenge, index) => (
            <ChallengeBlock key={challenge.id} challenge={challenge} isFirst={index === 0} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No live challenge right now — check back soon.</p>
        )}

        {showPast && past.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border pt-4 animate-fade-in-up">
            {past.map(challenge => (
              <div key={challenge.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{challenge.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Ended {new Date(challenge.endsAt).toLocaleDateString()} · {challenge.prize}
                  </p>
                </div>
                {challenge.winners[0] && (
                  <Badge variant="outline" className="shrink-0 bg-exo-ottone-soft text-exo-ottone border-exo-ottone-soft">
                    <Crown className="mr-1 h-3 w-3" /> {challenge.winners[0].name}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
