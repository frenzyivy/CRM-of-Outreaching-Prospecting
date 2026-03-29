import { useState, useEffect } from 'react'
import {
  X, ChevronLeft, ChevronRight, Globe, Phone,
  Mail, StickyNote, Tag, MoreVertical, Calendar,
  ExternalLink, Users, Share2, Camera, ThumbsUp, AtSign
} from 'lucide-react'
import { useLeadDetail, useCompanyEmployees } from '../../hooks/useLeads'
import { useUpdateStage, useLogActivity } from '../../hooks/usePipeline'
import Badge from '../common/Badge'
import LeadScoreBadge from '../common/LeadScoreBadge'
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

type Tab = 'activities' | 'details'

interface Props {
  lead: Lead
  onClose: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  onOpenLead?: (lead: Lead) => void
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

export default function CompanyDetailDrawer({ lead, onClose, onNavigate, onOpenLead }: Props) {
  const { data: detail } = useLeadDetail(lead.id)
  const { data: employees } = useCompanyEmployees(lead.company_name)
  const updateStage = useUpdateStage()
  const logActivity = useLogActivity()
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
  const initials = (lead.company_name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

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
              <button
                onClick={() => onNavigate('prev')}
                className="p-1.5 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
                title="Previous company"
              >
                <ChevronLeft size={16} className="text-slate-600" />
              </button>
              <button
                onClick={() => onNavigate('next')}
                className="p-1.5 bg-white/90 rounded-lg shadow-md hover:bg-white transition-colors"
                title="Next company"
              >
                <ChevronRight size={16} className="text-slate-600" />
              </button>
            </>
          )}
        </div>

        {/* ─── Left Sidebar: Company Info ─── */}
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
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-emerald-600 font-semibold text-sm">{initials}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900 truncate">{lead.company_name}</h2>
                  {lead.lead_tier && (
                    <LeadScoreBadge score={lead.lead_score ?? 0} tier={lead.lead_tier} showScore />
                  )}
                </div>
                {lead.industry && (
                  <p className="text-xs text-slate-500 truncate">{lead.industry}</p>
                )}
                {(lead.city || lead.country) && (
                  <p className="text-xs text-emerald-500 truncate mt-0.5">
                    {[lead.city, lead.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-2 mt-3">
              {lead.website && (
                <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  title="Website">
                  <Globe size={14} className="text-slate-600" />
                </a>
              )}
              {lead.company_linkedin && (
                <a href={lead.company_linkedin} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors"
                  title="LinkedIn">
                  <Share2 size={14} className="text-blue-600" />
                </a>
              )}
              {lead.company_instagram && (
                <a href={lead.company_instagram.startsWith('http') ? lead.company_instagram : `https://instagram.com/${lead.company_instagram.replace(/^@/, '')}`}
                  target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors"
                  title="Instagram">
                  <Camera size={14} className="text-pink-600" />
                </a>
              )}
              {lead.company_facebook && (
                <a href={lead.company_facebook.startsWith('http') ? lead.company_facebook : `https://facebook.com/${lead.company_facebook}`}
                  target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors"
                  title="Facebook">
                  <ThumbsUp size={14} className="text-blue-700" />
                </a>
              )}
              {lead.company_twitter && (
                <a href={lead.company_twitter.startsWith('http') ? lead.company_twitter : `https://x.com/${lead.company_twitter.replace(/^@/, '')}`}
                  target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  title="Twitter / X">
                  <AtSign size={14} className="text-slate-800" />
                </a>
              )}
            </div>
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
          </div>

          {/* Company Details */}
          <div className="px-4 py-3 flex-1 overflow-y-auto">
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Company Info</h4>
            <InfoRow label="Company Name" value={lead.company_name} />
            <InfoRow label="Industry" value={lead.industry} />
            <InfoRow label="Size" value={lead.size} />
            <InfoRow label="Website" value={lead.website} isLink />
            <InfoRow label="Phone" value={lead.phone} />

            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Location</h4>
            <InfoRow label="Location" value={lead.location} />
            <InfoRow label="City" value={lead.city} />
            <InfoRow label="State" value={lead.state} />
            <InfoRow label="Country" value={lead.country} />

            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Pipeline</h4>
            <div className="flex items-center gap-2 py-2">
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

            {lead.notes && (
              <>
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Notes</h4>
                <p className="text-xs text-slate-700">{lead.notes}</p>
              </>
            )}

            {/* Employees */}
            {employees && employees.length > 0 && (
              <>
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4 flex items-center gap-1.5">
                  <Users size={11} />
                  Employees ({employees.length})
                </h4>
                {employees.map((emp, idx) => {
                  const empName = emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown'
                  const label = employees.length === 1 ? 'Employee' : `Employee ${idx + 1}`
                  return (
                    <div key={emp.id} className="flex justify-between items-start py-2 border-b border-slate-50">
                      <span className="text-xs text-slate-400">{label}</span>
                      <button
                        onClick={() => onOpenLead?.(emp)}
                        className="text-xs text-blue-500 hover:text-blue-700 hover:underline truncate max-w-[200px] text-right"
                      >
                        {empName}
                      </button>
                    </div>
                  )
                })}
              </>
            )}
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
                      Your interactions will show up here once you start engaging with this company.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── All Fields Tab ── */}
            {activeTab === 'details' && (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-x-6">
                  {Object.entries(lead)
                    .filter(([k]) => !['id', 'lead_type', 'stage', 'stage_label', 'activities'].includes(k))
                    .map(([key, value]) => (
                      <div key={key} className="py-2 border-b border-slate-50">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                          {key.replace(/_/g, ' ')}
                        </span>
                        {value && String(value).startsWith('http') ? (
                          <a href={String(value)} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-600 truncate block">
                            {String(value).replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)}
                          </a>
                        ) : (
                          <p className="text-xs text-slate-700 truncate">{String(value) || '-'}</p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
