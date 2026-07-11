export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <SkeletonBlock className="h-4 w-10" />
          <SkeletonBlock className="h-4 w-16" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-40" />
            <SkeletonBlock className="h-3 w-28" />
          </div>
          <SkeletonBlock className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-2.5">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}
