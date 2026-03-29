import { useState } from 'react'
import {
  Users, Target, Calendar, PlayCircle, ArrowRightLeft,
  UserCheck, DollarSign, CreditCard,
} from 'lucide-react'
import Header from '../layout/Header'
import EnhancedStatCard from './EnhancedStatCard'
import DashboardFilters from './DashboardFilters'
import QuickActions from './QuickActions'
import NeedsAttention from './NeedsAttention'
import ActivityFeed from './ActivityFeed'
import SchedulePanel from './SchedulePanel'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import type { DashboardFilters as DashboardFiltersType } from '../../hooks/useDashboardStats'

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFiltersType>({
    dateRange: 'This Month',
  })
  const { data: stats, isLoading } = useDashboardStats(filters)

  if (isLoading || !stats) {
    return (
      <div>
        <Header title="Dashboard" subtitle="Overview of your pipeline & activity" />
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Dashboard" subtitle="Overview of your pipeline & activity" />

      {/* ─── Filters ─── */}
      <div className="mb-5">
        <DashboardFilters onFilterChange={setFilters} />
      </div>

      {/* ─── KPI Cards (matching wireframe) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        <EnhancedStatCard
          title="Total Leads"
          value={stats.total_leads}
          icon={Users}
          color="bg-blue-500"
          subtitle={`${stats.total_companies} companies · ${stats.total_contacts} contacts`}
        />
        <EnhancedStatCard
          title="Outreaches"
          value={stats.outreaches_today}
          icon={Target}
          color="bg-violet-500"
          subtitle={`${stats.emails_today} emails · ${stats.calls_today} calls`}
        />
        <EnhancedStatCard
          title="Meetings Booked"
          value={stats.meetings_count}
          icon={Calendar}
          color="bg-indigo-500"
          subtitle={`${stats.proposals_count} proposals`}
        />
        <EnhancedStatCard
          title="Free Trial Started"
          value={stats.free_trial_count}
          icon={PlayCircle}
          color="bg-emerald-500"
          subtitle="Active trials"
        />
        <EnhancedStatCard
          title="Conversion"
          value={`${stats.outreach_to_trial}%`}
          icon={ArrowRightLeft}
          color="bg-cyan-500"
          subtitle="Outreach → Free Trial"
        />
        <EnhancedStatCard
          title="Clients (Paid)"
          value={stats.clients_paid}
          icon={UserCheck}
          color="bg-teal-600"
          subtitle={`${stats.closed_lost_count} lost`}
        />
        <EnhancedStatCard
          title="Revenue"
          value={stats.revenue_generated > 0 ? `₹${stats.revenue_generated.toLocaleString()}` : '—'}
          icon={DollarSign}
          color="bg-rose-500"
          subtitle="Generated"
        />
        <EnhancedStatCard
          title="Total Spent"
          value={stats.total_spent > 0 ? `₹${stats.total_spent.toLocaleString()}` : '—'}
          icon={CreditCard}
          color="bg-orange-500"
          subtitle="Tools + API"
        />
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="mb-6">
        <QuickActions />
      </div>

      {/* ─── Needs Attention ─── */}
      <div className="mb-6">
        <NeedsAttention />
      </div>

      {/* ─── Two-column bottom: Live Updates + Schedule ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityFeed />
        <SchedulePanel />
      </div>
    </div>
  )
}
