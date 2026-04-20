import { useState } from 'react'
import { RefreshCw, Users2 } from 'lucide-react'
import { useEmailAccounts, useEmailAnalyticsOverview, useSyncStatus, useTriggerSync } from '@/hooks/useEmailAccounts'
import MetricCard from './MetricCard'
import RateCard from './RateCard'
import ProgressBar from './ProgressBar'
import AccountsTable from './AccountsTable'
import PlatformSummaryTable from './PlatformSummaryTable'
import BulkAssignModal from './BulkAssignModal'
import { usagePercent } from '@/utils/emailCalculations'
import type { EmailSyncSnapshot } from '@/types'

export default function OverviewTab() {
  const { data: accounts = [], isLoading: loadingAccounts } = useEmailAccounts()
  const { data: overview, isLoading: loadingOverview } = useEmailAnalyticsOverview()
  const { data: syncStatus } = useSyncStatus()
  const triggerSync = useTriggerSync()
  const [showBulkModal, setShowBulkModal] = useState(false)

  const isLoading = loadingAccounts || loadingOverview

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 p-5 h-20 animate-pulse" />
        ))}
      </div>
    )
  }

  // Collect all today snapshots from account objects
  const allSnapshots: EmailSyncSnapshot[] = accounts.flatMap(a => a.snapshots_today ?? [])
  const totalSent = overview?.total_sent ?? 0
  const totalLimit = overview?.total_limit ?? 0
  const usage = usagePercent(totalSent, totalLimit)
  const lastSync = syncStatus?.last_sync
    ? new Date(syncStatus.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="space-y-6">
      {/* Last synced + manual trigger */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 dark:text-gray-500">
          {lastSync ? `Last synced: ${lastSync}` : 'Not yet synced today'}
        </p>
        <button
          onClick={() => triggerSync.mutate()}
          disabled={triggerSync.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-gray-300 text-xs rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={triggerSync.isPending ? 'animate-spin' : ''} />
          Sync now
        </button>
      </div>

      {/* Section 1 — Capacity */}
      <div>
        <h3 className="text-xs font-medium text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-3">Capacity Today</h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Total Daily Limit"
            value={totalLimit.toLocaleString()}
            sub={`across ${accounts.length} inbox${accounts.length !== 1 ? 'es' : ''}`}
          />
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 p-4">
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Combined Sent Today</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalSent.toLocaleString()}</p>
            <ProgressBar value={usage} color="bg-blue-500" className="mt-2" />
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 text-right">{usage}% used</p>
          </div>
          <MetricCard
            label="Remaining Today"
            value={(overview?.remaining ?? 0).toLocaleString()}
            sub="across all inboxes"
            className="text-emerald-400"
          />
        </div>
      </div>

      {/* Section 2 — Weighted engagement */}
      <div>
        <h3 className="text-xs font-medium text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-3">Engagement (Weighted)</h3>
        <div className="grid grid-cols-5 gap-4">
          <RateCard metricKey="open_rate"   label="Open Rate"        rate={overview?.open_rate   ?? 0} count={overview?.total_opened}      />
          <RateCard metricKey="click_rate"  label="Click Rate"       rate={overview?.click_rate  ?? 0} count={overview?.total_clicked}     />
          <RateCard metricKey="reply_rate"  label="Reply Rate"       rate={overview?.reply_rate  ?? 0} count={overview?.total_replied}     />
          <RateCard metricKey="bounce_rate" label="Bounce Rate"      rate={overview?.bounce_rate ?? 0} count={overview?.total_bounced}     />
          <RateCard metricKey="unsub_rate"  label="Unsubscribe Rate" rate={overview?.unsub_rate  ?? 0} count={overview?.total_unsubscribed} />
        </div>
      </div>

      {/* Section 3 — Per-tool summary */}
      <div>
        <h3 className="text-xs font-medium text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-3">By Platform</h3>
        <PlatformSummaryTable accounts={accounts} allSnapshots={allSnapshots} />
      </div>

      {/* Section 4 — All accounts table */}
      <div>
        <h3 className="text-xs font-medium text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-3">All Inboxes</h3>
        <AccountsTable accounts={accounts} allSnapshots={allSnapshots} />
      </div>

      {/* Bulk assign */}
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-800 dark:text-white flex items-center gap-2">
              <Users2 size={15} className="text-blue-500 dark:text-blue-400" />
              Bulk Assign Leads to Platform
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Filter leads by stage or country and assign them to an email platform at once.
            </p>
          </div>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Bulk Assign
          </button>
        </div>
      </div>

      {showBulkModal && <BulkAssignModal onClose={() => setShowBulkModal(false)} />}
    </div>
  )
}
