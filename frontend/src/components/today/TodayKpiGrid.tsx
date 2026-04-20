import type { DashboardStats } from '../../types'

interface Props {
  stats: DashboardStats | undefined
}

export default function TodayKpiGrid({ stats }: Props) {
  const s = stats ?? ({} as Partial<DashboardStats>)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 14,
      }}
    >
      <Kpi label="Outreaches" value={s.outreaches_today ?? 0} sub={`${s.emails_today ?? 0} emails · ${s.calls_today ?? 0} calls`} />
      <Kpi label="Meetings · 7d" value={s.meetings_count ?? 0} sub={`${s.proposals_count ?? 0} proposals`} />
      <Kpi label="Response Rate" value={`${s.response_rate ?? 0}%`} sub="Last period" />
      <Kpi label="Conversion" value={`${s.outreach_to_trial ?? 0}%`} sub="Outreach → trial" />

      <style>{`
        @media (max-width: 900px) {
          div[style*="repeat(4"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 420px) {
          div[style*="repeat(4"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-l">{label}</div>
      <div className="kpi-v">{value}</div>
      {sub && <div className="kpi-d">{sub}</div>}
    </div>
  )
}
