import { useQuery } from '@tanstack/react-query'
import api from '../../api/client'

interface AttentionItem {
  id: string
  type: 'unreplied' | 'stale' | 'bounced'
  lead_name: string
  email: string
  detail: string
  days_ago: number
}

interface NeedsAttentionData {
  items: AttentionItem[]
  total: number
}

const badgeClassByType: Record<AttentionItem['type'], string> = {
  unreplied: 'reply',
  stale: 'mtg',
  bounced: 'cold',
}

const ctaByType: Record<AttentionItem['type'], string> = {
  unreplied: 'Reply →',
  stale: 'Nudge →',
  bounced: 'Review →',
}

export default function PriorityQueue() {
  const { data, isLoading } = useQuery<NeedsAttentionData>({
    queryKey: ['needs-attention'],
    queryFn: async () => (await api.get('/dashboard/needs-attention')).data,
    refetchInterval: 60_000,
  })

  const items = (data?.items ?? []).slice(0, 5)
  const total = data?.total ?? 0

  return (
    <div className="card pq-card hoverable">
      <div className="card-head">
        <div className="card-t">Priority Queue</div>
        <div className="card-sub">
          {total > 0 ? `${total} item${total === 1 ? '' : 's'} · top ${items.length} shown` : 'Nothing urgent'}
        </div>
      </div>

      {isLoading && (
        <div style={{ padding: '22px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: "'Geist Mono', monospace", fontSize: 11 }}>
          Loading…
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div style={{ padding: '22px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          <span className="em" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 16 }}>
            All caught up.
          </span>{' '}
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11 }}>
            Nothing needs you right now.
          </span>
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="pq-row">
          <span className={`qbadge ${badgeClassByType[item.type]}`}>{item.type === 'unreplied' ? 'Reply' : item.type}</span>
          <div>
            <div className="pq-name">{item.lead_name || item.email}</div>
            <div className="pq-sub">{item.detail}</div>
          </div>
          <button className="btn sm primary">{ctaByType[item.type]}</button>
        </div>
      ))}
    </div>
  )
}
