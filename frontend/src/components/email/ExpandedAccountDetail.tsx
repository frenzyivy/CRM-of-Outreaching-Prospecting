import type { EmailAccount, EmailSyncSnapshot, EmailAnalyticsDaily } from '@/types'
import RateCard from './RateCard'
import { PLATFORM_TOKENS, PLATFORM_ORDER } from '@/utils/emailConstants'

interface Props {
  account: EmailAccount
  snapshots: EmailSyncSnapshot[]
}

type TodayRow = NonNullable<EmailAccount['today']>

const RATE_KEYS: { metricKey: keyof EmailAnalyticsDaily & string; label: string; countField: keyof TodayRow & string }[] = [
  { metricKey: 'open_rate',   label: 'Open Rate',        countField: 'total_opened'      },
  { metricKey: 'click_rate',  label: 'Click Rate',       countField: 'total_clicked'     },
  { metricKey: 'reply_rate',  label: 'Reply Rate',       countField: 'total_replied'     },
  { metricKey: 'bounce_rate', label: 'Bounce Rate',      countField: 'total_bounced'     },
  { metricKey: 'unsub_rate',  label: 'Unsubscribe Rate', countField: 'total_unsubscribed'},
]

export default function ExpandedAccountDetail({ account, snapshots }: Props) {
  const today = account.today
  const connections = account.platform_connections ?? []

  return (
    <div className="px-4 pb-4 space-y-4">
      {/* Rate cards */}
      <div className="grid grid-cols-5 gap-3">
        {RATE_KEYS.map(({ metricKey, label, countField }) => {
          const rate = today ? (today[metricKey as keyof TodayRow] as number ?? 0) : 0
          const count = today ? (today[countField as keyof TodayRow] as number ?? 0) : 0
          return (
            <RateCard
              key={metricKey}
              metricKey={metricKey}
              label={label}
              rate={rate}
              count={count}
            />
          )
        })}
      </div>

      {/* Per-platform breakdown */}
      {connections.length > 0 && (
        <div className="rounded-lg border border-slate-100 dark:border-white/10 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-400">
                <th className="text-left px-3 py-2">Platform</th>
                <th className="text-right px-3 py-2">Allocated</th>
                <th className="text-right px-3 py-2">Sent</th>
                <th className="text-right px-3 py-2">Opened</th>
                <th className="text-right px-3 py-2">Clicked</th>
                <th className="text-right px-3 py-2">Replied</th>
                <th className="text-right px-3 py-2">Bounced</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_ORDER.map(platform => {
                const conn = connections.find(c => c.platform === platform)
                if (!conn) return null
                const snap = snapshots.find(s => s.platform === platform)
                const token = PLATFORM_TOKENS[platform]
                return (
                  <tr key={platform} className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: token.bg, color: token.text }}
                      >
                        {token.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600 dark:text-gray-300">{conn.allocated_daily_limit}</td>
                    <td className="px-3 py-2 text-right text-slate-900 dark:text-white">{snap?.sent ?? 0}</td>
                    <td className="px-3 py-2 text-right text-slate-600 dark:text-gray-300">{snap?.opened ?? 0}</td>
                    <td className="px-3 py-2 text-right text-slate-600 dark:text-gray-300">{snap?.clicked ?? 0}</td>
                    <td className="px-3 py-2 text-right text-slate-600 dark:text-gray-300">{snap?.replied ?? 0}</td>
                    <td className="px-3 py-2 text-right text-slate-600 dark:text-gray-300">{snap?.bounced ?? 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
