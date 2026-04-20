import { useActivityStreak } from '../../hooks/useToday'

export default function ActivityStreak() {
  const { data, isLoading } = useActivityStreak()
  const current = data?.current_streak ?? 0
  const longest = data?.longest_streak ?? 0
  const days = data?.days ?? []

  // Last 30 days, newest last
  const cells = days.slice(-30)

  return (
    <div className="card hoverable" style={{ height: '100%' }}>
      <div className="card-head">
        <div className="card-t">Activity Streak</div>
        <div className="card-sub">Last 30 days</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span className="streak-big">{current}</span>
        <span className="streak-label">days</span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10,
            color: 'var(--ink-3)',
          }}
        >
          best: {longest}
        </span>
      </div>

      {isLoading && (
        <div style={{ color: 'var(--ink-3)', fontFamily: "'Geist Mono', monospace", fontSize: 11 }}>
          Loading…
        </div>
      )}

      {!isLoading && (
        <div className="streak-grid">
          {cells.map((d) => (
            <div
              key={d.date}
              className={`streak-cell ${d.level > 0 ? `lvl-${d.level}` : ''}`}
              title={`${d.date} · level ${d.level}`}
            />
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 10,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: "'Geist Mono', monospace",
          fontSize: 9.5,
          color: 'var(--ink-3)',
          letterSpacing: '0.04em',
        }}
      >
        <span>less</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className={`streak-cell lvl-${l}`}
              style={{ width: 10, height: 10, aspectRatio: 'unset' }}
            />
          ))}
        </div>
        <span>more</span>
      </div>
    </div>
  )
}
