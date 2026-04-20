import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import PipelineColumn from './PipelineColumn'
import LeadDetailModal from '../leads/LeadDetailModal'
import FieldsToggle from './FieldsToggle'
import PipeSummary from './PipeSummary'
import LeakageReport from './LeakageReport'
import { usePipeline, useUpdateStage } from '../../hooks/usePipeline'
import type { Lead } from '../../types'
import { isCompanyOnly } from '../../types'
import type { CompanyField, LeadField } from './fieldConfig'
import {
  loadCompanyFields, loadLeadFields,
  saveLeadFields,
} from './fieldConfig'

// ── Board ────────────────────────────────────────────────────────────────────

function PipelineBoard({
  search,
  onLeadClick,
  visibleCompanyFields,
  visibleLeadFields,
}: {
  search: string
  onLeadClick: (lead: Lead) => void
  visibleCompanyFields: Set<CompanyField>
  visibleLeadFields: Set<LeadField>
}) {
  const { data: pipeline, isLoading } = usePipeline()
  const { mutate: updateStage } = useUpdateStage()
  const draggingLead = useRef<Lead | null>(null)

  // Stable callbacks so `memo(PipelineColumn)` actually skips re-renders.
  // Without these, new inline function identities on every render defeat memo.
  const handleDragStart = useCallback((lead: Lead) => {
    draggingLead.current = lead
  }, [])
  const handleDrop = useCallback((targetStage: string) => {
    const lead = draggingLead.current
    if (!lead || lead.stage === targetStage) return
    updateStage({ leadId: lead.id, stage: targetStage })
    draggingLead.current = null
  }, [updateStage])

  const filteredStages = useMemo(() => {
    if (!pipeline || !search.trim()) return pipeline?.stages ?? {}
    const q = search.toLowerCase()
    const result: Record<string, Lead[]> = {}
    for (const stage of pipeline.stage_order) {
      result[stage] = (pipeline.stages[stage] ?? []).filter((lead) => {
        const name = isCompanyOnly(lead)
          ? lead.company_name ?? ''
          : lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || ''
        const subtitle = lead.company_name || lead.industry || ''
        return name.toLowerCase().includes(q) || subtitle.toLowerCase().includes(q)
      })
    }
    return result
  }, [pipeline, search])

  if (isLoading || !pipeline) {
    return (
      <div className="pipe-board">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="pipe-col">
            <div className="pipe-col-head">
              <span className="pipe-stage-dot" style={{ background: 'var(--ink-4)' }} />
              <span className="pipe-col-title" style={{ opacity: 0.4 }}>loading…</span>
            </div>
            <div className="pipe-col-drop" style={{ minHeight: 160, opacity: 0.5 }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="pipe-board">
      {pipeline.stage_order.map((stage) => (
        <PipelineColumn
          key={stage}
          stage={stage}
          label={pipeline.stage_labels[stage]}
          leads={filteredStages[stage] ?? []}
          onLeadClick={onLeadClick}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          visibleCompanyFields={visibleCompanyFields}
          visibleLeadFields={visibleLeadFields}
        />
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [selected, setSelected] = useState<Lead | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Field visibility — loaded from localStorage, persisted on change
  const [visibleCompanyFields] = useState<Set<CompanyField>>(loadCompanyFields)
  const [visibleLeadFields, setVisibleLeadFields] = useState<Set<LeadField>>(loadLeadFields)

  function handleLeadFieldsChange(next: Set<LeadField>) {
    setVisibleLeadFields(next)
    saveLeadFields(next)
  }

  return (
    <div className="alainza view-fade">
      {/* Page head */}
      <header className="page-head">
        <div>
          <h1>Pipeline — <em>eleven stages</em> of active deals</h1>
          <div className="page-sub">Drag a card to move it · heat dot shows days since last touch</div>
        </div>
        <div className="page-chips">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search
              size={13}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search leads…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 28,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                fontSize: 12.5,
                fontFamily: "'Geist', sans-serif",
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </div>

          <button className="btn">
            <SlidersHorizontal size={13} />
            Filter
          </button>

          <FieldsToggle
            mode="lead"
            visible={visibleLeadFields}
            onChange={handleLeadFieldsChange}
          />
        </div>
      </header>

      {/* Board */}
      <PipelineBoard
        search={search}
        onLeadClick={setSelected}
        visibleCompanyFields={visibleCompanyFields}
        visibleLeadFields={visibleLeadFields}
      />

      {/* Weighted pipeline summary strip */}
      <PipeSummary />

      {/* Lead Leakage Report */}
      <LeakageReport />

      {selected && (
        <LeadDetailModal lead={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
