import { useState, useMemo } from 'react'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import PriorityQueue from './PriorityQueue'
import ChampionLeads from './ChampionLeads'
import GoalsCard from './GoalsCard'
import ActivityStreak from './ActivityStreak'
import DailyDigestCard from './DailyDigestCard'
import TodayKpiGrid from './TodayKpiGrid'
import TouchpointHeatmap from './TouchpointHeatmap'
import WeekSchedule from './WeekSchedule'

type Period = 'Today' | 'Last 2 Days' | 'This Week' | 'This Month'

const PERIODS: Period[] = ['Today', 'Last 2 Days', 'This Week', 'This Month']

function greeting(now: Date) {
  const h = now.getHours()
  if (h < 5)  return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

function contextLine(now: Date) {
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' })
  const day = now.getDate()
  const month = now.toLocaleDateString('en-GB', { month: 'long' })
  // ISO week number
  const tmp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${weekday}, ${day} ${month} · Week ${week}`
}

export default function TodayPage() {
  const now = useMemo(() => new Date(), [])
  const [period, setPeriod] = useState<Period>('Today')
  const { data: stats } = useDashboardStats({ dateRange: period })

  const priorityCount = (stats?.meetings_count ?? 0) + (stats?.proposals_count ?? 0)
  const headline = priorityCount > 0
    ? `${priorityCount} things`
    : 'a quiet moment'

  return (
    <div className="alainza view-fade">
      <header className="page-head">
        <div>
          <h1>
            {greeting(now)} Komal — <em>{headline}</em>{' '}
            {priorityCount > 0 ? 'need you today' : 'to catch your breath'}
          </h1>
          <div className="page-sub">{contextLine(now)}</div>
        </div>
        <div className="page-chips">
          {PERIODS.map((p) => (
            <button
              key={p}
              className={`chip ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      {/* 1. Priority Queue */}
      <section className="mb-4">
        <PriorityQueue />
      </section>

      {/* 2. Champion Leads */}
      <section className="mb-4">
        <ChampionLeads />
      </section>

      {/* 3. Three-col: Goals + Streak + Digest */}
      <section
        className="mb-4"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        <GoalsCard />
        <ActivityStreak />
        <DailyDigestCard />
      </section>

      {/* 4. KPI grid */}
      <section className="mb-4">
        <TodayKpiGrid stats={stats} />
      </section>

      {/* 5. Heatmap + schedule */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 14,
        }}
      >
        <TouchpointHeatmap />
        <WeekSchedule />
      </section>

      <style>{`
        @media (max-width: 1100px) {
          .alainza section[style*="repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          .alainza section[style*="1.2fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
