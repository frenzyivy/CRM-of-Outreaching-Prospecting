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
  const { data: stats, isLoading, isError } = useDashboardStats(filters)

  const emptyStats = {
    total_leads: 0, total_companies: 0, total_contacts: 0,
    outreaches_today: 0, emails_today: 0, calls_today: 0,
    notes_today: 0, stage_changes_today: 0,
    meetings_count: 0, proposals_count: 0,
    closed_won_count: 0, closed_lost_count: 0,
    response_rate: 0, conversion_rate: 0,
    free_trial_count: 0, clients_paid: 0, outreach_to_trial: 0,
    revenue_generated: 0, total_spent: 0,
    stage_counts: {}, excel_last_modified: 0, excel_error: null,
  }

  if (isLoading) {
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

  const displayStats = stats ?? emptyStats

  return (
    <div>
      <Header title="Dashboard" subtitle="Overview of your pipeline & activity" />

      {/* ─── Filters ─── */}
      <div className="mb-5">
        <DashboardFilters onFilterChange={setFilters} />
      </div>

      {/* ─── KPI Cards (matching wireframe) ─── */}
      {isError && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-xs text-red-600 dark:text-red-400">
          Could not load dashboard stats — backend may be offline. Showing last known values.
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        <EnhancedStatCard
          title="Total Leads"
          value={displayStats.total_leads}
          icon={Users}
          color="bg-blue-500"
          subtitle={`${displayStats.total_companies} companies · ${displayStats.total_contacts} contacts`}
        />
        <EnhancedStatCard
          title="Outreaches"
          value={displayStats.outreaches_today}
          icon={Target}
          color="bg-violet-500"
          subtitle={`${displayStats.emails_today} emails · ${displayStats.calls_today} calls`}
        />
        <EnhancedStatCard
          title="Meetings Booked"
          value={displayStats.meetings_count}
          icon={Calendar}
          color="bg-indigo-500"
          subtitle={`${displayStats.proposals_count} proposals`}
        />
        <EnhancedStatCard
          title="Free Trial Started"
          value={displayStats.free_trial_count}
          icon={PlayCircle}
          color="bg-emerald-500"
          subtitle="Active trials"
        />
        <EnhancedStatCard
          title="Conversion"
          value={`${displayStats.outreach_to_trial}%`}
          icon={ArrowRightLeft}
          color="bg-cyan-500"
          subtitle="Outreach → Free Trial"
        />
        <EnhancedStatCard
          title="Clients (Paid)"
          value={displayStats.clients_paid}
          icon={UserCheck}
          color="bg-teal-600"
          subtitle={`${displayStats.closed_lost_count} lost`}
        />
        <EnhancedStatCard
          title="Revenue"
          value={displayStats.revenue_generated > 0 ? `₹${displayStats.revenue_generated.toLocaleString()}` : '—'}
          icon={DollarSign}
          color="bg-rose-500"
          subtitle="Generated"
        />
        <EnhancedStatCard
          title="Total Spent"
          value={displayStats.total_spent > 0 ? `₹${displayStats.total_spent.toLocaleString()}` : '—'}
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
