import type { EmailPlatform, EmailSyncSnapshot } from '@/types'
import { useEmailAccounts, useEmailPlatformMetrics } from '@/hooks/useEmailAccounts'
import MetricCard from './MetricCard'
import RateCard from './RateCard'
import ProgressBar from './ProgressBar'
import PlatformPill from './PlatformPill'
import StackedBar from './StackedBar'
import { PLATFORM_TOKENS } from '@/utils/emailConstants'
import { usagePercent } from '@/utils/emailCalculations'

interface Props {
  platform: EmailPlatform
}

export default function PlatformTab({ platform }: Props) {
  const { data: metrics, isLoading: loadingMetrics } = useEmailPlatformMetrics(platform)
  const { data: accounts = [], isLoading: loadingAccounts } = useEmailAccounts()

  if (loadingMetrics || loadingAccounts) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 p-5 h-20 animate-pulse" />
        ))}
      </div>
    )
  }

  const token = PLATFORM_TOKENS[platform]

  // Accounts connected to this platform
  const connected = accounts.filter(a =>
    (a.platform_connections ?? []).some(c => c.platform === platform)
  )

  const allSnapshots: EmailSyncSnapshot[] = accounts.flatMap(a => a.snapshots_today ?? [])
  const platformSnaps = allSnapshots.filter(s => s.platform === platform)

  const totalSent = metrics?.total_sent ?? 0
  const totalAllocated = metrics?.total_allocated ?? 0
  const usage = usagePercent(totalSent, totalAllocated)

  return (
    <div className="space-y-6">
      {/* Subtitle */}
      <p className="text-sm text-slate-500 dark:text-gray-400">
        <span className="font-semibold text-slate-800 dark:text-white">{metrics?.connected_accounts ?? 0}</span>{' '}
        inbox{(metrics?.connected_accounts ?? 0) !== 1 ? 'es' : ''} allocated to{' '}
        <span style={{ color: token.color }} className="font-medium">{token.label}</span>
      </p>

      {/* Capacity cards */}
      <div>
        <h3 className="text-xs font-medium text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-3">Capacity Today</h3>
        <div className="grid grid-cols-4 gap-4">
          <MetricCard label="Allocated" value={totalAllocated.toLocaleString()} sub="daily limit for this platform" />
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 p-4">
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Sent Today</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalSent.toLocaleString()}</p>
            <ProgressBar value={usage} color="bg-blue-500" className="mt-2" />
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 text-right">{usage}%</p>
          </div>
          <MetricCard label="Remaining" value={(metrics?.remaining ?? 0).toLocaleString()} />
          <MetricCard label="Connected Accounts" value={metrics?.connected_accounts ?? 0} />
        </div>
      </div>

      {/* Engagement rate cards */}
      <div>
        <h3 className="text-xs font-medium text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-3">Engagement</h3>
        <div className="grid grid-cols-5 gap-4">
          <RateCard metricKey="open_rate"   label="Open Rate"        rate={metrics?.open_rate   ?? 0} count={metrics?.total_opened}      />
          <RateCard metricKey="click_rate"  label="Click Rate"       rate={metrics?.click_rate  ?? 0} count={metrics?.total_clicked}     />
          <RateCard metricKey="reply_rate"  label="Reply Rate"       rate={metrics?.reply_rate  ?? 0} count={metrics?.total_replied}     />
          <RateCard metricKey="bounce_rate" label="Bounce Rate"      rate={metrics?.bounce_rate ?? 0} count={metrics?.total_bounced}     />
          <RateCard metricKey="unsub_rate"  label="Unsubscribe Rate" rate={metrics?.unsub_rate  ?? 0} count={metrics?.total_unsubscribed} />
        </div>
      </div>

      {/* Per-account breakdown */}
      <div>
        <h3 className="text-xs font-medium text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-3">Connected Inboxes</h3>
        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-400">
                  <th className="text-left px-4 py-3 font-medium">Inbox</th>
                  <th className="text-left px-4 py-3 font-medium">Also on</th>
                  <th className="text-right px-4 py-3 font-medium">Global Lim.</th>
                  <th className="text-right px-4 py-3 font-medium">Platform Alloc.</th>
                  <th className="text-right px-4 py-3 font-medium">Sent Here</th>
                  <th className="text-right px-4 py-3 font-medium">Others Sent</th>
                  <th className="text-right px-4 py-3 font-medium">Open%</th>
                  <th className="text-right px-4 py-3 font-medium">Reply%</th>
                  <th className="text-right px-4 py-3 font-medium">Bounce%</th>
                  <th className="text-left px-4 py-3 font-medium w-24">Global Left</th>
                  <th className="text-left px-4 py-3 font-medium w-28">Usage Bar</th>
                </tr>
              </thead>
              <tbody>
                {connected.map(account => {
                  const conn = (account.platform_connections ?? []).find(c => c.platform === platform)
                  const snap = platformSnaps.find(s => s.email_account_id === account.id)
                  const otherSnaps = allSnapshots.filter(
                    s => s.email_account_id === account.id && s.platform !== platform
                  )
                  const sentHere = snap?.sent ?? 0
                  const othersSent = otherSnaps.reduce((a, s) => a + s.sent, 0)
                  const totalSentAcc = sentHere + othersSent
                  const globalLeft = Math.max(0, account.global_daily_limit - totalSentAcc)
                  const usagePct = usagePercent(totalSentAcc, account.global_daily_limit)

                  // Build segments for StackedBar
                  const segments = (account.platform_connections ?? []).map(c => ({
                    platform: c.platform as EmailPlatform,
                    sent: allSnapshots.find(s => s.email_account_id === account.id && s.platform === c.platform)?.sent ?? 0,
                  }))

                  // Other platforms this account is also on
                  const otherPlatforms = (account.platform_connections ?? [])
                    .filter(c => c.platform !== platform)
                    .map(c => c.platform as EmailPlatform)

                  const openPct = snap && snap.sent > 0 ? ((snap.opened / snap.sent) * 100).toFixed(1) + '%' : '—'
                  const replyPct = snap && snap.sent > 0 ? ((snap.replied / snap.sent) * 100).toFixed(1) + '%' : '—'
                  const bouncePct = snap && snap.sent > 0 ? ((snap.bounced / snap.sent) * 100).toFixed(1) + '%' : '—'

                  return (
                    <tr key={account.id} className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 text-slate-800 dark:text-white">{account.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {otherPlatforms.map(p => (
                            <PlatformPill key={p} platform={p} />
                          ))}
                          {otherPlatforms.length === 0 && <span className="text-slate-400 dark:text-gray-600">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{account.global_daily_limit}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{conn?.allocated_daily_limit ?? 0}</td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{sentHere}</td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-gray-400">{othersSent}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{openPct}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{replyPct}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{bouncePct}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{globalLeft}</td>
                      <td className="px-4 py-3 w-28">
                        <div className="space-y-1">
                          <StackedBar segments={segments} total={account.global_daily_limit} />
                          <p className="text-xs text-slate-400 dark:text-gray-500 text-right">{usagePct}%</p>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {connected.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-slate-400 dark:text-gray-500">
                      No accounts connected to {token.label} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* API source note */}
      <p className="text-xs text-slate-400 dark:text-gray-600 text-center">
        Data fetched from {token.label} API · Synced every 15 minutes
      </p>
    </div>
  )
}
