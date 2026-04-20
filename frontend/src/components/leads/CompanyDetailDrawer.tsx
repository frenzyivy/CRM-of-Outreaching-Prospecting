import { useState, useEffect } from 'react'
import {
  X, ChevronLeft, ChevronRight, Globe, Phone,
  Mail, StickyNote, Tag, MoreVertical, Calendar,
  ExternalLink, Users, Share2, Camera, ThumbsUp, AtSign,
  MapPin, ChevronDown, ChevronUp
} from 'lucide-react'
import { useLogActivity } from '../../hooks/usePipeline'
import { useCompanyDetail } from '../../hooks/useCompanies'
import { formatDateTime } from '../../lib/utils'
import type { NormalizedCompany, NormalizedContact, NormalizedLocation, Lead, Activity } from '../../types'

const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'researched', label: 'Researched' },
  { value: 'email_sent', label: 'Email Sent' },
  { value: 'follow_up_1', label: 'Follow-up 1' },
  { value: 'follow_up_2', label: 'Follow-up 2' },
  { value: 'responded', label: 'Responded' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'free_trial', label: 'Free Trial' },
  { value: 'closed_won', label: 'Closed (Won)' },
  { value: 'closed_lost', label: 'Closed (Lost)' },
]

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-slate-100 text-slate-600',
  researched: 'bg-blue-50 text-blue-600',
  email_sent: 'bg-indigo-50 text-indigo-600',
  follow_up_1: 'bg-violet-50 text-violet-600',
  follow_up_2: 'bg-purple-50 text-purple-600',
  responded: 'bg-sky-50 text-sky-600',
  meeting: 'bg-yellow-50 text-yellow-700',
  proposal: 'bg-orange-50 text-orange-600',
  free_trial: 'bg-amber-50 text-amber-600',
  closed_won: 'bg-green-50 text-green-600',
  closed_lost: 'bg-red-50 text-red-600',
}

const activityIcons: Record<string, typeof Mail> = {
  email: Mail,
  call: Phone,
  note: StickyNote,
  stage_change: Tag,
}

const activityColors: Record<string, string> = {
  email: 'text-blue-500 bg-blue-50',
  call: 'text-green-500 bg-green-50',
  note: 'text-amber-500 bg-amber-50',
  stage_change: 'text-purple-500 bg-purple-50',
}

type Tab = 'activities' | 'details'

interface Props {
  company: NormalizedCompany
  onClose: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  onOpenLead?: (lead: Lead) => void
}

