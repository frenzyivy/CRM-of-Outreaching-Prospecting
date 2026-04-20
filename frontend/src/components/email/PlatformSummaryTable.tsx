import type { EmailAccount, EmailSyncSnapshot, EmailPlatform } from '@/types'
import { PLATFORM_TOKENS, PLATFORM_ORDER } from '@/utils/emailConstants'
import ProgressBar from './ProgressBar'
import { usagePercent } from '@/utils/emailCalculations'

interface Props {
  accounts: EmailAccount[]
  allSnapshots: EmailSyncSnapshot[]
}

function rate(num: number, denom: number) {
  return denom > 0 ? ((num / denom) * 100).toFixed(1) + '%' : '—'
}

export default function PlatformSummaryTable({ accounts, allSnapshots }: Props) {
  // For each platform, aggregate across all accounts connected to it
  const rows = PLATFORM_ORDER.map(platform => {
    const connectedAccounts = accounts.filter(a =>
      (a.platform_connections ?? []).some(c => c.platform === platform)
    )
    const snaps = allSnapshots.filter(s => s.platform === platform)

    const allocated = connectedAccounts.reduce((acc, a) => {
      const conn = (a.platform_connections ?? []).find(c => c.platform === platform)
      return acc + (conn?.allocated_daily_limit ?? 0)
    }, 0)

    const sent       = snaps.reduce((a, s) => a + s.sent, 0)
    const opened     = snaps.reduce((a, s) => a + s.opened, 0)
    const clicked    = snaps.reduce((a, s) => a + s.clicked, 0)
    const replied    = snaps.reduce((a, s) => a + s.replied, 0)
    const bounced    = snaps.reduce((a, s) => a + s.bounced, 0)
    const unsub      = snaps.reduce((a, s) => a + s.unsubscribed, 0)
    const usage      = usagePercent(sent, allocated)

    return { platform, connectedAccounts: connectedAccounts.length, allocated, sent, opened, clicked, replied, bounced, unsub, usage }
  })

  // Footer totals
  const totals = rows.reduce(
    (acc, r) => ({
      accts:    acc.accts    + r.connectedAccounts,
      alloc:    acc.alloc    + r.allocated,
      sent:     acc.sent     + r.sent,
      opened:   acc.opened   + r.opened,
      clicked:  acc.clicked  + r.clicked,
      replied:  acc.replied  + r.replied,
      bounced:  acc.bounced  + r.bounced,
      unsub:    acc.unsub    + r.unsub,
    }),
    { accts: 0, alloc: 0, sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, unsub: 0 },
  )

  return (
    <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-400">
              <th className="text-left px-4 py-3 font-medium">Tool</th>
              <th className="text-right px-4 py-3 font-medium">Accts</th>
              <th className="text-right px-4 py-3 font-medium">Alloc.</th>
              <th className="text-right px-4 py-3 font-medium">Sent</th>
              <th className="text-right px-4 py-3 font-medium">Open%</th>
              <th className="text-right px-4 py-3 font-medium">Click%</th>
              <th className="text-right px-4 py-3 font-medium">Reply%</th>
              <th className="text-right px-4 py-3 font-medium">Bounce%</th>
              <th className="text-right px-4 py-3 font-medium">Unsub%</th>
              <th className="text-left px-4 py-3 font-medium w-28">Usage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const token = PLATFORM_TOKENS[r.platform as EmailPlatform]
              return (
                <tr key={r.platform} className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: token.bg, color: token.text }}
                    >
                      {token.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{r.connectedAccounts}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{r.allocated}</td>
                  <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{r.sent}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{rate(r.opened, r.sent)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{rate(r.clicked, r.sent)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{rate(r.replied, r.sent)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{rate(r.bounced, r.sent)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{rate(r.unsub, r.sent)}</td>
                  <td className="px-4 py-3 w-28">
                    <div className="space-y-1">
                      <ProgressBar value={r.usage} color="bg-blue-500" />
                      <p className="text-xs text-slate-400 dark:text-gray-500 text-right">{r.usage}%</p>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Weighted footer */}
          <tfoot>
            <tr className="border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 font-semibold">
              <td className="px-4 py-3 text-slate-600 dark:text-gray-300">Total</td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{totals.accts}</td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{totals.alloc}</td>
              <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{totals.sent}</td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{rate(totals.opened, totals.sent)}</td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{rate(totals.clicked, totals.sent)}</td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{rate(totals.replied, totals.sent)}</td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{rate(totals.bounced, totals.sent)}</td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-gray-300">{rate(totals.unsub, totals.sent)}</td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
