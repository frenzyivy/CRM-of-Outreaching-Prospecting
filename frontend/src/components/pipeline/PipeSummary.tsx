import { usePipelineSummary } from '../../hooks/usePipelineExtras'

function fmtEur(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000)    return `€${Math.round(n / 1000)}k`
  if (n >= 1000)      return `€${(n / 1000).toFixed(1)}k`
  return `€${Math.round(n).toLocaleString()}`
}

export default function PipeSummary() {
  const { data, isLoading } = usePipelineSummary()

  return (
    <div className="pipe-summary alainza">
      <div>
        <div className="stat-v">{isLoading ? '…' : fmtEur(data?.weighted_pipeline_eur)}</div>
        <div className="stat-l">Weighted pipeline</div>
        {data?.value_source === 'placeholder' && (
          <div className="stat-sub">€ placeholder — deals table lands Phase 5</div>
        )}
      </div>

      <div>
        <div className="stat-v">{isLoading ? '…' : fmtEur(data?.avg_deal_value_eur)}</div>
        <div className="stat-l">Avg deal size</div>
        {data?.value_source === 'placeholder' && (
          <div className="stat-sub">AVG_DEAL_SIZE_EUR env var</div>
        )}
      </div>

      <div>
        <div className="stat-v">{isLoading ? '…' : `${data?.close_rate_pct?.toFixed(1) ?? 0}%`}</div>
        <div className="stat-l">Close rate</div>
        <div className="stat-sub">won / closed</div>
      </div>

      <div>
        <div className="stat-v">{isLoading ? '…' : data?.cold_pool ?? 0}</div>
        <div className="stat-l">Cold pool</div>
        <div className="stat-sub">new · researched</div>
      </div>

      <div>
        <div className="stat-v">{isLoading ? '…' : data?.stuck_leads ?? 0}</div>
        <div className="stat-l">Stuck 14d+</div>
        <div className="stat-sub">needs a nudge</div>
      </div>

      <button className="btn primary" onClick={() => { /* wired in Phase 3 */ }}>
        + Add Lead
      </button>
    </div>
  )
}
