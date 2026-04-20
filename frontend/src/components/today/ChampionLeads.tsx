import { useChampionLeads, type ChampionLead } from '../../hooks/useToday'

function tierFor(score: number): 'tier-a' | 'tier-b' | 'tier-c' {
  if (score >= 90) return 'tier-a'
  if (score >= 80) return 'tier-b'
  return 'tier-c'
}

export default function ChampionLeads() {
  const { data, isLoading, isError } = useChampionLeads()
  const leads = (data?.leads ?? []).slice(0, 6)
  const hasScoring = data?.has_scored_data ?? false

  return (
    <div className="card champ-card hoverable">
      <div className="card-head">
        <div className="card-t">Champion Leads</div>
        <div className="card-sub">
          {hasScoring && leads.length > 0 ? `Top ${leads.length} by intent score` : 'Scoring pending'}
        </div>
      </div>

      {isLoading && (
        <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: "'Geist Mono', monospace", fontSize: 11 }}>
          Loading…
        </div>
      )}

      {!isLoading && !isError && !hasScoring && (
        <EmptyState
          title="Intent scoring hasn't run yet."
          sub="The nightly job populates champion leads. Once it runs, your top 6 will show up here."
        />
      )}

      {!isLoading && !isError && hasScoring && leads.length === 0 && (
        <EmptyState
          title="No champion leads right now."
          sub="No open lead has cleared the 60-point threshold in the last 30 days."
        />
      )}

      {leads.length > 0 && (
        <div className="champ-grid">
          {leads.map((l) => (
            <ChampionRow key={l.id} lead={l} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChampionRow({ lead }: { lead: ChampionLead }) {
  return (
    <div className="champ-row">
      <div className={`champ-score ${tierFor(lead.intent_score)}`}>{lead.intent_score}</div>
      <div style={{ minWidth: 0 }}>
        <div className="champ-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.name}
        </div>
        <div className="champ-signal" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.primary_signal}
        </div>
      </div>
      <button className="btn sm primary">{lead.cta_label}</button>
    </div>
  )
}

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ padding: '18px 4px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16, color: 'var(--ink-2)' }}>
        {title}
      </div>
      <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
        {sub}
      </div>
    </div>
  )
}
