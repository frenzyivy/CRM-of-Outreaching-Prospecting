import { useState } from 'react'
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

// Color mapping per stage — header dot + count badge + column bg tint
const stageTheme: Record<string, { dot: string; badge: string; bg: string; header: string }> = {
  new:         { dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600',   bg: 'bg-slate-50/60',    header: 'text-slate-600' },
  researched:  { dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-600',      bg: 'bg-blue-50/30',     header: 'text-blue-700' },
  email_sent:  { dot: 'bg-indigo-400',  badge: 'bg-indigo-50 text-indigo-600',  bg: 'bg-indigo-50/30',   header: 'text-indigo-700' },
  follow_up_1: { dot: 'bg-violet-400',  badge: 'bg-violet-50 text-violet-600',  bg: 'bg-violet-50/30',   header: 'text-violet-700' },
  follow_up_2: { dot: 'bg-purple-400',  badge: 'bg-purple-50 text-purple-600',  bg: 'bg-purple-50/30',   header: 'text-purple-700' },
  responded:   { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-600',bg: 'bg-emerald-50/30',  header: 'text-emerald-700' },
  meeting:     { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700',    bg: 'bg-amber-50/30',    header: 'text-amber-700' },
  proposal:    { dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-600',  bg: 'bg-orange-50/30',   header: 'text-orange-700' },
  closed_won:  { dot: 'bg-green-500',   badge: 'bg-green-50 text-green-700',    bg: 'bg-green-50/30',    header: 'text-green-700' },
  closed_lost: { dot: 'bg-red-400',     badge: 'bg-red-50 text-red-600',        bg: 'bg-red-50/30',      header: 'text-red-700' },
}

const fallbackTheme = { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600', bg: 'bg-slate-50/60', header: 'text-slate-600' }

export default function PipelineColumn({
  stage, label, leads, onLeadClick, onDragStart, onDrop,
  visibleCompanyFields, visibleLeadFields,
}: Props) {
  const theme = stageTheme[stage] ?? fallbackTheme
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div className="flex-shrink-0 w-[260px]">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
        <h3 className={`text-xs font-semibold uppercase tracking-wider flex-1 ${theme.header}`}>{label}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${theme.badge}`}>
          {leads.length}
        </span>
      </div>

      {/* Cards column — drop target */}
      <div
        className={`rounded-2xl p-2.5 min-h-[200px] space-y-2 border transition-all ${
          isDragOver
            ? `border-dashed border-2 ${theme.dot.replace('bg-', 'border-')} ${theme.bg} scale-[1.01]`
            : `border-slate-100 ${theme.bg}`
        }`}
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
          <div className="flex flex-col items-center justify-center py-10 gap-1">
            <div className={`w-6 h-6 rounded-full ${theme.dot} opacity-20`} />
            <p className="text-xs text-slate-300 mt-1">No leads</p>
          </div>
        )}
      </div>
    </div>
  )
}
