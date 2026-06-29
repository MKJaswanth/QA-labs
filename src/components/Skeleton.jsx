export function Skeleton({ width, height = 14, radius = 6, style, className = '' }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{
        display: 'inline-block',
        width: width || '100%',
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, var(--soft-bg) 25%, #e2e8ea 50%, var(--soft-bg) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
      aria-hidden="true"
    />
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="skeleton-table" style={{ padding: '12px 16px' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              width={c === 0 ? 40 : c === cols - 1 ? 60 : `${100 / cols - 5}%`}
              height={14}
              style={{ flex: c === 0 ? '0 0 40px' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 12 }}>
          <Skeleton width="60%" height={16} style={{ marginBottom: 10 }} />
          <Skeleton width="90%" height={12} style={{ marginBottom: 6 }} />
          <Skeleton width="40%" height={12} />
        </div>
      ))}
    </div>
  )
}
