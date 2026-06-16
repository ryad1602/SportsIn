/**
 * Skeleton loading components — remplace les spinners pendant le chargement.
 *
 * Usage:
 *   <Skeleton width="100%" height={20} />
 *   <SkeletonCard lines={3} />
 *   <SkeletonList count={4} />
 */

/** Bloc skeleton de base — shimmer animé */
export function Skeleton({ width = "100%", height = 16, borderRadius = 6, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

/** Card skeleton avec header + lignes de texte */
export function SkeletonCard({ lines = 2, showAvatar = false }) {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-header">
        {showAvatar && <Skeleton width={40} height={40} borderRadius={20} />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <div className="skeleton-card-body">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            width={i === lines - 1 ? "70%" : "100%"}
            height={12}
          />
        ))}
      </div>
    </div>
  );
}

/** Liste de N skeleton cards */
export function SkeletonList({ count = 3, lines = 2, showAvatar = false }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} showAvatar={showAvatar} />
      ))}
    </div>
  );
}

/** Skeleton barre de stats (ex. page équipe) */
export function SkeletonStats({ count = 4 }) {
  return (
    <div className="skeleton-stats">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat">
          <Skeleton width={40} height={28} borderRadius={4} />
          <Skeleton width={56} height={12} borderRadius={4} style={{ marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}
