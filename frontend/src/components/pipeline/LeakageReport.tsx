import { AlertTriangle, Clock, MessageSquare, Ghost, FileText } from 'lucide-react'
import { useLeakageAlerts, useLeakageBulkAction, type LeakageAlert, type LeakageAlertType } from '../../hooks/usePipelineExtras'

const ICONS: Record<LeakageAlertType, typeof AlertTriangle> = {
  stuck_followup2:              Clock,
  no_post_meeting_followup:     MessageSquare,
  unanswered_positive_replies:  AlertTriangle,
  ghosted:                      Ghost,
  stale_proposals:              FileText,
}

export default function LeakageReport() {
  const { data, isLoading, isError } = useLeakageAlerts()
  const { mutate: bulkAction, isPending } = useLeakageBulkAction()

  const alerts = data?.alerts ?? []
  const total = data?.total ?? 0

  return (
    <div className="card hoverable" style={{ marginTop: 14 }}>
      <div className="card-head">
        <div className="card-t">Lead Leakage Report</div>
        <div className="card-sub">
          {isLoading ? 'loading…'
            : total === 0 ? 'No leaks — nice'
            : `${total} lead${total === 1 ? '' : 's'} slipping`}
        </div>
      </div>

      {isError && (
        <div style={{ padding: '14px 0', color: 'var(--ink-3)', fontFamily: "'Geist Mono', monospace", fontSize: 11 }}>
          Could not load leakage alerts. Make sure the Phase 2 migration ran.
        </div>
      )}

      {!isLoading && !isError && total === 0 && (
        <div style={{ padding: '14px 4px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, color: 'var(--ink-2)' }}>
            Nothing is leaking.
          </div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
            Every open lead has been touched recently enough.
          </div>
        </div>
      )}

      {!isLoading && !isError && alerts.map((a) => (
        <LeakRow
          key={a.alert_type}
          alert={a}
          disabled={isPending || a.count === 0}
          onAction={() => bulkAction({ alertType: a.alert_type })}
        />
      ))}
    </div>
  )
}

function LeakRow({ alert, disabled, onAction }: {
  alert: LeakageAlert
  disabled: boolean
  onAction: () => void
}) {
  const Icon = ICONS[alert.alert_type]
  return (
    <div className="leak-row">
      <div className={`leak-icon ${alert.severity}`}>
        <Icon size={16} />
      </div>
      <div>
        <div className="leak-title">{alert.title}</div>
        <div className="leak-sub">
          {alert.count === 0 ? 'clean'
            : `${alert.count} lead${alert.count === 1 ? '' : 's'}${alert.total_value != null ? ` · €${Math.round(alert.total_value).toLocaleString()} at risk` : ''}`}
        </div>
      </div>
      <div className="leak-count">{alert.count || ''}</div>
      <button
        className="btn sm primary"
        onClick={onAction}
        disabled={disabled}
        title={alert.count === 0 ? 'Nothing to act on' : `Apply ${alert.cta.action} to ${alert.count} lead${alert.count === 1 ? '' : 's'}`}
      >
        {alert.cta.label}
      </button>
    </div>
  )
}
