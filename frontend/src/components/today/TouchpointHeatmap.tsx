import { useActivityStreak } from '../../hooks/useToday'

// Renders the last 7 × 4 = 28 days as a simple heatmap. This is a Today-page
// view that shows *your* daily touch volume; the full reply-heatmap (by day-
// of-week × hour) lands in Phase 3 with the Best Time Heatmap.

export default function TouchpointHeatmap() {
  const { data, isLoading } = useActivityStreak()
  const days = (data?.days ?? []).slice(-28)

  // Pad to 28 cells with empties if backend returned fewer
  while (days.length < 28) days.unshift({ date: '', level: 0 })

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="card hoverable" style={{ height: '100%' }}>
      <div className="card-head">
        <div className="card-t">Touchpoint Heatmap</div>
        <div className="card-sub">Last 4 weeks</div>
      </div>

      {isLoading && (
        <div style={{ color: 'var(--ink-3)', fontFamily: "'Geist Mono', monospace", fontSize: 11 }}>
          Loading…
        </div>
      )}

      {!isLoading && (
        <div
          className="heatmap-grid"
          style={{ gridTemplateColumns: 'repeat(7, 1fr)', maxWidth: 360 }}
        >
          {days.map((d, i) => (
            <div
              key={`${d.date}-${i}`}
              className={`hm-cell ${d.level > 0 ? `lvl-${d.level}` : ''} ${d.date === today ? 'today' : ''}`}
              style={{
                background:
                  d.level === 0
                    ? 'var(--surface-2)'
                    : `rgba(96, 165, 250, ${0.15 + (d.level / 4) * 0.85})`,
              }}
              title={d.date ? `${d.date} · level ${d.level}` : ''}
            />
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 10,
          color: 'var(--ink-3)',
        }}
      >
        <span>less</span>
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((a) => (
          <div
            key={a}
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: `rgba(96, 165, 250, ${a})`,
            }}
          />
        ))}
        <span>more</span>
      </div>
    </div>
  )
}
