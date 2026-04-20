import { useState, useEffect } from 'react'
import {
  X, ChevronLeft, ChevronRight, Mail, Phone, StickyNote,
  ExternalLink, Send, Eye, MousePointer, Reply,
  Calendar, Tag, MoreVertical, Sparkles
} from 'lucide-react'
import { useLeadDetail } from '../../hooks/useLeads'
import { useUpdateStage, useLogActivity } from '../../hooks/usePipeline'
import { useSetLeadPlatform } from '../../hooks/useEmail'
import type { EmailPlatformId } from '../../types'
import Badge from '../common/Badge'
import LeadScoreBadge from '../common/LeadScoreBadge'
import AgentPanel from '../ai/AgentPanel'
import { formatDateTime } from '../../lib/utils'
import type { Lead, Activity } from '../../types'

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

type Tab = 'activities' | 'emails' | 'details' | 'ai'

interface Props {
  lead: Lead
  onClose: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  onOpenCompany?: (companyName: string) => void
}

function StatBox({ icon: Icon, value, label }: { icon: typeof Mail; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center py-3 border-r border-slate-100 last:border-r-0">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon size={12} className="text-slate-400" />
        <span className="text-lg font-semibold text-slate-900">{value}</span>
      </div>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  )
}

function InfoRow({ label, value, isLink }: { label: string; value?: string | unknown; isLink?: boolean }) {
  const strValue = value == null ? '' : String(value)
  if (!strValue || strValue === '-' || strValue === 'undefined' || strValue === 'null') {
    return (
      <div className="flex justify-between items-start py-2 border-b border-slate-50">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs text-slate-300">-</span>
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
      {/* Timeline connector line */}
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-slate-200" />
      )}
      {/* Icon dot */}
      <div className={`p-1.5 rounded-lg shrink-0 z-10 ${colors}`}>
        <Icon size={14} />
      </div>
      {/* Content */}
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

const EMAIL_PLATFORM_OPTIONS: { value: EmailPlatformId; label: string }[] = [
  { value: 'instantly', label: 'Instantly.ai' },
  { value: 'convertkit', label: 'ConvertKit' },
  { value: 'lemlist', label: 'Lemlist' },
  { value: 'smartlead', label: 'Smartlead' },
]

export default function LeadDetailDrawer({ lead, onClose, onNavigate, onOpenCompany }: Props) {
  const { data: detail } = useLeadDetail(lead.id)
  const updateStage = useUpdateStage()
  const logActivity = useLogActivity()
  const setLeadPlatform = useSetLeadPlatform()
  const [activityType, setActivityType] = useState<'email' | 'call' | 'note'>('email')
  const [description, setDescription] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('activities')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true))
    return () => setIsOpen(false)
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(onClose, 300)
  }

  const activities: Activity[] = detail?.activities || []
  const displayName = lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const handleStageChange = (stage: string) => {
    updateStage.mutate({ leadId: lead.id, stage })
  }

  const handleLogActivity = () => {
    if (!description.trim()) return
    logActivity.mutate({
      lead_id: lead.id,
      activity_type: activityType,
      description,
    })
    setDescription('')
  }

  // Email stats (mock for now based on activities)
  const emailActivities = activities.filter(a => a.activity_type === 'email')
  const emailStats = {
    sent: emailActivities.length,
    opened: 0,
    clicked: 0,
    replied: 0,
  }

  const tabs: { key: Tab; label: string; count?: number; icon?: typeof Mail }[] = [
    { key: 'activities', label: 'Activities', count: activities.length },
    { key: 'emails', label: 'Emails', count: emailStats.sent },
    { key: 'details', label: 'All Fields' },
    { key: 'ai', label: 'AI Agent', icon: Sparkles },
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
              <button
                onClick={() => onNavigate('prev')}
                className="p-1.5 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
                title="Previous lead"
              >
                <ChevronLeft size={16} className="text-slate-600" />
              </button>
              <button
                onClick={() => onNavigate('next')}
                className="p-1.5 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
                title="Next lead"
              >
                <ChevronRight size={16} className="text-slate-600" />
              </button>
            </>
          )}
        </div>

        {/* ─── Left Sidebar: Contact Info ─── */}
        <div className="w-[340px] border-r border-slate-100 flex flex-col overflow-y-auto">
          {/* Close + Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
              <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <MoreVertical size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Avatar + Name */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-blue-600 font-semibold text-sm">{initials}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900 truncate">{displayName}</h2>
                  {lead.lead_tier && (
                    <LeadScoreBadge score={lead.lead_score ?? 0} tier={lead.lead_tier} showScore />
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {lead.title || String(lead.job_title || '') || 'No title'}
                </p>
              </div>
            </div>

            {/* Company Context Chip */}
            {(lead.company_name || lead.company) && (() => {
              const companyName = String(lead.company_name || lead.company || '')
              const rawDomain = String(lead.company_website || lead.website || '')
              const domain = rawDomain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
              const locationParts = [lead.city, lead.state, lead.country].filter(Boolean)
              const locationLine = locationParts.join(', ')
              const companyInitials = companyName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
              return (
                <button
                  onClick={() => { if (onOpenCompany) onOpenCompany(companyName) }}
                  className="mt-3 w-full text-left border-l-2 border-blue-500 bg-slate-50 hover:bg-blue-50 rounded-r-lg px-3 py-2.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-slate-600 font-semibold text-[10px]">{companyInitials}</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600 truncate">{companyName}</span>
                  </div>
                  {locationLine && (
                    <p className="text-xs text-slate-500 mt-1 ml-8 truncate">{locationLine}</p>
                  )}
                  {domain && (
                    <p className="text-xs text-slate-400 mt-0.5 ml-8 truncate">{domain}</p>
                  )}
                </button>
              )
            })()}
          </div>

          {/* Quick Action Buttons */}
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
            <button className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs transition-colors">
              <Tag size={13} /> Tag
            </button>
          </div>

          {/* Email Stats Bar */}
          <div className="grid grid-cols-4 border-b border-slate-100">
            <StatBox icon={Send} value={emailStats.sent} label="Sent" />
            <StatBox icon={Eye} value={emailStats.opened} label="Opened" />
            <StatBox icon={MousePointer} value={emailStats.clicked} label="Clicked" />
            <StatBox icon={Reply} value={emailStats.replied} label="Replied" />
          </div>

          {/* Contact Details */}
          <div className="px-4 py-3 flex-1 overflow-y-auto">
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Contact</h4>
            <InfoRow label="Email" value={lead.email} isLink />
            <InfoRow label="Phone" value={lead.phone} />
            <InfoRow label="Specialty" value={lead.specialty || ''} />

            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Links</h4>
            <InfoRow label="LinkedIn" value={lead.linkedin} isLink />
            <InfoRow label="Instagram" value={lead.instagram} isLink />

            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Pipeline</h4>
            <div className="flex items-center gap-2 py-2 border-b border-slate-50">
              <Badge stage={lead.stage} label={lead.stage_label} />
              <select
                value={lead.stage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 py-2 border-b border-slate-50">
              <span className="text-xs text-slate-400 shrink-0">Assigned to</span>
              <select
                value={lead.email_platform || ''}
                onChange={(e) => {
                  const val = e.target.value as EmailPlatformId | ''
                  setLeadPlatform.mutate({ leadId: lead.id, platform: val || null })
                }}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1"
              >
                <option value="">— Unassigned —</option>
                {EMAIL_PLATFORM_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Tabs Content ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center border-b border-slate-100 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? tab.key === 'ai' ? 'text-violet-600 border-violet-600' : 'text-blue-600 border-blue-600'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                {tab.icon && <tab.icon size={13} />}
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
                {/* Activity Type Filter */}
                <div className="flex items-center gap-2 mb-4">
                  <select className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option>Activities Types (All)</option>
                    <option>Emails</option>
                    <option>Calls</option>
                    <option>Notes</option>
                    <option>Stage Changes</option>
                  </select>
                </div>

                {/* Log Activity Input */}
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

                {/* Activity List */}
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
                      Your interactions will show up here once you start engaging with this prospect.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Emails Tab ── */}
            {activeTab === 'emails' && (
              <div className="p-4">
                {emailActivities.length > 0 ? (
                  <div>
                    {emailActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 py-3 border-b border-slate-50">
                        <div className="p-1.5 rounded-lg bg-blue-50 shrink-0">
                          <Mail size={14} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700">{activity.description}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(activity.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                      <Mail size={24} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No Emails yet</p>
                    <p className="text-xs text-slate-400 mt-1">Email activity for this lead will appear here.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── All Fields Tab ── */}
            {activeTab === 'details' && (() => {
              const companyName = String(lead.company_name || lead.company || '')
              const rawDomain = String(lead.company_website || lead.website || '')
              const domain = rawDomain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
              const companyInitials = companyName ? companyName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) : ''
              const SectionHeader = ({ title }: { title: string }) => (
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3 mt-5 first:mt-0">{title}</h4>
              )
              return (
                <div className="p-4">
                  {/* PERSON */}
                  <SectionHeader title="Person" />
                  <div className="grid grid-cols-2 gap-x-6">
                    <InfoRow label="First name" value={lead.first_name} />
                    <InfoRow label="Last name" value={lead.last_name} />
                    <InfoRow label="Full name" value={lead.full_name} />
                    <InfoRow label="Title" value={lead.title || String(lead.job_title || '')} />
                    <InfoRow label="Email" value={lead.email} isLink />
                    <InfoRow label="Phone" value={lead.phone} />
                    <InfoRow label="LinkedIn" value={lead.linkedin} isLink />
                    <InfoRow label="Instagram" value={lead.instagram} isLink />
                    <InfoRow label="Specialty" value={lead.specialty} />
                    <InfoRow label="Sub specialties" value={lead.sub_specialties} />
                  </div>

                  {/* COMPANY & LOCATION */}
                  <SectionHeader title="Company (this lead's company)" />
                  {companyName ? (
                    <button
                      onClick={() => { if (onOpenCompany) onOpenCompany(companyName) }}
                      className="w-full text-left border-l-2 border-blue-500 bg-slate-50 hover:bg-blue-50 rounded-r-lg px-3 py-2.5 mb-3 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-slate-200 flex items-center justify-center shrink-0">
                            <span className="text-slate-600 font-semibold text-[10px]">{companyInitials}</span>
                          </div>
                          <span className="text-sm font-medium text-blue-600 truncate">{companyName}</span>
                        </div>
                        <span className="text-xs text-blue-400 flex items-center gap-1 shrink-0">
                          View company <ExternalLink size={10} />
                        </span>
                      </div>
                      <div className="mt-2 ml-9 grid grid-cols-2 gap-x-4">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Domain</span>
                          <span className="text-xs text-slate-600">{domain || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Industry</span>
                          <span className="text-xs text-slate-600">{String(lead.industry || '') || '—'}</span>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400 mb-3">No company linked</p>
                  )}
                  <h5 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Location (this lead's location only)</h5>
                  <div className="grid grid-cols-2 gap-x-6">
                    <InfoRow label="City" value={lead.city} />
                    <InfoRow label="State" value={lead.state} />
                    <InfoRow label="Country" value={lead.country} />
                    <InfoRow label="Street address" value={lead.street_address} />
                    <InfoRow label="Postal code" value={lead.postal_code} />
                  </div>

                  {/* ENGAGEMENT */}
                  <SectionHeader title="Engagement" />
                  <div className="grid grid-cols-2 gap-x-6">
                    <InfoRow label="Email opens" value={lead.email_opens ?? 0} />
                    <InfoRow label="Email replies" value={lead.email_replies ?? 0} />
                    <InfoRow label="Email clicks" value={lead.email_clicks ?? 0} />
                    <InfoRow label="Email bounced" value={lead.email_bounced != null ? String(lead.email_bounced) : 'false'} />
                    <InfoRow label="Last email event" value={lead.last_email_event} />
                    <InfoRow label="Last event at" value={lead.last_email_event_at} />
                  </div>

                  {/* OUTREACH */}
                  <SectionHeader title="Outreach" />
                  <div className="grid grid-cols-2 gap-x-6">
                    <InfoRow label="Instantly synced" value={lead.instantly_synced != null ? String(lead.instantly_synced) : 'false'} />
                    <InfoRow label="Campaign ID" value={lead.instantly_campaign_id} />
                    <InfoRow label="Email status" value={lead.email_status} />
                    <InfoRow label="Assigned to" value={String(lead.email_platform || 'Unassigned')} />
                  </div>

                  {/* META */}
                  <SectionHeader title="Meta" />
                  <div className="grid grid-cols-2 gap-x-6">
                    <InfoRow label="Source" value={lead.source} />
                    <InfoRow label="Created at" value={lead.created_at} />
                    <InfoRow label="Updated at" value={lead.updated_at} />
                    <InfoRow label="Raw data" value={lead.raw_data ? '[object]' : '—'} />
                    <InfoRow label="Notes" value={lead.notes} />
                  </div>
                </div>
              )
            })()}

            {/* ── AI Agent Tab ── */}
            {activeTab === 'ai' && (
              <AgentPanel
                leadId={lead.id}
                leadName={displayName}
                leadEmail={lead.email}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