function InfoRow({ label, value, isLink }: { label: string; value?: string | number | null | unknown; isLink?: boolean }) {
  const strValue = value == null ? '' : String(value)
  if (!strValue || strValue === '-' || strValue === 'undefined' || strValue === 'null') {
    return (
      <div className="flex justify-between items-start py-2 border-b border-slate-50">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs text-slate-300">—</span>
      </div>
    )
  }
  return (
    <div className="flex justify-between items-start py-2 border-b border-slate-50 gap-4">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      {isLink ? (
        <a href={strValue.startsWith('http') ? strValue : `https://${strValue}`} target="_blank" rel="noreferrer"
          className="text-xs text-blue-500 hover:text-blue-600 truncate max-w-[200px] flex items-center gap-1">
          {strValue.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
          <ExternalLink size={10} className="shrink-0" />
        </a>
      ) : (
        <span className="text-xs text-slate-700 text-right truncate max-w-[200px]">{strValue}</span>
      )}
    </div>
  )
}

function ActivityItem({ activity, isLast }: { activity: Activity; isLast: boolean }) {
  const Icon = activityIcons[activity.activity_type] || StickyNote
  const colors = activityColors[activity.activity_type] || 'text-slate-500 bg-slate-50'
  return (
    <div className="flex gap-3 relative">
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-slate-200" />
      )}
      <div className={`p-1.5 rounded-lg shrink-0 z-10 ${colors}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0 pb-5">
        <p className="text-sm text-slate-700">{activity.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-400 capitalize">{activity.activity_type.replace('_', ' ')}</span>
          <span className="text-[10px] text-slate-300">&middot;</span>
          <span className="text-[10px] text-slate-400">{formatDateTime(activity.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

function LocationAccordionRow({ location, defaultOpen = false }: { location: NormalizedLocation; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const leads = location.leads || []
  const locationLabel = [location.city, location.state].filter(Boolean).join(', ') || location.country || 'Unknown location'

  return (
    <div className="border border-slate-100 rounded-xl mb-2 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-emerald-500 shrink-0" />
          <span className="text-sm font-medium text-slate-700">{locationLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-500 font-medium">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
          </span>
          {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 py-2 bg-slate-50/50">
          {location.street_address && (
            <p className="text-xs text-slate-500 mb-2">{location.street_address}</p>
          )}
          {location.postal_code && (
            <p className="text-xs text-slate-500 mb-2">Postal: {location.postal_code}</p>
          )}
          {location.phone && (
            <p className="text-xs text-slate-500 mb-2">Phone: {location.phone}</p>
          )}
          {leads.length > 0 ? (
            <div className="space-y-1.5 mt-1">
              {leads.map((lead) => {
                const name = lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
                return (
                  <div key={lead.id} className="bg-white rounded-lg px-2.5 py-2 border border-slate-100">
                    <p className="text-xs font-medium text-slate-800">{name}</p>
                    {lead.title && <p className="text-[10px] text-slate-400">{lead.title}</p>}
                    <p className="text-[10px] text-slate-500 mt-0.5">{lead.email}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No leads at this location</p>
          )}
        </div>
      )}
    </div>
  )
}

function ContactCard({ contact }: { contact: NormalizedContact }) {
  const name = contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email
  return (
    <div className="border border-slate-100 rounded-xl px-3 py-2.5 mb-2">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
          {contact.title && <p className="text-xs text-slate-400 truncate">{contact.title}</p>}
          <p className="text-xs text-slate-500 mt-0.5 truncate">{contact.email}</p>
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          {contact.linkedin_url && (
            <a href={contact.linkedin_url} target="_blank" rel="noreferrer"
              className="p-1 rounded-md bg-slate-50 hover:bg-blue-50 transition-colors">
              <Share2 size={11} className="text-blue-600" />
            </a>
          )}
          {contact.instagram_url && (
            <a href={contact.instagram_url.startsWith('http') ? contact.instagram_url : `https://instagram.com/${contact.instagram_url.replace(/^@/, '')}`}
              target="_blank" rel="noreferrer"
              className="p-1 rounded-md bg-slate-50 hover:bg-pink-50 transition-colors">
              <Camera size={11} className="text-pink-500" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CompanyDetailDrawer({ company, onClose, onNavigate }: Props) {
  const { data: detail } = useCompanyDetail(company.id)
  const logActivity = useLogActivity()
  const [activityType, setActivityType] = useState<'email' | 'call' | 'note'>('email')
  const [description, setDescription] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('activities')
  const [isOpen, setIsOpen] = useState(false)
  const [stage, setStage] = useState(company.pipeline_stage || 'new')
  const [showAllLeads, setShowAllLeads] = useState(false)
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true))
    return () => setIsOpen(false)
  }, [])

  useEffect(() => {
    setStage(detail?.pipeline_stage || company.pipeline_stage || 'new')
  }, [detail, company.pipeline_stage])

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(onClose, 300)
  }

  // Use detail data when available, fall back to list data
  const locations = detail?.locations || []
  const allContacts: NormalizedContact[] = detail?.leads || []
  const locationCount = detail?.location_count ?? company.location_count ?? locations.length
  const leadCount = detail?.lead_count ?? company.lead_count ?? allContacts.length

  const activities: Activity[] = (detail as unknown as { activities?: Activity[] })?.activities || []

  const initials = (company.name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()

  const handleLogActivity = () => {
    if (!description.trim()) return
    logActivity.mutate({
      lead_id: company.id,
      activity_type: activityType,
      description,
    })
    setDescription('')
  }

  const toggleLocationExpand = (locId: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev)
      if (next.has(locId)) next.delete(locId)
      else next.add(locId)
      return next
    })
  }

  const PREVIEW_LEADS = 3
  const previewContacts = showAllLeads ? allContacts : allContacts.slice(0, PREVIEW_LEADS)

  const stageBadgeColor = STAGE_COLORS[stage] || STAGE_COLORS.new
  const stageLabel = STAGES.find(s => s.value === stage)?.label || stage

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'activities', label: 'Activities', count: activities.length },
    { key: 'details', label: 'All Fields' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`relative w-[70vw] max-w-[1100px] h-full bg-white shadow-2xl flex transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation buttons on left edge */}
        <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {onNavigate && (
            <>
              <button onClick={() => onNavigate('prev')}
                className="p-1.5 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
                title="Previous company">
                <ChevronLeft size={16} className="text-slate-600" />
              </button>
              <button onClick={() => onNavigate('next')}
                className="p-1.5 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
                title="Next company">
                <ChevronRight size={16} className="text-slate-600" />
              </button>
            </>
          )}
        </div>

        {/* ─── Left Sidebar ─── */}
        <div className="w-[340px] border-r border-slate-100 flex flex-col overflow-y-auto">

          {/* Header: close + avatar + name + domain + badges */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
              <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <MoreVertical size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-emerald-600 font-semibold text-sm">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-900 truncate">{company.name}</h2>
                {company.domain && (
                  <p className="text-xs text-slate-400 truncate">{company.domain}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                    <MapPin size={10} />
                    {locationCount} {locationCount === 1 ? 'location' : 'locations'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
                    <Users size={10} />
                    {leadCount} {leadCount === 1 ? 'lead' : 'leads'}
                  </span>
                </div>
              </div>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-1.5 mt-3">
              {company.domain && (
                <a href={`https://${company.domain}`} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors" title="Website">
                  <Globe size={14} className="text-slate-600" />
                </a>
              )}
              {company.linkedin_url && (
                <a href={company.linkedin_url} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors" title="LinkedIn">
                  <Share2 size={14} className="text-blue-600" />
                </a>
              )}
              {company.instagram_url && (
                <a href={company.instagram_url.startsWith('http') ? company.instagram_url : `https://instagram.com/${company.instagram_url.replace(/^@/, '')}`}
                  target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors" title="Instagram">
                  <Camera size={14} className="text-pink-600" />
                </a>
              )}
              {company.facebook_url && (
                <a href={company.facebook_url.startsWith('http') ? company.facebook_url : `https://facebook.com/${company.facebook_url}`}
                  target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors" title="Facebook">
                  <ThumbsUp size={14} className="text-blue-700" />
                </a>
              )}
              {company.twitter_url && (
                <a href={company.twitter_url.startsWith('http') ? company.twitter_url : `https://x.com/${company.twitter_url.replace(/^@/, '')}`}
                  target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors" title="Twitter / X">
                  <AtSign size={14} className="text-slate-800" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 px-4 py-3 border-b border-slate-100">
            <button className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs transition-colors">
              <Mail size={13} /> Email
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs transition-colors">
              <Phone size={13} /> Call
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs transition-colors">
              <StickyNote size={13} /> Note
            </button>
          </div>

          {/* Scrollable body */}
          <div className="px-4 py-3 flex-1 overflow-y-auto space-y-4">

            {/* Company Info */}
            <div>
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Company Info</h4>
              <InfoRow label="Company Name" value={company.name} />
              <InfoRow label="Industry" value={company.industry} />
              <InfoRow label="Size" value={company.size} />
              <InfoRow label="Website" value={company.domain} isLink />
              <InfoRow label="Phone" value={company.phone} />
              <InfoRow label="Country" value={company.country} />
            </div>

            {/* Locations Accordion */}
            {locations.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Locations ({locations.length})
                </h4>
                {locations.map((loc) => (
                  <LocationAccordionRow key={loc.id} location={loc} />
                ))}
              </div>
            )}

            {/* Leads Section */}
            {allContacts.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Leads ({allContacts.length})
                </h4>
                {previewContacts.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))}
                {!showAllLeads && allContacts.length > PREVIEW_LEADS && (
                  <button
                    onClick={() => setShowAllLeads(true)}
                    className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                  >
                    + {allContacts.length - PREVIEW_LEADS} more leads...
                  </button>
                )}
              </div>
            )}

            {/* Pipeline */}
            <div>
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Pipeline</h4>
              <div className="flex items-center gap-2 py-2">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${stageBadgeColor}`}>
                  {stageLabel}
                </span>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            {company.notes && (
              <div>
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</h4>
                <p className="text-xs text-slate-700">{company.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Panel ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center border-b border-slate-100 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-blue-600'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-blue-400' : 'text-slate-300'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Activities Tab ── */}
            {activeTab === 'activities' && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <select className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option>Activities Types (All)</option>
                    <option>Emails</option>
                    <option>Calls</option>
                    <option>Notes</option>
                    <option>Stage Changes</option>
                  </select>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <div className="flex gap-2 mb-3">
                    {(['email', 'call', 'note'] as const).map((type) => {
                      const TypeIcon = activityIcons[type]
                      return (
                        <button
                          key={type}
                          onClick={() => setActivityType(type)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            activityType === type
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'border-slate-200 text-slate-500 hover:bg-white'
                          }`}
                        >
                          <TypeIcon size={12} />
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogActivity()}
                      placeholder={`Log a ${activityType}...`}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                    <button
                      onClick={handleLogActivity}
                      disabled={!description.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Log
                    </button>
                  </div>
                </div>

                {activities.length > 0 ? (
                  <div>
                    {activities.map((activity, idx) => (
                      <ActivityItem key={activity.id} activity={activity} isLast={idx === activities.length - 1} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                      <Calendar size={24} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No Activities yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Your interactions will show up here once you start engaging with this company.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── All Fields Tab ── */}
            {activeTab === 'details' && (
              <div className="p-4 space-y-6">

                {/* COMPANY section */}
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Company</h4>
                  <InfoRow label="Company Name" value={company.name} />
                  <InfoRow label="Domain" value={company.domain} isLink />
                  <InfoRow label="Industry" value={company.industry} />
                  <InfoRow label="Country" value={company.country} />
                  <InfoRow label="Source" value={company.source} />
                  <InfoRow label="Created at" value={company.created_at ? company.created_at.slice(0, 10) : null} />
                </div>

                {/* LOCATIONS section */}
                {locations.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Locations ({locations.length})
                    </h4>
                    {locations.map((loc) => {
                      const isExpanded = expandedLocations.has(loc.id)
                      const locLeads = loc.leads || []
                      const locLabel = [loc.city, loc.state].filter(Boolean).join(', ') || loc.country || 'Unknown'
                      return (
                        <div key={loc.id} className="border border-slate-100 rounded-xl mb-2 overflow-hidden">
                          <button
                            onClick={() => toggleLocationExpand(loc.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors"
                          >
                            <span className="text-sm font-medium text-slate-700">{locLabel}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-blue-500 font-medium">
                                {locLeads.length} {locLeads.length === 1 ? 'lead' : 'leads'}
                              </span>
                              {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-slate-100 px-3 py-3 bg-slate-50/50 space-y-1">
                              <InfoRow label="City" value={loc.city} />
                              <InfoRow label="State" value={loc.state} />
                              <InfoRow label="Address" value={loc.street_address} />
                              <InfoRow label="Phone" value={loc.phone} />

                              {locLeads.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                    Leads at this location
                                  </p>
                                  {locLeads.map((lead) => {
                                    const name = lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
                                    return (
                                      <div key={lead.id} className="bg-white rounded-lg px-2.5 py-2 border border-slate-100 mb-1.5">
                                        <p className="text-xs font-medium text-slate-800">{name}</p>
                                        {lead.title && <p className="text-[10px] text-slate-400">{lead.title}</p>}
                                        <p className="text-[10px] text-slate-500">{lead.email}</p>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ALL LEADS flat table */}
                {allContacts.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      All Leads ({allContacts.length})
                    </h4>
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-3 py-2 text-left font-medium text-slate-500">Name</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-500">Email</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-500">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {allContacts.map((contact) => {
                            const name = contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '—'
                            const loc = locations.find(l => l.id === contact.location_id)
                            const locLabel = loc ? ([loc.city, loc.state].filter(Boolean).join(', ') || loc.country || '—') : '—'
                            return (
                              <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 font-medium text-slate-800">{name}</td>
                                <td className="px-3 py-2 text-slate-500 truncate max-w-[160px]">{contact.email}</td>
                                <td className="px-3 py-2 text-slate-500">{locLabel}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ENGAGEMENT section — aggregate across all leads */}
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Engagement</h4>
                  <InfoRow
                    label="Email opens"
                    value={allContacts.reduce((sum, c) => sum + (c.email_opens || 0), 0)}
                  />
                  <InfoRow
                    label="Email replies"
                    value={allContacts.reduce((sum, c) => sum + (c.email_replies || 0), 0)}
                  />
                  <InfoRow
                    label="Email clicks"
                    value={allContacts.reduce((sum, c) => sum + (c.email_clicks || 0), 0)}
                  />
                  <InfoRow
                    label="Email bounced"
                    value={allContacts.some(c => c.email_bounced) ? 'Yes' : 'No'}
                  />
                  <InfoRow
                    label="Instantly synced"
                    value={allContacts.some(c => c.instantly_synced) ? 'Yes' : 'No'}
                  />
                  <InfoRow label="Pipeline" value={stageLabel} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
