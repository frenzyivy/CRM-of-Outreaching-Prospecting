import { useState } from 'react'
import { X, Mail, Phone, StickyNote } from 'lucide-react'
import { useLeadDetail } from '../../hooks/useLeads'
import { useUpdateStage, useLogActivity } from '../../hooks/usePipeline'
import Badge from '../common/Badge'
import { formatDateTime } from '../../lib/utils'
import type { Lead } from '../../types'
import { isCompanyOnly } from '../../types'

const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'researched', label: 'Researched' },
  { value: 'email_sent', label: 'Email Sent' },
  { value: 'follow_up_1', label: 'Follow-up 1' },
  { value: 'follow_up_2', label: 'Follow-up 2' },
  { value: 'responded', label: 'Responded' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'closed_won', label: 'Closed (Won)' },
  { value: 'closed_lost', label: 'Closed (Lost)' },
]

const activityIcons = {
  email: Mail,
  call: Phone,
  note: StickyNote,
  stage_change: StickyNote,
}

interface Props {
  lead: Lead
  onClose: () => void
}

export default function LeadDetailModal({ lead, onClose }: Props) {
  const { data: detail } = useLeadDetail(lead.id)
  const updateStage = useUpdateStage()
  const logActivity = useLogActivity()
  const [activityType, setActivityType] = useState<'email' | 'call' | 'note'>('email')
  const [description, setDescription] = useState('')

  const displayLead = detail || lead
  const activities = detail?.activities || []

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

  const name = isCompanyOnly(lead)
    ? displayLead.company_name
    : `${displayLead.first_name || ''} ${displayLead.last_name || ''}`.trim() || displayLead.full_name

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-20 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
            <p className="text-sm text-slate-500 capitalize">{isCompanyOnly(lead) ? 'Company' : 'Contact'}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Lead info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(displayLead)
              .filter(([k]) => !['id', 'lead_type', 'stage', 'stage_label', 'activities'].includes(k))
              .map(([key, value]) => (
                <div key={key}>
                  <span className="text-slate-400 text-xs capitalize">{key.replace(/_/g, ' ')}</span>
                  <p className="text-slate-700">{String(value) || '-'}</p>
                </div>
              ))}
          </div>

          {/* Stage */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Pipeline Stage</label>
            <div className="flex items-center gap-2">
              <Badge stage={displayLead.stage} label={displayLead.stage_label} />
              <select
                value={displayLead.stage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="text-sm border border-slate-200 rounded px-2 py-1"
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Log activity */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Log Activity</h4>
            <div className="flex gap-2 mb-2">
              {(['email', 'call', 'note'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActivityType(type)}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    activityType === type
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogActivity()}
                placeholder={`Describe the ${activityType}...`}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleLogActivity}
                disabled={!description.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Log
              </button>
            </div>
          </div>

          {/* Activity history */}
          {activities.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Activity History</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activities.map((activity) => {
                  const Icon = activityIcons[activity.activity_type as keyof typeof activityIcons] || StickyNote
                  return (
                    <div key={activity.id} className="flex items-start gap-2 text-sm">
                      <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-slate-700">{activity.description}</p>
                        <p className="text-xs text-slate-400">
                          {activity.activity_type} &middot; {formatDateTime(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
