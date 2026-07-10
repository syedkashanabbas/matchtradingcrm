import { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: 'purple' | 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose';
}

const colorMap = {
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
  rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400',
};

export function StatsCard({
  icon,
  label,
  value,
  subtext,
  trend,
  color = 'blue',
}: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft hover-lift animate-fade-in-up">
      <div className="flex items-start justify-between mb-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        {trend && (
          <div
            className={`text-xs font-semibold flex items-center gap-1 ${
              trend.direction === 'up'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-foreground mb-1.5 tabular-nums">{value}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground">{subtext}</p>
      )}
    </div>
  );
}
