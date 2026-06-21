export function SkeletonList() {
  return (
    <div className="attractions-list" aria-label="Carregando atrações" role="status">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="attraction-card skeleton-card" key={index}>
          <div className="attraction-card-top">
            <div className="attraction-title-row">
              <span className="skeleton skeleton-rank" />
              <span className="skeleton-copy">
                <span className="skeleton skeleton-title" />
                <span className="skeleton skeleton-subtitle" />
              </span>
            </div>
            <span className="skeleton skeleton-time" />
          </div>
          <div className="attraction-card-footer skeleton-footer">
            <span className="skeleton skeleton-chip" />
            <span className="skeleton skeleton-chip" />
            <span className="skeleton skeleton-chip" />
          </div>
          <div className="daily-history skeleton-daily-history">
            <span className="skeleton skeleton-history-stat" />
            <span className="skeleton skeleton-history-stat" />
            <span className="skeleton skeleton-history-stat" />
          </div>
          <div className="prediction-panel skeleton-prediction">
            <span className="skeleton skeleton-prediction-label" />
            <span className="skeleton skeleton-prediction-value" />
          </div>
        </div>
      ))}
    </div>
  )
}
