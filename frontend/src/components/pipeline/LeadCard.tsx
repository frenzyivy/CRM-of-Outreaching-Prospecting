import { Building2, User, MapPin, Briefcase, Phone, Mail, Globe, Calendar, ExternalLink, Tag } from 'lucide-react'
import type { Lead, Company, Contact, LeadRecord } from '../../types'
import type { CompanyField, LeadField } from './fieldConfig'

const stageTagColors: Record<string, string> = {
  new:         'bg-slate-100 text-slate-600',
  researched:  'bg-blue-50 text-blue-600',
  email_sent:  'bg-indigo-50 text-indigo-600',
  follow_up_1: 'bg-violet-50 text-violet-600',
  follow_up_2: 'bg-purple-50 text-purple-600',
  responded:   'bg-emerald-50 text-emerald-600',
  meeting:     'bg-amber-50 text-amber-700',
  proposal:    'bg-orange-50 text-orange-600',
  closed_won:  'bg-green-50 text-green-700',
  closed_lost: 'bg-red-50 text-red-600',
}

function formatDate(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Row({ icon, text, link }: { icon: React.ReactNode; text: string; link?: string }) {
  const inner = (
    <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate min-w-0">
      <span className="shrink-0 text-slate-300">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  )
  if (link) {
    return (
      <a
        href={link.startsWith('http') ? link : `https://${link}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="block hover:text-blue-500 transition-colors"
      >
        {inner}
      </a>
    )
  }
  return <div>{inner}</div>
}

interface Props {
  lead: Lead
  onClick: () => void
  onDragStart?: (e: React.DragEvent) => void
  visibleCompanyFields?: Set<CompanyField>
  visibleLeadFields?: Set<LeadField>
}

export default function LeadCard({ lead, onClick, onDragStart, visibleCompanyFields, visibleLeadFields }: Props) {
  const tagColor = stageTagColors[lead.stage] ?? 'bg-slate-100 text-slate-600'

  // ── Company card ──────────────────────────────────────────────────────────
  if (lead.lead_type === 'company') {
    const c = lead as Company
    const show = (f: CompanyField) => !visibleCompanyFields || visibleCompanyFields.has(f)
    const location = [c.city, c.state, c.country].filter(Boolean).join(', ')

    return (
      <div
        draggable
        onClick={onClick}
        onDragStart={onDragStart}
        className="bg-white border border-slate-100 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-200/60 hover:-translate-y-0.5 transition-all"
      >
        {/* Name */}
        <div className="flex items-start gap-2.5 mb-2">
          <div className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-blue-50">
            <Building2 size={13} className="text-blue-500" />
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate leading-tight pt-0.5">{c.company_name}</p>
        </div>

        {/* Optional fields */}
        <div className="space-y-1.5 mb-2.5 pl-0.5">
          {show('industry') && c.industry && (
            <Row icon={<Briefcase size={10} />} text={c.industry} />
          )}
          {show('city_country') && location && (
            <Row icon={<MapPin size={10} />} text={location} />
          )}
          {show('phone') && c.phone && (
            <Row icon={<Phone size={10} />} text={c.phone} />
          )}
          {show('website') && c.website && (
            <Row icon={<Globe size={10} />} text={c.website} link={c.website} />
          )}
          {show('notes') && c.notes && (
            <p className="text-[11px] text-slate-400 italic line-clamp-2 pl-4">{c.notes}</p>
          )}
          {show('created_at') && c.created_at && (
            <Row icon={<Calendar size={10} />} text={`Added ${formatDate(c.created_at)}`} />
          )}
        </div>

        {/* Stage badge */}
        <div className="flex justify-end pt-1.5 border-t border-slate-50">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${tagColor}`}>
            {lead.stage_label}
          </span>
        </div>
      </div>
    )
  }

  // ── Person card (contact or lead) ─────────────────────────────────────────
  // Both types share similar fields but use different column names in the DB.
  // Normalise to a common shape so the card works for either.
  const raw = lead as Record<string, unknown>
  const show = (f: LeadField) => !visibleLeadFields || visibleLeadFields.has(f)

  const fullName =
    (raw.full_name as string) ||
    [raw.first_name, raw.last_name].filter(Boolean).join(' ') ||
    '(no name)'
  const jobTitle = (raw.title as string) || (raw.job_title as string) || ''
  const companyName = (raw.company_name as string) || (raw.company as string) || ''
  const email = (raw.email as string) || (raw.personal_email as string) || ''
  const phone = (raw.phone as string) || ''
  const location = [raw.city, raw.country].filter(Boolean).join(', ')
  const linkedin = (raw.linkedin as string) || ''
  const source = (raw.source as string) || ''
  const notionUrl = (raw.notion_url as string) || ''

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      className="bg-white border border-slate-100 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-200/60 hover:-translate-y-0.5 transition-all"
    >
      {/* Name */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-slate-50">
          <User size={13} className="text-slate-500" />
        </div>
        <p className="text-sm font-semibold text-slate-800 truncate leading-tight pt-0.5">{fullName}</p>
      </div>

      {/* Optional fields */}
      <div className="space-y-1.5 mb-2.5 pl-0.5">
        {show('job_title') && jobTitle && (
          <Row icon={<Briefcase size={10} />} text={jobTitle} />
        )}
        {show('company') && companyName && (
          <Row icon={<Building2 size={10} />} text={companyName} />
        )}
        {show('email') && email && (
          <Row icon={<Mail size={10} />} text={email} />
        )}
        {show('phone') && phone && (
          <Row icon={<Phone size={10} />} text={phone} />
        )}
        {show('city_country') && location && (
          <Row icon={<MapPin size={10} />} text={location} />
        )}
        {show('source') && source && (
          <Row icon={<Tag size={10} />} text={source} />
        )}
        {show('linkedin') && linkedin && (
          <Row icon={<ExternalLink size={10} />} text="LinkedIn" link={linkedin} />
        )}
        {show('notion_url') && notionUrl && (
          <Row icon={<ExternalLink size={10} />} text="Notion" link={notionUrl} />
        )}
        {show('created_at') && (raw.created_at as string) && (
          <Row icon={<Calendar size={10} />} text={`Added ${formatDate(raw.created_at as string)}`} />
        )}
      </div>

      {/* Stage badge */}
      <div className="flex justify-end pt-1.5 border-t border-slate-50">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${tagColor}`}>
          {lead.stage_label}
        </span>
      </div>
    </div>
  )
}
