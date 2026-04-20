import { useLatestDigest, type DigestHighlight } from '../../hooks/useToday'

export default function DailyDigestCard() {
  const { data, isLoading } = useLatestDigest()

  const stats = data?.stats
  const highlights = data?.highlights ?? []
  const digestDate = data?.digest_date

  return (
    <div className="card digest-card hoverable" style={{ height: '100%' }}>
      <div className="card-head">
        <div className="card-t">Yesterday's Digest</div>
        <div className="card-sub">
          {digestDate ? digestDate : 'not generated yet'}
        </div>
      </div>

      {isLoading && (
        <div style={{ color: 'var(--ink-3)', fontFamily: "'Geist Mono', monospace", fontSize: 11 }}>
          Loading…
        </div>
      )}

      {!isLoading && !data && (
        <div style={{ padding: '14px 4px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, color: 'var(--ink-2)' }}>
            No digest yet.
          </div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
            The evening job writes one per user per day.
          </div>
        </div>
      )}

      {stats && (
        <div className="digest-stats">
          <Stat label="Emails sent" v={stats.emails_sent} />
          <Stat label="Replies" v={stats.replies} />
          <Stat label="Meetings" v={stats.meetings} />
          <Stat label="Closed won" v={stats.closed_won} />
        </div>
      )}

      {highlights.map((h: DigestHighlight, i: number) => (
        <div key={i} className={`digest-bullet ${h.type}`}>
          <span className="dot" />
          <span>{h.text}</span>
        </div>
      ))}
    </div>
  )
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="digest-stat">
      <div className="digest-v">{v}</div>
      <div className="digest-l">{label}</div>
    </div>
  )
}
