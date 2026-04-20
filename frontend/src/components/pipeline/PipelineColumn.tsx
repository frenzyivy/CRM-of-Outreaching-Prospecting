import { memo, useState } from 'react'
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

function PipelineColumn({
  stage, label, leads, onLeadClick, onDragStart, onDrop,
  visibleCompanyFields, visibleLeadFields,
}: Props) {
  const [isDragOver, setIsDragOver] = useState(false)
  const dotColor = STAGE_DOT[stage] ?? 'var(--ink-4)'

  return (
    <div className="pipe-col">
      <div className="pipe-col-head">
        <span className="pipe-stage-dot" style={{ background: dotColor }} />
        <span className="pipe-col-title">{label}</span>
        <span className="pipe-col-count">{leads.length}</span>
      </div>

      <div
        className={`pipe-col-drop ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(stage) }}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick(lead)}
            onDragStart={() => onDragStart(lead)}
            visibleCompanyFields={visibleCompanyFields}
            visibleLeadFields={visibleLeadFields}
          />
        ))}
        {leads.length === 0 && (
          <div className="pipe-col-empty">No leads</div>
        )}
      </div>
    </div>
  )
}

export default memo(PipelineColumn)
