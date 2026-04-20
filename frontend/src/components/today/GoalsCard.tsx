import { useGoalsCurrent, type GoalProgress } from '../../hooks/useToday'

const labels: Record<GoalProgress['metric'], string> = {
  mrr: 'MRR',
  meetings_booked: 'Meetings booked',
  replies_received: 'Replies received',
  outreach_volume: 'Outreach volume',
}

function formatValue(metric: GoalProgress['metric'], v: number): string {
  if (metric === 'mrr') return `€${Math.round(v).toLocaleString()}`
  return Math.round(v).toLocaleString()
}

function paceClass(status: GoalProgress['status']): string {
  if (status === 'ahead') return 'ahead'
  if (status === 'behind') return 'behind'
  return 'on'
}

function paceLabel(g: GoalProgress): string {
  if (g.status === 'ahead')  return 'ahead of pace'
  if (g.status === 'behind') return 'behind pace'
  if (g.status === 'slightly_behind') return 'slightly behind'
  return 'on pace'
}

export default function GoalsCard() {
  const { data, isLoading } = useGoalsCurrent()
  const goals = data?.goals ?? []

  return (
    <div className="card hoverable" style={{ height: '100%' }}>
      <div className="card-head">
        <div className="card-t">Goals · {data?.period_label ?? 'This month'}</div>
        <div className="card-sub">
          {goals.length > 0 ? `${goals.length} active` : ''}
        </div>
      </div>

      {isLoading && (
        <div style={{ padding: '14px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: "'Geist Mono', monospace", fontSize: 11 }}>
          Loading…
        </div>
      )}

      {!isLoading && goals.length === 0 && (
        <div style={{ padding: '14px 4px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, color: 'var(--ink-2)' }}>
            No goals set for this period.
          </div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
            POST /api/goals to set MRR, meetings, replies, outreach targets.
          </div>
        </div>
      )}

      {goals.map((g) => {
        const pct = g.target_value > 0
          ? Math.min(100, (g.current_value / g.target_value) * 100)
          : 0
        const barClass = g.status === 'ahead' ? 'bar-g'
                       : g.status === 'behind' ? 'bar-b'
                       : g.status === 'slightly_behind' ? 'bar-m'
                       : 'bar-brand'
        return (
          <div key={g.id} className="goal-row">
            <div className="goal-head">
              <span className="goal-name">{labels[g.metric]}</span>
              <span className={`goal-pct ${paceClass(g.status)}`}>
                {formatValue(g.metric, g.current_value)}
                {' / '}
                {formatValue(g.metric, g.target_value)}
              </span>
            </div>
            <div className="bar-track">
              <div
                className={`bar-fill ${barClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="goal-sub">
              {Math.round(pct)}% · {paceLabel(g)} · {g.days_remaining}d left
            </div>
          </div>
        )
      })}
    </div>
  )
}
