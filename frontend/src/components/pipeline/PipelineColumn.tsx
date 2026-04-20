import { memo, useEffect, useRef, useState } from 'react'
import LeadCard from './LeadCard'
import type { Lead } from '../../types'
import type { CompanyField, LeadField } from './fieldConfig'

interface Props {
  stage: string
  label: string
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  onDragStart: (lead: Lead) => void
  onDrop: (targetStage: string) => void
  visibleCompanyFields: Set<CompanyField>
  visibleLeadFields: Set<LeadField>
}

// Stage dot colors — token-based, one shade per stage. Pulls from the
// Alainza palette instead of hardcoded Tailwind.
const STAGE_DOT: Record<string, string> = {
  new:         'var(--ink-4)',
  researched:  '#60A5FA',
  email_sent:  '#6366F1',
  follow_up_1: '#8B5CF6',
  follow_up_2: '#A855F7',
  responded:   '#22C55E',
  meeting:     '#F59E0B',
  proposal:    '#F97316',
  free_trial:  '#EAB308',
  closed_won:  '#16A34A',
  closed_lost: '#EF4444',
}

// Soft cap on rendered cards per column. Dense columns (e.g. 6k leads in
// `new`) would freeze the browser if we rendered them all. Users can expand
// with the "Show all" button — accepts the render stall as an informed choice.
const RENDER_CAP = 50

function PipelineColumn({
  stage, label, leads, onLeadClick, onDragStart, onDrop,
  visibleCompanyFields, visibleLeadFields,
}: Props) {
  const dotColor = STAGE_DOT[stage] ?? 'var(--ink-4)'

  // ── Drag-counter pattern ──────────────────────────────────────────────────
  // Native HTML5 dragleave fires every time the cursor crosses a CHILD's
  // boundary (including lead cards inside the column), which makes a simple
  // boolean flicker on/off. A counter that increments on dragenter and
  // decrements on dragleave stays positive for the whole hover.
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = useRef(0)

  function onEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current += 1
    if (!isDragOver) setIsDragOver(true)
  }
  function onLeave() {
    dragCounter.current = Math.max(0, dragCounter.current - 1)
    if (dragCounter.current === 0) setIsDragOver(false)
  }
  function onOver(e: React.DragEvent) {
    // preventDefault is required for `drop` to fire.
    e.preventDefault()
  }
  function onDropInternal(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)
    onDrop(stage)
  }

  // ── Render cap + Show-all ────────────────────────────────────────────────
  const [showAll, setShowAll] = useState(false)
  // Track the lead IDs the user just dropped here. Those are kept visible even
  // if the column is over its cap — so a drop never "disappears" into the
  // hidden tail.
  const pinnedIds = useRef<Set<string>>(new Set())
  const prevIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const prev = prevIdsRef.current
    const next = new Set(leads.map((l) => l.id))
    // Anything new in this column since the last render is a recent arrival.
    for (const id of next) {
      if (!prev.has(id)) pinnedIds.current.add(id)
    }
    // Clean up pins for leads that left the column.
    for (const id of Array.from(pinnedIds.current)) {
      if (!next.has(id)) pinnedIds.current.delete(id)
    }
    prevIdsRef.current = next
  }, [leads])

  const total = leads.length
  const overCap = !showAll && total > RENDER_CAP
  let visible: Lead[]
  if (!overCap) {
    visible = leads
  } else {
    // First RENDER_CAP (newest by server order — leads are sorted desc by
    // created_at), plus any pinned arrivals beyond the cap so drops stay visible.
    const head = leads.slice(0, RENDER_CAP)
    const headIds = new Set(head.map((l) => l.id))
    const tailPinned = leads.filter(
      (l) => pinnedIds.current.has(l.id) && !headIds.has(l.id),
    )
    visible = [...head, ...tailPinned]
  }
  const hiddenCount = Math.max(0, total - visible.length)

  return (
    <div className="pipe-col">
      <div className="pipe-col-head">
        <span className="pipe-stage-dot" style={{ background: dotColor }} />
        <span className="pipe-col-title">{label}</span>
        <span className="pipe-col-count">{total}</span>
      </div>

      <div
        className={`pipe-col-drop ${isDragOver ? 'drag-over' : ''}`}
        onDragEnter={onEnter}
        onDragOver={onOver}
        onDragLeave={onLeave}
        onDrop={onDropInternal}
      >
        {visible.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick(lead)}
            onDragStart={() => onDragStart(lead)}
            visibleCompanyFields={visibleCompanyFields}
            visibleLeadFields={visibleLeadFields}
          />
        ))}

        {hiddenCount > 0 && (
          <button
            className="btn sm ghost pipe-col-showall"
            onClick={() => setShowAll(true)}
            title={`Render ${hiddenCount.toLocaleString()} more cards (may briefly freeze the browser)`}
          >
            Show all {total.toLocaleString()} leads
          </button>
        )}

        {visible.length === 0 && (
          <div className="pipe-col-empty">No leads</div>
        )}
      </div>
    </div>
  )
}

export default memo(PipelineColumn)
