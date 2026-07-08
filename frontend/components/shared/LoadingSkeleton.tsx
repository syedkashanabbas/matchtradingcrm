interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'avatar' | 'table' | 'chart';
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ variant = 'card', count = 1, className = '' }: LoadingSkeletonProps) {
  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-4 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div className={`h-10 w-10 rounded-full bg-muted animate-pulse ${className}`} />
    );
  }

  if (variant === 'card') {
    return (
      <div className={`space-y-3 rounded-2xl border border-border bg-card p-6 ${className}`}>
        <div className="h-6 w-1/3 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-5/6 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded-lg bg-muted animate-pulse" />
              <div className="h-4 w-2/3 rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`space-y-4 rounded-2xl border border-border bg-card p-6 ${className}`}>
        <div className="h-6 w-1/3 rounded-lg bg-muted animate-pulse" />
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return null;
}
