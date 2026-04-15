/**
 * Skeleton — loading placeholder matching card/row layouts.
 * Never show blank screens while data loads.
 */
function SkeletonBox({ className = '', style }) {
  return (
    <div
      className={`rounded-2xl animate-pulse ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)', ...style }}
    />
  );
}

/** Single row skeleton (matches ListRow height) */
export function SkeletonRow({ className = '' }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3.5 min-h-[64px] ${className}`}>
      <SkeletonBox className="w-10 h-10 flex-shrink-0" style={{ borderRadius: '14px' }} />
      <div className="flex-1 flex flex-col gap-2">
        <SkeletonBox className="h-4" style={{ width: '55%' }} />
        <SkeletonBox className="h-3" style={{ width: '35%' }} />
      </div>
    </div>
  );
}

/** Card skeleton */
export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div
      className={`rounded-3xl p-5 flex flex-col gap-3 ${className}`}
      style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <SkeletonBox className="h-5" style={{ width: '45%' }} />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonBox key={i} className="h-4" style={{ width: i === lines - 2 ? '35%' : '80%' }} />
      ))}
    </div>
  );
}

/** List of row skeletons */
export function SkeletonList({ count = 4, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
