import type { ToolQuota } from '../../types'

interface Props {
  quota: ToolQuota
  compact?: boolean
}

function ProgressBar({ value, max, color }: { value: number; max: number | null; color: string }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0
  const hasMax = max !== null && max > 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        {hasMax ? (
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className={`h-full rounded-full w-full opacity-20 ${color}`} />
        )}
      </div>
      <span className="text-xs text-slate-500 w-24 text-right shrink-0">
        {hasMax
          ? `${value.toLocaleString()} / ${max!.toLocaleString()}`
          : `${value.toLocaleString()} sent`}
      </span>
    </div>
  )
}

export default function QuotaBars({ quota, compact = false }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-xs text-slate-500">
          <span className="font-medium text-slate-700">{quota.plan_name}</span>
        </div>
        {quota.reset_date && (
          <div className="text-xs text-slate-400">
            Resets {new Date(quota.reset_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
        <div className="text-xs">
          <span className="text-slate-600 font-medium">{quota.emails_sent.toLocaleString()}</span>
          {quota.emails_remaining !== null && (
            <span className="text-slate-400"> / {(quota.emails_sent + quota.emails_remaining).toLocaleString()} emails</span>
          )}
        </div>
        {quota.contacts_used !== null && (
          <div className="text-xs">
            <span className="text-slate-600 font-medium">{quota.contacts_used.toLocaleString()}</span>
            {quota.contacts_max && (
              <span className="text-slate-400"> / {quota.contacts_max.toLocaleString()} contacts</span>
            )}
          </div>
        )}
        {!quota.connected && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Demo data</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm font-semibold text-slate-800">{quota.plan_name}</span>
          {quota.reset_date && (
            <span className="text-xs text-slate-400 ml-2">
              · Resets {new Date(quota.reset_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
        {!quota.connected && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Demo data — connect API key to see live data
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Emails sent</span>
            {quota.emails_remaining !== null && (
              <span className="text-slate-400">{quota.emails_remaining.toLocaleString()} remaining</span>
            )}
          </div>
          <ProgressBar
            value={quota.emails_sent}
            max={quota.emails_remaining !== null ? quota.emails_sent + quota.emails_remaining : null}
            color="bg-blue-500"
          />
        </div>

        {quota.contacts_used !== null && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Contacts used</span>
              {quota.contacts_max && (
                <span className="text-slate-400">
                  {(quota.contacts_max - quota.contacts_used).toLocaleString()} slots remaining
                </span>
              )}
            </div>
            <ProgressBar
              value={quota.contacts_used}
              max={quota.contacts_max}
              color="bg-emerald-500"
            />
          </div>
        )}
      </div>
    </div>
  )
}
