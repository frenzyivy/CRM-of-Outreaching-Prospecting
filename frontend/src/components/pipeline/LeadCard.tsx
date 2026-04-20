import { memo, useState } from 'react'
import { Building2, User, MapPin, Briefcase, Mail } from 'lucide-react'
import type { Lead } from '../../types'
import { isCompanyOnly } from '../../types'
import type { CompanyField, LeadField } from './fieldConfig'
import { heatFor, heatLabel, daysSinceLastTouch } from '../../utils/heat'

interface Props {
  lead: Lead
  onClick: () => void
  onDragStart?: (e: React.DragEvent) => void
  visibleCompanyFields?: Set<CompanyField>
  visibleLeadFields?: Set<LeadField>
}

function LeadCard({ lead, onClick, onDragStart, visibleCompanyFields, visibleLeadFields }: Props) {
  const heat = heatFor(lead)
  const days = daysSinceLastTouch(lead)
  const heatClass = heat === 'hot' ? 'hot'
                  : heat === 'warm' ? 'warm'
                  : heat === 'cool' ? 'cool'
                  : ''

  // Local drag flag so this card can hide itself (pointer-events: none) while
  // the ghost image is following the cursor. Prevents the original node from
  // intercepting dragover events meant for the target column.
  const [isDragging, setIsDragging] = useState(false)
  function handleDragStart(e: React.DragEvent) {
    setIsDragging(true)
    onDragStart?.(e)
  }
  function handleDragEnd() {
    setIsDragging(false)
  }
  const cardClass = `lead-card${isDragging ? ' dragging' : ''}`

  // ── Company card ──────────────────────────────────────────────────────────
  if (isCompanyOnly(lead)) {
    const c = lead
    const show = (f: CompanyField) => !visibleCompanyFields || visibleCompanyFields.has(f)
    const location = [c.city, c.state, c.country].filter(Boolean).join(', ')

    return (
      <div
        draggable
        onClick={onClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cardClass}
        title={heatLabel(heat)}
      >
        <span className={`lead-card-heat ${heatClass}`} aria-hidden="true" />
        <div className="lead-card-title">
          <Building2 size={11} style={{ display: 'inline-block', marginRight: 6, opacity: 0.7, verticalAlign: '-2px' }} />
          {c.company_name || '(no name)'}
        </div>

        {show('industry') && c.industry && (
          <div className="lead-card-meta"><Briefcase /> {c.industry}</div>
        )}
        {show('city_country') && location && (
          <div className="lead-card-meta"><MapPin /> {location}</div>
        )}

        <div className="lead-card-foot">
          <span className="stage-tag">{lead.stage_label}</span>
          {days != null && <span className="age-meta">{days}d</span>}
        </div>
      </div>
    )
  }

  // ── Person card ────────────────────────────────────────────────────────────
  const raw = lead as unknown as Record<string, unknown>
  const show = (f: LeadField) => !visibleLeadFields || visibleLeadFields.has(f)

  const fullName =
    (raw.full_name as string) ||
    [raw.first_name, raw.last_name].filter(Boolean).join(' ') ||
    '(no name)'
  const jobTitle = (raw.title as string) || (raw.job_title as string) || ''
  const companyName = (raw.company_name as string) || (raw.company as string) || ''
  const email = (raw.email as string) || ''
  const location = [raw.city, raw.country].filter(Boolean).join(', ')

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cardClass}
      title={heatLabel(heat)}
    >
      <span className={`lead-card-heat ${heatClass}`} aria-hidden="true" />
      <div className="lead-card-title">
        <User size={11} style={{ display: 'inline-block', marginRight: 6, opacity: 0.7, verticalAlign: '-2px' }} />
        {fullName}
      </div>

      {show('job_title') && jobTitle && (
        <div className="lead-card-meta"><Briefcase /> {jobTitle}</div>
      )}
      {show('company') && companyName && (
        <div className="lead-card-meta"><Building2 /> {companyName}</div>
      )}
      {show('email') && email && (
        <div className="lead-card-meta"><Mail /> {email}</div>
      )}
      {show('city_country') && location && (
        <div className="lead-card-meta"><MapPin /> {location}</div>
      )}

      <div className="lead-card-foot">
        <span className="stage-tag">{lead.stage_label}</span>
        {days != null && <span className="age-meta">{days}d</span>}
      </div>
    </div>
  )
}

export default memo(LeadCard)
