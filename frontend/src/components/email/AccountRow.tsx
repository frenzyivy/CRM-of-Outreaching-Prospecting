import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { EmailAccount, EmailSyncSnapshot } from '@/types'
import PlatformPill from './PlatformPill'
import StackedBar from './StackedBar'
import HealthPill from './HealthPill'
import ExpandedAccountDetail from './ExpandedAccountDetail'
import { getHealthStatus, usagePercent } from '@/utils/emailCalculations'
import type { EmailPlatform } from '@/types'

interface Props {
  account: EmailAccount
  allSnapshots: EmailSyncSnapshot[]
}

export default function AccountRow({ account, allSnapshots }: Props) {
  const [expanded, setExpanded] = useState(false)
  const toggle = useCallback(() => setExpanded(e => !e), [])

  const today = account.today
  const totalSent = today?.total_sent ?? 0
  const health = getHealthStatus(account.global_daily_limit, totalSent)
  const usage = usagePercent(totalSent, account.global_daily_limit)
  const connections = account.platform_connections ?? []

  // Snapshots for this account
  const accountSnaps = allSnapshots.filter(s => s.email_account_id === account.id)

  // Build per-platform sent map for StackedBar
  const segments = connections.map(c => ({
    platform: c.platform as EmailPlatform,
    sent: accountSnaps.find(s => s.platform === c.platform)?.sent ?? 0,
  }))

  const fmt = (n: number | undefined) => (n ?? 0).toFixed(1) + '%'

  return (
    <>
      <tr
        className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
        onClick={toggle}
      >
        {/* Email + platform pills */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-800 dark:text-white">{account.email}</span>
            {connections.map(c => (
              <PlatformPill key={c.id} platform={c.platform as EmailPlatform} />
            ))}
          </div>
        </td>

        {/* Limit */}
        <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300 text-sm">{account.global_daily_limit}</td>

        {/* Sent */}
        <td className="px-4 py-3 text-right text-slate-900 dark:text-white text-sm">{totalSent}</td>

        {/* Remaining */}
        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 text-sm">
          {Math.max(0, account.global_daily_limit - totalSent)}
        </td>

        {/* Rates */}
        <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300 text-sm">{fmt(today?.open_rate)}</td>
        <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300 text-sm">{fmt(today?.click_rate)}</td>
        <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300 text-sm">{fmt(today?.reply_rate)}</td>
        <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300 text-sm">{fmt(today?.bounce_rate)}</td>
        <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300 text-sm">{fmt(today?.unsub_rate)}</td>

        {/* Stacked bar */}
        <td className="px-4 py-3 w-28">
          <div className="space-y-1">
            <StackedBar segments={segments} total={account.global_daily_limit} />
            <p className="text-xs text-slate-400 dark:text-gray-500 text-right">{usage}%</p>
          </div>
        </td>

        {/* Health */}
        <td className="px-4 py-3">
          <HealthPill status={health} />
        </td>

        {/* Expand toggle */}
        <td className="px-4 py-3 text-slate-400 dark:text-gray-400">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
          <td colSpan={12}>
            <ExpandedAccountDetail account={account} snapshots={accountSnaps} />
          </td>
        </tr>
      )}
    </>
  )
}
